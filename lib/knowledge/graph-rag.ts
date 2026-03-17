/**
 * GraphRAG Layer
 * ══════════════
 * Bridges the knowledge bank and entity graph.
 *
 * 1. Entity extraction: when knowledge is ingested, Haiku extracts entities
 *    and relationships, wiring them into the graph automatically.
 * 2. Cross-linking: new knowledge entries are linked to similar existing
 *    entries via embedding similarity.
 * 3. Graph-aware search: vector results are augmented with graph-discovered
 *    context from 1-2 hops away.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { upsertEntity, upsertRelationship } from "@/lib/graph/engine";
import { getSettingValue } from "@/lib/settings/get-setting";
import { HAIKU_MODEL } from "@/lib/ai/model";

// ── 1. Entity Extraction ──

interface ExtractedEntity {
  name: string;
  type: "actor" | "location" | "event" | "ticker" | "sector" | "organization";
}

interface ExtractedRelationship {
  from: string;
  to: string;
  type: "affects" | "triggers" | "opposes" | "allies" | "located_in" | "correlated_with" | "monitors";
}

interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

/**
 * Extract entities and relationships from knowledge content using Haiku.
 * Runs in background after knowledge is added, never blocks the insert.
 */
export async function extractAndLinkEntities(knowledgeId: number): Promise<void> {
  try {
    const rows = await db.select().from(schema.knowledge).where(eq(schema.knowledge.id, knowledgeId));
    const entry = rows[0];
    if (!entry) return;

    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
    if (!apiKey) return;

    const client = new Anthropic({ apiKey });
    const text = `${entry.title}\n\n${entry.content.slice(0, 2000)}`;

    const res = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Extract entities and relationships from this intelligence text. Return JSON only.

Entity types: actor (person, country, group), location, event, ticker (market symbol), sector (market sector), organization
Relationship types: affects, triggers, opposes, allies, located_in, correlated_with, monitors

Text:
${text}

Return: {"entities":[{"name":"...","type":"..."}],"relationships":[{"from":"...","to":"...","type":"..."}]}
Return ONLY the JSON.`,
      }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const result: ExtractionResult = JSON.parse(jsonMatch[0]);
    if (!result.entities || !Array.isArray(result.entities)) return;

    // Create entity nodes in graph
    const entityMap = new Map<string, number>();
    for (const ent of result.entities.slice(0, 15)) {
      if (!ent.name || ent.name.length < 2) continue;
      const validTypes = ["actor", "location", "event", "ticker", "sector", "organization"];
      const type = validTypes.includes(ent.type) ? ent.type : "actor";
      const node = await upsertEntity(type, ent.name, { extractedFrom: knowledgeId }, "knowledge", `k:${knowledgeId}:${ent.name}`);
      entityMap.set(ent.name, node.id);
    }

    // Create relationship edges
    if (result.relationships && Array.isArray(result.relationships)) {
      for (const rel of result.relationships.slice(0, 20)) {
        const fromId = entityMap.get(rel.from);
        const toId = entityMap.get(rel.to);
        if (fromId && toId && fromId !== toId) {
          const validRelTypes = ["affects", "triggers", "opposes", "allies", "located_in", "correlated_with", "monitors"];
          const relType = validRelTypes.includes(rel.type) ? rel.type : "affects";
          await upsertRelationship(fromId, toId, relType, 0.7);
        }
      }
    }

    // Link the knowledge entry itself to extracted entities
    const knowledgeNode = await upsertEntity("knowledge", entry.title, {
      category: entry.category,
      confidence: entry.confidence,
      knowledgeId: entry.id,
    }, "knowledge_entry", `ke:${knowledgeId}`);

    for (const [, entityId] of entityMap) {
      await upsertRelationship(knowledgeNode.id, entityId, "mentions", 0.8);
    }
  } catch (err) {
    console.error(`[GraphRAG] Entity extraction failed for knowledge ${knowledgeId}:`, err);
  }
}

// ── 2. Cross-Linking ──

/**
 * Find and link related knowledge entries via embedding similarity.
 * Creates "related_to" edges in the graph between knowledge nodes.
 */
export async function crossLinkKnowledge(knowledgeId: number): Promise<void> {
  try {
    // Find similar entries via vector similarity
    const similarRows = await db.execute(sql`
      SELECT k2.id, k2.title,
        1 - (k1.embedding <=> k2.embedding) as similarity
      FROM knowledge k1, knowledge k2
      WHERE k1.id = ${knowledgeId}
        AND k2.id != ${knowledgeId}
        AND k1.embedding IS NOT NULL
        AND k2.embedding IS NOT NULL
        AND k2.status = 'active'
      ORDER BY k1.embedding <=> k2.embedding
      LIMIT 5
    `);

    const similar = similarRows.rows as Array<{ id: number; title: string; similarity: number }>;

    // Only link entries with similarity > 0.6
    const strong = similar.filter((s) => s.similarity > 0.6);
    if (strong.length === 0) return;

    // Ensure source knowledge has a graph node
    const sourceNode = await upsertEntity("knowledge", "", {}, "knowledge_entry", `ke:${knowledgeId}`);

    for (const match of strong) {
      const targetNode = await upsertEntity("knowledge", match.title, {}, "knowledge_entry", `ke:${match.id}`);
      await upsertRelationship(sourceNode.id, targetNode.id, "correlated_with", match.similarity);
    }
  } catch (err) {
    // Cross-linking is best-effort, don't fail the ingest
    console.error(`[GraphRAG] Cross-linking failed for knowledge ${knowledgeId}:`, err);
  }
}

// ── 3. Graph-Aware Search ──

/**
 * Augment vector search results with graph-discovered context.
 * For each result, traverse 1 hop in the graph to find connected knowledge.
 */
export async function graphAugmentedSearch(
  baseResults: Array<{ id: number; title: string; content: string; category: string; confidence: number | null }>,
  limit: number = 20
): Promise<Array<{ id: number; title: string; content: string; category: string; confidence: number | null; graphContext?: string[] }>> {
  if (baseResults.length === 0) return [];

  try {
    // Find knowledge nodes for base results
    const knowledgeSourceIds = baseResults.map((r) => `ke:${r.id}`);
    const graphNodes = await db.select().from(schema.entities)
      .where(and(
        eq(schema.entities.sourceType, "knowledge_entry"),
      ));

    const matchedNodeIds = graphNodes
      .filter((n) => knowledgeSourceIds.includes(n.sourceId || ""))
      .map((n) => n.id);

    if (matchedNodeIds.length === 0) return baseResults;

    // Find connected entities 1 hop away
    const allRels = await db.select().from(schema.relationships);
    const connectedEntityIds = new Set<number>();
    for (const rel of allRels) {
      if (matchedNodeIds.includes(rel.fromEntityId)) connectedEntityIds.add(rel.toEntityId);
      if (matchedNodeIds.includes(rel.toEntityId)) connectedEntityIds.add(rel.fromEntityId);
    }

    // Find knowledge entries connected via graph but not in base results
    const baseIds = new Set(baseResults.map((r) => r.id));
    const connectedKnowledgeNodes = graphNodes
      .filter((n) => connectedEntityIds.has(n.id) && n.sourceId?.startsWith("ke:"))
      .map((n) => parseInt(n.sourceId!.replace("ke:", ""), 10))
      .filter((id) => !isNaN(id) && !baseIds.has(id));

    if (connectedKnowledgeNodes.length === 0) return baseResults;

    // Fetch the graph-discovered knowledge entries
    const graphDiscovered = await db.select().from(schema.knowledge)
      .where(
        sql`id = ANY(${connectedKnowledgeNodes.slice(0, 5)}::int[]) AND status = 'active'`
      )
      .orderBy(desc(schema.knowledge.confidence));

    // Annotate base results with graph context
    const enriched = baseResults.map((r) => {
      // Find entities connected to this knowledge entry
      const nodeId = graphNodes.find((n) => n.sourceId === `ke:${r.id}`)?.id;
      if (!nodeId) return r;

      const connected = allRels
        .filter((rel) => rel.fromEntityId === nodeId || rel.toEntityId === nodeId)
        .map((rel) => {
          const otherId = rel.fromEntityId === nodeId ? rel.toEntityId : rel.fromEntityId;
          const other = graphNodes.find((n) => n.id === otherId);
          return other ? `${other.name} (${other.type}, ${rel.type})` : null;
        })
        .filter(Boolean) as string[];

      return { ...r, graphContext: connected.length > 0 ? connected.slice(0, 5) : undefined };
    });

    // Append graph-discovered entries at the end
    const combined = [
      ...enriched,
      ...graphDiscovered.map((k) => ({
        id: k.id,
        title: k.title,
        content: k.content,
        category: k.category,
        confidence: k.confidence,
        graphContext: ["[discovered via graph connection]"],
      })),
    ];

    return combined.slice(0, limit);
  } catch (err) {
    console.error("[GraphRAG] Graph augmentation failed:", err);
    return baseResults;
  }
}

// ── 4. Entity Neighborhood (for chat explore_connections tool) ──

export interface EntityNeighborhood {
  center: { name: string; type: string };
  connections: Array<{
    name: string;
    type: string;
    relationship: string;
    weight: number;
  }>;
  relatedKnowledge: Array<{
    id: number;
    title: string;
    category: string;
    confidence: number | null;
  }>;
}

/**
 * Explore an entity's neighborhood in the graph.
 * Returns connected entities and related knowledge entries.
 */
export async function exploreEntityNeighborhood(query: string): Promise<EntityNeighborhood | null> {
  type EntityRow = typeof schema.entities.$inferSelect;
  const allEntities: EntityRow[] = await db.select().from(schema.entities);
  const q = query.toLowerCase();

  // Find best matching entity
  const match = allEntities
    .filter((e) => e.name.toLowerCase().includes(q) || q.includes(e.name.toLowerCase()))
    .sort((a, b) => {
      // Prefer exact matches
      const aExact = a.name.toLowerCase() === q ? 0 : 1;
      const bExact = b.name.toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      // Then prefer shorter names (more specific)
      return a.name.length - b.name.length;
    })[0];

  if (!match) return null;

  const allRels = await db.select().from(schema.relationships);
  const entityMap = new Map<number, EntityRow>(allEntities.map((e) => [e.id, e]));

  // Get 1-hop connections
  const connections: EntityNeighborhood["connections"] = [];
  for (const rel of allRels) {
    if (rel.fromEntityId === match.id) {
      const target = entityMap.get(rel.toEntityId);
      if (target) connections.push({ name: target.name, type: target.type, relationship: rel.type, weight: rel.weight || 1 });
    }
    if (rel.toEntityId === match.id) {
      const source = entityMap.get(rel.fromEntityId);
      if (source) connections.push({ name: source.name, type: source.type, relationship: rel.type, weight: rel.weight || 1 });
    }
  }

  // Sort by weight, deduplicate
  const seen = new Set<string>();
  const uniqueConnections = connections
    .sort((a, b) => b.weight - a.weight)
    .filter((c) => {
      const key = `${c.name}:${c.relationship}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);

  // Find knowledge entries linked to this entity or its neighbors
  const knowledgeNodeIds = new Set<number>();
  const connectedIds = new Set([match.id, ...connections.map((c) => {
    const e = allEntities.find((e) => e.name === c.name);
    return e?.id;
  }).filter(Boolean) as number[]]);

  for (const rel of allRels) {
    if (connectedIds.has(rel.fromEntityId) || connectedIds.has(rel.toEntityId)) {
      const otherId = connectedIds.has(rel.fromEntityId) ? rel.toEntityId : rel.fromEntityId;
      const otherEntity = entityMap.get(otherId);
      if (otherEntity?.sourceId?.startsWith("ke:")) {
        knowledgeNodeIds.add(parseInt(otherEntity.sourceId.replace("ke:", ""), 10));
      }
    }
  }

  // Also check if the matched entity itself is a knowledge node
  for (const ent of allEntities) {
    if (ent.sourceType === "knowledge_entry" && ent.sourceId?.startsWith("ke:")) {
      // Check if this knowledge node is connected to our match
      const knId = parseInt(ent.sourceId.replace("ke:", ""), 10);
      const isConnected = allRels.some(
        (r) => (r.fromEntityId === match.id && r.toEntityId === ent.id) ||
               (r.toEntityId === match.id && r.fromEntityId === ent.id)
      );
      if (isConnected) knowledgeNodeIds.add(knId);
    }
  }

  let relatedKnowledge: EntityNeighborhood["relatedKnowledge"] = [];
  if (knowledgeNodeIds.size > 0) {
    const ids = Array.from(knowledgeNodeIds).slice(0, 10);
    const rows = await db.select({
      id: schema.knowledge.id,
      title: schema.knowledge.title,
      category: schema.knowledge.category,
      confidence: schema.knowledge.confidence,
    }).from(schema.knowledge)
      .where(sql`id = ANY(${ids}::int[]) AND status = 'active'`);
    relatedKnowledge = rows;
  }

  return {
    center: { name: match.name, type: match.type },
    connections: uniqueConnections,
    relatedKnowledge,
  };
}
