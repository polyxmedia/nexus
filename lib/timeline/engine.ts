import { db, schema } from "../db";
import { desc, and, eq, gte, lte, inArray, type SQL } from "drizzle-orm";
import { getCachedNews } from "../news/sync";
import { getFredSeries, FRED_SERIES, type FredSeriesId } from "../market-data/fred";

export interface TimelineEntry { id: number; timestamp: string; type: string; title: string; description: string | null; severity: number; category: string | null; sourceType: string | null; sourceId: number | null; entityIds: number[]; metadata: Record<string, unknown>; }

function safeParse(json: string | null): unknown { if (!json) return {}; try { return JSON.parse(json); } catch { return {}; } }

// Track last external sync to avoid hammering APIs on every request
let lastExternalSync = 0;
const EXTERNAL_SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function isExternalSyncStale(): boolean {
  return Date.now() - lastExternalSync > EXTERNAL_SYNC_INTERVAL;
}

export async function syncTimeline(): Promise<number> {
  let count = 0;
  const signals = await db.select().from(schema.signals);
  for (const s of signals) { await upsertTimelineEvent({ timestamp: s.date + "T00:00:00Z", type: "signal", title: s.title, description: s.description?.slice(0, 200) || null, severity: s.intensity, category: s.category, sourceType: "signals", sourceId: s.id, metadata: JSON.stringify({ status: s.status, layers: safeParse(s.layers) }) }); count++; }
  const predictions = await db.select().from(schema.predictions);
  for (const p of predictions) { await upsertTimelineEvent({ timestamp: p.createdAt, type: "prediction", title: `Prediction: ${p.claim.slice(0, 60)}`, description: `[${p.category}] Confidence ${(p.confidence * 100).toFixed(0)}%, deadline ${p.deadline}`, severity: Math.ceil(p.confidence * 5), category: p.category, sourceType: "predictions", sourceId: p.id, metadata: JSON.stringify({ uuid: p.uuid, confidence: p.confidence, deadline: p.deadline, outcome: p.outcome || null, score: p.score, direction: p.direction || null }) }); count++; if (p.resolvedAt) { await upsertTimelineEvent({ timestamp: p.resolvedAt, type: "prediction", title: `Resolved: ${p.claim.slice(0, 50)} [${(p.outcome || "").toUpperCase()}]`, description: p.outcomeNotes, severity: p.outcome === "confirmed" ? 2 : p.outcome === "denied" ? 4 : 3, category: p.category, sourceType: "predictions", sourceId: p.id, metadata: JSON.stringify({ uuid: p.uuid, outcome: p.outcome, score: p.score, direction: p.direction || null }) }); count++; } }
  const trades = await db.select().from(schema.trades);
  for (const t of trades) { await upsertTimelineEvent({ timestamp: t.createdAt, type: "trade", title: `${t.direction} ${t.ticker} (${t.orderType})`, description: `Qty: ${t.quantity}${t.filledPrice ? `, filled at ${t.filledPrice}` : ""}, status: ${t.status}`, severity: t.direction === "SELL" ? 3 : 2, category: "market", sourceType: "trades", sourceId: t.id, metadata: JSON.stringify({ ticker: t.ticker, direction: t.direction, status: t.status }) }); count++; }
  const theses = await db.select().from(schema.theses);
  for (const t of theses) { await upsertTimelineEvent({ timestamp: t.generatedAt, type: "thesis", title: t.title, description: `Regime: ${t.marketRegime}, confidence: ${(t.overallConfidence * 100).toFixed(0)}%`, severity: Math.ceil(t.overallConfidence * 5), category: "market", sourceType: "theses", sourceId: t.id, metadata: JSON.stringify({ marketRegime: t.marketRegime, convergenceDensity: t.convergenceDensity }) }); count++; }
  const alertHist = await db.select().from(schema.alertHistory);
  for (const a of alertHist) { await upsertTimelineEvent({ timestamp: a.triggeredAt, type: "alert", title: a.title, description: a.message, severity: a.severity, category: "system", sourceType: "alert_history", sourceId: a.id, metadata: a.data || "{}" }); count++; }

  // Sync external sources (news + economic data) if stale
  if (isExternalSyncStale()) {
    const externalCount = await syncExternalSources();
    count += externalCount;
    lastExternalSync = Date.now();
  }

  return count;
}

// ── News severity classification ──

const HIGH_SEVERITY_KEYWORDS = [
  "war", "invasion", "nuclear", "missile strike", "airstrike", "casualties",
  "sanctions", "embargo", "coup", "assassination", "emergency", "martial law",
  "default", "collapse", "crash", "crisis", "recession",
];

const MEDIUM_SEVERITY_KEYWORDS = [
  "military", "troops", "conflict", "tension", "escalat", "deploy",
  "ceasefire", "negotiation", "summit", "tariff", "trade war",
  "rate hike", "rate cut", "inflation", "unemployment", "layoff",
  "protest", "unrest", "election", "referendum", "missile", "drone",
  "opec", "oil price", "energy crisis", "supply chain", "shortage",
  "central bank", "federal reserve", "ecb", "boe", "boj",
];

function classifyNewsSeverity(title: string, category: string): number {
  const text = title.toLowerCase();
  for (const kw of HIGH_SEVERITY_KEYWORDS) {
    if (text.includes(kw)) return 5;
  }
  for (const kw of MEDIUM_SEVERITY_KEYWORDS) {
    if (text.includes(kw)) return 3;
  }
  if (category === "conflict") return 4;
  if (category === "energy") return 3;
  if (category === "markets") return 2;
  return 2;
}

function newsToTimelineCategory(category: string): string {
  switch (category) {
    case "conflict": return "geopolitical";
    case "energy": return "geopolitical";
    case "markets": return "market";
    case "world": return "geopolitical";
    default: return "geopolitical";
  }
}

// ── External source sync ──

async function syncExternalSources(): Promise<number> {
  let count = 0;

  // 1. News feeds: geopolitical + economic headlines
  const [newsCount, econCount] = await Promise.all([
    syncNewsToTimeline(),
    syncEconomicDataToTimeline(),
  ]);
  count += newsCount + econCount;

  return count;
}

async function syncNewsToTimeline(): Promise<number> {
  let count = 0;
  try {
    // Read from cached news_articles table (populated by background job)
    // No external fetches -- instant
    const articles = await getCachedNews(undefined, 100);

    for (const article of articles) {
      const severity = classifyNewsSeverity(article.title, article.category);
      const sourceId = hashCode(article.url);

      await upsertTimelineEvent({
        timestamp: article.date,
        type: "news",
        title: article.title,
        description: article.description || null,
        severity,
        category: newsToTimelineCategory(article.category),
        sourceType: "news_feed",
        sourceId,
        metadata: JSON.stringify({
          source: article.source,
          url: article.url,
          bias: article.bias,
          newsCategory: article.category,
        }),
      });
      count++;
    }
  } catch (err) {
    console.error("[timeline] News sync error:", err);
  }
  return count;
}

// Key FRED series to track for timeline events
const TRACKED_FRED_SERIES: { id: FredSeriesId; thresholdPct: number; highSeverityPct: number }[] = [
  { id: "FEDFUNDS", thresholdPct: 0.1, highSeverityPct: 1.0 },
  { id: "DGS10", thresholdPct: 2.0, highSeverityPct: 5.0 },
  { id: "T10Y2Y", thresholdPct: 5.0, highSeverityPct: 20.0 },
  { id: "CPIAUCSL", thresholdPct: 0.2, highSeverityPct: 0.5 },
  { id: "UNRATE", thresholdPct: 2.0, highSeverityPct: 5.0 },
  { id: "ICSA", thresholdPct: 5.0, highSeverityPct: 15.0 },
  { id: "VIXCLS", thresholdPct: 10.0, highSeverityPct: 25.0 },
  { id: "DCOILWTICO", thresholdPct: 3.0, highSeverityPct: 8.0 },
  { id: "DCOILBRENTEU", thresholdPct: 3.0, highSeverityPct: 8.0 },
  { id: "GOLDAMGBD228NLBM", thresholdPct: 2.0, highSeverityPct: 5.0 },
  { id: "DTWEXBGS", thresholdPct: 1.0, highSeverityPct: 3.0 },
  { id: "BAMLH0A0HYM2", thresholdPct: 5.0, highSeverityPct: 15.0 },
  { id: "UMCSENT", thresholdPct: 3.0, highSeverityPct: 8.0 },
  { id: "A191RL1Q225SBEA", thresholdPct: 10.0, highSeverityPct: 30.0 },
  { id: "M2SL", thresholdPct: 1.0, highSeverityPct: 3.0 },
  { id: "PAYEMS", thresholdPct: 1.0, highSeverityPct: 3.0 },
];

async function syncEconomicDataToTimeline(): Promise<number> {
  let count = 0;
  try {
    for (const tracked of TRACKED_FRED_SERIES) {
      try {
        const series = FRED_SERIES[tracked.id];
        const points = await getFredSeries(series.id, 5);
        if (points.length < 2) continue;

        const latest = points[points.length - 1];
        const previous = points[points.length - 2];
        const change = latest.value - previous.value;
        const changePct = previous.value !== 0 ? Math.abs((change / previous.value) * 100) : 0;

        // Always create an event for the latest data point so the timeline
        // shows current economic readings, not just big moves
        const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
        const directionArrow = change > 0 ? "+" : "";
        let severity = 2;
        if (changePct >= tracked.highSeverityPct) severity = 5;
        else if (changePct >= tracked.thresholdPct) severity = 3;

        const sourceId = hashCode(`fred:${series.id}:${latest.date}`);

        await upsertTimelineEvent({
          timestamp: latest.date + "T12:00:00Z",
          type: "economic",
          title: `${series.name}: ${latest.value.toFixed(2)} ${series.unit} (${directionArrow}${change.toFixed(2)})`,
          description: `${series.name} moved from ${previous.value.toFixed(2)} to ${latest.value.toFixed(2)} ${series.unit} (${directionArrow}${changePct.toFixed(1)}%). Previous reading: ${previous.date}.`,
          severity,
          category: "market",
          sourceType: "fred",
          sourceId,
          metadata: JSON.stringify({
            seriesId: series.id,
            seriesName: series.name,
            unit: series.unit,
            latestValue: latest.value,
            previousValue: previous.value,
            change,
            changePct,
            direction,
            date: latest.date,
          }),
        });
        count++;
      } catch {
        // Skip individual series failures
      }
    }
  } catch (err) {
    console.error("[timeline] FRED sync error:", err);
  }
  return count;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export async function getTimeline(options: { from?: string; to?: string; types?: string[]; categories?: string[]; minSeverity?: number; limit?: number; }): Promise<TimelineEntry[]> {
  const conditions: SQL[] = [];
  if (options.from) conditions.push(gte(schema.timelineEvents.timestamp, options.from));
  if (options.to) conditions.push(lte(schema.timelineEvents.timestamp, options.to));
  if (options.types && options.types.length > 0) conditions.push(inArray(schema.timelineEvents.type, options.types));
  if (options.categories && options.categories.length > 0) conditions.push(inArray(schema.timelineEvents.category, options.categories));
  if (options.minSeverity) conditions.push(gte(schema.timelineEvents.severity, options.minSeverity));

  const events = await db.select().from(schema.timelineEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.timelineEvents.timestamp))
    .limit(options.limit || 500);

  return events.map((e) => ({ id: e.id, timestamp: e.timestamp, type: e.type, title: e.title, description: e.description, severity: e.severity || 1, category: e.category, sourceType: e.sourceType, sourceId: e.sourceId, entityIds: (safeParse(e.entityIds) as number[]) || [], metadata: (safeParse(e.metadata) as Record<string, unknown>) || {} }));
}

async function upsertTimelineEvent(values: { timestamp: string; type: string; title: string; description: string | null; severity: number; category: string | null; sourceType: string; sourceId: number; metadata: string; }) {
  const rows = await db.select().from(schema.timelineEvents).where(and(eq(schema.timelineEvents.sourceType, values.sourceType), eq(schema.timelineEvents.sourceId, values.sourceId), eq(schema.timelineEvents.type, values.type), eq(schema.timelineEvents.title, values.title)));
  const existing = rows[0];
  if (existing) { await db.update(schema.timelineEvents).set({ severity: values.severity, description: values.description, metadata: values.metadata }).where(eq(schema.timelineEvents.id, existing.id)); return; }
  await db.insert(schema.timelineEvents).values(values);
}
