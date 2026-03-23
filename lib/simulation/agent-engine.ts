/**
 * Agent Simulation Engine
 *
 * Runs multiple AI agent personas in parallel against the same context,
 * then measures their convergence/divergence as a signal.
 */
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_PERSONAS, STANCE_VALUES, type AgentResult, type AgentStance } from "./personas";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

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

  // Dominant stance: mode (most common), not weighted mean
  const stanceCounts: Record<string, number> = {};
  for (const r of results) {
    stanceCounts[r.stance] = (stanceCounts[r.stance] || 0) + 1;
  }
  const dominantStance = (Object.entries(stanceCounts).sort((a, b) => b[1] - a[1])[0][0]) as AgentStance;

  // Convergence: pairwise agreement ratio
  // For each pair of agents, measure how close their stances are (0-4 range)
  // This gives a more intuitive score than variance against theoretical max
  let pairCount = 0;
  let agreementSum = 0;
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const diff = Math.abs(
        STANCE_VALUES[results[i].stance] - STANCE_VALUES[results[j].stance]
      );
      // diff: 0 = same, 1 = adjacent, 2+ = far apart
      // agreement: 1.0 for same, 0.75 for adjacent, 0.5 for 2-apart, etc.
      agreementSum += Math.max(0, 1 - diff / 4);
      pairCount++;
    }
  }
  const pairwiseScore = pairCount > 0 ? agreementSum / pairCount : 0;

  // Also factor in whether agents are confident in their stance
  // Low confidence across the board should dampen convergence
  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const confidencePenalty = Math.min(1, avgConfidence / 0.5); // full credit at >= 50% avg confidence

  const convergenceScore = Math.max(0, Math.min(1, pairwiseScore * confidencePenalty));

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

/**
 * Build a swarm of the requested size from the base personas.
 * If swarmSize <= base count, pick that many. If larger, duplicate
 * personas with variant suffixes so each agent runs independently.
 */
function buildSwarm(size: number): typeof AGENT_PERSONAS {
  if (size <= AGENT_PERSONAS.length) {
    return AGENT_PERSONAS.slice(0, size);
  }

  const swarm = [...AGENT_PERSONAS];
  let variant = 2;
  while (swarm.length < size) {
    const base = AGENT_PERSONAS[swarm.length % AGENT_PERSONAS.length];
    swarm.push({
      ...base,
      id: `${base.id}-v${variant}`,
      name: `${base.name} #${variant}`,
    });
    if (swarm.length % AGENT_PERSONAS.length === 0) variant++;
  }
  return swarm;
}

export async function runSimulation(
  apiKey: string,
  context: string,
  swarmSize: number = 7
): Promise<SimulationResult> {
  const client = new Anthropic({ apiKey });

  const swarm = buildSwarm(swarmSize);

  // Run all agents in parallel
  const results = await Promise.all(
    swarm.map((persona) => runAgent(client, persona, context))
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
  context: string,
  swarmSize: number = 7
): Promise<{ id: number; uuid: string; result: SimulationResult }> {
  // Create the row first as "running"
  const [row] = await db
    .insert(schema.agentSimulations)
    .values({ context, status: "running" })
    .returning();

  try {
    const result = await runSimulation(apiKey, context, swarmSize);

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
