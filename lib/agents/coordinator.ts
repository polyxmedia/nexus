import { db, schema } from "@/lib/db";
import { eq, desc, gte, isNull } from "drizzle-orm";
import { sentinelScan } from "./sentinel";
import { analystDeepDive } from "./analyst";
import { executorEvaluate } from "./executor";
import { isMetaSystemJunk } from "@/lib/predictions/engine";
import type {
  SentinelContext,
  AnalystContext,
  ExecutorContext,
  CycleResult,
  AgentStatus,
} from "./types";

type PredictionRow = typeof schema.predictions.$inferSelect;
type SignalRow = typeof schema.signals.$inferSelect;
type GameTheoryRow = typeof schema.gameTheoryScenarios.$inferSelect;
type KnowledgeRow = typeof schema.knowledge.$inferSelect;

// ── Agent status tracking ──

const agentState: Record<string, AgentStatus> = {
  sentinel: { name: "SENTINEL", model: "claude-haiku-4-5-20251001", lastRun: null, lastDuration: null, errorCount: 0, lastError: null },
  analyst: { name: "ANALYST", model: "claude-sonnet-4-20250514", lastRun: null, lastDuration: null, errorCount: 0, lastError: null },
  executor: { name: "EXECUTOR", model: "claude-haiku-4-5-20251001", lastRun: null, lastDuration: null, errorCount: 0, lastError: null },
};

export function getAgentStatus(): AgentStatus[] {
  return Object.values(agentState);
}

// ── Helper: get API key ──

async function getApiKey(): Promise<string> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"));
  const key = rows[0]?.value || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");
  return key;
}

// ── Helper: build sentinel context from DB ──

async function buildSentinelContext(): Promise<SentinelContext> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const signals = await db
    .select()
    .from(schema.signals)
    .where(gte(schema.signals.createdAt, oneDayAgo))
    .orderBy(desc(schema.signals.intensity));

  const predictions = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome))
    .orderBy(desc(schema.predictions.id));

  const thesis = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.id))
    .limit(1);

  const undismissed = await db
    .select()
    .from(schema.alertHistory)
    .where(eq(schema.alertHistory.dismissed, 0));

  // Market data from watchlist items (last known prices)
  const watchlistItems = await db.select().from(schema.watchlistItems);
  const marketData: Record<string, { price: number; change: number; changePercent: number }> = {};
  for (const item of watchlistItems) {
    if (item.lastPrice != null) {
      marketData[item.symbol] = {
        price: item.lastPrice,
        change: item.lastChange || 0,
        changePercent: item.lastChangePercent || 0,
      };
    }
  }

  return {
    recentSignals: signals.map((s: SignalRow) => ({
      title: s.title,
      intensity: s.intensity,
      category: s.category,
      date: s.date,
      status: s.status,
    })),
    marketData,
    activeThesisSummary: thesis[0]?.executiveSummary || null,
    pendingPredictions: predictions
      .filter((p: PredictionRow) => !isMetaSystemJunk(p.claim))
      .slice(0, 15)
      .map((p: PredictionRow) => ({
        claim: p.claim,
        deadline: p.deadline,
        confidence: p.confidence,
      })),
    undismissedAlerts: undismissed.length,
  };
}

// ── Helper: build analyst context ──

async function buildAnalystContext(
  sentinelAlerts: import("./types").SentinelAlert[]
): Promise<AnalystContext> {
  const signals = await db
    .select()
    .from(schema.signals)
    .orderBy(desc(schema.signals.id))
    .limit(10);

  const pending = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome))
    .orderBy(desc(schema.predictions.id));

  const thesis = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.id))
    .limit(1);

  const gameTheory = await db
    .select()
    .from(schema.gameTheoryScenarios)
    .orderBy(desc(schema.gameTheoryScenarios.id))
    .limit(3);

  // Knowledge context - get recent entries
  let knowledgeContext = "";
  try {
    const knowledge = await db
      .select()
      .from(schema.knowledge)
      .where(eq(schema.knowledge.status, "active"))
      .orderBy(desc(schema.knowledge.id))
      .limit(5);
    knowledgeContext = knowledge
      .map((k: KnowledgeRow) => `[${k.category}] ${k.title}: ${k.content.slice(0, 200)}`)
      .join("\n\n");
  } catch {
    // knowledge bank may not be available
  }

  return {
    sentinelAlerts,
    signals: signals.map((s: SignalRow) => ({
      title: s.title,
      description: s.description,
      intensity: s.intensity,
      category: s.category,
      layers: s.layers,
      date: s.date,
    })),
    knowledgeContext,
    activeThesis: thesis[0]
      ? {
          summary: thesis[0].executiveSummary,
          regime: thesis[0].marketRegime,
          confidence: thesis[0].overallConfidence,
          riskScenarios: thesis[0].riskScenarios,
        }
      : null,
    predictions: pending
      .filter((p: PredictionRow) => !isMetaSystemJunk(p.claim))
      .slice(0, 10)
      .map((p: PredictionRow) => ({
        claim: p.claim,
        confidence: p.confidence,
        category: p.category,
        deadline: p.deadline,
      })),
    gameTheory: gameTheory.map((g: GameTheoryRow) => ({
      title: g.title,
      analysis: typeof g.analysis === "string" ? g.analysis : JSON.stringify(g.analysis),
    })),
  };
}

// ── Helper: build executor context ──

async function buildExecutorContext(
  briefing: import("./types").AnalystBriefing
): Promise<ExecutorContext> {
  // Get portfolio data from trades table
  const trades = await db
    .select()
    .from(schema.trades)
    .orderBy(desc(schema.trades.id));

  // Aggregate open positions
  const positionMap = new Map<string, { quantity: number; totalCost: number }>();
  for (const trade of trades) {
    const current = positionMap.get(trade.symbol) || { quantity: 0, totalCost: 0 };
    if (trade.direction === "buy") {
      current.quantity += trade.quantity;
      current.totalCost += trade.quantity * trade.price;
    } else {
      current.quantity -= trade.quantity;
      current.totalCost -= trade.quantity * trade.price;
    }
    positionMap.set(trade.symbol, current);
  }

  // Get current prices from watchlist items
  const watchlistItems = await db.select().from(schema.watchlistItems);
  const priceMap = new Map<string, number>();
  for (const item of watchlistItems) {
    if (item.lastPrice != null) {
      priceMap.set(item.symbol, item.lastPrice);
    }
  }

  const positions = Array.from(positionMap.entries())
    .filter(([, v]) => v.quantity > 0)
    .map(([symbol, v]) => ({
      symbol,
      quantity: v.quantity,
      avgPrice: v.quantity > 0 ? v.totalCost / v.quantity : 0,
      currentPrice: priceMap.get(symbol) || v.totalCost / v.quantity,
      pnl: v.quantity * ((priceMap.get(symbol) || v.totalCost / v.quantity) - v.totalCost / v.quantity),
    }));

  // Get account balance from portfolio snapshots
  const snapshots = await db
    .select()
    .from(schema.portfolioSnapshots)
    .orderBy(desc(schema.portfolioSnapshots.id))
    .limit(1);
  const accountBalance = snapshots[0]?.totalValue || 10000;

  return {
    briefing,
    positions,
    accountBalance,
    riskParams: {
      maxPositionPercent: 25,
      maxDrawdownPercent: 15,
      defaultStopLossPercent: 5,
    },
  };
}

// ── Main Intelligence Cycle ──

export async function runIntelligenceCycle(): Promise<CycleResult> {
  const apiKey = await getApiKey();
  const cycleStart = Date.now();

  const result: CycleResult = {
    timestamp: new Date().toISOString(),
    sentinel: { alerts: [], duration: 0 },
    analyst: { briefing: null, triggered: false, duration: 0 },
    executor: { actions: [], triggered: false, duration: 0 },
    totalDuration: 0,
  };

  // ── Phase 1: SENTINEL scan ──
  const sentinelStart = Date.now();
  try {
    const context = await buildSentinelContext();
    result.sentinel.alerts = await sentinelScan(context, apiKey);
    agentState.sentinel.lastRun = new Date().toISOString();
    agentState.sentinel.errorCount = 0;
  } catch (err) {
    agentState.sentinel.errorCount++;
    agentState.sentinel.lastError = err instanceof Error ? err.message : "unknown";
    console.error("[coordinator] SENTINEL failed:", err);
  }
  result.sentinel.duration = Date.now() - sentinelStart;
  agentState.sentinel.lastDuration = result.sentinel.duration;

  // ── Phase 2: ANALYST (only if sentinel recommends) ──
  const needsAnalyst = result.sentinel.alerts.some((a) => a.recommendsAnalyst);
  if (needsAnalyst) {
    const analystStart = Date.now();
    result.analyst.triggered = true;
    try {
      const context = await buildAnalystContext(result.sentinel.alerts);
      result.analyst.briefing = await analystDeepDive(context, apiKey);
      agentState.analyst.lastRun = new Date().toISOString();
      agentState.analyst.errorCount = 0;
    } catch (err) {
      agentState.analyst.errorCount++;
      agentState.analyst.lastError = err instanceof Error ? err.message : "unknown";
      console.error("[coordinator] ANALYST failed:", err);
    }
    result.analyst.duration = Date.now() - analystStart;
    agentState.analyst.lastDuration = result.analyst.duration;
  }

  // ── Phase 2.5: Auto-generate predictions from analyst action items ──
  if (result.analyst.briefing) {
    const predictionActions = result.analyst.briefing.actionItems.filter(
      (a) => (a.type === "alert" || a.urgency === "immediate") && !isMetaSystemJunk(a.description)
    );
    for (const action of predictionActions) {
      try {
        await db.insert(schema.predictions).values({
          claim: action.description,
          confidence: result.analyst.briefing.confidence,
          category: "geopolitical",
          timeframe: action.urgency === "immediate" ? "7 days" : "30 days",
          deadline: new Date(Date.now() + (action.urgency === "immediate" ? 7 : 30) * 86400000).toISOString().split("T")[0],
          createdBy: "system",
        });
      } catch {
        // prediction may already exist, continue
      }
    }
  }

  // ── Phase 2.6: Auto-create alerts for high-severity sentinel findings ──
  const criticalAlerts = result.sentinel.alerts.filter(
    (a) => a.severity >= 4 && !isMetaSystemJunk(a.title) && !isMetaSystemJunk(a.summary)
  );
  if (criticalAlerts.length > 0) {
    // Get or create a system alert to anchor auto-generated history entries
    const systemAlerts = await db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.name, "Intelligence Cycle"))
      .limit(1);

    let alertId = systemAlerts[0]?.id;
    if (!alertId) {
      const inserted = await db.insert(schema.alerts).values({
        name: "Intelligence Cycle",
        type: "signal_intensity",
        condition: JSON.stringify({ threshold: 4 }),
        enabled: 1,
        cooldownMinutes: 5,
        triggerCount: 0,
      }).returning({ id: schema.alerts.id });
      alertId = inserted[0]?.id;
    }

    if (alertId) {
      for (const alert of criticalAlerts) {
        try {
          await db.insert(schema.alertHistory).values({
            alertId,
            title: `[AUTO] ${alert.title}`,
            message: alert.summary,
            severity: alert.severity,
            data: JSON.stringify({ source: "sentinel", type: alert.type }),
          });
        } catch {
          // continue on error
        }
      }
    }
  }

  // ── Phase 3: EXECUTOR (only if analyst has immediate actions) ──
  const hasImmediateActions = result.analyst.briefing?.actionItems.some(
    (a) => a.urgency === "immediate" && a.type === "trade"
  );
  if (hasImmediateActions && result.analyst.briefing) {
    const executorStart = Date.now();
    result.executor.triggered = true;
    try {
      const context = await buildExecutorContext(result.analyst.briefing);
      result.executor.actions = await executorEvaluate(context, apiKey);
      agentState.executor.lastRun = new Date().toISOString();
      agentState.executor.errorCount = 0;
    } catch (err) {
      agentState.executor.errorCount++;
      agentState.executor.lastError = err instanceof Error ? err.message : "unknown";
      console.error("[coordinator] EXECUTOR failed:", err);
    }
    result.executor.duration = Date.now() - executorStart;
    agentState.executor.lastDuration = result.executor.duration;
  }

  result.totalDuration = Date.now() - cycleStart;
  return result;
}
