/**
 * Agent Simulation Engine
 *
 * Runs multiple AI agent personas in parallel against the same context,
 * then measures their convergence/divergence as a signal.
 */
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_PERSONAS, type AgentResult, type AgentStance } from "./personas";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const STANCE_VALUES: Record<AgentStance, number> = {
  strongly_bullish: 2,
  bullish: 1,
  neutral: 0,
  bearish: -1,
  strongly_bearish: -2,
};

const STANCE_LABELS: AgentStance[] = [
  "strongly_bearish",
  "bearish",
  "neutral",
  "bullish",
  "strongly_bullish",
];

export interface SimulationResult {
  agentResults: AgentResult[];
  convergenceScore: number; // 0-1, higher = more agreement
  convergenceLabel: string;
  dominantStance: AgentStance;
  summary: string;
}

function buildPrompt(context: string): string {
  return `Analyze the following intelligence context and provide your assessment.

<context>
${context}
</context>

Respond in EXACTLY this JSON format, no other text:
{
  "stance": "strongly_bullish" | "bullish" | "neutral" | "bearish" | "strongly_bearish",
  "confidence": <number 0-1>,
  "reasoning": "<2-3 sentence analysis from your perspective>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "dissent": "<what you disagree with vs what most analysts would say, or null>"
}`;
}

async function runAgent(
  client: Anthropic,
  persona: typeof AGENT_PERSONAS[number],
  context: string
): Promise<AgentResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: persona.systemPrompt,
    messages: [{ role: "user", content: buildPrompt(context) }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      personaId: persona.id,
      personaName: persona.name,
      role: persona.role,
      stance: parsed.stance as AgentStance,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      reasoning: parsed.reasoning || "",
      keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors.slice(0, 5) : [],
      dissent: parsed.dissent || null,
    };
  } catch {
    return {
      personaId: persona.id,
      personaName: persona.name,
      role: persona.role,
      stance: "neutral",
      confidence: 0.3,
      reasoning: "Failed to parse agent response",
      keyFactors: [],
      dissent: null,
    };
  }
}

function computeConvergence(results: AgentResult[]): {
  score: number;
  label: string;
  dominantStance: AgentStance;
} {
  if (results.length === 0) {
    return { score: 0, label: "No data", dominantStance: "neutral" };
  }

  // Weighted mean stance (weighted by confidence)
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of results) {
    const w = r.confidence;
    weightedSum += STANCE_VALUES[r.stance] * w;
    totalWeight += w;
  }
  const meanStance = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Variance of stances (lower = more convergence)
  let varianceSum = 0;
  for (const r of results) {
    const diff = STANCE_VALUES[r.stance] - meanStance;
    varianceSum += diff * diff * r.confidence;
  }
  const variance = totalWeight > 0 ? varianceSum / totalWeight : 0;

  // Max possible variance is 4 (range from -2 to 2, so max diff = 4, variance = 16/n)
  // Normalize: convergence = 1 - (variance / maxVariance)
  const maxVariance = 4; // (2 - (-2))^2 / 4 = 4
  const convergenceScore = Math.max(0, Math.min(1, 1 - variance / maxVariance));

  // Dominant stance from weighted mean
  const stanceIndex = Math.round((meanStance + 2) / 4 * (STANCE_LABELS.length - 1));
  const clampedIndex = Math.max(0, Math.min(STANCE_LABELS.length - 1, stanceIndex));
  const dominantStance = STANCE_LABELS[clampedIndex];

  // Label
  let label: string;
  if (convergenceScore >= 0.85) label = "Strong Convergence";
  else if (convergenceScore >= 0.65) label = "Moderate Convergence";
  else if (convergenceScore >= 0.45) label = "Mixed Signals";
  else if (convergenceScore >= 0.25) label = "Divergent";
  else label = "Strongly Divergent";

  return { score: convergenceScore, label, dominantStance };
}

function generateSummary(results: AgentResult[], convergence: ReturnType<typeof computeConvergence>): string {
  const stanceCounts: Record<string, number> = {};
  for (const r of results) {
    const bucket = STANCE_VALUES[r.stance] > 0 ? "bullish" : STANCE_VALUES[r.stance] < 0 ? "bearish" : "neutral";
    stanceCounts[bucket] = (stanceCounts[bucket] || 0) + 1;
  }

  const parts: string[] = [];
  parts.push(`${results.length} agents analysed the current context.`);
  parts.push(`Convergence: ${convergence.label} (${(convergence.score * 100).toFixed(0)}%).`);
  parts.push(`Dominant stance: ${convergence.dominantStance.replace(/_/g, " ")}.`);

  if (stanceCounts.bullish && stanceCounts.bearish) {
    parts.push(`Split: ${stanceCounts.bullish} bullish, ${stanceCounts.bearish} bearish, ${stanceCounts.neutral || 0} neutral.`);
  }

  // Find highest-confidence dissenter
  const dissenters = results.filter((r) => r.dissent && r.dissent !== "null");
  if (dissenters.length > 0) {
    const top = dissenters.sort((a, b) => b.confidence - a.confidence)[0];
    parts.push(`Key dissent from ${top.personaName}: ${top.dissent}`);
  }

  return parts.join(" ");
}

export async function runSimulation(
  apiKey: string,
  context: string
): Promise<SimulationResult> {
  const client = new Anthropic({ apiKey });

  // Run all agents in parallel
  const results = await Promise.all(
    AGENT_PERSONAS.map((persona) => runAgent(client, persona, context))
  );

  const convergence = computeConvergence(results);
  const summary = generateSummary(results, convergence);

  return {
    agentResults: results,
    convergenceScore: convergence.score,
    convergenceLabel: convergence.label,
    dominantStance: convergence.dominantStance,
    summary,
  };
}

export async function runAndPersistSimulation(
  apiKey: string,
  context: string
): Promise<{ id: number; uuid: string; result: SimulationResult }> {
  // Create the row first as "running"
  const [row] = await db
    .insert(schema.agentSimulations)
    .values({ context, status: "running" })
    .returning();

  try {
    const result = await runSimulation(apiKey, context);

    // Update with results
    await db
      .update(schema.agentSimulations)
      .set({
        status: "complete",
        convergenceScore: result.convergenceScore,
        convergenceLabel: result.convergenceLabel,
        dominantStance: result.dominantStance,
        agentResults: JSON.stringify(result.agentResults),
        summary: result.summary,
      })
      .where(eq(schema.agentSimulations.id, row.id));

    return { id: row.id, uuid: row.uuid, result };
  } catch (error) {
    await db
      .update(schema.agentSimulations)
      .set({ status: "failed" })
      .where(eq(schema.agentSimulations.id, row.id));
    throw error;
  }
}
