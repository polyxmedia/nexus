import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type { ExecutionRule, NewExecutionRule } from "@/lib/db/schema";

export interface RuleConditions {
  minConvergence: number;        // minimum signal convergence intensity (1-5)
  regime?: string;                // peacetime | transitional | wartime | any
  signalLayers?: string[];        // required layers (e.g. ["geopolitical", "market"])
  tickers?: string[];             // specific tickers to watch
  minConfidence?: number;         // minimum prediction confidence (0-1)
  categories?: string[];          // signal categories to match
}

export interface BracketConfig {
  stopPct: number;                // stop loss percentage (e.g. 2.0 = 2%)
  takeProfitPct: number;          // take profit percentage
  trailingStop?: boolean;
}

export async function createRule(userId: string, data: {
  name: string;
  conditions: RuleConditions;
  sizingStrategy?: string;
  sizingParams?: Record<string, number>;
  bracketConfig?: BracketConfig;
  broker?: string;
  maxDailyOrders?: number;
  maxPositionPct?: number;
}): Promise<ExecutionRule> {
  const [rule] = await db.insert(schema.executionRules).values({
    userId,
    name: data.name,
    conditions: JSON.stringify(data.conditions),
    sizingStrategy: data.sizingStrategy || "tier",
    sizingParams: data.sizingParams ? JSON.stringify(data.sizingParams) : null,
    bracketConfig: data.bracketConfig ? JSON.stringify(data.bracketConfig) : null,
    broker: data.broker || "t212",
    maxDailyOrders: data.maxDailyOrders || 5,
    maxPositionPct: data.maxPositionPct || 5.0,
  }).returning();
  return rule;
}

export async function updateRule(id: number, userId: string, data: Partial<{
  name: string;
  enabled: number;
  conditions: RuleConditions;
  sizingStrategy: string;
  sizingParams: Record<string, number>;
  bracketConfig: BracketConfig;
  broker: string;
  maxDailyOrders: number;
  maxPositionPct: number;
}>): Promise<ExecutionRule | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.enabled !== undefined) updates.enabled = data.enabled;
  if (data.conditions !== undefined) updates.conditions = JSON.stringify(data.conditions);
  if (data.sizingStrategy !== undefined) updates.sizingStrategy = data.sizingStrategy;
  if (data.sizingParams !== undefined) updates.sizingParams = JSON.stringify(data.sizingParams);
  if (data.bracketConfig !== undefined) updates.bracketConfig = JSON.stringify(data.bracketConfig);
  if (data.broker !== undefined) updates.broker = data.broker;
  if (data.maxDailyOrders !== undefined) updates.maxDailyOrders = data.maxDailyOrders;
  if (data.maxPositionPct !== undefined) updates.maxPositionPct = data.maxPositionPct;

  const [updated] = await db.update(schema.executionRules)
    .set(updates)
    .where(and(eq(schema.executionRules.id, id), eq(schema.executionRules.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteRule(id: number, userId: string): Promise<boolean> {
  const result = await db.delete(schema.executionRules)
    .where(and(eq(schema.executionRules.id, id), eq(schema.executionRules.userId, userId)))
    .returning();
  return result.length > 0;
}

export async function getRules(userId: string): Promise<ExecutionRule[]> {
  return db.select().from(schema.executionRules).where(eq(schema.executionRules.userId, userId));
}

export async function toggleRule(id: number, userId: string, enabled: boolean): Promise<ExecutionRule | null> {
  return updateRule(id, userId, { enabled: enabled ? 1 : 0 });
}
