// ── Conditional Monte Carlo Simulation Engine ──

export interface ScenarioParams {
  dailyMeanReturn: number;
  dailyVolatility: number;
  fatTailSkew: number;        // -1 to 1
  jumpProbability: number;     // per day
  jumpMagnitude: number;       // e.g., 0.1 = 10%
  meanReversionTarget?: number;
  meanReversionSpeed?: number; // 0-1
}

export interface Scenario {
  name: string;
  probability: number;
  params: ScenarioParams;
}

export interface SimulationConfig {
  currentPrice: number;
  scenarios: Scenario[];
  daysToSimulate: number;
  numPaths: number;
  leverageMultiplier?: number;
}

export interface ScenarioResult {
  name: string;
  probability: number;
  samplePaths: number[][];
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
  expectedReturn: number;
  maxDrawdown: number;
  probabilityOfProfit: number;
  finalPriceStats: { mean: number; median: number; min: number; max: number };
}

export interface SimulationResult {
  scenarios: ScenarioResult[];
  blended: {
    percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
    expectedReturn: number;
    probabilityOfProfit: number;
    expectedValue: number;
  };
  config: { currentPrice: number; days: number; leverage: number };
}

// Box-Muller transform for normal distribution sampling
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Skewed normal using Azzalini method
function randomSkewedNormal(skew: number): number {
  const u0 = randomNormal();
  const v = randomNormal();
  const delta = skew / Math.sqrt(1 + skew * skew);
  const u1 = delta * u0 + Math.sqrt(1 - delta * delta) * v;
  return u0 >= 0 ? u1 : -u1;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function simulatePath(
  startPrice: number,
  days: number,
  params: ScenarioParams,
  leverage: number
): number[] {
  const path: number[] = [startPrice];
  let price = startPrice;

  for (let d = 0; d < days; d++) {
    // Base return from skewed normal
    let dailyReturn = params.dailyMeanReturn + params.dailyVolatility * randomSkewedNormal(params.fatTailSkew);

    // Jump process
    if (Math.random() < params.jumpProbability) {
      dailyReturn += params.jumpMagnitude * (Math.random() > 0.5 ? 1 : -1) * (1 + randomNormal() * 0.3);
    }

    // Mean reversion
    if (params.meanReversionTarget != null && params.meanReversionSpeed != null) {
      const reversion = params.meanReversionSpeed * (params.meanReversionTarget - price) / price;
      dailyReturn += reversion;
    }

    // Apply leverage
    dailyReturn *= leverage;

    // Update price (compounding)
    price = price * (1 + dailyReturn);
    if (price < 0.01) price = 0.01; // floor
    path.push(price);
  }

  return path;
}

export function runMonteCarloSimulation(config: SimulationConfig): SimulationResult {
  const leverage = config.leverageMultiplier || 1;
  const scenarioResults: ScenarioResult[] = [];
  const allBlendedFinals: { price: number; weight: number }[] = [];

  for (const scenario of config.scenarios) {
    const allPaths: number[][] = [];
    const finalPrices: number[] = [];
    let maxDrawdownSum = 0;

    for (let i = 0; i < config.numPaths; i++) {
      const path = simulatePath(config.currentPrice, config.daysToSimulate, scenario.params, leverage);
      allPaths.push(path);
      finalPrices.push(path[path.length - 1]);

      // Calculate max drawdown for this path
      let peak = path[0];
      let maxDD = 0;
      for (const p of path) {
        if (p > peak) peak = p;
        const dd = (peak - p) / peak;
        if (dd > maxDD) maxDD = dd;
      }
      maxDrawdownSum += maxDD;

      allBlendedFinals.push({ price: path[path.length - 1], weight: scenario.probability });
    }

    // Sort final prices for percentile calculation
    const sorted = [...finalPrices].sort((a, b) => a - b);

    // Sample 100 paths for visualization
    const sampleIndices = new Set<number>();
    const sampleCount = Math.min(100, config.numPaths);
    while (sampleIndices.size < sampleCount) {
      sampleIndices.add(Math.floor(Math.random() * config.numPaths));
    }
    const samplePaths = Array.from(sampleIndices).map((i) => allPaths[i]);

    const mean = finalPrices.reduce((s, p) => s + p, 0) / finalPrices.length;
    const profitCount = finalPrices.filter((p) => p > config.currentPrice).length;

    scenarioResults.push({
      name: scenario.name,
      probability: scenario.probability,
      samplePaths,
      percentiles: {
        p5: percentile(sorted, 5),
        p25: percentile(sorted, 25),
        p50: percentile(sorted, 50),
        p75: percentile(sorted, 75),
        p95: percentile(sorted, 95),
      },
      expectedReturn: (mean - config.currentPrice) / config.currentPrice,
      maxDrawdown: maxDrawdownSum / config.numPaths,
      probabilityOfProfit: profitCount / config.numPaths,
      finalPriceStats: {
        mean,
        median: percentile(sorted, 50),
        min: sorted[0],
        max: sorted[sorted.length - 1],
      },
    });
  }

  // Blended result: weight by scenario probability
  // Build weighted final price distribution
  const blendedFinals: number[] = [];
  for (const scenario of scenarioResults) {
    // Take proportional sample from each scenario
    const count = Math.round(scenario.probability * 10000);
    const step = Math.max(1, Math.floor(scenario.samplePaths.length / count));
    for (let i = 0; i < count && i < scenario.samplePaths.length; i++) {
      const path = scenario.samplePaths[Math.min(i * step, scenario.samplePaths.length - 1)];
      blendedFinals.push(path[path.length - 1]);
    }
  }

  // If we don't have enough samples from samplePaths, use the scenario stats
  const blendedExpectedReturn = scenarioResults.reduce(
    (s, sc) => s + sc.probability * sc.expectedReturn, 0
  );
  const blendedProbProfit = scenarioResults.reduce(
    (s, sc) => s + sc.probability * sc.probabilityOfProfit, 0
  );
  const blendedExpectedValue = scenarioResults.reduce(
    (s, sc) => s + sc.probability * sc.finalPriceStats.mean, 0
  );

  // Blended percentiles from weighted combination
  const blendedP5 = scenarioResults.reduce((s, sc) => s + sc.probability * sc.percentiles.p5, 0);
  const blendedP25 = scenarioResults.reduce((s, sc) => s + sc.probability * sc.percentiles.p25, 0);
  const blendedP50 = scenarioResults.reduce((s, sc) => s + sc.probability * sc.percentiles.p50, 0);
  const blendedP75 = scenarioResults.reduce((s, sc) => s + sc.probability * sc.percentiles.p75, 0);
  const blendedP95 = scenarioResults.reduce((s, sc) => s + sc.probability * sc.percentiles.p95, 0);

  return {
    scenarios: scenarioResults,
    blended: {
      percentiles: { p5: blendedP5, p25: blendedP25, p50: blendedP50, p75: blendedP75, p95: blendedP95 },
      expectedReturn: blendedExpectedReturn,
      probabilityOfProfit: blendedProbProfit,
      expectedValue: blendedExpectedValue,
    },
    config: { currentPrice: config.currentPrice, days: config.daysToSimulate, leverage },
  };
}
