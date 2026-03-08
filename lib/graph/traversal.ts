import { db, schema } from "@/lib/db";
import { eq, or, ilike } from "drizzle-orm";

type EntityRow = typeof schema.entities.$inferSelect;
type RelationshipRow = typeof schema.relationships.$inferSelect;

export interface GraphNode {
  id: number;
  name: string;
  type: string;
  metadata: Record<string, unknown>;
  depth: number;
  connectionPath: string[];
}

export interface GraphPath {
  nodes: GraphNode[];
  relationships: { from: string; to: string; type: string; weight: number }[];
  totalWeight: number;
}

// BFS traversal from a starting entity
export async function traverseFrom(entityId: number, maxDepth: number = 2): Promise<GraphNode[]> {
  const allEntities = await db.select().from(schema.entities);
  const allRelationships = await db.select().from(schema.relationships);

  const entityMap = new Map<number, EntityRow>();
  for (const e of allEntities) entityMap.set(e.id, e);

  // Build adjacency list
  const adjacency = new Map<number, Array<{ targetId: number; relType: string; weight: number }>>();
  for (const r of allRelationships) {
    if (!adjacency.has(r.fromEntityId)) adjacency.set(r.fromEntityId, []);
    if (!adjacency.has(r.toEntityId)) adjacency.set(r.toEntityId, []);
    adjacency.get(r.fromEntityId)!.push({ targetId: r.toEntityId, relType: r.type, weight: r.weight || 1 });
    adjacency.get(r.toEntityId)!.push({ targetId: r.fromEntityId, relType: r.type, weight: r.weight || 1 });
  }

  const visited = new Set<number>();
  const result: GraphNode[] = [];
  const queue: Array<{ id: number; depth: number; path: string[] }> = [
    { id: entityId, depth: 0, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    if (current.depth > maxDepth) continue;
    visited.add(current.id);

    const entity = entityMap.get(current.id);
    if (!entity) continue;

    const metadata = entity.properties ? safeParse(entity.properties) : {};
    result.push({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      metadata,
      depth: current.depth,
      connectionPath: current.path,
    });

    const neighbors = adjacency.get(current.id) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.targetId)) {
        const neighborEntity = entityMap.get(neighbor.targetId);
        const pathStep = `${entity.name} -[${neighbor.relType}]-> ${neighborEntity?.name || "?"}`;
        queue.push({
          id: neighbor.targetId,
          depth: current.depth + 1,
          path: [...current.path, pathStep],
        });
      }
    }
  }

  return result;
}

// Find all paths between two entities (BFS-based, limited depth)
export async function findPaths(fromId: number, toId: number, maxDepth: number = 4): Promise<GraphPath[]> {
  const allEntities = await db.select().from(schema.entities);
  const allRelationships = await db.select().from(schema.relationships);

  const entityMap = new Map<number, EntityRow>();
  for (const e of allEntities) entityMap.set(e.id, e);

  const adjacency = new Map<number, Array<{ targetId: number; rel: RelationshipRow }>>();
  for (const r of allRelationships) {
    if (!adjacency.has(r.fromEntityId)) adjacency.set(r.fromEntityId, []);
    if (!adjacency.has(r.toEntityId)) adjacency.set(r.toEntityId, []);
    adjacency.get(r.fromEntityId)!.push({ targetId: r.toEntityId, rel: r });
    adjacency.get(r.toEntityId)!.push({ targetId: r.fromEntityId, rel: r });
  }

  const paths: GraphPath[] = [];
  const queue: Array<{ id: number; visited: Set<number>; nodes: number[]; rels: RelationshipRow[] }> = [
    { id: fromId, visited: new Set([fromId]), nodes: [fromId], rels: [] },
  ];

  while (queue.length > 0 && paths.length < 10) {
    const current = queue.shift()!;
    if (current.nodes.length > maxDepth + 1) continue;

    if (current.id === toId && current.nodes.length > 1) {
      const graphNodes = current.nodes.map((nid, i) => {
        const e = entityMap.get(nid)!;
        return {
          id: e.id,
          name: e.name,
          type: e.type,
          metadata: e.properties ? safeParse(e.properties) : {},
          depth: i,
          connectionPath: [],
        };
      });
      const relationships = current.rels.map((r) => ({
        from: entityMap.get(r.fromEntityId)?.name || "?",
        to: entityMap.get(r.toEntityId)?.name || "?",
        type: r.type,
        weight: r.weight || 1,
      }));
      paths.push({
        nodes: graphNodes,
        relationships,
        totalWeight: relationships.reduce((s, r) => s + r.weight, 0),
      });
      continue;
    }

    const neighbors = adjacency.get(current.id) || [];
    for (const neighbor of neighbors) {
      if (!current.visited.has(neighbor.targetId)) {
        const newVisited = new Set(current.visited);
        newVisited.add(neighbor.targetId);
        queue.push({
          id: neighbor.targetId,
          visited: newVisited,
          nodes: [...current.nodes, neighbor.targetId],
          rels: [...current.rels, neighbor.rel],
        });
      }
    }
  }

  return paths.sort((a, b) => a.nodes.length - b.nodes.length);
}

// Explore an entity by name query
export async function exploreEntity(
  query: string,
  maxDepth: number = 2
): Promise<{ root: GraphNode | null; connected: GraphNode[]; paths: GraphPath[] }> {
  const entities = await db
    .select()
    .from(schema.entities)
    .where(or(
      ilike(schema.entities.name, `%${query}%`),
      ilike(schema.entities.type, `%${query}%`)
    ));

  if (entities.length === 0) {
    return { root: null, connected: [], paths: [] };
  }

  const rootEntity = entities[0];
  const connected = await traverseFrom(rootEntity.id, maxDepth);
  const root = connected.find((n) => n.id === rootEntity.id) || null;

  return { root, connected, paths: [] };
}

// Build context graph from text (extract entity mentions)
export async function buildContextGraph(
  text: string
): Promise<{ entities: GraphNode[]; paths: GraphPath[] }> {
  const allEntities = await db.select().from(schema.entities);

  // Find entities mentioned in the text (simple substring matching)
  const mentioned = allEntities.filter((e) =>
    text.toLowerCase().includes(e.name.toLowerCase()) && e.name.length > 2
  );

  if (mentioned.length === 0) {
    return { entities: [], paths: [] };
  }

  // Get subgraph for all mentioned entities
  const allNodes = new Map<number, GraphNode>();
  for (const entity of mentioned) {
    const nodes = await traverseFrom(entity.id, 1);
    for (const node of nodes) {
      if (!allNodes.has(node.id)) {
        allNodes.set(node.id, node);
      }
    }
  }

  // Find paths between mentioned entities
  const paths: GraphPath[] = [];
  for (let i = 0; i < mentioned.length; i++) {
    for (let j = i + 1; j < mentioned.length; j++) {
      const found = await findPaths(mentioned[i].id, mentioned[j].id, 3);
      paths.push(...found.slice(0, 2));
    }
  }

  return { entities: Array.from(allNodes.values()), paths };
}

function safeParse(json: string): Record<string, unknown> {
  try { return JSON.parse(json); } catch { return {}; }
}
