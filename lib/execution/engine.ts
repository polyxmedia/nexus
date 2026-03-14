import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { getKillSwitchStatus } from "./kill-switch";
import { type RuleConditions, type BracketConfig } from "./rules";
import { preTradeCheckT212, preTradeCheckCoinbase } from "@/lib/trading/pre-trade-check";
import { computeSizingSuggestions } from "@/lib/trading/sizing";
import type { Trading212Client } from "@/lib/trading212/client";
import type { CoinbaseClient } from "@/lib/coinbase/client";
import type { ExecutionRule, Signal } from "@/lib/db/schema";

// ── Types ──

interface ExecutionResult {
  ruleId: number;
  action: "executed" | "blocked" | "killed" | "skipped" | "error";
  details: Record<string, unknown>;
}

// ── Kelly Criterion ──

/**
 * Kelly criterion: f* = (bp - q) / b
 * b = average win/loss ratio, p = win rate, q = 1 - p
 * Returns fraction of bankroll to bet (0-1), capped at 25% for safety
 */
export function getKellySizing(winRate: number, avgWinLossRatio: number, bankroll: number): number {
  if (winRate <= 0 || avgWinLossRatio <= 0 || bankroll <= 0) return 0;

  const b = avgWinLossRatio;
  const p = Math.min(Math.max(winRate, 0), 1);
  const q = 1 - p;

  const kelly = (b * p - q) / b;

  // Negative Kelly = don't bet
  if (kelly <= 0) return 0;

  // Half-Kelly for safety, capped at 25% of bankroll
  const halfKelly = kelly * 0.5;
  const cappedFraction = Math.min(halfKelly, 0.25);

  return Math.round(bankroll * cappedFraction * 100) / 100;
}

// ── Signal Matching ──

function matchesConditions(signal: Signal, conditions: RuleConditions): boolean {
  if (signal.intensity < conditions.minConvergence) return false;

  if (conditions.signalLayers && conditions.signalLayers.length > 0) {
    try {
      const signalLayers: string[] = JSON.parse(signal.layers || "[]");
      const hasRequiredLayer = conditions.signalLayers.some(
        (layer) => signalLayers.includes(layer)
      );
      if (!hasRequiredLayer) return false;
    } catch {
      return false;
    }
  }

  if (conditions.categories && conditions.categories.length > 0) {
    if (!conditions.categories.includes(signal.category)) return false;
  }

  if (conditions.tickers && conditions.tickers.length > 0) {
    try {
      const sectors: string[] = JSON.parse(signal.marketSectors || "[]");
      const hasTicker = conditions.tickers.some(
        (t) => sectors.some((s) => s.toLowerCase().includes(t.toLowerCase()))
      );
      if (!hasTicker) return false;
    } catch {
      // No market sectors, skip ticker check
    }
  }

  return true;
}

// ── Core Execution Loop ──

async function logExecution(
  ruleId: number | null,
  userId: string,
  action: string,
  details: Record<string, unknown>,
  signalId?: number,
  predictionId?: number,
  tradeId?: number
): Promise<void> {
  await db.insert(schema.executionLog).values({
    ruleId,
    userId,
    action,
    details: JSON.stringify(details),
    signalId: signalId || null,
    predictionId: predictionId || null,
    tradeId: tradeId || null,
  });
}

async function resetDailyCountIfNeeded(rule: ExecutionRule): Promise<ExecutionRule> {
  const today = new Date().toISOString().split("T")[0];
  if (rule.lastResetDate !== today) {
    const [updated] = await db.update(schema.executionRules)
      .set({ ordersToday: 0, lastResetDate: today })
      .where(eq(schema.executionRules.id, rule.id))
      .returning();
    return updated;
  }
  return rule;
}

async function getCurrentRegime(): Promise<string> {
  try {
    const { detectCurrentRegime } = await import("@/lib/regime/detection");
    const regime = await detectCurrentRegime();
    return regime?.composite || "peacetime";
  } catch {
    return "peacetime";
  }
}

async function getActiveSignals(): Promise<Signal[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return db.select().from(schema.signals)
    .where(and(
      eq(schema.signals.status, "active"),
      gte(schema.signals.createdAt, weekAgo)
    ))
    .orderBy(desc(schema.signals.intensity));
}

async function getBrokerClient(broker: string): Promise<Trading212Client | CoinbaseClient | null> {
  const settingKey = broker === "t212" ? "trading212_api_key" : "coinbase_api_key";
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, settingKey));
  if (rows.length === 0) return null;

  if (broker === "t212") {
    const { Trading212Client } = await import("@/lib/trading212/client");
    const envRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "trading212_environment"));
    const env = envRows.length > 0 ? envRows[0].value : "demo";
    return new Trading212Client(rows[0].value, env as "demo" | "live");
  }

  if (broker === "coinbase") {
    const { CoinbaseClient } = await import("@/lib/coinbase/client");
    const secretRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "coinbase_api_secret"));
    if (secretRows.length === 0) return null;
    return new CoinbaseClient(rows[0].value, secretRows[0].value);
  }

  return null;
}

async function getBacktestWinRate(): Promise<{ winRate: number; avgWinLossRatio: number }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const resolved = await db.select().from(schema.predictions)
    .where(and(
      gte(schema.predictions.resolvedAt, ninetyDaysAgo),
      eq(schema.predictions.preEvent, 1)
    ));

  if (resolved.length < 10) return { winRate: 0.5, avgWinLossRatio: 1.0 };

  const correct = resolved.filter(p => p.directionCorrect === 1).length;
  const winRate = correct / resolved.length;

  const wins = resolved.filter(p => p.directionCorrect === 1);
  const losses = resolved.filter(p => p.directionCorrect === 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + (p.score || 0.6), 0) / wins.length : 0.6;
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + (1 - (p.score || 0.4)), 0) / losses.length : 0.4;

  return {
    winRate,
    avgWinLossRatio: avgLoss > 0 ? avgWin / avgLoss : 1.0,
  };
}

async function getFreeCash(client: Trading212Client | CoinbaseClient, broker: string): Promise<number> {
  if (broker === "t212") {
    const cashData = await (client as Trading212Client).getAccountCash();
    return typeof (cashData as Record<string, unknown>)?.free === "number"
      ? (cashData as Record<string, number>).free
      : 0;
  }
  if (broker === "coinbase") {
    const accounts = await (client as CoinbaseClient).getAccounts();
    return accounts
      .filter(a => ["USD", "USDC", "USDT"].includes(a.currency.code))
      .reduce((s, a) => s + parseFloat(a.available_balance.value), 0);
  }
  return 0;
}

async function computePositionSize(
  rule: ExecutionRule,
  client: Trading212Client | CoinbaseClient,
  broker: string,
): Promise<number> {
  if (rule.sizingStrategy === "kelly") {
    const { winRate, avgWinLossRatio } = await getBacktestWinRate();
    const freeCash = await getFreeCash(client, broker);
    return getKellySizing(winRate, avgWinLossRatio, freeCash);
  }

  if (rule.sizingStrategy === "fixed") {
    const params = rule.sizingParams ? JSON.parse(rule.sizingParams) : {};
    return params.fixedAmount || 100;
  }

  // Tier-based sizing
  const freeCash = await getFreeCash(client, broker);
  const tiers = await computeSizingSuggestions(freeCash, 1);
  return tiers.length > 0 ? tiers[0].positionValue : 0;
}

async function enforceMaxPositionPct(
  positionValue: number,
  rule: ExecutionRule,
  client: Trading212Client | CoinbaseClient,
  broker: string,
): Promise<number> {
  const freeCash = await getFreeCash(client, broker);
  // Total portfolio approximation: cash is what we can reference
  if (freeCash <= 0) return positionValue;
  const maxValue = freeCash * (rule.maxPositionPct / 100);
  return Math.min(positionValue, maxValue);
}

async function executeT212(
  client: Trading212Client,
  rule: ExecutionRule,
  signal: Signal,
  finalValue: number,
  userId: string,
  bracketConfig: BracketConfig | null,
): Promise<{ success: boolean; tradeId?: number; error?: string }> {
  const conditions: RuleConditions = JSON.parse(rule.conditions);
  const ticker = resolveTicker(signal, conditions);
  if (!ticker) return { success: false, error: "No ticker identified from signal" };

  const riskCheck = await preTradeCheckT212(client, ticker, finalValue, "BUY", null, null);
  if (!riskCheck.allowed) {
    return { success: false, error: riskCheck.warnings.find(w => w.severity === "block")?.message || "Risk check failed" };
  }

  const quantity = finalValue / (riskCheck.currentPrice || 1);

  const order = await client.placeMarketOrder({ ticker, quantity });

  const [trade] = await db.insert(schema.trades).values({
    userId,
    signalId: signal.id,
    ticker,
    direction: "BUY",
    orderType: "MARKET",
    quantity,
    t212OrderId: (order as Record<string, unknown>)?.id?.toString() || null,
    status: "pending",
    environment: "demo",
    notes: `Auto-executed by rule: ${rule.name}`,
  }).returning();

  // Place bracket orders if configured
  if (bracketConfig && riskCheck.currentPrice) {
    const bracketQty = finalValue / riskCheck.currentPrice;
    const stopPrice = riskCheck.currentPrice * (1 - bracketConfig.stopPct / 100);
    const tpPrice = riskCheck.currentPrice * (1 + bracketConfig.takeProfitPct / 100);

    try {
      await client.placeStopOrder({
        ticker,
        quantity: bracketQty,
        stopPrice,
        timeValidity: "GTC",
      });
    } catch (err) {
      console.error(`[Execution] Stop-loss failed for ${ticker} (trade ${trade.id}):`, err);
      await logExecution(rule.id, userId, "bracket_failed", {
        type: "stop_loss",
        ticker,
        stopPrice,
        tradeId: trade.id,
        error: err instanceof Error ? err.message : "Stop-loss placement failed",
      });
    }

    try {
      await client.placeLimitOrder({
        ticker,
        quantity: bracketQty,
        limitPrice: tpPrice,
        timeValidity: "GTC",
      });
    } catch (err) {
      console.error(`[Execution] Take-profit failed for ${ticker} (trade ${trade.id}):`, err);
      await logExecution(rule.id, userId, "bracket_failed", {
        type: "take_profit",
        ticker,
        tpPrice,
        tradeId: trade.id,
        error: err instanceof Error ? err.message : "Take-profit placement failed",
      });
    }
  }

  return { success: true, tradeId: trade.id };
}

async function executeCoinbase(
  client: CoinbaseClient,
  rule: ExecutionRule,
  signal: Signal,
  finalValue: number,
  userId: string,
): Promise<{ success: boolean; tradeId?: number; error?: string }> {
  const conditions: RuleConditions = JSON.parse(rule.conditions);
  const ticker = resolveTicker(signal, conditions);
  if (!ticker) return { success: false, error: "No ticker identified from signal" };

  const riskCheck = await preTradeCheckCoinbase(client, ticker, "BUY", finalValue);
  if (!riskCheck.allowed) {
    return { success: false, error: riskCheck.warnings.find(w => w.severity === "block")?.message || "Risk check failed" };
  }

  await client.placeMarketOrder({
    productId: ticker,
    side: "BUY",
    amount: finalValue.toString(),
  });

  const [trade] = await db.insert(schema.trades).values({
    userId,
    signalId: signal.id,
    ticker,
    direction: "BUY",
    orderType: "MARKET",
    quantity: finalValue,
    status: "pending",
    environment: "demo",
    notes: `Auto-executed by rule: ${rule.name}`,
  }).returning();

  return { success: true, tradeId: trade.id };
}

function resolveTicker(signal: Signal, conditions: RuleConditions): string | null {
  try {
    const sectors: string[] = JSON.parse(signal.marketSectors || "[]");
    if (conditions.tickers && conditions.tickers.length > 0) {
      return conditions.tickers.find(t =>
        sectors.some(s => s.toLowerCase().includes(t.toLowerCase()))
      ) || conditions.tickers[0];
    }
    if (sectors.length > 0) return sectors[0];
  } catch {
    // fallback
  }
  return null;
}

async function executeOnBroker(
  rule: ExecutionRule,
  signal: Signal,
  broker: string,
  userId: string
): Promise<{ success: boolean; tradeId?: number; error?: string }> {
  const client = await getBrokerClient(broker);
  if (!client) return { success: false, error: "Broker client not configured" };

  const bracketConfig: BracketConfig | null = rule.bracketConfig ? JSON.parse(rule.bracketConfig) : null;

  // Compute and cap position size
  let positionValue = await computePositionSize(rule, client, broker);
  if (positionValue <= 0) return { success: false, error: "Position size computed as zero" };
  positionValue = await enforceMaxPositionPct(positionValue, rule, client, broker);
  if (positionValue <= 0) return { success: false, error: "Position exceeds max position percentage" };

  if (broker === "t212") {
    return executeT212(client as Trading212Client, rule, signal, positionValue, userId, bracketConfig);
  }

  if (broker === "coinbase") {
    return executeCoinbase(client as CoinbaseClient, rule, signal, positionValue, userId);
  }

  return { success: false, error: `Unsupported broker: ${broker}` };
}

// ── Atomic order count increment ──

async function incrementOrderCount(ruleId: number): Promise<void> {
  await db.execute(sql`
    UPDATE execution_rules
    SET orders_today = orders_today + 1
    WHERE id = ${ruleId}
  `);
}

// ── Public API ──

export async function evaluateRules(userId: string): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  // 1. Check kill switch FIRST
  const killStatus = await getKillSwitchStatus(userId);
  if (killStatus.active) {
    await logExecution(null, userId, "killed", { reason: killStatus.reason });
    return [{ ruleId: 0, action: "killed", details: { reason: killStatus.reason } }];
  }

  // 2. Get current state
  const [rules, signals, regime] = await Promise.all([
    db.select().from(schema.executionRules)
      .where(and(eq(schema.executionRules.userId, userId), eq(schema.executionRules.enabled, 1))),
    getActiveSignals(),
    getCurrentRegime(),
  ]);

  if (rules.length === 0) return [];

  // 3. Evaluate each rule
  for (let rule of rules) {
    try {
      rule = await resetDailyCountIfNeeded(rule);

      if (rule.ordersToday >= rule.maxDailyOrders) {
        await logExecution(rule.id, userId, "skipped", { reason: "Daily order limit reached" });
        results.push({ ruleId: rule.id, action: "skipped", details: { reason: "Daily order limit reached" } });
        continue;
      }

      const conditions: RuleConditions = JSON.parse(rule.conditions);

      if (conditions.regime && conditions.regime !== "any" && conditions.regime !== regime) {
        await logExecution(rule.id, userId, "skipped", { reason: `Regime mismatch: ${regime} vs ${conditions.regime}` });
        results.push({ ruleId: rule.id, action: "skipped", details: { reason: "Regime mismatch" } });
        continue;
      }

      const matchingSignals = signals.filter(s => matchesConditions(s, conditions));

      if (matchingSignals.length === 0) {
        results.push({ ruleId: rule.id, action: "skipped", details: { reason: "No matching signals" } });
        continue;
      }

      const bestSignal = matchingSignals[0];
      const execResult = await executeOnBroker(rule, bestSignal, rule.broker, userId);

      if (execResult.success) {
        // Atomic increment prevents race condition
        await incrementOrderCount(rule.id);

        await logExecution(rule.id, userId, "executed", {
          signalId: bestSignal.id,
          signalIntensity: bestSignal.intensity,
          tradeId: execResult.tradeId,
          broker: rule.broker,
          regime,
        }, bestSignal.id, undefined, execResult.tradeId);

        results.push({ ruleId: rule.id, action: "executed", details: { tradeId: execResult.tradeId } });
      } else {
        await logExecution(rule.id, userId, "blocked", {
          signalId: bestSignal.id,
          error: execResult.error,
          broker: rule.broker,
        }, bestSignal.id);

        results.push({ ruleId: rule.id, action: "blocked", details: { error: execResult.error } });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await logExecution(rule.id, userId, "error", { error: errorMsg });
      results.push({ ruleId: rule.id, action: "error", details: { error: errorMsg } });
    }
  }

  return results;
}

export async function getExecutionLog(userId: string, limit = 50) {
  return db.select().from(schema.executionLog)
    .where(eq(schema.executionLog.userId, userId))
    .orderBy(desc(schema.executionLog.createdAt))
    .limit(limit);
}
