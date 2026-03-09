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

export interface RegimeSegment {
  startDate: string;
  endDate: string;
  duration: number; // days
  mean: number;
  std: number;
  trend: number; // slope, positive = upward
  minVal: number;
  maxVal: number;
  label: string; // human-readable: "high-vol uptrend", "stable range", etc.
}

export interface PredictiveBounds {
  mean: number;
  std: number;
  upper1Sigma: number;
  lower1Sigma: number;
  upper2Sigma: number;
  lower2Sigma: number;
}

export interface RunLengthDist {
  runLengths: number[];
  probabilities: number[];
  mapRunLength: number;
  stabilityScore: number; // 0-1, how concentrated the posterior is
}

export interface Coincidence {
  date: string; // center date
  streams: string[];
  changePoints: ChangePoint[];
  severity: "moderate" | "significant" | "critical"; // 2 streams, 3 streams, 4+ streams
}

export interface Sparkline {
  dates: string[];
  values: number[];
}

export interface BOCPDState {
  stream: string;
  label: string;
  currentValue: number | null;
  currentRunLength: number;
  lastChangePoint: ChangePoint | null;
  changePoints: ChangePoint[];
  regimeSegments: RegimeSegment[];
  predictive: PredictiveBounds | null;
  runLengthDist: RunLengthDist | null;
  sparkline: Sparkline;
  error?: string; // set when data fetch failed (rate limit, network, etc.)
}

export interface BOCPDSnapshot {
  streams: BOCPDState[];
  recentChangePoints: ChangePoint[];
  coincidences: Coincidence[];
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
  runLengthDist: RunLengthDist;
  predictive: PredictiveBounds | null;
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
    return {
      changePoints: [],
      finalRunLength: 0,
      runLengthDist: { runLengths: [], probabilities: [], mapRunLength: 0, stabilityScore: 0 },
      predictive: null,
    };
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

  // Build run-length distribution (top 50 entries for compactness)
  const rlDist: { rl: number; p: number }[] = [];
  for (let r = 0; r < R.length; r++) {
    if (R[r] > 1e-6) rlDist.push({ rl: r, p: R[r] });
  }
  rlDist.sort((a, b) => b.p - a.p);
  const topRL = rlDist.slice(0, 50);

  // Stability score: how concentrated is the posterior? Shannon entropy based.
  let entropy = 0;
  for (let r = 0; r < R.length; r++) {
    if (R[r] > 1e-12) entropy -= R[r] * Math.log(R[r]);
  }
  const maxEntropy = Math.log(Math.max(R.length, 2));
  const stabilityScore = maxEntropy > 0 ? Math.max(0, 1 - entropy / maxEntropy) : 1;

  const runLengthDist: RunLengthDist = {
    runLengths: topRL.map((d) => d.rl),
    probabilities: topRL.map((d) => Math.round(d.p * 10000) / 10000),
    mapRunLength,
    stabilityScore: Math.round(stabilityScore * 1000) / 1000,
  };

  // Predictive bounds from the MAP run-length's sufficient statistics
  let predictive: PredictiveBounds | null = null;
  if (suffStats.length > 0) {
    // Find the stats corresponding to the MAP run length
    const mapStats = mapRunLength < suffStats.length ? suffStats[mapRunLength] : suffStats[suffStats.length - 1];
    if (mapStats && mapStats.count >= 3) {
      const mu = mapStats.mean;
      const sigma2 = mapStats.var / (mapStats.count - 1);
      const sigma = Math.sqrt(sigma2 * (1 + 1 / mapStats.count));
      predictive = {
        mean: Math.round(mu * 100) / 100,
        std: Math.round(sigma * 100) / 100,
        upper1Sigma: Math.round((mu + sigma) * 100) / 100,
        lower1Sigma: Math.round((mu - sigma) * 100) / 100,
        upper2Sigma: Math.round((mu + 2 * sigma) * 100) / 100,
        lower2Sigma: Math.round((mu - 2 * sigma) * 100) / 100,
      };
    }
  }

  return { changePoints, finalRunLength: mapRunLength, runLengthDist, predictive };
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
): Promise<{ values: number[]; dates: string[]; currentValue: number | null; error?: string }> {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[BOCPD] Failed to fetch ${config.key} (${config.symbol}): ${msg}`);
    return { values: [], dates: [], currentValue: null, error: msg };
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
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours - daily data doesn't change frequently

// Alpha Vantage daily data cache is 5min in the AV module.
// We fetch all streams in parallel and let AV cache + our 4hr BOCPD cache handle rate limits.
// Streams that get rate-limited show error state rather than blocking everything.

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

  const allChangePoints: ChangePoint[] = [];

  // Fetch all streams in parallel - AV cache handles dedup, failures show error state
  const fetchResults = await Promise.all(
    configs.map(async (config) => {
      const { values, dates, currentValue, error } = await fetchStreamData(config, apiKey);
      return { config, values, dates, currentValue, error };
    })
  );

  const streams: BOCPDState[] = fetchResults.map(({ config, values, dates, currentValue, error }) => {
    if (values.length < 10) {
      return {
        stream: config.key,
        label: config.label,
        currentValue,
        currentRunLength: 0,
        lastChangePoint: null,
        changePoints: [],
        regimeSegments: [],
        predictive: null,
        runLengthDist: null,
        sparkline: { dates: [], values: [] },
        error: error || (values.length === 0 ? "No data available" : undefined),
      };
    }

    const result = runBOCPD(values, dates, config.key);

    const lastCP =
      result.changePoints.length > 0
        ? result.changePoints[result.changePoints.length - 1]
        : null;

    const regimeSegments = buildRegimeSegments(result.changePoints, values, dates);

    const sparklineLen = Math.min(90, values.length);
    const sparkline: Sparkline = {
      dates: dates.slice(-sparklineLen),
      values: values.slice(-sparklineLen),
    };

    allChangePoints.push(...result.changePoints);

    return {
      stream: config.key,
      label: config.label,
      currentValue,
      currentRunLength: result.finalRunLength,
      lastChangePoint: lastCP,
      changePoints: result.changePoints,
      regimeSegments,
      predictive: result.predictive,
      runLengthDist: result.runLengthDist,
      sparkline,
    };
  });

  // Sort recent change-points by date descending
  const recentChangePoints = allChangePoints
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);

  // Detect cross-stream coincidences (CPs within 5-day windows)
  const coincidences = detectCoincidences(allChangePoints, 5);

  const snapshot: BOCPDSnapshot = {
    streams,
    recentChangePoints,
    coincidences,
    activeRegimes: streams.filter((s) => s.changePoints.length > 0).length,
    generatedAt: new Date().toISOString(),
  };

  // Cache full snapshots
  if (!streamFilter) {
    snapshotCache = { data: snapshot, expiry: Date.now() + CACHE_TTL_MS };
  }

  return snapshot;
}

// ---------------------------------------------------------------------------
// Regime segment builder
// ---------------------------------------------------------------------------

function buildRegimeSegments(
  changePoints: ChangePoint[],
  values: number[],
  dates: string[]
): RegimeSegment[] {
  if (values.length === 0 || dates.length === 0) return [];

  // Build date-to-index map
  const dateIndex = new Map<string, number>();
  for (let i = 0; i < dates.length; i++) dateIndex.set(dates[i], i);

  // Segment boundaries: [0, cp1, cp2, ..., end]
  const boundaries: number[] = [0];
  for (const cp of changePoints) {
    const idx = dateIndex.get(cp.date);
    if (idx !== undefined && idx > boundaries[boundaries.length - 1]) {
      boundaries.push(idx);
    }
  }
  boundaries.push(values.length);

  const segments: RegimeSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (end - start < 2) continue;

    const segValues = values.slice(start, end);
    const mean = segValues.reduce((a, b) => a + b, 0) / segValues.length;
    const variance = segValues.reduce((a, v) => a + (v - mean) ** 2, 0) / segValues.length;
    const std = Math.sqrt(variance);
    const minVal = Math.min(...segValues);
    const maxVal = Math.max(...segValues);

    // Linear regression slope for trend
    const n = segValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < n; j++) {
      sumX += j;
      sumY += segValues[j];
      sumXY += j * segValues[j];
      sumX2 += j * j;
    }
    const denom = n * sumX2 - sumX * sumX;
    const trend = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

    // Classify regime
    const volLevel = std / Math.abs(mean || 1);
    const trendStr = Math.abs(trend) < std * 0.05 ? "sideways" : trend > 0 ? "uptrend" : "downtrend";
    const volStr = volLevel > 0.03 ? "high-vol" : volLevel > 0.01 ? "moderate-vol" : "low-vol";
    const label = `${volStr} ${trendStr}`;

    segments.push({
      startDate: dates[start],
      endDate: dates[Math.min(end - 1, dates.length - 1)],
      duration: end - start,
      mean: Math.round(mean * 100) / 100,
      std: Math.round(std * 100) / 100,
      trend: Math.round(trend * 10000) / 10000,
      minVal: Math.round(minVal * 100) / 100,
      maxVal: Math.round(maxVal * 100) / 100,
      label,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Cross-stream coincidence detection
// ---------------------------------------------------------------------------

function detectCoincidences(allCPs: ChangePoint[], windowDays: number): Coincidence[] {
  if (allCPs.length === 0) return [];

  // Sort by date
  const sorted = [...allCPs].sort((a, b) => a.date.localeCompare(b.date));

  const coincidences: Coincidence[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    const cluster: ChangePoint[] = [sorted[i]];
    const clusterStreams = new Set<string>([sorted[i].dataStream]);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const dayDiff = Math.abs(
        (new Date(sorted[j].date).getTime() - new Date(sorted[i].date).getTime()) / 86400000
      );
      if (dayDiff <= windowDays && !clusterStreams.has(sorted[j].dataStream)) {
        cluster.push(sorted[j]);
        clusterStreams.add(sorted[j].dataStream);
        used.add(j);
      }
    }

    if (clusterStreams.size >= 2) {
      used.add(i);
      const severity: Coincidence["severity"] =
        clusterStreams.size >= 4 ? "critical" :
        clusterStreams.size >= 3 ? "significant" :
        "moderate";

      coincidences.push({
        date: sorted[i].date,
        streams: Array.from(clusterStreams),
        changePoints: cluster,
        severity,
      });
    }
  }

  return coincidences.sort((a, b) => b.date.localeCompare(a.date));
}
