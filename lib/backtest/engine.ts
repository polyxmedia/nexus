import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { generateSignals } from "../signals/engine";
import { getHistoricalData, getHistoricalDataRange } from "../market-data/yahoo";
import { invalidateBacktestCache } from "./feedback-loops";

// Unified bar type matching yahoo output
interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
import { getModel } from "@/lib/ai/model";
import type {
  BacktestConfig,
  BacktestPrediction,
  BacktestRun,
  BacktestResults,
  BacktestLogEntry,
  CalibrationBucket,
  WalkForwardFold,
  WalkForwardResults,
  RegimeStats,
  CostSensitivityResult,
} from "./types";

// ── In-memory cache for actively running backtests (fast progress polling) ──
// Completed runs are read from DB. On server restart, only DB runs survive.
const activeRuns = new Map<string, BacktestRun>();

// ── DB helpers ──

async function dbInsertRun(run: BacktestRun): Promise<void> {
  await db.execute(sql`
    INSERT INTO backtest_runs (id, config, status, progress, progress_message, predictions, results, error, created_at, completed_at)
    VALUES (
      ${run.id},
      ${JSON.stringify(run.config)}::jsonb,
      ${run.status},
      ${run.progress},
      ${run.progressMessage},
      '[]'::jsonb,
      ${run.results ? JSON.stringify(run.results) : null}::jsonb,
      ${run.error ?? null},
      ${run.createdAt}::timestamptz,
      ${run.completedAt ?? null}
    )
  `);
}

async function dbUpdateRunProgress(run: BacktestRun): Promise<void> {
  await db.execute(sql`
    UPDATE backtest_runs SET
      status = ${run.status},
      progress = ${run.progress},
      progress_message = ${run.progressMessage},
      error = ${run.error ?? null}
    WHERE id = ${run.id}
  `);
}

async function dbFinaliseRun(run: BacktestRun): Promise<void> {
  await db.execute(sql`
    UPDATE backtest_runs SET
      status = ${run.status},
      progress = ${run.progress},
      progress_message = ${run.progressMessage},
      predictions = ${JSON.stringify(run.predictions)}::jsonb,
      results = ${run.results ? JSON.stringify(run.results) : null}::jsonb,
      logs = ${JSON.stringify(run.logs || [])}::jsonb,
      error = ${run.error ?? null},
      completed_at = ${run.completedAt ?? null}
    WHERE id = ${run.id}
  `);
}

type DbRow = {
  id: string;
  config: BacktestConfig;
  status: BacktestRun["status"];
  progress: number;
  progress_message: string;
  predictions: BacktestPrediction[];
  results: BacktestResults | null;
  logs?: BacktestLogEntry[] | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  published?: boolean;
  publish_slug?: string | null;
};

function rowToRun(row: DbRow): BacktestRun {
  // JSONB columns may come back as strings from raw SQL queries
  const config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
  const predictions = typeof row.predictions === "string" ? JSON.parse(row.predictions) : row.predictions;
  const results = typeof row.results === "string" ? JSON.parse(row.results) : row.results;
  const logs = row.logs ? (typeof row.logs === "string" ? JSON.parse(row.logs) : row.logs) : [];

  return {
    id: row.id,
    config: config as BacktestConfig,
    status: row.status as BacktestRun["status"],
    progress: Number(row.progress),
    progressMessage: row.progress_message || "",
    predictions: (predictions as BacktestPrediction[]) ?? [],
    results: results ?? undefined,
    logs: (logs as BacktestLogEntry[]) ?? [],
    error: row.error ?? undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    completedAt: row.completed_at ? (typeof row.completed_at === "string" ? row.completed_at : new Date(row.completed_at).toISOString()) : undefined,
    published: !!row.published,
    publishSlug: row.publish_slug ?? undefined,
  };
}

export async function getBacktestRun(id: string): Promise<BacktestRun | undefined> {
  // Active in-memory run (fast path for polling during execution)
  if (activeRuns.has(id)) return activeRuns.get(id);

  // Fallback to DB (completed/old runs, or after server restart)
  try {
    const rows = await db.execute(sql`SELECT * FROM backtest_runs WHERE id = ${id} LIMIT 1`);
    if (rows.rows.length === 0) return undefined;
    return rowToRun(rows.rows[0] as DbRow);
  } catch {
    return undefined;
  }
}

export async function getAllBacktestRuns(): Promise<BacktestRun[]> {
  try {
    const rows = await db.execute(sql`SELECT id, config, status, progress, progress_message, predictions, results, logs, error, created_at, completed_at, published, publish_slug FROM backtest_runs ORDER BY created_at DESC LIMIT 50`);
    const dbRuns = (rows.rows as DbRow[]).map(rowToRun);

    // Merge: active in-memory runs override DB for the same ID (fresher progress)
    const seen = new Set<string>();
    const merged: BacktestRun[] = [];

    for (const run of activeRuns.values()) {
      seen.add(run.id);
      merged.push(run);
    }

    for (const run of dbRuns) {
      if (!seen.has(run.id)) merged.push(run);
    }

    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    // DB unavailable — fall back to in-memory only
    return Array.from(activeRuns.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// ── Historical price cache (persists across runs) ──
const priceCache = new Map<string, DailyBar[]>();

async function getHistoricalPrices(
  symbol: string,
  startDate?: string,
  endDate?: string
): Promise<DailyBar[]> {
  const cacheKey = `${symbol}:${startDate || ""}:${endDate || ""}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey)!;

  try {
    // Use date-range fetch for backtests, period-based for general use
    const data = startDate
      ? await getHistoricalDataRange(symbol, startDate, endDate)
      : await getHistoricalData(symbol, "5y");
    priceCache.set(cacheKey, data);
    return data;
  } catch (e) {
    console.error(`Failed to fetch historical data for ${symbol}:`, e);
    return [];
  }
}

function getPriceOnDate(
  bars: DailyBar[],
  targetDate: string
): DailyBar | undefined {
  // Find exact date or nearest prior trading day
  const target = new Date(targetDate).getTime();
  let closest: DailyBar | undefined;
  let closestDiff = Infinity;

  for (const bar of bars) {
    const barTime = new Date(bar.date).getTime();
    if (barTime <= target) {
      const diff = target - barTime;
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = bar;
      }
    }
  }

  // Only return if within 5 trading days
  if (closest && closestDiff <= 5 * 24 * 60 * 60 * 1000) {
    return closest;
  }
  return undefined;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── VIX regime classification ──
// Uses VIX ETF (VIXY) or ^VIX as proxy. Falls back to realized volatility.

function classifyRegime(bars: DailyBar[], date: string): string {
  const available = bars.filter(b => b.date <= date).sort((a, b) => b.date.localeCompare(a.date));
  if (available.length < 20) return "unknown";

  // Use 20-day realized volatility of the instrument as proxy
  const window = available.slice(0, 20);
  const returns: number[] = [];
  for (let i = 0; i < window.length - 1; i++) {
    returns.push(Math.log(window[i].close / window[i + 1].close));
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const annualizedVol = Math.sqrt(variance * 252) * 100;

  if (annualizedVol < 12) return "low_vol";
  if (annualizedVol < 20) return "normal";
  if (annualizedVol < 35) return "elevated";
  return "crisis";
}

// ── Main backtest execution ──

export async function startBacktest(config: BacktestConfig): Promise<string> {
  const id = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const run: BacktestRun = {
    id,
    config,
    status: "pending",
    progress: 0,
    progressMessage: "Initialising backtest...",
    predictions: [],
    logs: [],
    createdAt: new Date().toISOString(),
  };

  // Persist to DB immediately so the run survives server restarts
  await dbInsertRun(run);

  // Also keep in active-runs cache for fast polling during execution
  activeRuns.set(id, run);

  // Run async - don't await
  executeBacktest(run).catch(async (err) => {
    run.status = "failed";
    run.error = err.message;
    await dbUpdateRunProgress(run).catch((e) => console.error("[Backtest] failed to persist error state:", e));
    activeRuns.delete(id);
  });

  return id;
}

async function executeBacktest(run: BacktestRun): Promise<void> {
  const { config } = run;
  const id = run.id;

  // Helper: append a timestamped log line (kept in memory, returned on poll)
  const log = (message: string, level: BacktestLogEntry["level"] = "info") => {
    if (!run.logs) run.logs = [];
    run.logs.push({ timestamp: new Date().toISOString(), message, level });
  };

  // Helper: persist current phase to DB (non-blocking, best-effort)
  const flushPhase = () => dbUpdateRunProgress(run).catch((err) => console.error("[Backtest] phase progress flush failed:", err));

  // Get Anthropic key — DB settings first, then env fallback
  const anthropicKey =
    (await getSettingValue("anthropic_api_key")) ||
    process.env.ANTHROPIC_API_KEY ||
    null;

  if (!anthropicKey) {
    throw new Error("Missing Anthropic API key (set ANTHROPIC_API_KEY in .env.local or add it in Settings)");
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  const model = await getModel();

  log(`Backtest ${id} initialised`);
  log(`Config: ${config.startDate} to ${config.endDate}, threshold=${config.convergenceThreshold}`);
  log(`Instruments: ${config.instruments.join(", ")}`);
  log(`Timeframes: ${config.timeframes.map(t => `${t}d`).join(", ")}`);
  log(`Model: ${model}`);

  // ── Phase 1: Collect historical market data ──
  run.status = "collecting_data";
  run.progressMessage = "Fetching historical market data...";
  run.progress = 5;
  await flushPhase();

  log("--- PHASE 1: COLLECTING MARKET DATA ---");

  // Fetch all instruments in parallel — Yahoo Finance has no rate limits
  // Use full backtest date range (+ buffer for timeframe validation)
  const maxTimeframe = Math.max(...config.timeframes, 30);
  const fetchEndDate = addDays(config.endDate, maxTimeframe + 7); // buffer for validation window
  const priceData: Record<string, DailyBar[]> = {};
  run.progressMessage = `Fetching historical data for ${config.instruments.length} instruments (${config.startDate} to ${fetchEndDate})...`;
  log(`Fetching ${config.instruments.length} instruments (${config.startDate} to ${fetchEndDate})...`);
  const fetches = await Promise.allSettled(
    config.instruments.map((symbol) => getHistoricalPrices(symbol, config.startDate, fetchEndDate))
  );
  fetches.forEach((result, i) => {
    const symbol = config.instruments[i];
    if (result.status === "fulfilled") {
      priceData[symbol] = result.value;
      log(`  ${symbol}: ${result.value.length} daily bars loaded`, "success");
    } else {
      priceData[symbol] = [];
      log(`  ${symbol}: FAILED to fetch data`, "error");
    }
  });

  // ── Phase 2: Generate signals for all years ──
  // NOTE: Signal engine uses only deterministic calendar/celestial events and
  // recurring geopolitical patterns (OPEC meetings, UN sessions, etc.).
  // No reactive/news-based signals are used, so no look-ahead bias.
  run.status = "generating_signals";
  run.progress = 15;
  await flushPhase();

  log("--- PHASE 2: GENERATING SIGNALS ---");

  const startYear = new Date(config.startDate).getFullYear();
  const endYear = new Date(config.endDate).getFullYear();
  const allConvergences: Array<{
    date: string;
    intensity: number;
    layers: string[];
    description: string;
    title: string;
    category: string;
  }> = [];

  for (let year = startYear; year <= endYear; year++) {
    run.progressMessage = `Generating signals for ${year}...`;
    log(`Scanning ${year} for convergence events...`);
    const result = generateSignals(year);

    let yearCount = 0;
    for (const signal of result.signals) {
      if (signal.intensity >= config.convergenceThreshold) {
        const layers = typeof signal.layers === "string"
          ? JSON.parse(signal.layers)
          : signal.layers;

        allConvergences.push({
          date: signal.date,
          intensity: signal.intensity,
          layers,
          description: signal.description,
          title: signal.title,
          category: signal.category,
        });
        yearCount++;
      }
    }
    log(`  ${year}: ${result.signals.length} total signals, ${yearCount} above threshold (>=${config.convergenceThreshold})`, yearCount > 0 ? "success" : "warn");
  }

  // Sort by date
  allConvergences.sort((a, b) => a.date.localeCompare(b.date));

  // Filter to config date range
  const convergencesInRange = allConvergences.filter(
    (c) => c.date >= config.startDate && c.date <= config.endDate
  );

  run.progressMessage = `Found ${convergencesInRange.length} convergence events above threshold...`;
  log(`Total convergences in range: ${convergencesInRange.length}`, "success");

  // ── Phase 3: Simulate - generate predictions at each convergence ──
  run.status = "simulating";
  run.progress = 25;
  await flushPhase();

  log("--- PHASE 3: SIMULATING PREDICTIONS ---");
  log(`Generating AI predictions for ${convergencesInRange.length} convergence events...`);

  const totalSteps = convergencesInRange.length;

  for (let i = 0; i < totalSteps; i++) {
    const convergence = convergencesInRange[i];
    const pct = 25 + Math.round((i / totalSteps) * 45);
    run.progress = pct;
    run.progressMessage = `Generating prediction ${i + 1}/${totalSteps} (${convergence.date})...`;

    log(`[${i + 1}/${totalSteps}] ${convergence.date} | intensity=${convergence.intensity} | ${convergence.layers.join("+")} | "${convergence.title}"`);

    // Get market context up to this date only (TIME-GATED)
    const marketContext = buildMarketContext(
      priceData,
      convergence.date,
      config.instruments
    );

    // Get recent convergences before this date for context
    const priorConvergences = allConvergences
      .filter((c) => c.date < convergence.date)
      .slice(-5);

    try {
      const prediction = await generateBacktestPrediction(
        client,
        model,
        convergence,
        marketContext,
        priorConvergences,
        config.instruments,
        config.timeframes
      );

      if (prediction) {
        // Attach price at prediction time
        prediction.priceAtPrediction = {};
        for (const symbol of prediction.instruments) {
          const bars = priceData[symbol];
          if (bars) {
            const bar = getPriceOnDate(bars, convergence.date);
            if (bar) prediction.priceAtPrediction[symbol] = bar.close;
          }
        }

        run.predictions.push(prediction);
        log(`  -> ${prediction.direction.toUpperCase()} ${prediction.instruments.join(",")} (${(prediction.confidence * 100).toFixed(0)}% conf, ${prediction.timeframeDays}d)`, "success");
      } else {
        log(`  -> No prediction generated (skipped)`, "warn");
      }
    } catch (err) {
      console.error(`Prediction generation failed for ${convergence.date}:`, err);
      log(`  -> ERROR: ${(err as Error).message}`, "error");
    }

    // Rate limit Claude API
    await sleep(2000);
  }

  log(`Simulation complete: ${run.predictions.length} predictions generated from ${totalSteps} convergences`);

  // ── Phase 4: Validate predictions against actual outcomes ──
  run.status = "validating";
  run.progress = 70;
  await flushPhase();

  log("--- PHASE 4: VALIDATING AGAINST ACTUALS ---");

  // Compute climatological baseline: what % of the time does each instrument go up?
  const climatologicalUp = computeClimatologicalBaseline(priceData, config);
  log(`Climatological baseline (naive bullish): ${(climatologicalUp * 100).toFixed(1)}%`);

  for (let i = 0; i < run.predictions.length; i++) {
    const pred = run.predictions[i];
    run.progressMessage = `Validating prediction ${i + 1}/${run.predictions.length}...`;
    run.progress = 70 + Math.round((i / run.predictions.length) * 15);

    const validationDate = addDays(pred.predictionDate, pred.timeframeDays);

    // Check we have price data for validation
    pred.priceAtValidation = {};
    pred.actualReturn = {};
    let anyValidated = false;

    for (const symbol of pred.instruments) {
      const bars = priceData[symbol];
      if (!bars) continue;

      const predBar = getPriceOnDate(bars, pred.predictionDate);
      const valBar = getPriceOnDate(bars, validationDate);

      if (predBar && valBar) {
        pred.priceAtValidation[symbol] = valBar.close;
        const ret = (valBar.close - predBar.close) / predBar.close;
        pred.actualReturn[symbol] = ret;
        anyValidated = true;
      }
    }

    if (anyValidated) {
      pred.validationDate = validationDate;

      // Determine if direction was correct
      const avgReturn = Object.values(pred.actualReturn).reduce(
        (sum, r) => sum + r,
        0
      ) / Object.values(pred.actualReturn).length;

      if (pred.direction === "bullish") {
        pred.directionCorrect = avgReturn > 0;
      } else if (pred.direction === "bearish") {
        pred.directionCorrect = avgReturn < 0;
      } else {
        // Neutral: correct if abs return < 1%
        pred.directionCorrect = Math.abs(avgReturn) < 0.01;
      }

      // Pure Brier score: (confidence - outcome)^2
      // No "partial" category, strict binary outcome per Brier (1950)
      const outcome = pred.directionCorrect ? 1 : 0;
      pred.brierScore = Math.pow(pred.confidence - outcome, 2);
      pred.outcome = pred.directionCorrect ? "confirmed" : "denied";

      const avgRet = Object.values(pred.actualReturn).reduce((s, r) => s + r, 0) / Object.values(pred.actualReturn).length;
      log(`  [${i + 1}/${run.predictions.length}] ${pred.predictionDate} ${pred.direction} -> ${pred.outcome === "confirmed" ? "CORRECT" : "WRONG"} (actual ${(avgRet * 100).toFixed(2)}%, brier=${pred.brierScore.toFixed(4)})`, pred.outcome === "confirmed" ? "success" : "warn");
    } else {
      log(`  [${i + 1}/${run.predictions.length}] ${pred.predictionDate} -> no price data for validation`, "warn");
    }
  }

  // ── Phase 5: Statistical analysis ──
  run.status = "analyzing";
  run.progress = 85;
  run.progressMessage = "Computing statistical analysis...";
  await flushPhase();

  log("--- PHASE 5: STATISTICAL ANALYSIS ---");

  const validatedCount = run.predictions.filter(p => p.outcome).length;
  const correctCount = run.predictions.filter(p => p.outcome === "confirmed").length;
  log(`Validated: ${validatedCount}/${run.predictions.length} predictions`);
  log(`Raw accuracy: ${validatedCount > 0 ? ((correctCount / validatedCount) * 100).toFixed(1) : "N/A"}% (${correctCount}/${validatedCount})`);

  const results = computeResults(run.predictions, config, priceData, climatologicalUp);

  log(`Brier score: ${results.brierScore.toFixed(4)} (random=${results.randomBaseline?.brierScore.toFixed(4)})`);
  log(`Directional accuracy: ${(results.directionalAccuracy * 100).toFixed(1)}% (random=${(results.randomBaseline?.directionalAccuracy * 100).toFixed(1)}%)`);
  log(`p-value: ${results.pValue < 0.001 ? "<0.001" : results.pValue.toFixed(4)} ${results.significant ? "(SIGNIFICANT)" : "(not significant)"}`, results.significant ? "success" : "warn");
  log(`Calibration gap: ${(results.calibrationGap * 100).toFixed(1)}pp`);

  if (results.walkForward) {
    log(`Walk-forward OOS accuracy: ${(results.walkForward.oosAccuracy * 100).toFixed(1)}%`);
    log(`Temporal stability ratio: ${results.walkForward.overfitRatio.toFixed(2)}`);
  }

  // Generate AI analysis
  run.progressMessage = "Generating AI analysis of results...";
  log("Generating AI analysis of backtest results...");
  try {
    results.aiAnalysis = await generateAiAnalysis(
      client,
      model,
      results,
      config
    );
    log("AI analysis complete", "success");
  } catch (err) {
    console.error("AI analysis failed:", err);
    log(`AI analysis failed: ${(err as Error).message}`, "error");
  }

  run.results = results;
  run.status = "complete";
  run.progress = 100;
  run.progressMessage = "Backtest complete.";
  run.completedAt = new Date().toISOString();
  log("--- BACKTEST COMPLETE ---", "success");
  log(`Duration: ${((Date.now() - new Date(run.createdAt).getTime()) / 1000).toFixed(0)}s`);

  // Persist full results (predictions + results JSON) to DB
  await dbFinaliseRun(run).catch((err) => console.error("[Backtest] finalise run persist failed:", err));

  // Invalidate feedback loop cache so downstream systems pick up new results
  invalidateBacktestCache();

  // Remove from active cache — future reads come from DB
  activeRuns.delete(id);
}

// ── Publish / unpublish a backtest run ──

export async function publishBacktestRun(id: string): Promise<string> {
  // Generate a short slug for the public URL
  const slug = `bt-${id.split("_")[1] || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await db.execute(sql`
    UPDATE backtest_runs SET published = true, publish_slug = ${slug}
    WHERE id = ${id}
  `);

  return slug;
}

export async function unpublishBacktestRun(id: string): Promise<void> {
  await db.execute(sql`
    UPDATE backtest_runs SET published = false, publish_slug = NULL
    WHERE id = ${id}
  `);
}

export async function getPublishedBacktestBySlug(slug: string): Promise<BacktestRun | undefined> {
  try {
    const rows = await db.execute(
      sql`SELECT * FROM backtest_runs WHERE publish_slug = ${slug} AND published = true LIMIT 1`
    );
    if (rows.rows.length === 0) return undefined;
    const row = rows.rows[0] as DbRow & { published?: boolean; publish_slug?: string };
    const run = rowToRun(row);
    run.published = true;
    run.publishSlug = slug;
    return run;
  } catch {
    return undefined;
  }
}

// ── Climatological baseline ──
// Computes the historical frequency of positive returns for the instruments
// at the relevant timeframes. A naive "always bullish" strategy would achieve
// this accuracy without any signal intelligence.

function computeClimatologicalBaseline(
  priceData: Record<string, DailyBar[]>,
  config: BacktestConfig
): number {
  let totalObs = 0;
  let totalUp = 0;

  for (const symbol of config.instruments) {
    const bars = priceData[symbol];
    if (!bars || bars.length < 30) continue;

    // Filter bars within the backtest date range
    const inRange = bars.filter(b => b.date >= config.startDate && b.date <= config.endDate);
    if (inRange.length < 10) continue;

    // Use the median timeframe for baseline calculation
    const tf = config.timeframes[Math.floor(config.timeframes.length / 2)] || 14;

    for (let i = 0; i < inRange.length; i++) {
      const futureDate = addDays(inRange[i].date, tf);
      const futureBar = bars.find(b => b.date >= futureDate);
      if (futureBar) {
        totalObs++;
        if (futureBar.close > inRange[i].close) totalUp++;
      }
    }
  }

  return totalObs > 0 ? totalUp / totalObs : 0.5;
}

// ── Build market context (time-gated) ──

function buildMarketContext(
  priceData: Record<string, DailyBar[]>,
  asOfDate: string,
  instruments: string[]
): string {
  const lines: string[] = [];

  for (const symbol of instruments) {
    const bars = priceData[symbol];
    if (!bars || bars.length === 0) continue;

    // Filter to only data before asOfDate
    const available = bars
      .filter((b) => b.date <= asOfDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // most recent first

    if (available.length === 0) continue;

    const latest = available[0];
    const d30 = available.find(
      (b) => b.date <= addDays(asOfDate, -30)
    );
    const d90 = available.find(
      (b) => b.date <= addDays(asOfDate, -90)
    );

    let context = `${symbol}: $${latest.close.toFixed(2)} (${latest.date})`;

    if (d30) {
      const ret30 = ((latest.close - d30.close) / d30.close * 100).toFixed(1);
      context += ` | 30d: ${Number(ret30) >= 0 ? "+" : ""}${ret30}%`;
    }
    if (d90) {
      const ret90 = ((latest.close - d90.close) / d90.close * 100).toFixed(1);
      context += ` | 90d: ${Number(ret90) >= 0 ? "+" : ""}${ret90}%`;
    }

    lines.push(context);
  }

  return lines.join("\n");
}

// ── AI Prediction Generation (time-gated) ──

async function generateBacktestPrediction(
  client: Anthropic,
  model: string,
  convergence: {
    date: string;
    intensity: number;
    layers: string[];
    description: string;
    title: string;
    category: string;
  },
  marketContext: string,
  priorConvergences: typeof convergence[],
  instruments: string[],
  timeframes: number[]
): Promise<BacktestPrediction | null> {
  const systemPrompt = `You are a geopolitical-market analyst performing a blind backtest simulation.

CRITICAL CONSTRAINT: You are operating as if the current date is ${convergence.date}. You have ZERO knowledge of any events, prices, or outcomes after this date. You must analyse based solely on the information provided.

You are evaluating a signal convergence event and must make a directional prediction about market impact. Be specific, falsifiable, and calibrate your confidence honestly.

Respond with valid JSON only, no markdown wrapping. Schema:
{
  "claim": "A specific, falsifiable prediction",
  "direction": "bullish" | "bearish" | "neutral",
  "instruments": ["SYMBOL1", "SYMBOL2"],
  "confidence": 0.0-1.0,
  "timeframeDays": ${timeframes[0]},
  "category": "market" | "geopolitical" | "mixed",
  "reasoning": "Brief explanation grounded in the signal data"
}

Rules:
- Pick the most appropriate timeframe from: ${timeframes.join(", ")} days
- Instruments must be from: ${instruments.join(", ")}
- Confidence should reflect genuine uncertainty. 0.5 = coin flip. Use the full range.
- Direction must follow from your analysis of the convergence + market context
- Do NOT reference any events after ${convergence.date}`;

  const userPrompt = `CONVERGENCE EVENT (${convergence.date}):
Intensity: ${convergence.intensity}/5
Layers: ${convergence.layers.join(", ")}
Title: ${convergence.title}
Description: ${convergence.description}

MARKET CONTEXT (as of ${convergence.date}):
${marketContext || "No market data available for this date."}

${priorConvergences.length > 0 ? `RECENT PRIOR CONVERGENCES:
${priorConvergences.map((c) => `- ${c.date} (${c.intensity}/5): ${c.title}`).join("\n")}` : "No recent prior convergences."}

Generate a single prediction based on this convergence event.`;

  const response = await client.messages.create({
    model,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      predictionDate: convergence.date,
      convergenceDate: convergence.date,
      convergenceIntensity: convergence.intensity,
      convergenceLayers: convergence.layers,
      convergenceDescription: convergence.description,
      claim: parsed.claim,
      direction: parsed.direction,
      instruments: parsed.instruments || [instruments[0]],
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      timeframeDays: parsed.timeframeDays || timeframes[0],
      category: parsed.category || "mixed",
      reasoning: parsed.reasoning,
    };
  } catch {
    console.error("Failed to parse AI prediction:", text);
    return null;
  }
}

// ── Walk-Forward Temporal Stability Validation ──
// Expanding window: train on [0..k], test on [k+1..k+fold_size]
// NOTE: The LLM is not retrained between folds, so the "overfit ratio" is actually
// a temporal stability ratio. A value < 1 indicates accuracy degrades in later periods
// (regime sensitivity or concept drift), not traditional model overfitting.

function computeWalkForward(
  predictions: BacktestPrediction[],
  foldCount: number = 5
): WalkForwardResults {
  const validated = predictions
    .filter(p => p.outcome !== undefined)
    .sort((a, b) => a.predictionDate.localeCompare(b.predictionDate));

  const n = validated.length;
  if (n < foldCount * 2) {
    // Not enough data for meaningful walk-forward
    return {
      foldCount: 0,
      folds: [],
      oosAccuracy: 0,
      oosBrierScore: 0,
      overfitRatio: 0,
      oosSignificant: false,
      oosPValue: 1,
    };
  }

  const foldSize = Math.floor(n / (foldCount + 1)); // reserve first fold for initial training
  const folds: WalkForwardFold[] = [];

  let allOosCorrect = 0;
  let allOosTotal = 0;
  let allOosBrier = 0;
  let allTrainAccuracy = 0;

  for (let f = 0; f < foldCount; f++) {
    const trainEnd = (f + 1) * foldSize;
    const testStart = trainEnd;
    const testEnd = Math.min(testStart + foldSize, n);

    const trainSet = validated.slice(0, trainEnd);
    const testSet = validated.slice(testStart, testEnd);

    if (testSet.length === 0) continue;

    const trainCorrect = trainSet.filter(p => p.directionCorrect).length;
    const testCorrect = testSet.filter(p => p.directionCorrect).length;
    const trainBrier = trainSet.reduce((s, p) => s + (p.brierScore || 0), 0) / trainSet.length;
    const testBrier = testSet.reduce((s, p) => s + (p.brierScore || 0), 0) / testSet.length;

    const fold: WalkForwardFold = {
      foldIndex: f,
      trainStart: trainSet[0].predictionDate,
      trainEnd: trainSet[trainSet.length - 1].predictionDate,
      testStart: testSet[0].predictionDate,
      testEnd: testSet[testSet.length - 1].predictionDate,
      trainCount: trainSet.length,
      testCount: testSet.length,
      trainAccuracy: trainCorrect / trainSet.length,
      testAccuracy: testCorrect / testSet.length,
      trainBrier,
      testBrier,
    };

    folds.push(fold);
    allOosCorrect += testCorrect;
    allOosTotal += testSet.length;
    allOosBrier += testBrier * testSet.length;
    allTrainAccuracy += fold.trainAccuracy;
  }

  const oosAccuracy = allOosTotal > 0 ? allOosCorrect / allOosTotal : 0;
  const oosBrierScore = allOosTotal > 0 ? allOosBrier / allOosTotal : 0;
  const avgTrainAccuracy = folds.length > 0 ? allTrainAccuracy / folds.length : 0;

  // Temporal stability ratio (labelled overfitRatio for backward compat):
  // OOS / in-sample. < 1 means later periods are less accurate.
  const overfitRatio = avgTrainAccuracy > 0 ? oosAccuracy / avgTrainAccuracy : 0;

  // Statistical significance of OOS accuracy
  const zScore = allOosTotal > 0
    ? (allOosCorrect - allOosTotal * 0.5) / Math.sqrt(allOosTotal * 0.25)
    : 0;
  const oosPValue = 1 - normalCDF(Math.abs(zScore));

  // Wilson CI on OOS accuracy
  const oosAccuracyCI = wilsonInterval(allOosCorrect, allOosTotal);

  return {
    foldCount: folds.length,
    folds,
    oosAccuracy,
    oosBrierScore,
    overfitRatio,
    oosSignificant: oosPValue < 0.05,
    oosPValue,
    oosAccuracyCI,
  };
}

// ── Regime-Conditioned Analysis ──
// Breaks results by volatility regime to test if model only works in benign markets.

function computeRegimeAnalysis(
  predictions: BacktestPrediction[],
  priceData: Record<string, DailyBar[]>
): Record<string, RegimeStats> {
  const validated = predictions.filter(p => p.outcome !== undefined);
  const regimeMap: Record<string, BacktestPrediction[]> = {};

  // Use SPY as the primary regime indicator, fall back to first instrument
  const regimeBars = priceData["SPY"] || priceData[Object.keys(priceData)[0]] || [];

  for (const pred of validated) {
    const regime = classifyRegime(regimeBars, pred.predictionDate);
    if (!regimeMap[regime]) regimeMap[regime] = [];
    regimeMap[regime].push(pred);
  }

  const result: Record<string, RegimeStats> = {};
  for (const [regime, preds] of Object.entries(regimeMap)) {
    const correct = preds.filter(p => p.directionCorrect).length;
    const brierSum = preds.reduce((s, p) => s + (p.brierScore || 0), 0);
    const confSum = preds.reduce((s, p) => s + p.confidence, 0);
    const retSum = preds.reduce((s, p) => {
      const rets = Object.values(p.actualReturn || {});
      return s + (rets.length > 0 ? rets.reduce((a, b) => a + b, 0) / rets.length : 0);
    }, 0);

    result[regime] = {
      regime,
      count: preds.length,
      directionalAccuracy: correct / preds.length,
      brierScore: brierSum / preds.length,
      avgConfidence: confSum / preds.length,
      avgReturn: retSum / preds.length,
    };
  }

  return result;
}

// ── Transaction Cost Sensitivity Analysis ──
// Sweeps cost assumptions from 5bps to 50bps to test robustness of portfolio returns.

function computeCostSensitivity(
  predictions: BacktestPrediction[],
  config: BacktestConfig,
  priceData: Record<string, DailyBar[]>
): CostSensitivityResult[] {
  const costLevels = [5, 10, 15, 20, 30, 50];
  const validated = predictions
    .filter(p => p.outcome !== undefined)
    .sort((a, b) => a.predictionDate.localeCompare(b.predictionDate));

  const startDate = config.startDate;
  const endDate = config.endDate;
  const yearsSpanned =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  const initialCapital = config.initialCapital || 100000;
  const positionSizePct = (config.positionSizePct || 5) / 100;

  return costLevels.map(costBps => {
    const costRate = costBps / 10000;
    let portfolioValue = initialCapital;
    let peak = initialCapital;
    let maxDrawdownPct = 0;
    const dailyReturns: number[] = [];
    const negativeReturns: number[] = [];
    let wins = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    for (const pred of validated) {
      if (!pred.priceAtPrediction || !pred.priceAtValidation || !pred.actualReturn) continue;

      const allocatedUsd = portfolioValue * positionSizePct * pred.confidence;
      const instruments = Object.keys(pred.actualReturn);
      const perInstrumentUsd = allocatedUsd / Math.max(1, instruments.length);

      let tradePnl = 0;
      for (const sym of instruments) {
        const entryPrice = pred.priceAtPrediction[sym];
        const exitPrice = pred.priceAtValidation[sym];
        if (!entryPrice || !exitPrice) continue;

        const shares = perInstrumentUsd / entryPrice;
        const direction = pred.direction === "bearish" ? -1 : 1;
        tradePnl += shares * (exitPrice - entryPrice) * direction;
      }

      // Round-trip trading cost
      const cost = allocatedUsd * costRate * 2;
      tradePnl -= cost;

      const prevValue = portfolioValue;
      portfolioValue += tradePnl;
      const dailyReturn = tradePnl / prevValue;
      dailyReturns.push(dailyReturn);
      if (dailyReturn < 0) negativeReturns.push(dailyReturn);

      if (tradePnl > 0) {
        wins++;
        grossProfit += tradePnl;
      } else {
        grossLoss += Math.abs(tradePnl);
      }

      if (portfolioValue > peak) peak = portfolioValue;
      const ddPct = (peak - portfolioValue) / peak;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
    }

    const totalReturn = portfolioValue - initialCapital;
    const totalReturnPct = totalReturn / initialCapital;

    const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
    const stdDev = dailyReturns.length > 1
      ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (dailyReturns.length - 1))
      : 0;
    const tradesPerYear = dailyReturns.length / Math.max(0.1, yearsSpanned);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(tradesPerYear) : 0;

    return {
      costBps,
      totalReturn,
      totalReturnPct,
      sharpeRatio,
      maxDrawdownPct,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    };
  });
}

// ── Holm-Bonferroni Multiple Testing Correction ──
// When running multiple backtest scenarios, raw p-values must be adjusted
// to control family-wise error rate. This prevents p-hacking.

function holmBonferroniCorrection(pValue: number, hypothesisCount: number): number {
  // Holm-Bonferroni: for the most significant test, multiply by m.
  // For a single p-value with known test count, this is the adjustment.
  return Math.min(1, pValue * hypothesisCount);
}

// ── Wilson Confidence Interval ──
// More accurate than the normal approximation for small n or extreme proportions.
// Returns 95% CI by default (z=1.96).

function wilsonInterval(successes: number, n: number, z = 1.96): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 1 };
  const p = successes / n;
  const denom = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denom;
  const margin = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denom;
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

// ── Effective Sample Size (autocorrelation-adjusted) ──
// Predictions clustered in time are not independent. A week of convergences
// during a selloff is effectively one observation. This computes an adjusted N
// by counting independent temporal clusters (predictions > 7 days apart).
// Uses geometric mean of raw N and cluster count as a balanced compromise.

function effectiveSampleSize(predictions: BacktestPrediction[]): number {
  if (predictions.length <= 1) return predictions.length;

  const sorted = [...predictions].sort((a, b) =>
    a.predictionDate.localeCompare(b.predictionDate)
  );

  let clusters = 1;
  for (let i = 1; i < sorted.length; i++) {
    const daysBetween =
      (new Date(sorted[i].predictionDate).getTime() -
        new Date(sorted[i - 1].predictionDate).getTime()) /
      (24 * 60 * 60 * 1000);
    if (daysBetween > 7) clusters++;
  }

  // Geometric mean: sqrt(raw_N * clusters)
  return Math.round(Math.sqrt(sorted.length * clusters));
}

// ── LLM Training Cutoff ──
// Claude's training data has a knowledge cutoff. Predictions for dates before
// this cutoff are subject to look-ahead bias (the model's weights encode
// knowledge of what actually happened). Predictions after the cutoff are
// the most trustworthy metric of real forecasting ability.
const LLM_TRAINING_CUTOFF = "2025-04-01"; // Claude Opus 4 / Sonnet 4 approximate cutoff

function buildLeakageWarning(
  totalValidated: number,
  postCutoffCount: number,
  postCutoffAccuracy: number | null
): string {
  if (postCutoffCount >= totalValidated) {
    return "All predictions are for dates after the LLM training cutoff. No knowledge leakage concern.";
  }

  const preCutoffCount = totalValidated - postCutoffCount;
  const preCutoffPct = totalValidated > 0 ? Math.round((preCutoffCount / totalValidated) * 100) : 0;

  const postCutoffNote = postCutoffAccuracy !== null
    ? `Post-cutoff accuracy (${(postCutoffAccuracy * 100).toFixed(1)}%, n=${postCutoffCount}) is the most trustworthy metric.`
    : `Only ${postCutoffCount} post-cutoff predictions exist (need 5+ for reliable measurement).`;

  return `${preCutoffPct}% of predictions (${preCutoffCount}/${totalValidated}) are for dates before the LLM training cutoff (${LLM_TRAINING_CUTOFF}). The model's weights encode knowledge of actual outcomes for these dates, so backtest accuracy is likely inflated. ${postCutoffNote}`;
}

// ── Statistical analysis ──

function computeResults(
  predictions: BacktestPrediction[],
  config: BacktestConfig,
  priceData: Record<string, DailyBar[]>,
  climatologicalUp: number
): BacktestResults {
  const validated = predictions.filter((p) => p.outcome !== undefined);
  const n = validated.length;

  if (n === 0) {
    return emptyResults(config);
  }

  // ── Core metrics ──
  const directionalAccuracy =
    validated.filter((p) => p.directionCorrect).length / n;

  const brierScore =
    validated.reduce((sum, p) => sum + (p.brierScore || 0), 0) / n;

  const avgConfidence =
    validated.reduce((sum, p) => sum + p.confidence, 0) / n;

  // Log loss
  const logLoss =
    validated.reduce((sum, p) => {
      const y = p.directionCorrect ? 1 : 0;
      const pClip = Math.max(0.001, Math.min(0.999, p.confidence));
      return sum - (y * Math.log(pClip) + (1 - y) * Math.log(1 - pClip));
    }, 0) / n;

  const calibrationGap = Math.abs(avgConfidence - directionalAccuracy);

  // ── Random baseline (50% directional accuracy) ──
  const randomBrier = 0.25; // (0.5 - outcome)^2 averages to 0.25

  // ── Climatological baseline ──
  // A naive "always bullish" strategy achieves this accuracy.
  // This is a stricter baseline than random 50%.
  const climatoBrier = climatologicalUp * (1 - climatologicalUp) ** 2 +
    (1 - climatologicalUp) * climatologicalUp ** 2;

  // ── Confidence interval on accuracy (Wilson) ──
  const successes = validated.filter((p) => p.directionCorrect).length;
  const accuracyCI = wilsonInterval(successes, n);

  // ── Effective sample size (autocorrelation-adjusted) ──
  const nEff = effectiveSampleSize(validated);

  // ── Statistical significance (binomial test) ──
  // H0: true accuracy = 0.5 (random)
  // Uses effective N to account for temporal clustering of predictions.
  // Standard binomial test with raw N overstates significance when predictions
  // are not independent (e.g. multiple predictions during the same market event).
  const zScore = (successes / n - 0.5) * Math.sqrt(nEff) / 0.5;
  const pValue = 1 - normalCDF(Math.abs(zScore)); // one-tailed

  // Multiple testing correction: count how many hypothesis tests are run.
  // Each backtest config represents one test. For preset scenarios we
  // count 6 (the number of presets in the UI). For custom runs, count 1.
  // This is conservative and prevents p-hacking from running many presets.
  const hypothesisCount = 6; // number of preset scenarios
  const pValueCorrected = holmBonferroniCorrection(pValue, hypothesisCount);

  // ── Sample size warning ──
  const sampleWarning = n < 30
    ? `Sample size (n=${n}) is below 30. Statistical metrics are unreliable and should be treated as directional only.`
    : null;

  // ── LLM knowledge leakage analysis ──
  // Predictions for dates before the LLM training cutoff are subject to
  // look-ahead bias: the model's weights encode knowledge of actual outcomes.
  // Post-cutoff predictions are the most trustworthy accuracy metric.
  const postCutoffPreds = validated.filter(
    (p) => p.predictionDate > LLM_TRAINING_CUTOFF
  );
  const postCutoffCount = postCutoffPreds.length;
  const postCutoffAccuracy = postCutoffCount >= 5
    ? postCutoffPreds.filter((p) => p.directionCorrect).length / postCutoffCount
    : null;

  const llmLeakageWarning = buildLeakageWarning(n, postCutoffCount, postCutoffAccuracy);

  // ── Breakdown by timeframe ──
  const byTimeframe: Record<number, { count: number; correct: number; brierSum: number; confSum: number }> = {};
  for (const p of validated) {
    const tf = p.timeframeDays;
    if (!byTimeframe[tf]) byTimeframe[tf] = { count: 0, correct: 0, brierSum: 0, confSum: 0 };
    byTimeframe[tf].count++;
    if (p.directionCorrect) byTimeframe[tf].correct++;
    byTimeframe[tf].brierSum += p.brierScore || 0;
    byTimeframe[tf].confSum += p.confidence;
  }

  // ── Breakdown by category ──
  const byCategory: Record<string, { count: number; correct: number; brierSum: number; confSum: number }> = {};
  for (const p of validated) {
    const cat = p.category;
    if (!byCategory[cat]) byCategory[cat] = { count: 0, correct: 0, brierSum: 0, confSum: 0 };
    byCategory[cat].count++;
    if (p.directionCorrect) byCategory[cat].correct++;
    byCategory[cat].brierSum += p.brierScore || 0;
    byCategory[cat].confSum += p.confidence;
  }

  // ── Breakdown by year ──
  const byYear: Record<number, { count: number; correct: number; brierSum: number; confSum: number; returnSum: number }> = {};
  for (const p of validated) {
    const year = new Date(p.predictionDate).getFullYear();
    if (!byYear[year]) byYear[year] = { count: 0, correct: 0, brierSum: 0, confSum: 0, returnSum: 0 };
    byYear[year].count++;
    if (p.directionCorrect) byYear[year].correct++;
    byYear[year].brierSum += p.brierScore || 0;
    byYear[year].confSum += p.confidence;
    const avgRet = Object.values(p.actualReturn || {}).reduce((s, r) => s + r, 0) / Math.max(1, Object.values(p.actualReturn || {}).length);
    byYear[year].returnSum += avgRet;
  }

  // ── Breakdown by instrument ──
  const byInstrument: Record<string, { count: number; correct: number; returnSum: number }> = {};
  for (const p of validated) {
    for (const sym of p.instruments) {
      if (!byInstrument[sym]) byInstrument[sym] = { count: 0, correct: 0, returnSum: 0 };
      byInstrument[sym].count++;
      if (p.directionCorrect) byInstrument[sym].correct++;
      byInstrument[sym].returnSum += p.actualReturn?.[sym] || 0;
    }
  }

  // ── Calibration curve ──
  const buckets: { min: number; max: number; label: string }[] = [
    { min: 0, max: 0.3, label: "0-30%" },
    { min: 0.3, max: 0.45, label: "30-45%" },
    { min: 0.45, max: 0.55, label: "45-55%" },
    { min: 0.55, max: 0.7, label: "55-70%" },
    { min: 0.7, max: 0.85, label: "70-85%" },
    { min: 0.85, max: 1.01, label: "85-100%" },
  ];

  const calibrationCurve: CalibrationBucket[] = buckets.map((b) => {
    const inBucket = validated.filter(
      (p) => p.confidence >= b.min && p.confidence < b.max
    );
    const correct = inBucket.filter((p) => p.directionCorrect).length;
    return {
      range: b.label,
      midpoint: (b.min + b.max) / 2,
      count: inBucket.length,
      observedFrequency: inBucket.length > 0 ? correct / inBucket.length : 0,
      expectedFrequency: (b.min + b.max) / 2,
    };
  });

  // ── Time series: cumulative accuracy ──
  const sortedPreds = [...validated].sort(
    (a, b) => a.predictionDate.localeCompare(b.predictionDate)
  );
  let cumCorrect = 0;
  const cumulativeAccuracy = sortedPreds.map((p, i) => {
    if (p.directionCorrect) cumCorrect++;
    return {
      date: p.predictionDate,
      accuracy: cumCorrect / (i + 1),
      n: i + 1,
    };
  });

  // ── Time series: Brier score over time ──
  let brierRunningSum = 0;
  const brierOverTime = sortedPreds.map((p, i) => {
    brierRunningSum += p.brierScore || 0;
    // Rolling 30-prediction Brier
    const window = sortedPreds.slice(Math.max(0, i - 29), i + 1);
    const rolling = window.reduce((s, w) => s + (w.brierScore || 0), 0) / window.length;
    return {
      date: p.predictionDate,
      brier: brierRunningSum / (i + 1),
      rolling30: rolling,
    };
  });

  // ── Hypothetical P&L (percentage-based, legacy) ──
  let cumulativePnl = 0;
  let tradeCount = 0;
  const hypotheticalPnl = sortedPreds.map((p) => {
    const avgRet = Object.values(p.actualReturn || {}).reduce(
      (s, r) => s + r, 0
    ) / Math.max(1, Object.values(p.actualReturn || {}).length);

    const positionSize = p.confidence;
    if (p.directionCorrect) {
      cumulativePnl += Math.abs(avgRet) * positionSize;
    } else {
      cumulativePnl -= Math.abs(avgRet) * positionSize;
    }
    tradeCount++;

    return {
      date: p.predictionDate,
      pnl: cumulativePnl * 100,
      trades: tradeCount,
    };
  });

  // ── Portfolio P&L (real dollar terms) ──
  const startDate = config.startDate;
  const endDate = config.endDate;
  const yearsSpanned =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  const initialCapital = config.initialCapital || 100000;
  const positionSizePct = (config.positionSizePct || 5) / 100;
  const tradingCostBps = (config.tradingCostBps || 10) / 10000;

  let portfolioValue = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let maxDrawdownDate = "";
  const dailyReturns: number[] = [];
  const negativeReturns: number[] = [];
  let totalCosts = 0;
  const tradeLog: import("./types").TradeRecord[] = [];
  const equityCurve: import("./types").EquityPoint[] = [{
    date: config.startDate,
    portfolioValue: initialCapital,
    cash: initialCapital,
    invested: 0,
    drawdown: 0,
    drawdownPct: 0,
  }];

  for (const p of sortedPreds) {
    if (!p.priceAtPrediction || !p.priceAtValidation || !p.actualReturn) continue;

    // Position size: % of current portfolio, scaled by confidence
    const allocatedUsd = portfolioValue * positionSizePct * p.confidence;
    const instruments = Object.keys(p.actualReturn);
    const perInstrumentUsd = allocatedUsd / Math.max(1, instruments.length);

    let tradePnl = 0;
    const entryPrices: Record<string, number> = {};
    const exitPrices: Record<string, number> = {};

    for (const sym of instruments) {
      const entryPrice = p.priceAtPrediction[sym];
      const exitPrice = p.priceAtValidation[sym];
      if (!entryPrice || !exitPrice) continue;

      entryPrices[sym] = entryPrice;
      exitPrices[sym] = exitPrice;

      const shares = perInstrumentUsd / entryPrice;
      const direction = p.direction === "bearish" ? -1 : 1;
      const rawPnl = shares * (exitPrice - entryPrice) * direction;
      tradePnl += rawPnl;
    }

    // Trading costs (round-trip)
    const cost = allocatedUsd * tradingCostBps * 2;
    totalCosts += cost;
    tradePnl -= cost;

    const prevValue = portfolioValue;
    portfolioValue += tradePnl;
    const dailyReturn = tradePnl / prevValue;
    dailyReturns.push(dailyReturn);
    if (dailyReturn < 0) negativeReturns.push(dailyReturn);

    // Track peak and drawdown
    if (portfolioValue > peak) peak = portfolioValue;
    const dd = peak - portfolioValue;
    const ddPct = dd / peak;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = ddPct;
      maxDrawdownDate = p.validationDate || p.predictionDate;
    }

    tradeLog.push({
      date: p.predictionDate,
      validationDate: p.validationDate || "",
      instruments,
      direction: p.direction,
      confidence: p.confidence,
      positionSize: allocatedUsd,
      entryPrices,
      exitPrices,
      pnl: tradePnl,
      pnlPct: tradePnl / allocatedUsd,
      cost,
      outcome: tradePnl > 0 ? "win" : "loss",
      claim: p.claim,
    });

    equityCurve.push({
      date: p.validationDate || p.predictionDate,
      portfolioValue,
      cash: portfolioValue,
      invested: 0,
      drawdown: dd,
      drawdownPct: ddPct,
    });
  }

  // Portfolio metrics
  const wins = tradeLog.filter((t) => t.outcome === "win");
  const losses = tradeLog.filter((t) => t.outcome === "loss");
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const stdDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (dailyReturns.length - 1))
    : 0;
  const downDev = negativeReturns.length > 1
    ? Math.sqrt(negativeReturns.reduce((s, r) => s + r ** 2, 0) / negativeReturns.length)
    : 0;

  // Annualization: sqrt(trades_per_year) for event-driven strategies
  // NOTE: This is standard for event-driven (non-daily) strategies.
  // For daily strategies, sqrt(252) would be used instead.
  const tradesPerYear = tradeLog.length / Math.max(0.1, yearsSpanned);
  const annualizationFactor = Math.sqrt(tradesPerYear);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * annualizationFactor : 0;
  const sortinoRatio = downDev > 0 ? (meanReturn / downDev) * annualizationFactor : 0;

  const totalReturn = portfolioValue - initialCapital;
  const totalReturnPct = totalReturn / initialCapital;
  const annualizedReturn = yearsSpanned > 0
    ? (Math.pow(portfolioValue / initialCapital, 1 / yearsSpanned) - 1)
    : 0;

  const portfolio: import("./types").PortfolioResults = {
    initialCapital,
    finalValue: portfolioValue,
    totalReturn,
    totalReturnPct,
    annualizedReturn,
    maxDrawdown,
    maxDrawdownPct,
    maxDrawdownDate,
    sharpeRatio,
    sortinoRatio,
    winRate: tradeLog.length > 0 ? wins.length / tradeLog.length : 0,
    avgWin,
    avgLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    totalTrades: tradeLog.length,
    totalCosts,
    equityCurve,
    tradeLog,
  };

  // ── Walk-forward validation ──
  const walkForward = computeWalkForward(predictions);

  // ── Regime-conditioned analysis ──
  const byRegime = computeRegimeAnalysis(predictions, priceData);

  // ── Transaction cost sensitivity ──
  const costSensitivity = computeCostSensitivity(predictions, config, priceData);

  return {
    totalPredictions: predictions.length,
    totalValidated: n,
    dateRange: { start: startDate, end: endDate },
    yearsSpanned: Math.round(yearsSpanned * 10) / 10,

    directionalAccuracy,
    brierScore,
    logLoss,
    avgConfidence,
    calibrationGap,

    randomBaseline: {
      directionalAccuracy: 0.5,
      brierScore: randomBrier,
    },

    climatologicalBaseline: {
      directionalAccuracy: climatologicalUp,
      brierScore: climatoBrier,
    },

    pValue,
    pValueCorrected,
    hypothesisCount,
    significant: pValueCorrected < 0.05,

    accuracyCI,
    effectiveSampleSize: nEff,
    rawSampleSize: n,
    sampleWarning,
    llmLeakageWarning,
    postCutoffCount,
    postCutoffAccuracy,

    walkForward,
    byRegime,
    costSensitivity,

    byTimeframe: Object.fromEntries(
      Object.entries(byTimeframe).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          brierScore: v.brierSum / v.count,
          avgConfidence: v.confSum / v.count,
        },
      ])
    ),

    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          brierScore: v.brierSum / v.count,
          avgConfidence: v.confSum / v.count,
        },
      ])
    ),

    byYear: Object.fromEntries(
      Object.entries(byYear).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          brierScore: v.brierSum / v.count,
          avgConfidence: v.confSum / v.count,
          hypotheticalReturn: v.returnSum * 100,
        },
      ])
    ),

    byInstrument: Object.fromEntries(
      Object.entries(byInstrument).map(([k, v]) => [
        k,
        {
          count: v.count,
          directionalAccuracy: v.correct / v.count,
          avgReturn: (v.returnSum / v.count) * 100,
          winRate: v.correct / v.count,
        },
      ])
    ),

    calibrationCurve,
    cumulativeAccuracy,
    brierOverTime,
    hypotheticalPnl,
    portfolio,
  };
}

function emptyResults(config: BacktestConfig): BacktestResults {
  return {
    totalPredictions: 0,
    totalValidated: 0,
    dateRange: { start: config.startDate, end: config.endDate },
    yearsSpanned: 0,
    directionalAccuracy: 0,
    brierScore: 0,
    logLoss: 0,
    avgConfidence: 0,
    calibrationGap: 0,
    randomBaseline: { directionalAccuracy: 0.5, brierScore: 0.25 },
    climatologicalBaseline: { directionalAccuracy: 0.5, brierScore: 0.25 },
    pValue: 1,
    pValueCorrected: 1,
    hypothesisCount: 6,
    significant: false,
    accuracyCI: { lower: 0, upper: 1 },
    effectiveSampleSize: 0,
    rawSampleSize: 0,
    sampleWarning: "No predictions to analyze.",
    llmLeakageWarning: "No predictions to analyze.",
    postCutoffCount: 0,
    postCutoffAccuracy: null,
    byTimeframe: {},
    byCategory: {},
    byYear: {},
    byInstrument: {},
    calibrationCurve: [],
    cumulativeAccuracy: [],
    brierOverTime: [],
    hypotheticalPnl: [],
    portfolio: undefined,
  };
}

// ── AI analysis of results ──

async function generateAiAnalysis(
  client: Anthropic,
  model: string,
  results: BacktestResults,
  config: BacktestConfig
): Promise<string> {
  const wfSection = results.walkForward && results.walkForward.foldCount > 0
    ? `
WALK-FORWARD VALIDATION (${results.walkForward.foldCount} folds, expanding window):
- Out-of-sample accuracy: ${(results.walkForward.oosAccuracy * 100).toFixed(1)}%
- Out-of-sample Brier: ${results.walkForward.oosBrierScore.toFixed(4)}
- Temporal stability ratio: ${results.walkForward.overfitRatio.toFixed(2)} (1.0 = stable across periods, <0.8 = accuracy degrades in later periods)
- OOS accuracy 95% CI: [${((results.walkForward.oosAccuracyCI?.lower ?? 0) * 100).toFixed(1)}%, ${((results.walkForward.oosAccuracyCI?.upper ?? 1) * 100).toFixed(1)}%]
- OOS significant: ${results.walkForward.oosSignificant ? "Yes" : "No"} (p=${results.walkForward.oosPValue.toFixed(4)})
Per fold:
${results.walkForward.folds.map(f => `  Fold ${f.foldIndex}: train ${(f.trainAccuracy * 100).toFixed(1)}% (n=${f.trainCount}), test ${(f.testAccuracy * 100).toFixed(1)}% (n=${f.testCount})`).join("\n")}`
    : "WALK-FORWARD: Insufficient data for walk-forward validation.";

  const regimeSection = results.byRegime
    ? `
REGIME-CONDITIONED ANALYSIS:
${Object.entries(results.byRegime).map(([regime, stats]) =>
      `  ${regime}: ${(stats.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${stats.brierScore.toFixed(3)}, avg return ${(stats.avgReturn * 100).toFixed(2)}%, n=${stats.count}`
    ).join("\n")}`
    : "";

  const costSection = results.costSensitivity
    ? `
TRANSACTION COST SENSITIVITY:
${results.costSensitivity.map(c =>
      `  ${c.costBps}bps: return ${(c.totalReturnPct * 100).toFixed(1)}%, Sharpe ${c.sharpeRatio.toFixed(2)}, max DD ${(c.maxDrawdownPct * 100).toFixed(1)}%, profit factor ${c.profitFactor === Infinity ? "inf" : c.profitFactor.toFixed(2)}`
    ).join("\n")}`
    : "";

  const prompt = `You are writing an academic-quality analysis of a backtesting study for a signal convergence intelligence platform. Your analysis must meet the standard of a peer-reviewed quantitative finance paper.

BACKTEST CONFIGURATION:
- Date range: ${config.startDate} to ${config.endDate} (${results.yearsSpanned} years)
- Instruments: ${config.instruments.join(", ")}
- Convergence threshold: ${config.convergenceThreshold}/5
- Timeframes: ${config.timeframes.join(", ")} days
- Signal layers: ${config.layers.join(", ")}

RESULTS:
- Total predictions generated: ${results.totalPredictions}
- Total validated: ${results.totalValidated}
- Directional accuracy: ${(results.directionalAccuracy * 100).toFixed(1)}%
- Brier score: ${results.brierScore.toFixed(4)} (random baseline: ${results.randomBaseline.brierScore.toFixed(4)})
- Log loss: ${results.logLoss.toFixed(4)}
- Average confidence: ${(results.avgConfidence * 100).toFixed(1)}%
- Calibration gap: ${(results.calibrationGap * 100).toFixed(1)}pp
- p-value (vs random): ${results.pValue.toFixed(6)}
- p-value (Holm-Bonferroni corrected, m=${results.hypothesisCount}): ${results.pValueCorrected.toFixed(6)}
- Statistically significant after correction: ${results.significant ? "Yes (p_corrected < 0.05)" : "No"}
- Accuracy 95% CI (Wilson): [${(results.accuracyCI.lower * 100).toFixed(1)}%, ${(results.accuracyCI.upper * 100).toFixed(1)}%]
- Effective sample size (autocorrelation-adjusted): ${results.effectiveSampleSize} (raw N=${results.rawSampleSize})
${results.sampleWarning ? `- SAMPLE WARNING: ${results.sampleWarning}` : ""}

LLM KNOWLEDGE LEAKAGE:
${results.llmLeakageWarning}
${results.postCutoffAccuracy !== null ? `- Post-cutoff accuracy: ${(results.postCutoffAccuracy * 100).toFixed(1)}% (n=${results.postCutoffCount}) -- MOST TRUSTWORTHY METRIC` : ""}

BASELINES:
- Random (coin flip): ${(results.randomBaseline.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${results.randomBaseline.brierScore.toFixed(4)}
- Climatological (naive "always bullish"): ${(results.climatologicalBaseline.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${results.climatologicalBaseline.brierScore.toFixed(4)}
${wfSection}
${regimeSection}
${costSection}

BY TIMEFRAME:
${Object.entries(results.byTimeframe).map(([k, v]) => `  ${k}d: ${(v.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${v.brierScore.toFixed(3)}, n=${v.count}`).join("\n")}

BY CATEGORY:
${Object.entries(results.byCategory).map(([k, v]) => `  ${k}: ${(v.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${v.brierScore.toFixed(3)}, n=${v.count}`).join("\n")}

BY YEAR:
${Object.entries(results.byYear).map(([k, v]) => `  ${k}: ${(v.directionalAccuracy * 100).toFixed(1)}% accuracy, Brier ${v.brierScore.toFixed(3)}, n=${v.count}`).join("\n")}

CALIBRATION:
${results.calibrationCurve.map((b) => `  ${b.range}: expected ${(b.expectedFrequency * 100).toFixed(0)}%, observed ${(b.observedFrequency * 100).toFixed(0)}% (n=${b.count})`).join("\n")}

Write a structured analysis with these sections:
1. EXECUTIVE SUMMARY - 2-3 sentences on headline findings
2. METHODOLOGY VALIDATION - Assess scientific rigor: time-gating, sample size, walk-forward validation, multiple testing correction, survivorship bias considerations. Note the effective vs raw sample size difference.
3. LLM KNOWLEDGE LEAKAGE - Address the fundamental limitation that the LLM's training data includes events after the simulation dates. Quantify the pre-cutoff vs post-cutoff split. If post-cutoff accuracy is available, highlight it as the most reliable metric.
4. BASELINE COMPARISON - Compare against BOTH random and climatological baselines. The climatological baseline is the critical one, beating random is trivial. Report whether the accuracy CI overlaps with the baseline.
5. WALK-FORWARD ANALYSIS - Assess out-of-sample temporal stability. Note that the "stability ratio" measures accuracy consistency across time periods, not traditional model overfitting (the LLM is not retrained between folds). Report OOS confidence intervals.
6. REGIME ANALYSIS - Comment on whether the model works across all volatility regimes or only in specific conditions
7. COST SENSITIVITY - At what transaction cost level does the strategy become unprofitable?
8. TEMPORAL CONSISTENCY - Year-over-year stability
9. CATEGORY INSIGHTS - Which signal categories perform best/worst
10. LIMITATIONS AND CAVEATS - Honest assessment including: LLM knowledge leakage (the most important caveat), survivorship bias in ETFs, sample size adequacy, temporal autocorrelation in predictions, and the distinction between temporal stability and true overfitting
11. CONCLUSIONS - Final assessment of predictive capability. If most predictions are pre-cutoff, state clearly that real-world performance is unproven until sufficient post-cutoff data accumulates.

Use precise, academic language. Be honest about both strengths and weaknesses. Reference specific numbers. Do not overstate findings. If the temporal stability ratio is below 0.85, flag this prominently.`;

  const response = await client.messages.create({
    model,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ── Helpers ──

function normalCDF(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));
    return rows.length > 0 ? rows[0].value : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
