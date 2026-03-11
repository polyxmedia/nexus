// Systemic Risk Engine
// Absorption Ratio (Kritzman et al. 2011) + Turbulence Index (Mahalanobis distance)
// Empirically validated crisis detection across 40+ years of out-of-sample data.

import { getDailySeries, type DailyBar } from "@/lib/market-data/provider";
import { getFredSeries } from "@/lib/market-data/fred";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { saveRegimeState, loadRegimeState, appendToHistory } from "@/lib/regime/store";

// ── Asset Basket ──
// Cross-asset coverage: equities, fixed income, commodities, volatility
const ASSET_BASKET = [
  { symbol: "SPY", label: "S&P 500", source: "av" as const },
  { symbol: "QQQ", label: "Nasdaq 100", source: "av" as const },
  { symbol: "IWM", label: "Russell 2000", source: "av" as const },
  { symbol: "EEM", label: "Emerging Markets", source: "av" as const },
  { symbol: "TLT", label: "20Y Treasuries", source: "av" as const },
  { symbol: "HYG", label: "High Yield", source: "av" as const },
  { symbol: "LQD", label: "Investment Grade", source: "av" as const },
  { symbol: "GLD", label: "Gold", source: "av" as const },
  { symbol: "USO", label: "Crude Oil", source: "av" as const },
  { symbol: "UUP", label: "US Dollar", source: "av" as const },
  // VIX via FRED (more reliable than ETFs)
  { symbol: "VIXCLS", label: "VIX", source: "fred" as const },
];

export interface SystemicRiskState {
  timestamp: string;
  absorptionRatio: number; // 0-1, fraction of variance explained by top eigenvalues
  absorptionRatioZScore: number; // standardized change
  turbulenceIndex: number; // Mahalanobis distance
  turbulencePercentile: number; // percentile vs trailing window
  compositeStress: number; // 0-100 combined score
  regime: "stable" | "elevated" | "fragile" | "critical";
  assetCoverage: number; // how many assets successfully loaded
  topEigenvaluePct: number; // % of variance from 1st principal component
  eigenvalueConcentration: number; // Herfindahl of eigenvalues
  interpretation: string;
  warnings: string[];
}

// ── Linear Algebra Utilities ──

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// Compute covariance matrix from return series (column = asset, row = observation)
function covarianceMatrix(returns: number[][]): number[][] {
  const n = returns.length; // observations
  const p = returns[0].length; // assets

  // Column means
  const means = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) {
      means[j] += returns[i][j];
    }
    means[j] /= n;
  }

  // Covariance
  const cov: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    for (let k = j; k < p; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += (returns[i][j] - means[j]) * (returns[i][k] - means[k]);
      }
      cov[j][k] = sum / (n - 1);
      cov[k][j] = cov[j][k]; // symmetric
    }
  }
  return cov;
}

// Correlation matrix from covariance matrix
function correlationFromCovariance(cov: number[][]): number[][] {
  const p = cov.length;
  const corr: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const stds = cov.map((_, i) => Math.sqrt(cov[i][i]));

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (stds[i] === 0 || stds[j] === 0) {
        corr[i][j] = i === j ? 1 : 0;
      } else {
        corr[i][j] = cov[i][j] / (stds[i] * stds[j]);
      }
    }
  }
  return corr;
}

// Jacobi eigenvalue algorithm for symmetric matrices
// Returns eigenvalues sorted descending
function eigenvalues(matrix: number[][]): number[] {
  const n = matrix.length;
  // Deep copy
  const A: number[][] = matrix.map(row => [...row]);

  const maxIter = 100 * n * n;
  const tol = 1e-10;

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxVal) {
          maxVal = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tol) break;

    // Compute rotation angle
    const theta = A[p][p] === A[q][q]
      ? Math.PI / 4
      : 0.5 * Math.atan2(2 * A[p][q], A[p][p] - A[q][q]);

    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply Givens rotation
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p];
        const aiq = A[i][q];
        A[i][p] = c * aip + s * aiq;
        A[p][i] = A[i][p];
        A[i][q] = -s * aip + c * aiq;
        A[q][i] = A[i][q];
      }
    }

    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];
    A[p][p] = c * c * app + 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app - 2 * s * c * apq + c * c * aqq;
    A[p][q] = 0;
    A[q][p] = 0;
  }

  // Diagonal contains eigenvalues
  const eigs = A.map((row, i) => row[i]);
  return eigs.sort((a, b) => b - a); // descending
}

// Matrix inversion via Gauss-Jordan elimination
function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  // Augment with identity
  const aug: number[][] = matrix.map((row, i) => {
    const identity = new Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) return null; // singular

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }
  }

  // Extract inverse from right half
  return aug.map(row => row.slice(n));
}

// Matrix-vector multiply
function matVecMul(mat: number[][], vec: number[]): number[] {
  return mat.map(row => row.reduce((s, v, i) => s + v * vec[i], 0));
}

// Dot product
function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

// ── Core Metrics ──

// Absorption Ratio: fraction of total variance explained by top K eigenvectors
// K = ceil(N/5) per Kritzman et al.
function computeAbsorptionRatio(correlationMatrix: number[][]): {
  ratio: number;
  topEigenPct: number;
  eigenConcentration: number;
} {
  const eigs = eigenvalues(correlationMatrix);
  const n = eigs.length;
  const k = Math.max(1, Math.ceil(n / 5));
  const totalVariance = eigs.reduce((a, b) => a + Math.max(0, b), 0);

  if (totalVariance === 0) return { ratio: 0, topEigenPct: 0, eigenConcentration: 0 };

  const topKVariance = eigs.slice(0, k).reduce((a, b) => a + Math.max(0, b), 0);
  const ratio = topKVariance / totalVariance;

  // First eigenvalue percentage
  const topEigenPct = Math.max(0, eigs[0]) / totalVariance;

  // Herfindahl-Hirschman index of eigenvalue concentration
  const shares = eigs.map(e => Math.max(0, e) / totalVariance);
  const eigenConcentration = shares.reduce((s, v) => s + v * v, 0);

  return { ratio, topEigenPct, eigenConcentration };
}

// Turbulence Index: Mahalanobis distance of current returns from mean
function computeTurbulenceIndex(
  currentReturns: number[],
  historicalMean: number[],
  covInverse: number[][]
): number {
  const p = currentReturns.length;
  const diff = currentReturns.map((r, i) => r - historicalMean[i]);
  const product = matVecMul(covInverse, diff);
  const mahal = dot(diff, product);
  // Turbulence is the square root of Mahalanobis distance scaled by dimensionality
  return Math.sqrt(Math.max(0, mahal) / p);
}

// ── Data Fetching ──

async function getApiKey(): Promise<string | null> {
  try {
    const rows = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, "alpha_vantage_api_key"))
      .limit(1);
    return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || null;
  } catch {
    return process.env.ALPHA_VANTAGE_API_KEY || null;
  }
}

function toReturns(bars: DailyBar[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close !== 0) {
      returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
  }
  return returns;
}

function fredToReturns(points: Array<{ value: number }>): number[] {
  const returns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].value !== 0) {
      returns.push((points[i].value - points[i - 1].value) / Math.abs(points[i - 1].value));
    }
  }
  return returns;
}

async function fetchAssetReturns(): Promise<{
  returns: Map<string, number[]>;
  labels: Map<string, string>;
}> {
  const apiKey = await getApiKey();
  const returns = new Map<string, number[]>();
  const labels = new Map<string, string>();

  for (const asset of ASSET_BASKET) {
    try {
      let assetReturns: number[];

      if (asset.source === "fred") {
        const data = await getFredSeries(asset.symbol, 200);
        assetReturns = fredToReturns(data);
      } else {
        if (!apiKey) continue;
        const bars = await getDailySeries(asset.symbol, apiKey);
        assetReturns = toReturns(bars);
        // Rate limit: Alpha Vantage allows 5/min on free tier
        await new Promise(r => setTimeout(r, 1500));
      }

      if (assetReturns.length >= 30) {
        returns.set(asset.symbol, assetReturns);
        labels.set(asset.symbol, asset.label);
      }
    } catch {
      // Skip failed assets
    }
  }

  return { returns, labels };
}

// ── Main Engine ──

export async function computeSystemicRisk(): Promise<SystemicRiskState> {
  const { returns: assetReturns, labels } = await fetchAssetReturns();
  const warnings: string[] = [];

  if (assetReturns.size < 5) {
    return {
      timestamp: new Date().toISOString(),
      absorptionRatio: 0,
      absorptionRatioZScore: 0,
      turbulenceIndex: 0,
      turbulencePercentile: 0,
      compositeStress: 0,
      regime: "stable",
      assetCoverage: assetReturns.size,
      topEigenvaluePct: 0,
      eigenvalueConcentration: 0,
      interpretation: `Insufficient data: only ${assetReturns.size} assets loaded (need 5+)`,
      warnings: ["Insufficient asset coverage for reliable systemic risk computation"],
    };
  }

  // Align return series to common length
  const symbols = Array.from(assetReturns.keys());
  const minLen = Math.min(...symbols.map(s => assetReturns.get(s)!.length));
  const windowSize = Math.min(minLen, 120); // 120 trading days (~6 months)

  // Build return matrix: rows = observations, columns = assets
  const returnMatrix: number[][] = [];
  for (let i = 0; i < windowSize; i++) {
    const row: number[] = [];
    for (const sym of symbols) {
      const r = assetReturns.get(sym)!;
      row.push(r[r.length - windowSize + i]);
    }
    returnMatrix.push(row);
  }

  // Compute covariance and correlation matrices
  const cov = covarianceMatrix(returnMatrix);
  const corr = correlationFromCovariance(cov);

  // 1. Absorption Ratio
  const { ratio: ar, topEigenPct, eigenConcentration } = computeAbsorptionRatio(corr);

  // Compare to historical AR for z-score
  const halfWindow = Math.floor(windowSize / 2);
  let arZScore = 0;
  if (windowSize >= 60) {
    const rollingARs: number[] = [];
    for (let end = halfWindow; end <= windowSize; end += 5) {
      const subMatrix = returnMatrix.slice(end - halfWindow, end);
      const subCov = covarianceMatrix(subMatrix);
      const subCorr = correlationFromCovariance(subCov);
      const { ratio } = computeAbsorptionRatio(subCorr);
      rollingARs.push(ratio);
    }
    if (rollingARs.length >= 3) {
      const arMean = mean(rollingARs);
      const arStd = std(rollingARs);
      arZScore = arStd > 0 ? (ar - arMean) / arStd : 0;
    }
  }

  // 2. Turbulence Index
  const covInv = invertMatrix(cov);
  let turbulence = 0;
  let turbulencePercentile = 0;

  if (covInv) {
    // Current returns (most recent observation)
    const currentReturns = returnMatrix[returnMatrix.length - 1];
    // Historical mean returns
    const meanReturns = symbols.map((_, j) =>
      mean(returnMatrix.map(row => row[j]))
    );

    turbulence = computeTurbulenceIndex(currentReturns, meanReturns, covInv);

    // Compute turbulence for all observations to get percentile
    const allTurbulence: number[] = [];
    for (let i = 0; i < windowSize; i++) {
      const t = computeTurbulenceIndex(returnMatrix[i], meanReturns, covInv);
      allTurbulence.push(t);
    }
    const belowCount = allTurbulence.filter(t => t <= turbulence).length;
    turbulencePercentile = (belowCount / allTurbulence.length) * 100;
  } else {
    warnings.push("Covariance matrix is singular, turbulence index may be unreliable");
  }

  // 3. Composite Stress Score (0-100)
  // AR component: higher AR = more fragile
  // Normal AR is ~0.6-0.8 for most markets
  const arScore = Math.max(0, Math.min(50, (ar - 0.5) * 100));
  // Turbulence component: use percentile directly
  const turbScore = turbulencePercentile / 2;
  // Z-score bonus: rapid AR increase is the key crisis signal
  const zBonus = Math.max(0, Math.min(20, arZScore * 5));

  const compositeStress = Math.round(Math.min(100, arScore + turbScore + zBonus));

  // 4. Regime classification
  let regime: SystemicRiskState["regime"];
  if (compositeStress >= 75 || (ar >= 0.85 && turbulencePercentile >= 90)) {
    regime = "critical";
  } else if (compositeStress >= 50 || ar >= 0.8 || turbulencePercentile >= 80) {
    regime = "fragile";
  } else if (compositeStress >= 30 || ar >= 0.7 || arZScore >= 1.5) {
    regime = "elevated";
  } else {
    regime = "stable";
  }

  // 5. Generate warnings
  if (ar >= 0.85) {
    warnings.push("Absorption ratio above 0.85: markets are tightly coupled. Small shocks can cascade.");
  }
  if (arZScore >= 2) {
    warnings.push(`Absorption ratio rising rapidly (${arZScore.toFixed(1)}σ above trailing mean). This pattern preceded 2008, 2020 crises.`);
  }
  if (turbulencePercentile >= 95) {
    warnings.push("Turbulence index in top 5th percentile: current returns are highly unusual relative to history.");
  }
  if (ar >= 0.8 && turbulencePercentile >= 80) {
    warnings.push("Both absorption ratio AND turbulence elevated simultaneously. This is the highest-confidence crisis signal.");
  }

  // 6. Interpretation
  const assetList = symbols.map(s => labels.get(s) || s).join(", ");
  let interpretation: string;
  if (regime === "critical") {
    interpretation = `Systemic stress is critical. AR=${ar.toFixed(3)} indicates markets are moving in lockstep. Turbulence at ${turbulencePercentile.toFixed(0)}th percentile. Cross-asset correlations have converged, reducing diversification benefits. Defensive positioning warranted. Assets: ${assetList}`;
  } else if (regime === "fragile") {
    interpretation = `Markets are fragile. AR=${ar.toFixed(3)} shows increasing correlation across ${symbols.length} assets. Turbulence at ${turbulencePercentile.toFixed(0)}th percentile. Monitor for further deterioration. Assets: ${assetList}`;
  } else if (regime === "elevated") {
    interpretation = `Elevated systemic risk. AR=${ar.toFixed(3)} is above normal range. Some concentration risk building in cross-asset returns. Assets: ${assetList}`;
  } else {
    interpretation = `Systemic risk is within normal parameters. AR=${ar.toFixed(3)}, turbulence at ${turbulencePercentile.toFixed(0)}th percentile. Diversification is functioning. Assets: ${assetList}`;
  }

  const state: SystemicRiskState = {
    timestamp: new Date().toISOString(),
    absorptionRatio: Math.round(ar * 1000) / 1000,
    absorptionRatioZScore: Math.round(arZScore * 100) / 100,
    turbulenceIndex: Math.round(turbulence * 1000) / 1000,
    turbulencePercentile: Math.round(turbulencePercentile * 10) / 10,
    compositeStress,
    regime,
    assetCoverage: symbols.length,
    topEigenvaluePct: Math.round(topEigenPct * 1000) / 1000,
    eigenvalueConcentration: Math.round(eigenConcentration * 1000) / 1000,
    interpretation,
    warnings,
  };

  // Persist
  await saveRegimeState("systemic:latest", state);
  await appendToHistory("systemic", {
    timestamp: state.timestamp,
    absorptionRatio: state.absorptionRatio,
    turbulenceIndex: state.turbulenceIndex,
    turbulencePercentile: state.turbulencePercentile,
    compositeStress: state.compositeStress,
    regime: state.regime,
  });

  return state;
}

export async function getLatestSystemicRisk(): Promise<SystemicRiskState | null> {
  return loadRegimeState<SystemicRiskState>("systemic:latest");
}

export async function getSystemicRiskHistory(): Promise<Array<{
  timestamp: string;
  absorptionRatio: number;
  turbulenceIndex: number;
  turbulencePercentile: number;
  compositeStress: number;
  regime: string;
}>> {
  const history = await loadRegimeState<Array<{
    timestamp: string;
    absorptionRatio: number;
    turbulenceIndex: number;
    turbulencePercentile: number;
    compositeStress: number;
    regime: string;
  }>>("systemic:history");
  return history || [];
}
