import "server-only";
import { db, schema } from "@/lib/db";
import { eq, or, sql } from "drizzle-orm";

export interface SupplyChainNode {
  entity: string;
  depth: number;
  relationships: Array<{
    target: string;
    type: string;
    strength: number;
    lagDays: number;
    source: string;
    direction: "upstream" | "downstream";
  }>;
}

export interface ExposureResult {
  entity: string;
  totalExposure: number;
  directExposure: number;
  indirectExposure: number;
  paths: Array<{
    chain: string[];
    strength: number;
    bottleneck: string;
  }>;
  affectedSectors: string[];
  tradingImplications: string[];
}

export async function getSupplyChain(
  entity: string,
  maxDepth = 3,
): Promise<SupplyChainNode[]> {
  // Load all edges upfront (table is small) to avoid N+1 queries
  const allEdges = await db.select().from(schema.supplyChainEdges);

  const edgesByEntity = new Map<string, typeof allEdges>();
  for (const edge of allEdges) {
    const fromList = edgesByEntity.get(edge.fromEntity) || [];
    fromList.push(edge);
    edgesByEntity.set(edge.fromEntity, fromList);

    const toList = edgesByEntity.get(edge.toEntity) || [];
    toList.push(edge);
    edgesByEntity.set(edge.toEntity, toList);
  }

  const nodes: SupplyChainNode[] = [];
  const visited = new Set<string>();

  function traverse(current: string, depth: number) {
    if (depth > maxDepth || visited.has(current)) return;
    visited.add(current);

    const edges = edgesByEntity.get(current) || [];

    const node: SupplyChainNode = {
      entity: current,
      depth,
      relationships: edges.map(e => ({
        target: e.fromEntity === current ? e.toEntity : e.fromEntity,
        type: e.relationshipType,
        strength: e.strength,
        lagDays: e.lagDays,
        source: e.source,
        direction: e.fromEntity === current ? "downstream" as const : "upstream" as const,
      })),
    };

    nodes.push(node);

    for (const rel of node.relationships) {
      if (!visited.has(rel.target)) {
        traverse(rel.target, depth + 1);
      }
    }
  }

  traverse(entity.toUpperCase(), 0);
  return nodes;
}

export async function getExposure(
  entity: string,
  shockType?: string,
): Promise<ExposureResult> {
  const resolved = entity.toUpperCase();
  const paths: ExposureResult["paths"] = [];
  const visited = new Set<string>();
  const DECAY_PER_HOP = 0.6;

  async function findPaths(
    current: string,
    currentPath: string[],
    currentStrength: number,
    depth: number,
  ) {
    if (depth > 3) return;

    const edges = await db.select().from(schema.supplyChainEdges)
      .where(eq(schema.supplyChainEdges.fromEntity, current));

    for (const edge of edges) {
      if (currentPath.includes(edge.toEntity)) continue; // No cycles

      const pathStrength = currentStrength * edge.strength * DECAY_PER_HOP;
      const newPath = [...currentPath, edge.toEntity];

      if (pathStrength > 0.05) { // Skip negligible paths
        // Find bottleneck (weakest link)
        let bottleneck = edge.toEntity;
        let minStrength = edge.strength;

        paths.push({
          chain: newPath,
          strength: Math.round(pathStrength * 1000) / 1000,
          bottleneck,
        });

        await findPaths(edge.toEntity, newPath, pathStrength, depth + 1);
      }
    }
  }

  await findPaths(resolved, [resolved], 1.0, 0);

  // Compute exposure scores
  const directPaths = paths.filter(p => p.chain.length === 2);
  const indirectPaths = paths.filter(p => p.chain.length > 2);

  const directExposure = directPaths.reduce((max, p) => Math.max(max, p.strength), 0);
  const indirectExposure = indirectPaths.reduce((max, p) => Math.max(max, p.strength), 0);
  const totalExposure = Math.min(1, directExposure + indirectExposure * 0.5);

  // Extract affected sectors (unique downstream entities)
  const affectedSectors = [...new Set(paths.flatMap(p => p.chain.slice(1)))];

  // Generate trading implications
  const tradingImplications: string[] = [];
  if (totalExposure > 0.7) {
    tradingImplications.push(`High exposure to ${resolved} disruption. Consider hedging downstream positions.`);
  }
  if (directPaths.length > 5) {
    tradingImplications.push(`${resolved} is a critical node with ${directPaths.length} direct connections. Single-point-of-failure risk.`);
  }
  if (indirectPaths.length > 0) {
    tradingImplications.push(`${indirectPaths.length} indirect exposure paths detected. Monitor 2nd-order effects.`);
  }

  return {
    entity: resolved,
    totalExposure: Math.round(totalExposure * 1000) / 1000,
    directExposure: Math.round(directExposure * 1000) / 1000,
    indirectExposure: Math.round(indirectExposure * 1000) / 1000,
    paths: paths.sort((a, b) => b.strength - a.strength).slice(0, 20),
    affectedSectors,
    tradingImplications,
  };
}

export async function addEdge(edge: {
  fromEntity: string;
  toEntity: string;
  relationshipType: string;
  strength?: number;
  lagDays?: number;
  source?: string;
  confidence?: number;
  evidence?: string;
}) {
  return db.insert(schema.supplyChainEdges).values({
    fromEntity: edge.fromEntity.toUpperCase(),
    toEntity: edge.toEntity.toUpperCase(),
    relationshipType: edge.relationshipType,
    strength: edge.strength || 0.5,
    lagDays: edge.lagDays || 0,
    source: edge.source || "manual",
    confidence: edge.confidence || 0.8,
    evidence: edge.evidence || null,
  }).returning();
}

export async function getEdgesForEntity(entity: string) {
  return db.select().from(schema.supplyChainEdges)
    .where(or(
      eq(schema.supplyChainEdges.fromEntity, entity.toUpperCase()),
      eq(schema.supplyChainEdges.toEntity, entity.toUpperCase()),
    ));
}
