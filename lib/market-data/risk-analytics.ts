// Portfolio Risk Analytics Engine
// VaR, Stress Testing, Correlation Matrix, Factor Exposure

import { getDailySeries, getQuote, type DailyBar } from "./provider";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function getApiKey(): Promise<string | null> {
  const rows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, "alpha_vantage_api_key"));
  return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || null;
}

// Compute daily log returns from close prices
function logReturns(closes: number[]): number[] {
  return closes.slice(1).map((c, i) => Math.log(c / closes[i]));
}

// ── Historical VaR ──
export function computeHistoricalVaR(
  returns: number[],
  portfolioValue: number,
  confidenceLevel: number = 0.95
): { var1d: number; var10d: number; cvar1d: number } {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidenceLevel) * sorted.length);
  const varReturn = sorted[idx];

  // CVaR (Expected Shortfall) - average of returns worse than VaR
  const tailReturns = sorted.slice(0, idx + 1);
  const cvarReturn = tailReturns.length > 0
    ? tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length
    : varReturn;

  return {
    var1d: Math.abs(varReturn * portfolioValue),
    var10d: Math.abs(varReturn * Math.sqrt(10) * portfolioValue),
    cvar1d: Math.abs(cvarReturn * portfolioValue),
  };
}

// ── Parametric VaR (assumes normal distribution) ──
export function computeParametricVaR(
  returns: number[],
  portfolioValue: number,
  confidenceLevel: number = 0.95
): { var1d: number; var10d: number } {
  const mu = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sigma = Math.sqrt(
    returns.reduce((s, r) => s + (r - mu) ** 2, 0) / returns.length
  );

  // Z-score for confidence level
  const z = confidenceLevel === 0.99 ? 2.326 : confidenceLevel === 0.95 ? 1.645 : 1.282;

  return {
    var1d: (z * sigma - mu) * portfolioValue,
    var10d: (z * sigma * Math.sqrt(10) - mu * 10) * portfolioValue,
  };
}

// ── Correlation Matrix ──
export function computeCorrelationMatrix(
  returnSeries: Record<string, number[]>
): { symbols: string[]; matrix: number[][] } {
  const symbols = Object.keys(returnSeries);
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }

      const a = returnSeries[symbols[i]];
      const b = returnSeries[symbols[j]];
      const len = Math.min(a.length, b.length);

      if (len < 5) {
        matrix[i][j] = 0;
        continue;
      }

      const aSlice = a.slice(-len);
      const bSlice = b.slice(-len);
      const muA = aSlice.reduce((s, v) => s + v, 0) / len;
      const muB = bSlice.reduce((s, v) => s + v, 0) / len;

      let cov = 0, varA = 0, varB = 0;
      for (let k = 0; k < len; k++) {
        const da = aSlice[k] - muA;
        const db = bSlice[k] - muB;
        cov += da * db;
        varA += da * da;
        varB += db * db;
      }

      matrix[i][j] = varA > 0 && varB > 0
        ? cov / Math.sqrt(varA * varB)
        : 0;
    }
  }

  return { symbols, matrix };
}

// ── Stress Testing ──
export interface StressScenario {
  name: string;
  description: string;
  shocks: Record<string, number>; // symbol -> % change
}

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    name: "Oil Shock (+30%)",
    description: "Major supply disruption (Hormuz closure, OPEC+ deep cut). Oil +30%, energy +15%, airlines -20%, consumer staples -5%.",
    shocks: {
      "CL": 0.30, "XLE": 0.15, "USO": 0.30,
      "DAL": -0.20, "UAL": -0.20, "AAL": -0.20,
      "SPY": -0.05, "QQQ": -0.03,
      "XLF": -0.05, "XLK": -0.03,
      "GLD": 0.08, "TLT": 0.03,
    },
  },
  {
    name: "Rate Spike (+200bp)",
    description: "Fed emergency rate hike or inflation shock. Bonds -15%, growth stocks -20%, banks mixed, gold -5%.",
    shocks: {
      "TLT": -0.15, "AGG": -0.08, "IEF": -0.10,
      "QQQ": -0.20, "ARKK": -0.30,
      "SPY": -0.12, "IWM": -0.15,
      "XLF": 0.05, "GLD": -0.05,
      "XLU": -0.10, "XLRE": -0.18,
    },
  },
  {
    name: "China-Taiwan Crisis",
    description: "Military escalation in Taiwan Strait. Semiconductors -40%, China exposure -25%, defense +15%, gold +12%.",
    shocks: {
      "TSM": -0.40, "ASML": -0.25, "NVDA": -0.20,
      "SMH": -0.30, "SOXX": -0.30,
      "FXI": -0.25, "KWEB": -0.30,
      "SPY": -0.15, "QQQ": -0.20,
      "LMT": 0.15, "RTX": 0.12, "NOC": 0.15,
      "GLD": 0.12, "TLT": 0.05,
    },
  },
  {
    name: "Pandemic 2.0",
    description: "New global health crisis. Travel -35%, retail -20%, tech +10%, healthcare +15%, bonds rally.",
    shocks: {
      "DAL": -0.35, "MAR": -0.30, "ABNB": -0.30,
      "XLY": -0.20, "XRT": -0.20,
      "SPY": -0.25, "IWM": -0.30,
      "QQQ": -0.10, "MSFT": 0.05, "AMZN": 0.10, "ZM": 0.30,
      "XLV": 0.15, "PFE": 0.20, "MRNA": 0.40,
      "TLT": 0.15, "GLD": 0.08,
    },
  },
  {
    name: "Dollar Crash (-15%)",
    description: "Loss of reserve currency confidence. Dollar -15%, gold +25%, EM +15%, commodities +20%, US equities -10%.",
    shocks: {
      "UUP": -0.15, "GLD": 0.25, "SLV": 0.30,
      "EEM": 0.15, "EFA": 0.10,
      "SPY": -0.10, "DIA": -0.08,
      "CL": 0.20, "DBA": 0.15,
      "TLT": -0.10, "TIP": 0.05,
    },
  },
  {
    name: "Credit Crisis",
    description: "HY spread blowout, bank failures. Banks -30%, HY bonds -20%, equities -25%, gold +15%, treasuries rally.",
    shocks: {
      "XLF": -0.30, "KRE": -0.40, "KBE": -0.35,
      "HYG": -0.20, "JNK": -0.20,
      "SPY": -0.25, "IWM": -0.30, "QQQ": -0.18,
      "GLD": 0.15, "TLT": 0.12,
      "VIX": 1.50,
    },
  },
];

export function stressTestPortfolio(
  positions: Array<{ ticker: string; value: number }>,
  scenario: StressScenario
): {
  scenario: string;
  totalImpact: number;
  totalImpactPercent: number;
  positionImpacts: Array<{ ticker: string; currentValue: number; shock: number; impact: number }>;
} {
  const portfolioValue = positions.reduce((s, p) => s + p.value, 0);
  const positionImpacts = positions.map(pos => {
    // Find matching shock - try exact ticker, then sector ETFs
    const shock = scenario.shocks[pos.ticker.toUpperCase()] || scenario.shocks["SPY"] || -0.05;
    const impact = pos.value * shock;
    return {
      ticker: pos.ticker,
      currentValue: pos.value,
      shock,
      impact,
    };
  });

  const totalImpact = positionImpacts.reduce((s, p) => s + p.impact, 0);

  return {
    scenario: scenario.name,
    totalImpact,
    totalImpactPercent: portfolioValue > 0 ? (totalImpact / portfolioValue) * 100 : 0,
    positionImpacts,
  };
}

// ── Full Portfolio Risk Report ──
export async function computePortfolioRisk(
  positions: Array<{ ticker: string; value: number; quantity: number }>,
  portfolioValue: number
): Promise<{
  var95: { var1d: number; var10d: number; cvar1d: number };
  var99: { var1d: number; var10d: number; cvar1d: number };
  parametricVar: { var1d: number; var10d: number };
  correlation: { symbols: string[]; matrix: number[][] };
  stressTests: Array<ReturnType<typeof stressTestPortfolio>>;
  concentrationRisk: Array<{ ticker: string; weight: number }>;
  beta: number | null;
  sharpeData: { annualizedReturn: number; annualizedVol: number; sharpe: number } | null;
}> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Alpha Vantage API key not configured");

  const tickers = [...new Set(positions.map(p => p.ticker.toUpperCase()))];

  // Fetch price history for all positions + SPY for beta
  const allTickers = [...tickers, "SPY"];
  const priceData: Record<string, DailyBar[]> = {};

  for (const ticker of allTickers) {
    try {
      priceData[ticker] = await getDailySeries(ticker, apiKey, "compact");
    } catch {
      // Skip tickers we can't get data for
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  // Compute returns for each position
  const returnSeries: Record<string, number[]> = {};
  for (const ticker of allTickers) {
    if (priceData[ticker] && priceData[ticker].length > 5) {
      returnSeries[ticker] = logReturns(priceData[ticker].map(b => b.close));
    }
  }

  // Portfolio-weighted returns
  const portfolioReturns: number[] = [];
  const minLen = Math.min(...tickers.filter(t => returnSeries[t]).map(t => returnSeries[t].length));

  if (minLen > 5) {
    for (let i = 0; i < minLen; i++) {
      let dayReturn = 0;
      for (const pos of positions) {
        const t = pos.ticker.toUpperCase();
        if (returnSeries[t]) {
          const weight = pos.value / portfolioValue;
          const idx = returnSeries[t].length - minLen + i;
          dayReturn += weight * returnSeries[t][idx];
        }
      }
      portfolioReturns.push(dayReturn);
    }
  }

  // VaR calculations
  const var95 = portfolioReturns.length > 10
    ? computeHistoricalVaR(portfolioReturns, portfolioValue, 0.95)
    : { var1d: 0, var10d: 0, cvar1d: 0 };

  const var99 = portfolioReturns.length > 10
    ? computeHistoricalVaR(portfolioReturns, portfolioValue, 0.99)
    : { var1d: 0, var10d: 0, cvar1d: 0 };

  const parametricVar = portfolioReturns.length > 10
    ? computeParametricVaR(portfolioReturns, portfolioValue, 0.95)
    : { var1d: 0, var10d: 0 };

  // Correlation matrix
  const corrTickers = tickers.filter(t => returnSeries[t]);
  const corrSeries: Record<string, number[]> = {};
  for (const t of corrTickers) corrSeries[t] = returnSeries[t];
  const correlation = computeCorrelationMatrix(corrSeries);

  // Stress tests
  const positionsForStress = positions.map(p => ({ ticker: p.ticker, value: p.value }));
  const stressTests = STRESS_SCENARIOS.map(s => stressTestPortfolio(positionsForStress, s));

  // Concentration risk
  const concentrationRisk = positions
    .map(p => ({ ticker: p.ticker, weight: p.value / portfolioValue }))
    .sort((a, b) => b.weight - a.weight);

  // Portfolio beta vs SPY
  let beta: number | null = null;
  if (returnSeries["SPY"] && portfolioReturns.length > 10) {
    const spyReturns = returnSeries["SPY"].slice(-portfolioReturns.length);
    const muP = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    const muS = spyReturns.reduce((a, b) => a + b, 0) / spyReturns.length;
    let cov = 0, varS = 0;
    for (let i = 0; i < portfolioReturns.length; i++) {
      cov += (portfolioReturns[i] - muP) * (spyReturns[i] - muS);
      varS += (spyReturns[i] - muS) ** 2;
    }
    beta = varS > 0 ? cov / varS : null;
  }

  // Sharpe-like data
  let sharpeData: { annualizedReturn: number; annualizedVol: number; sharpe: number } | null = null;
  if (portfolioReturns.length > 20) {
    const mu = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    const sigma = Math.sqrt(portfolioReturns.reduce((s, r) => s + (r - mu) ** 2, 0) / portfolioReturns.length);
    const annReturn = mu * 252;
    const annVol = sigma * Math.sqrt(252);
    const riskFreeRate = 0.045; // approximate
    sharpeData = {
      annualizedReturn: annReturn,
      annualizedVol: annVol,
      sharpe: annVol > 0 ? (annReturn - riskFreeRate) / annVol : 0,
    };
  }

  return {
    var95,
    var99,
    parametricVar,
    correlation,
    stressTests,
    concentrationRisk,
    beta,
    sharpeData,
  };
}
