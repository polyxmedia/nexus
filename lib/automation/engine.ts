/**
 * Automation Rules Engine
 *
 * Evaluates trigger conditions against live platform state and executes
 * action chains when conditions are met. Runs on the scheduler every 5 min.
 *
 * Trigger types:
 *   - signal_threshold: fires when signal intensity >= threshold
 *   - prediction_resolved: fires when a prediction resolves with specific outcome
 *   - iw_level_change: fires when I&W scenario escalation level changes
 *   - sentiment_shift: fires when social sentiment crosses a threshold
 *   - price_alert: fires when an asset price crosses a level
 *   - schedule: fires on a cron-like schedule (every N hours)
 *
 * Action types:
 *   - send_telegram: send message to Telegram
 *   - send_email: send email notification
 *   - run_analysis: trigger AI analysis on a topic
 *   - generate_thesis: run thesis generation
 *   - generate_predictions: run prediction generation
 *   - update_iw: activate an I&W indicator
 *   - log: write to knowledge bank
 */

import { db, schema } from "../db";
import { eq, and, desc } from "drizzle-orm";

// ── Types ──

export interface TriggerConfig {
  // signal_threshold
  category?: string; // GEO, MKT, OSI, etc
  minIntensity?: number;
  keywords?: string[];

  // prediction_resolved
  outcome?: string; // confirmed, denied, partial
  minConfidence?: number;

  // iw_level_change
  scenarioId?: string;
  minLevel?: number;
  direction?: "up" | "down" | "any";

  // sentiment_shift
  topic?: string;
  sentimentThreshold?: number; // -1 to 1
  sentimentDirection?: "above" | "below";

  // price_alert
  symbol?: string;
  priceLevel?: number;
  priceDirection?: "above" | "below";

  // schedule
  intervalHours?: number;
}

export interface ActionConfig {
  type: "send_telegram" | "send_email" | "run_analysis" | "generate_thesis" | "generate_predictions" | "update_iw" | "log";
  config: Record<string, unknown>;
}

export interface AutomationRule {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  triggerConfig: TriggerConfig;
  actions: ActionConfig[];
  lastTriggeredAt: string | null;
  triggerCount: number;
  lastError: string | null;
  cooldownMinutes: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Rule CRUD ──

export async function getRules(): Promise<AutomationRule[]> {
  const rows = await db.select().from(schema.automationRules).orderBy(desc(schema.automationRules.id));
  return rows.map(parseRule);
}

export async function getEnabledRules(): Promise<AutomationRule[]> {
  const rows = await db.select().from(schema.automationRules)
    .where(eq(schema.automationRules.enabled, 1))
    .orderBy(desc(schema.automationRules.id));
  return rows.map(parseRule);
}

export async function getRule(id: number): Promise<AutomationRule | null> {
  const rows = await db.select().from(schema.automationRules).where(eq(schema.automationRules.id, id));
  return rows.length > 0 ? parseRule(rows[0]) : null;
}

export async function createRule(input: {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: TriggerConfig;
  actions: ActionConfig[];
  cooldownMinutes?: number;
  createdBy?: string;
}): Promise<AutomationRule> {
  const [row] = await db.insert(schema.automationRules).values({
    name: input.name,
    description: input.description || null,
    triggerType: input.triggerType,
    triggerConfig: JSON.stringify(input.triggerConfig),
    actions: JSON.stringify(input.actions),
    cooldownMinutes: input.cooldownMinutes || 30,
    createdBy: input.createdBy || null,
  }).returning();
  return parseRule(row);
}

export async function updateRule(id: number, updates: Partial<{
  name: string;
  description: string;
  enabled: boolean;
  triggerType: string;
  triggerConfig: TriggerConfig;
  actions: ActionConfig[];
  cooldownMinutes: number;
}>): Promise<AutomationRule | null> {
  const setValues: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.enabled !== undefined) setValues.enabled = updates.enabled ? 1 : 0;
  if (updates.triggerType !== undefined) setValues.triggerType = updates.triggerType;
  if (updates.triggerConfig !== undefined) setValues.triggerConfig = JSON.stringify(updates.triggerConfig);
  if (updates.actions !== undefined) setValues.actions = JSON.stringify(updates.actions);
  if (updates.cooldownMinutes !== undefined) setValues.cooldownMinutes = updates.cooldownMinutes;

  const [row] = await db.update(schema.automationRules)
    .set(setValues)
    .where(eq(schema.automationRules.id, id))
    .returning();
  return row ? parseRule(row) : null;
}

export async function deleteRule(id: number): Promise<boolean> {
  const rows = await db.delete(schema.automationRules).where(eq(schema.automationRules.id, id)).returning();
  return rows.length > 0;
}

// ── Trigger Evaluation ──

export async function evaluateRules(): Promise<{ evaluated: number; triggered: number; errors: number }> {
  const rules = await getEnabledRules();
  let triggered = 0;
  let errors = 0;
  const now = Date.now();

  for (const rule of rules) {
    try {
      // Check cooldown
      if (rule.lastTriggeredAt) {
        const elapsed = now - new Date(rule.lastTriggeredAt).getTime();
        if (elapsed < rule.cooldownMinutes * 60 * 1000) continue;
      }

      const shouldFire = await evaluateTrigger(rule);
      if (!shouldFire) continue;

      // Execute actions
      const actionResults: string[] = [];
      for (const action of rule.actions) {
        try {
          const result = await executeAction(action, rule);
          actionResults.push(`${action.type}: ok`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          actionResults.push(`${action.type}: FAILED - ${msg}`);
        }
      }

      // Record trigger
      await db.update(schema.automationRules).set({
        lastTriggeredAt: new Date().toISOString(),
        triggerCount: rule.triggerCount + 1,
        lastError: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.automationRules.id, rule.id));

      triggered++;
      console.log(`[automation] Rule "${rule.name}" fired: ${actionResults.join(", ")}`);
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      await db.update(schema.automationRules).set({
        lastError: msg,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.automationRules.id, rule.id)).catch(() => {});
      console.error(`[automation] Rule "${rule.name}" error: ${msg}`);
    }
  }

  return { evaluated: rules.length, triggered, errors };
}

async function evaluateTrigger(rule: AutomationRule): Promise<boolean> {
  const cfg = rule.triggerConfig;

  switch (rule.triggerType) {
    case "signal_threshold": {
      const signals = await db.select({
        intensity: schema.signals.intensity,
        category: schema.signals.category,
        title: schema.signals.title,
      }).from(schema.signals)
        .where(eq(schema.signals.status, "active"))
        .orderBy(desc(schema.signals.id))
        .limit(20);

      return signals.some((s) => {
        if (cfg.minIntensity && s.intensity < cfg.minIntensity) return false;
        if (cfg.category && s.category !== cfg.category) return false;
        if (cfg.keywords?.length) {
          const text = s.title.toLowerCase();
          return cfg.keywords.some((kw) => text.includes(kw.toLowerCase()));
        }
        return true;
      });
    }

    case "prediction_resolved": {
      // Check if any predictions resolved since last trigger
      const since = rule.lastTriggeredAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const resolved = await db.select({
        outcome: schema.predictions.outcome,
        confidence: schema.predictions.confidence,
        resolvedAt: schema.predictions.resolvedAt,
      }).from(schema.predictions)
        .orderBy(desc(schema.predictions.resolvedAt))
        .limit(20);

      return resolved.some((p) => {
        if (!p.resolvedAt || p.resolvedAt < since) return false;
        if (cfg.outcome && p.outcome !== cfg.outcome) return false;
        if (cfg.minConfidence && p.confidence < cfg.minConfidence) return false;
        return true;
      });
    }

    case "iw_level_change": {
      if (!cfg.scenarioId) return false;
      const { evaluateScenario } = await import("@/lib/iw/engine");
      const status = await evaluateScenario(cfg.scenarioId);
      if (!status) return false;
      if (cfg.minLevel && status.escalationLevel < cfg.minLevel) return false;
      return true;
    }

    case "sentiment_shift": {
      if (!cfg.topic) return false;
      const { getCachedSentiment } = await import("@/lib/sentiment/aggregator");
      const sentiment = await getCachedSentiment(cfg.topic);
      if (!sentiment) return false;
      const score = sentiment.composite.sentiment;
      if (cfg.sentimentDirection === "above" && cfg.sentimentThreshold !== undefined) {
        return score >= cfg.sentimentThreshold;
      }
      if (cfg.sentimentDirection === "below" && cfg.sentimentThreshold !== undefined) {
        return score <= cfg.sentimentThreshold;
      }
      return false;
    }

    case "price_alert": {
      if (!cfg.symbol || !cfg.priceLevel) return false;
      try {
        const { getQuote } = await import("@/lib/market-data/provider");
        const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "alpha_vantage_api_key")).limit(1);
        const apiKey = rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || "";
        if (!apiKey) return false;
        const quote = await getQuote(cfg.symbol, apiKey);
        if (!quote) return false;
        if (cfg.priceDirection === "above") return quote.price >= cfg.priceLevel;
        if (cfg.priceDirection === "below") return quote.price <= cfg.priceLevel;
      } catch { return false; }
      return false;
    }

    case "schedule": {
      // Simple interval-based: fire if enough time has passed
      if (!cfg.intervalHours) return false;
      if (!rule.lastTriggeredAt) return true; // Never fired, fire now
      const elapsed = Date.now() - new Date(rule.lastTriggeredAt).getTime();
      return elapsed >= cfg.intervalHours * 60 * 60 * 1000;
    }

    default:
      return false;
  }
}

// ── Action Execution ──

async function executeAction(action: ActionConfig, rule: AutomationRule): Promise<void> {
  switch (action.type) {
    case "send_telegram": {
      const { broadcastAlert } = await import("@/lib/telegram/alerts");
      const message = (action.config.message as string) || `Automation "${rule.name}" triggered`;
      await broadcastAlert("automation", message);
      break;
    }

    case "run_analysis": {
      const topic = (action.config.topic as string) || rule.name;
      // Store as knowledge bank entry for the analyst to pick up
      const { addKnowledge } = await import("@/lib/knowledge/engine");
      await addKnowledge({
        title: `Automation: ${rule.name}`,
        content: `Automation rule "${rule.name}" triggered. Topic: ${topic}. Trigger: ${rule.triggerType}. This entry was auto-generated for analyst review.`,
        category: "automation",
        source: "automation-engine",
      });
      break;
    }

    case "generate_predictions": {
      const { generatePredictions } = await import("@/lib/predictions/engine");
      const topic = (action.config.topic as string) || undefined;
      await generatePredictions({ topic });
      break;
    }

    case "update_iw": {
      const scenarioId = action.config.scenarioId as string;
      const indicatorId = action.config.indicatorId as string;
      const status = (action.config.status as string) || "watching";
      if (scenarioId && indicatorId) {
        const { activateIndicator } = await import("@/lib/iw/engine");
        await activateIndicator(scenarioId, indicatorId, status as "watching" | "active" | "confirmed", `Activated by automation: ${rule.name}`);
      }
      break;
    }

    case "log": {
      const message = (action.config.message as string) || `Rule "${rule.name}" triggered`;
      const { addKnowledge } = await import("@/lib/knowledge/engine");
      await addKnowledge({
        title: `Automation Log: ${rule.name}`,
        content: message,
        category: "automation",
        source: "automation-engine",
      });
      break;
    }

    default:
      console.warn(`[automation] Unknown action type: ${action.type}`);
  }
}

// ── Helpers ──

function parseRule(row: typeof schema.automationRules.$inferSelect): AutomationRule {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    description: row.description,
    enabled: row.enabled === 1,
    triggerType: row.triggerType,
    triggerConfig: JSON.parse(row.triggerConfig) as TriggerConfig,
    actions: JSON.parse(row.actions) as ActionConfig[],
    lastTriggeredAt: row.lastTriggeredAt,
    triggerCount: row.triggerCount,
    lastError: row.lastError,
    cooldownMinutes: row.cooldownMinutes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
