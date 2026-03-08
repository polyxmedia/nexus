// I&W Evaluation Engine
// Manages indicator activation, scoring, and auto-detection from OSINT feeds

import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { THREAT_SCENARIOS, getScenario, type IndicatorStatus, type ThreatScenario } from "./scenarios";

const STATUS_MULTIPLIER: Record<IndicatorStatus, number> = {
  inactive: 0,
  watching: 0.3,
  active: 0.7,
  confirmed: 1.0,
};

export interface IndicatorState {
  indicatorId: string;
  status: IndicatorStatus;
  activatedAt: string | null;
  evidence: string | null;
}

export interface ScenarioStatus {
  scenarioId: string;
  name: string;
  region: string;
  escalationLevel: number;
  escalationName: string;
  score: number; // 0-100 percentage of max
  maxScore: number;
  currentScore: number;
  activeIndicatorCount: number;
  totalIndicatorCount: number;
  indicators: Array<{
    id: string;
    title: string;
    category: string;
    weight: number;
    status: IndicatorStatus;
    activatedAt: string | null;
    evidence: string | null;
    contribution: number; // weighted score contribution
  }>;
  marketSectors: string[];
  marketImpact: string;
  lastEvaluated: string;
}

// Get indicator states from settings table
async function getIndicatorStates(scenarioId: string): Promise<Map<string, IndicatorState>> {
  const key = `iw:indicators:${scenarioId}`;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1);

  if (rows.length === 0 || !rows[0].value) return new Map();

  try {
    const states: IndicatorState[] = JSON.parse(rows[0].value);
    return new Map(states.map(s => [s.indicatorId, s]));
  } catch {
    return new Map();
  }
}

// Save indicator states
async function saveIndicatorStates(scenarioId: string, states: Map<string, IndicatorState>): Promise<void> {
  const key = `iw:indicators:${scenarioId}`;
  const value = JSON.stringify(Array.from(states.values()));
  const now = new Date().toISOString();

  const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key));
  } else {
    await db.insert(schema.settings).values({ key, value, updatedAt: now });
  }
}

// Save escalation history
async function recordEscalationChange(
  scenarioId: string,
  fromLevel: number,
  toLevel: number,
  score: number,
  triggeredBy: string
): Promise<void> {
  const key = `iw:escalation-history:${scenarioId}`;
  const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  const history: Array<{ from: number; to: number; score: number; triggeredBy: string; timestamp: string }> = existing.length > 0 && existing[0].value
    ? JSON.parse(existing[0].value)
    : [];

  history.push({ from: fromLevel, to: toLevel, score, triggeredBy, timestamp: new Date().toISOString() });

  // Keep last 100 entries
  const trimmed = history.slice(-100);
  const value = JSON.stringify(trimmed);
  const now = new Date().toISOString();

  if (existing.length > 0) {
    await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key));
  } else {
    await db.insert(schema.settings).values({ key, value, updatedAt: now });
  }
}

function calculateScore(scenario: ThreatScenario, states: Map<string, IndicatorState>): { score: number; maxScore: number; currentScore: number } {
  const maxScore = scenario.indicators.reduce((sum, ind) => sum + ind.weight, 0);
  let currentScore = 0;

  for (const indicator of scenario.indicators) {
    const state = states.get(indicator.id);
    const status = state?.status || "inactive";
    const multiplier = STATUS_MULTIPLIER[status];
    currentScore += indicator.weight * multiplier;
  }

  const score = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;
  return { score, maxScore, currentScore: Math.round(currentScore * 10) / 10 };
}

function getEscalationLevel(scenario: ThreatScenario, scorePercent: number): { level: number; name: string; marketImpact: string } {
  let current = scenario.escalationLevels[0];
  for (const level of scenario.escalationLevels) {
    if (scorePercent >= level.thresholdPercent) {
      current = level;
    }
  }
  return { level: current.level, name: current.name, marketImpact: current.marketImpact };
}

export async function evaluateScenario(scenarioId: string): Promise<ScenarioStatus | null> {
  const scenario = getScenario(scenarioId);
  if (!scenario) return null;

  const states = await getIndicatorStates(scenarioId);
  const { score, maxScore, currentScore } = calculateScore(scenario, states);
  const escalation = getEscalationLevel(scenario, score);

  // Check for escalation change
  const prevKey = `iw:prev-escalation:${scenarioId}`;
  const prevRows = await db.select().from(schema.settings).where(eq(schema.settings.key, prevKey)).limit(1);
  const prevLevel = prevRows.length > 0 && prevRows[0].value ? parseInt(prevRows[0].value) : 1;

  if (escalation.level !== prevLevel) {
    await recordEscalationChange(scenarioId, prevLevel, escalation.level, score, "evaluation");
    const now = new Date().toISOString();
    if (prevRows.length > 0) {
      await db.update(schema.settings).set({ value: String(escalation.level), updatedAt: now }).where(eq(schema.settings.key, prevKey));
    } else {
      await db.insert(schema.settings).values({ key: prevKey, value: String(escalation.level), updatedAt: now });
    }
  }

  const activeCount = scenario.indicators.filter(ind => {
    const s = states.get(ind.id)?.status || "inactive";
    return s !== "inactive";
  }).length;

  return {
    scenarioId: scenario.id,
    name: scenario.name,
    region: scenario.region,
    escalationLevel: escalation.level,
    escalationName: escalation.name,
    score,
    maxScore,
    currentScore,
    activeIndicatorCount: activeCount,
    totalIndicatorCount: scenario.indicators.length,
    indicators: scenario.indicators.map(ind => {
      const state = states.get(ind.id);
      const status = state?.status || "inactive";
      return {
        id: ind.id,
        title: ind.title,
        category: ind.category,
        weight: ind.weight,
        status,
        activatedAt: state?.activatedAt || null,
        evidence: state?.evidence || null,
        contribution: Math.round(ind.weight * STATUS_MULTIPLIER[status] * 10) / 10,
      };
    }),
    marketSectors: scenario.marketSectors,
    marketImpact: escalation.marketImpact,
    lastEvaluated: new Date().toISOString(),
  };
}

export async function activateIndicator(
  scenarioId: string,
  indicatorId: string,
  status: IndicatorStatus,
  evidence: string
): Promise<{ success: boolean; error?: string }> {
  const scenario = getScenario(scenarioId);
  if (!scenario) return { success: false, error: "Scenario not found" };

  const indicator = scenario.indicators.find(i => i.id === indicatorId);
  if (!indicator) return { success: false, error: "Indicator not found" };

  const states = await getIndicatorStates(scenarioId);
  states.set(indicatorId, {
    indicatorId,
    status,
    activatedAt: status !== "inactive" ? new Date().toISOString() : null,
    evidence: status !== "inactive" ? evidence : null,
  });

  await saveIndicatorStates(scenarioId, states);
  return { success: true };
}

export async function deactivateIndicator(
  scenarioId: string,
  indicatorId: string
): Promise<{ success: boolean }> {
  const states = await getIndicatorStates(scenarioId);
  states.set(indicatorId, {
    indicatorId,
    status: "inactive",
    activatedAt: null,
    evidence: null,
  });
  await saveIndicatorStates(scenarioId, states);
  return { success: true };
}

export async function getAllScenarioStatuses(): Promise<ScenarioStatus[]> {
  const results: ScenarioStatus[] = [];
  for (const scenario of THREAT_SCENARIOS) {
    const status = await evaluateScenario(scenario.id);
    if (status) results.push(status);
  }
  return results;
}

// Auto-detect indicators by matching GDELT/OSINT headlines against detection queries
export async function autoDetectIndicators(): Promise<{
  scenariosChecked: number;
  suggestedActivations: Array<{
    scenarioId: string;
    scenarioName: string;
    indicatorId: string;
    indicatorTitle: string;
    matchedHeadlines: string[];
    currentStatus: IndicatorStatus;
    suggestedStatus: IndicatorStatus;
  }>;
}> {
  const suggestions: Array<{
    scenarioId: string;
    scenarioName: string;
    indicatorId: string;
    indicatorTitle: string;
    matchedHeadlines: string[];
    currentStatus: IndicatorStatus;
    suggestedStatus: IndicatorStatus;
  }> = [];

  // Fetch recent OSINT events/articles from GDELT
  let recentHeadlines: string[] = [];
  try {
    const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20military%20OR%20crisis%20OR%20attack%20OR%20nuclear%20OR%20sanctions&mode=ArtList&maxrecords=50&format=json&sort=DateDesc";
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const json = await res.json();
      recentHeadlines = (json?.articles || [])
        .map((a: { title?: string }) => (a.title || "").toLowerCase())
        .filter((t: string) => t.length > 10);
    }
  } catch {
    // Continue with empty headlines
  }

  if (recentHeadlines.length === 0) {
    return { scenariosChecked: THREAT_SCENARIOS.length, suggestedActivations: [] };
  }

  for (const scenario of THREAT_SCENARIOS) {
    const states = await getIndicatorStates(scenario.id);

    for (const indicator of scenario.indicators) {
      const currentStatus = states.get(indicator.id)?.status || "inactive";
      if (currentStatus === "confirmed") continue; // Already confirmed, skip

      // Check if any headlines match the detection query keywords
      const queryWords = indicator.detectionQuery.toLowerCase().split(/\s+/);
      const matchedHeadlines: string[] = [];

      for (const headline of recentHeadlines) {
        // Require at least 2 keyword matches for relevance
        const matchCount = queryWords.filter(word => headline.includes(word)).length;
        if (matchCount >= 2) {
          matchedHeadlines.push(headline);
        }
      }

      if (matchedHeadlines.length > 0) {
        // Suggest escalation based on match strength
        let suggestedStatus: IndicatorStatus;
        if (matchedHeadlines.length >= 5) suggestedStatus = "active";
        else if (matchedHeadlines.length >= 2) suggestedStatus = "watching";
        else suggestedStatus = "watching";

        // Only suggest if it would be an escalation
        const statusOrder: IndicatorStatus[] = ["inactive", "watching", "active", "confirmed"];
        if (statusOrder.indexOf(suggestedStatus) > statusOrder.indexOf(currentStatus)) {
          suggestions.push({
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            indicatorId: indicator.id,
            indicatorTitle: indicator.title,
            matchedHeadlines: matchedHeadlines.slice(0, 5),
            currentStatus,
            suggestedStatus,
          });

          // Auto-activate if enough evidence and currently inactive
          if (currentStatus === "inactive" && matchedHeadlines.length >= 3) {
            await activateIndicator(
              scenario.id,
              indicator.id,
              "watching",
              `Auto-detected from ${matchedHeadlines.length} matching headlines: ${matchedHeadlines[0]}`
            );
          }
        }
      }
    }
  }

  return { scenariosChecked: THREAT_SCENARIOS.length, suggestedActivations: suggestions };
}

export async function getEscalationHistory(scenarioId: string): Promise<Array<{
  from: number;
  to: number;
  score: number;
  triggeredBy: string;
  timestamp: string;
}>> {
  const key = `iw:escalation-history:${scenarioId}`;
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  if (rows.length === 0 || !rows[0].value) return [];
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return [];
  }
}
