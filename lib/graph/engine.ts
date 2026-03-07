import { db, schema } from "../db";
import { eq, desc, and, inArray } from "drizzle-orm";

// ── Entity Graph Engine ──
// Builds and queries the knowledge graph from existing platform data

export interface GraphNode {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
}

export interface GraphEdge {
  id: number;
  from: number;
  to: number;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function safeParse(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

// ── Sync: Ingest existing data into the entity graph ──

export async function syncEntityGraph(): Promise<{ entities: number; relationships: number }> {
  let entityCount = 0;
  let relCount = 0;

  // 1. Signals -> entities
  const signals = await db.select().from(schema.signals);
  for (const s of signals) {
    const ent = await upsertEntity("signal", s.title, {
      intensity: s.intensity,
      category: s.category,
      date: s.date,
      status: s.status,
      celestialType: s.celestialType,
      hebrewHoliday: s.hebrewHoliday,
    }, "signals", String(s.id));
    entityCount++;

    // Link signals to sectors
    const sectors = safeParse(s.marketSectors) as unknown as string[] | null;
    if (Array.isArray(sectors)) {
      for (const sector of sectors) {
        const sectorEnt = await upsertEntity("sector", sector, {}, "derived", sector);
        await upsertRelationship(ent.id, sectorEnt.id, "affects", 0.5 + s.intensity * 0.1);
        relCount++;
      }
    }
  }

  // 2. Predictions -> entities
  const predictions = await db.select().from(schema.predictions);
  for (const p of predictions) {
    const ent = await upsertEntity("prediction", p.claim.slice(0, 80), {
      confidence: p.confidence,
      category: p.category,
      deadline: p.deadline,
      outcome: p.outcome,
      score: p.score,
    }, "predictions", String(p.id));
    entityCount++;

    // Link prediction to its signal
    if (p.signalId) {
      const sigEnt = await findEntityBySource("signals", String(p.signalId));
      if (sigEnt) {
        await upsertRelationship(sigEnt.id, ent.id, "predicts", p.confidence);
        relCount++;
      }
    }
  }

  // 3. Trades -> entities
  const trades = await db.select().from(schema.trades);
  for (const t of trades) {
    const ent = await upsertEntity("trade", `${t.direction} ${t.ticker}`, {
      direction: t.direction,
      ticker: t.ticker,
      status: t.status,
      quantity: t.quantity,
      filledPrice: t.filledPrice,
    }, "trades", String(t.id));
    entityCount++;

    // Link trade to ticker entity
    const tickerEnt = await upsertEntity("ticker", t.ticker, { sector: "unknown" }, "derived", `ticker:${t.ticker}`);
    await upsertRelationship(ent.id, tickerEnt.id, "trades", 1.0);
    relCount++;

    // Link trade to signal if present
    if (t.signalId) {
      const sigEnt = await findEntityBySource("signals", String(t.signalId));
      if (sigEnt) {
        await upsertRelationship(sigEnt.id, ent.id, "triggers", 0.8);
        relCount++;
      }
    }
  }

  // 4. Theses -> entities
  const theses = await db.select().from(schema.theses);
  for (const t of theses) {
    const ent = await upsertEntity("thesis", t.title, {
      status: t.status,
      marketRegime: t.marketRegime,
      confidence: t.overallConfidence,
      convergenceDensity: t.convergenceDensity,
    }, "theses", String(t.id));
    entityCount++;

    // Link thesis to its trading action tickers
    const actions = safeParse(t.tradingActions) as unknown as Array<{ ticker?: string }> | null;
    if (Array.isArray(actions)) {
      for (const a of actions) {
        if (a.ticker) {
          const tickerEnt = await upsertEntity("ticker", a.ticker, {}, "derived", `ticker:${a.ticker}`);
          await upsertRelationship(ent.id, tickerEnt.id, "affects", 0.7);
          relCount++;
        }
      }
    }
  }

  // 5. Geopolitical actors -> entities
  const gameTheory = await db.select().from(schema.gameTheoryScenarios);
  for (const g of gameTheory) {
    const analysis = safeParse(g.analysis) as Record<string, unknown>;
    const ent = await upsertEntity("event", g.title, {
      scenarioId: g.scenarioId,
    }, "game_theory_scenarios", String(g.id));
    entityCount++;

    // Link to market sectors from assessment
    const ma = analysis.marketAssessment as Record<string, unknown> | undefined;
    if (ma?.keySectors && Array.isArray(ma.keySectors)) {
      for (const sector of ma.keySectors as string[]) {
        const sectorEnt = await upsertEntity("sector", sector, {}, "derived", sector);
        await upsertRelationship(ent.id, sectorEnt.id, "affects", (ma.confidence as number) || 0.5);
        relCount++;
      }
    }
  }

  return { entities: entityCount, relationships: relCount };
}

// ── Query helpers ──

export async function getEntityGraph(centerEntityId?: number, depth: number = 2): Promise<GraphData> {
  const allEntities = await db.select().from(schema.entities);
  const allRelationships = await db.select().from(schema.relationships);

  if (!centerEntityId) {
    return {
      nodes: allEntities.map(toGraphNode),
      edges: allRelationships.map(toGraphEdge),
    };
  }

  // BFS from center entity
  const visited = new Set<number>([centerEntityId]);
  const queue: Array<{ id: number; d: number }> = [{ id: centerEntityId, d: 0 }];
  const relevantEdges: typeof allRelationships = [];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (d >= depth) continue;

    for (const rel of allRelationships) {
      if (rel.fromEntityId === id && !visited.has(rel.toEntityId)) {
        visited.add(rel.toEntityId);
        queue.push({ id: rel.toEntityId, d: d + 1 });
        relevantEdges.push(rel);
      }
      if (rel.toEntityId === id && !visited.has(rel.fromEntityId)) {
        visited.add(rel.fromEntityId);
        queue.push({ id: rel.fromEntityId, d: d + 1 });
        relevantEdges.push(rel);
      }
      if ((rel.fromEntityId === id || rel.toEntityId === id) && !relevantEdges.includes(rel)) {
        relevantEdges.push(rel);
      }
    }
  }

  const nodes = allEntities.filter((e) => visited.has(e.id)).map(toGraphNode);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = relevantEdges.filter((e) => nodeIds.has(e.fromEntityId) && nodeIds.has(e.toEntityId)).map(toGraphEdge);

  return { nodes, edges };
}

export async function searchEntities(query: string, type?: string): Promise<GraphNode[]> {
  const all = await db.select().from(schema.entities);
  const q = query.toLowerCase();
  return all
    .filter((e) => {
      if (type && e.type !== type) return false;
      return e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q);
    })
    .slice(0, 50)
    .map(toGraphNode);
}

// ── Internal helpers ──

async function upsertEntity(
  type: string,
  name: string,
  properties: Record<string, unknown>,
  sourceType: string,
  sourceId: string,
) {
  const existingRows = await db.select().from(schema.entities)
    .where(and(eq(schema.entities.sourceType, sourceType), eq(schema.entities.sourceId, sourceId)))
    ;

  if (existingRows.length > 0) {
    await db.update(schema.entities)
      .set({ name, properties: JSON.stringify(properties), updatedAt: new Date().toISOString() })
      .where(eq(schema.entities.id, existingRows[0].id))
      ;
    return existingRows[0];
  }

  const [inserted] = await db.insert(schema.entities).values({
    type,
    name,
    properties: JSON.stringify(properties),
    sourceType,
    sourceId,
  }).returning();
  return inserted;
}

async function upsertRelationship(fromId: number, toId: number, type: string, weight: number) {
  const existingRows = await db.select().from(schema.relationships)
    .where(and(
      eq(schema.relationships.fromEntityId, fromId),
      eq(schema.relationships.toEntityId, toId),
      eq(schema.relationships.type, type),
    ))
    ;

  if (existingRows.length > 0) {
    await db.update(schema.relationships)
      .set({ weight })
      .where(eq(schema.relationships.id, existingRows[0].id))
      ;
    return existingRows[0];
  }

  const [inserted] = await db.insert(schema.relationships).values({
    fromEntityId: fromId,
    toEntityId: toId,
    type,
    weight,
  }).returning();
  return inserted;
}

async function findEntityBySource(sourceType: string, sourceId: string) {
  const rows = await db.select().from(schema.entities)
    .where(and(eq(schema.entities.sourceType, sourceType), eq(schema.entities.sourceId, sourceId)));
  return rows[0] || null;
}

function toGraphNode(e: typeof schema.entities.$inferSelect): GraphNode {
  return {
    id: e.id,
    type: e.type,
    name: e.name,
    properties: safeParse(e.properties),
    sourceType: e.sourceType,
    sourceId: e.sourceId,
  };
}

function toGraphEdge(r: typeof schema.relationships.$inferSelect): GraphEdge {
  return {
    id: r.id,
    from: r.fromEntityId,
    to: r.toEntityId,
    type: r.type,
    weight: r.weight || 1,
    properties: safeParse(r.properties),
  };
}
