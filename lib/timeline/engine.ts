import { db, schema } from "../db";
import { desc, and, eq } from "drizzle-orm";

export interface TimelineEntry { id: number; timestamp: string; type: string; title: string; description: string | null; severity: number; category: string | null; sourceType: string | null; sourceId: number | null; entityIds: number[]; metadata: Record<string, unknown>; }

function safeParse(json: string | null): unknown { if (!json) return {}; try { return JSON.parse(json); } catch { return {}; } }

export async function syncTimeline(): Promise<number> {
  let count = 0;
  const signals = await db.select().from(schema.signals);
  for (const s of signals) { await upsertTimelineEvent({ timestamp: s.date + "T00:00:00Z", type: "signal", title: s.title, description: s.description?.slice(0, 200) || null, severity: s.intensity, category: s.category, sourceType: "signals", sourceId: s.id, metadata: JSON.stringify({ status: s.status, layers: safeParse(s.layers) }) }); count++; }
  const predictions = await db.select().from(schema.predictions);
  for (const p of predictions) { await upsertTimelineEvent({ timestamp: p.createdAt, type: "prediction", title: `Prediction: ${p.claim.slice(0, 60)}`, description: `[${p.category}] Confidence ${(p.confidence * 100).toFixed(0)}%, deadline ${p.deadline}`, severity: Math.ceil(p.confidence * 5), category: p.category, sourceType: "predictions", sourceId: p.id, metadata: JSON.stringify({ confidence: p.confidence, deadline: p.deadline, outcome: p.outcome || null, score: p.score }) }); count++; if (p.resolvedAt) { await upsertTimelineEvent({ timestamp: p.resolvedAt, type: "prediction", title: `Resolved: ${p.claim.slice(0, 50)} [${(p.outcome || "").toUpperCase()}]`, description: p.outcomeNotes, severity: p.outcome === "confirmed" ? 2 : p.outcome === "denied" ? 4 : 3, category: p.category, sourceType: "predictions", sourceId: p.id, metadata: JSON.stringify({ outcome: p.outcome, score: p.score }) }); count++; } }
  const trades = await db.select().from(schema.trades);
  for (const t of trades) { await upsertTimelineEvent({ timestamp: t.createdAt, type: "trade", title: `${t.direction} ${t.ticker} (${t.orderType})`, description: `Qty: ${t.quantity}${t.filledPrice ? `, filled at ${t.filledPrice}` : ""}, status: ${t.status}`, severity: t.direction === "SELL" ? 3 : 2, category: "market", sourceType: "trades", sourceId: t.id, metadata: JSON.stringify({ ticker: t.ticker, direction: t.direction, status: t.status }) }); count++; }
  const theses = await db.select().from(schema.theses);
  for (const t of theses) { await upsertTimelineEvent({ timestamp: t.generatedAt, type: "thesis", title: t.title, description: `Regime: ${t.marketRegime}, confidence: ${(t.overallConfidence * 100).toFixed(0)}%`, severity: Math.ceil(t.overallConfidence * 5), category: "market", sourceType: "theses", sourceId: t.id, metadata: JSON.stringify({ marketRegime: t.marketRegime, convergenceDensity: t.convergenceDensity }) }); count++; }
  const alertHist = await db.select().from(schema.alertHistory);
  for (const a of alertHist) { await upsertTimelineEvent({ timestamp: a.triggeredAt, type: "alert", title: a.title, description: a.message, severity: a.severity, category: "system", sourceType: "alert_history", sourceId: a.id, metadata: a.data || "{}" }); count++; }
  return count;
}

export async function getTimeline(options: { from?: string; to?: string; types?: string[]; categories?: string[]; minSeverity?: number; limit?: number; }): Promise<TimelineEntry[]> {
  let events = await db.select().from(schema.timelineEvents).orderBy(desc(schema.timelineEvents.timestamp));
  if (options.from) events = events.filter((e) => e.timestamp >= options.from!);
  if (options.to) events = events.filter((e) => e.timestamp <= options.to!);
  if (options.types && options.types.length > 0) events = events.filter((e) => options.types!.includes(e.type));
  if (options.categories && options.categories.length > 0) events = events.filter((e) => e.category && options.categories!.includes(e.category));
  if (options.minSeverity) events = events.filter((e) => (e.severity || 0) >= options.minSeverity!);
  const limited = events.slice(0, options.limit || 200);
  return limited.map((e) => ({ id: e.id, timestamp: e.timestamp, type: e.type, title: e.title, description: e.description, severity: e.severity || 1, category: e.category, sourceType: e.sourceType, sourceId: e.sourceId, entityIds: (safeParse(e.entityIds) as number[]) || [], metadata: (safeParse(e.metadata) as Record<string, unknown>) || {} }));
}

async function upsertTimelineEvent(values: { timestamp: string; type: string; title: string; description: string | null; severity: number; category: string | null; sourceType: string; sourceId: number; metadata: string; }) {
  const rows = await db.select().from(schema.timelineEvents).where(and(eq(schema.timelineEvents.sourceType, values.sourceType), eq(schema.timelineEvents.sourceId, values.sourceId), eq(schema.timelineEvents.type, values.type), eq(schema.timelineEvents.title, values.title)));
  const existing = rows[0];
  if (existing) { await db.update(schema.timelineEvents).set({ severity: values.severity, description: values.description, metadata: values.metadata }).where(eq(schema.timelineEvents.id, existing.id)); return; }
  await db.insert(schema.timelineEvents).values(values);
}
