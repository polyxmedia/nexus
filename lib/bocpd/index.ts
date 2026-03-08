import { getDailySeries } from "@/lib/market-data/alpha-vantage";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChangePoint {
  date: string;
  dataStream: string;
  probability: number;
  runLength: number;
  magnitude: number;
  direction: "up" | "down";
  priorMean: number;
  postMean: number;
}

export interface BOCPDState {
  stream: string;
  label: string;
  currentValue: number | null;
  currentRunLength: number;
  lastChangePoint: ChangePoint | null;
  changePoints: ChangePoint[];
}

export interface BOCPDSnapshot {
  streams: BOCPDState[];
  recentChangePoints: ChangePoint[];
  activeRegimes: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Sufficient statistics for online Student-t predictive distribution
// ---------------------------------------------------------------------------

interface SuffStats {
  mean: number;
  var: number;
  count: number;
}

function initSuffStats(): SuffStats {
  return { mean: 0, var: 0, count: 0 };
}

function updateSuffStats(s: SuffStats, x: number): SuffStats {
  const newCount = s.count + 1;
  const delta = x - s.mean;
  const newMean = s.mean + delta / newCount;
  const newVar = s.var + delta * (x - newMean);
  return { mean: newMean, var: newVar, count: newCount };
}

/**
 * Student-t predictive log-probability.
 * With sufficient statistics (mu, sigma2, n), the predictive distribution is
 * t_{2a}(mu, sigma2 * (1 + 1/n)) where a = n/2 approximately.
 */
function studentTPredLogProb(x: number, s: SuffStats): number {
  if (s.count < 2) {
    // Uninformative prior: use broad Gaussian approximation
    const priorVar = 1e4;
    return -0.5 * Math.log(2 * Math.PI * priorVar) - 0.5 * (x * x) / priorVar;
  }

  const n = s.count;
  const mu = s.mean;
  const sigma2 = s.var / (n - 1); // sample variance
  const nu = 2 * (n - 1); // degrees of freedom
  const scaledVar = sigma2 * (1 + 1 / n);

  if (scaledVar <= 0) {
    return -20; // degenerate case
  }

  // Log of Student-t pdf
  const t = (x - mu) / Math.sqrt(scaledVar);
  const logCoeff =
    logGamma((nu + 1) / 2) -
    logGamma(nu / 2) -
    0.5 * Math.log(nu * Math.PI * scaledVar);
  const logBody = -((nu + 1) / 2) * Math.log(1 + (t * t) / nu);

  return logCoeff + logBody;
}

/**
 * Stirling's log-gamma approximation (sufficient for our purposes).
 */
function logGamma(x: number): number {
  if (x <= 0) return 0;
  // Lanczos approximation coefficients
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i);
  }

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ---------------------------------------------------------------------------
// Core BOCPD algorithm (Adams & MacKay 2007)
// ---------------------------------------------------------------------------

export interface BOCPDResult {
  changePoints: ChangePoint[];
  finalRunLength: number;
}

export function runBOCPD(
  dataPoints: number[],
  dates: string[],
  streamName: string,
  hazardRate: number = 250,
  threshold: number = 0.5
): BOCPDResult {
  const n = dataPoints.length;
  if (n === 0) {
    return { changePoints: [], finalRunLength: 0 };
  }

  const H = 1 / hazardRate; // constant hazard

  // Run-length distribution: R[r] = P(run_length = r | data)
  // We only need the current time step's distribution
  let R = new Float64Array(1);
  R[0] = 1.0; // P(r_0 = 0) = 1

  // Sufficient statistics for each run length
  let suffStats: SuffStats[] = [initSuffStats()];

  const changePoints: ChangePoint[] = [];
  let lastCPIndex = 0;

  for (let t = 0; t < n; t++) {
    const x = dataPoints[t];
    const prevLen = R.length;

    // Step 1: Evaluate predictive probabilities for each run length
    const predProbs = new Float64Array(prevLen);
    for (let r = 0; r < prevLen; r++) {
      predProbs[r] = Math.exp(studentTPredLogProb(x, suffStats[r]));
    }

    // Step 2: Calculate growth probabilities (run continues)
    const newR = new Float64Array(prevLen + 1);
    for (let r = 0; r < prevLen; r++) {
      newR[r + 1] = R[r] * predProbs[r] * (1 - H);
    }

    // Step 3: Calculate changepoint probability (run resets to 0)
    let cpProb = 0;
    for (let r = 0; r < prevLen; r++) {
      cpProb += R[r] * predProbs[r] * H;
    }
    newR[0] = cpProb;

    // Step 4: Normalize
    let total = 0;
    for (let r = 0; r < newR.length; r++) {
      total += newR[r];
    }
    if (total > 0) {
      for (let r = 0; r < newR.length; r++) {
        newR[r] /= total;
      }
    }

    // Step 5: Update sufficient statistics
    const newSuffStats: SuffStats[] = new Array(newR.length);
    newSuffStats[0] = initSuffStats(); // new run starts fresh
    for (let r = 0; r < prevLen; r++) {
      newSuffStats[r + 1] = updateSuffStats(suffStats[r], x);
    }

    // Step 6: Detect change-point
    if (newR[0] > threshold && t > 0) {
      // Calculate prior and post means around the change-point
      const windowSize = Math.min(10, t);
      const priorSlice = dataPoints.slice(Math.max(0, t - windowSize), t);
      const postSlice = dataPoints.slice(t, Math.min(n, t + Math.min(10, n - t)));

      const priorMean = priorSlice.reduce((a, b) => a + b, 0) / priorSlice.length;
      const postMean =
        postSlice.length > 0
          ? postSlice.reduce((a, b) => a + b, 0) / postSlice.length
          : x;

      const magnitude = Math.abs(postMean - priorMean);
      const direction: "up" | "down" = postMean >= priorMean ? "up" : "down";

      changePoints.push({
        date: dates[t] || new Date().toISOString().split("T")[0],
        dataStream: streamName,
        probability: Math.round(newR[0] * 1000) / 1000,
        runLength: t - lastCPIndex,
        magnitude: Math.round(magnitude * 100) / 100,
        direction,
        priorMean: Math.round(priorMean * 100) / 100,
        postMean: Math.round(postMean * 100) / 100,
      });

      lastCPIndex = t;
    }

    // Step 7: Prune low-probability run lengths for memory efficiency
    // Keep only run lengths with probability > 1e-10
    const prunedR: number[] = [];
    const prunedStats: SuffStats[] = [];
    for (let r = 0; r < newR.length; r++) {
      if (newR[r] > 1e-10) {
        prunedR.push(newR[r]);
        prunedStats.push(newSuffStats[r]);
      }
    }

    // Re-normalize after pruning
    let prunedTotal = 0;
    for (const p of prunedR) prunedTotal += p;
    R = new Float64Array(prunedR.length);
    for (let i = 0; i < prunedR.length; i++) {
      R[i] = prunedR[i] / prunedTotal;
    }
    suffStats = prunedStats;
  }

  // Calculate final run length as MAP estimate
  let maxProb = 0;
  let mapRunLength = 0;
  for (let r = 0; r < R.length; r++) {
    if (R[r] > maxProb) {
      maxProb = R[r];
      mapRunLength = r;
    }
  }

  return { changePoints, finalRunLength: mapRunLength };
}

// ---------------------------------------------------------------------------
// Data stream definitions and fetching
// ---------------------------------------------------------------------------

interface StreamConfig {
  key: string;
  label: string;
  symbol: string;
  type: "stock" | "signal";
}

const STREAM_CONFIGS: StreamConfig[] = [
  { key: "vix", label: "VIX (Volatility Index)", symbol: "VIXY", type: "stock" },
  { key: "gold", label: "Gold (GLD)", symbol: "GLD", type: "stock" },
  { key: "oil", label: "Oil WTI (USO)", symbol: "USO", type: "stock" },
  { key: "yield", label: "US 10Y Yield (TLT)", symbol: "TLT", type: "stock" },
  { key: "dxy", label: "Dollar Index (UUP)", symbol: "UUP", type: "stock" },
  { key: "signals", label: "Signal Intensity", symbol: "", type: "signal" },
];

async function fetchStreamData(
  config: StreamConfig,
  apiKey: string
): Promise<{ values: number[]; dates: string[]; currentValue: number | null }> {
  if (config.type === "signal") {
    return fetchSignalIntensity();
  }

  try {
    const bars = await getDailySeries(config.symbol, apiKey, "compact");
    if (!bars || bars.length === 0) {
      return { values: [], dates: [], currentValue: null };
    }

    const values = bars.map((b) => b.close);
    const dates = bars.map((b) => b.date);
    const currentValue = values[values.length - 1] ?? null;

    return { values, dates, currentValue };
  } catch {
    return { values: [], dates: [], currentValue: null };
  }
}

async function fetchSignalIntensity(): Promise<{
  values: number[];
  dates: string[];
  currentValue: number | null;
}> {
  try {
    const allSignals = await db
      .select({
        date: schema.signals.date,
        intensity: schema.signals.intensity,
      })
      .from(schema.signals)
      .orderBy(desc(schema.signals.date));

    if (allSignals.length === 0) {
      return { values: [], dates: [], currentValue: null };
    }

    // Group by date and average intensity
    const dateMap = new Map<string, number[]>();
    for (const s of allSignals) {
      const existing = dateMap.get(s.date) || [];
      existing.push(s.intensity);
      dateMap.set(s.date, existing);
    }

    const entries = Array.from(dateMap.entries())
      .map(([date, intensities]) => ({
        date,
        value: intensities.reduce((a, b) => a + b, 0) / intensities.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      values: entries.map((e) => e.value),
      dates: entries.map((e) => e.date),
      currentValue: entries[entries.length - 1]?.value ?? null,
    };
  } catch {
    return { values: [], dates: [], currentValue: null };
  }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let snapshotCache: { data: BOCPDSnapshot; expiry: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function getBOCPDSnapshot(
  streamFilter?: string
): Promise<BOCPDSnapshot> {
  // Check cache (only for full snapshot)
  if (!streamFilter && snapshotCache && snapshotCache.expiry > Date.now()) {
    return snapshotCache.data;
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
  const configs = streamFilter
    ? STREAM_CONFIGS.filter((c) => c.key === streamFilter)
    : STREAM_CONFIGS;

  const streams: BOCPDState[] = [];
  const allChangePoints: ChangePoint[] = [];

  // Process streams sequentially to respect API rate limits
  for (const config of configs) {
    const { values, dates, currentValue } = await fetchStreamData(config, apiKey);

    if (values.length < 10) {
      streams.push({
        stream: config.key,
        label: config.label,
        currentValue,
        currentRunLength: 0,
        lastChangePoint: null,
        changePoints: [],
      });
      continue;
    }

    const result = runBOCPD(values, dates, config.key);

    const lastCP =
      result.changePoints.length > 0
        ? result.changePoints[result.changePoints.length - 1]
        : null;

    streams.push({
      stream: config.key,
      label: config.label,
      currentValue,
      currentRunLength: result.finalRunLength,
      lastChangePoint: lastCP,
      changePoints: result.changePoints,
    });

    allChangePoints.push(...result.changePoints);
  }

  // Sort recent change-points by date descending
  const recentChangePoints = allChangePoints
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);

  const snapshot: BOCPDSnapshot = {
    streams,
    recentChangePoints,
    activeRegimes: streams.filter((s) => s.changePoints.length > 0).length,
    generatedAt: new Date().toISOString(),
  };

  // Cache full snapshots
  if (!streamFilter) {
    snapshotCache = { data: snapshot, expiry: Date.now() + CACHE_TTL_MS };
  }

  return snapshot;
}
