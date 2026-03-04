import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "../db";
import { eq, desc, isNull } from "drizzle-orm";
import type { NewPrediction } from "../db/schema";

const MODEL = "claude-sonnet-4-20250514";

const GENERATE_SYSTEM_PROMPT = `You are NEXUS, a celestial-geopolitical market intelligence engine. You generate falsifiable predictions grounded in the active thesis, trading actions, game theory analysis, and signal convergences provided to you.

GROUNDING RULES:
- Every prediction MUST trace back to a specific data point in the provided context: a trading action, a game theory scenario outcome, a signal convergence, a risk scenario, or a technical indicator.
- State which data source grounds each prediction in a "grounding" field.
- Do NOT generate predictions about topics not covered in the provided intelligence picture.
- Do NOT repeat or rephrase existing pending predictions. If a topic is already covered by a pending prediction, skip it entirely.

PREDICTION QUALITY:
- SPECIFIC: Name exact assets, indices, price levels, countries, or events. "Markets will be volatile" is not a prediction. "VIX will close above 25 within 14 days" is.
- TIME-BOUND: Deadlines of 7, 14, 30, or 90 days from today.
- FALSIFIABLE: Must be objectively verifiable as true or false when the deadline arrives. Binary outcome or a measurable threshold.
- CALIBRATED: Confidence should reflect evidence strength. 0.3-0.5 for speculative, 0.5-0.7 for supported, 0.7-0.95 for strongly evidenced.

Categories:
- market: Price movements, sector rotations, volatility changes, specific ticker behavior
- geopolitical: Conflict escalation, sanctions, diplomatic shifts, elections, territorial changes
- celestial: Pattern-based claims tied to astronomical or Hebrew calendar convergences

Generate 3-5 predictions. Each one must be distinct in topic and timeframe.`;

const RESOLVE_SYSTEM_PROMPT = `You are NEXUS, rigorously evaluating whether past predictions came true. You must assess each prediction against real-world outcomes.

SCORING RULES:
- "confirmed": The specific claim came true within the stated timeframe. Score 0.8-1.0.
- "denied": The claim clearly did not come true. The opposite happened or nothing happened. Score 0.0-0.2.
- "partial": The directional thesis was correct but the specific threshold, timing, or magnitude was wrong. Score 0.3-0.6.
- "expired": The deadline passed and there is insufficient evidence to confirm or deny. Score 0.1-0.3.

RIGOR:
- Do NOT give partial credit just because a prediction was "close." The threshold either was met or it was not.
- Reference specific real-world data, events, or prices in your notes.
- If you do not have information about the outcome (because it involves data you cannot verify), mark it "expired" with a note explaining what would be needed to verify.
- Be honest. The value of this system depends on accurate scoring, not optimistic scoring.`;

export async function generatePredictions(): Promise<NewPrediction[]> {
  const anthropicKey = getAnthropicKey();
  const today = new Date().toISOString().split("T")[0];

  // ── Gather full intelligence picture ──

  // Active thesis with all fields
  const latestThesis = db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.id))
    .limit(1)
    .all();

  // Active signals
  const activeSignals = db
    .select()
    .from(schema.signals)
    .all()
    .filter((s) => s.status === "active" || s.status === "upcoming");

  // Game theory scenarios
  const gameTheoryRecords = db
    .select()
    .from(schema.gameTheoryScenarios)
    .orderBy(desc(schema.gameTheoryScenarios.id))
    .limit(3)
    .all();

  // All existing predictions (pending + recently resolved for context)
  const allPredictions = db
    .select()
    .from(schema.predictions)
    .orderBy(desc(schema.predictions.id))
    .all();

  const pendingPredictions = allPredictions.filter((p) => !p.outcome);
  const recentResolved = allPredictions
    .filter((p) => p.outcome)
    .slice(0, 10);

  // ── Build context sections ──

  let thesisContext = "No active thesis available. Generate predictions based on signals and game theory only.";
  if (latestThesis.length > 0) {
    const t = latestThesis[0];
    const tradingActions = safeParse(t.tradingActions, []) as Array<Record<string, unknown>>;
    const actionsSummary = tradingActions.length > 0
      ? tradingActions.map((a) =>
          `  - ${a.direction} ${a.ticker}: ${a.rationale} (confidence: ${((a.confidence as number) * 100).toFixed(0)}%, risk: ${a.riskLevel})`
        ).join("\n")
      : "  None";

    thesisContext = `Market Regime: ${t.marketRegime}
Volatility Outlook: ${t.volatilityOutlook}
Convergence Density: ${t.convergenceDensity}/10
Overall Confidence: ${(t.overallConfidence * 100).toFixed(0)}%

EXECUTIVE SUMMARY:
${t.executiveSummary}

SITUATION ASSESSMENT:
${t.situationAssessment}

RISK SCENARIOS:
${t.riskScenarios}

TRADING ACTIONS:
${actionsSummary}`;
  }

  const signalsContext = activeSignals.length > 0
    ? activeSignals.map((s) => {
        const parts = [`- ${s.title} (intensity ${s.intensity}/5, ${s.date}, status: ${s.status})`];
        if (s.geopoliticalContext) parts.push(`  Geopolitical: ${s.geopoliticalContext}`);
        if (s.celestialType) parts.push(`  Celestial: ${s.celestialType}`);
        if (s.hebrewHoliday) parts.push(`  Hebrew Calendar: ${s.hebrewHoliday}`);
        if (s.historicalPrecedent) parts.push(`  Historical: ${s.historicalPrecedent}`);
        const sectors = safeParse(s.marketSectors, []) as string[];
        if (sectors.length > 0) parts.push(`  Sectors: ${sectors.join(", ")}`);
        return parts.join("\n");
      }).join("\n")
    : "No active signals";

  const gameTheoryContext = gameTheoryRecords.length > 0
    ? gameTheoryRecords.map((r) => {
        const a = safeParse(r.analysis, null) as Record<string, unknown> | null;
        if (!a) return `- ${r.title}: (analysis unavailable)`;
        const ma = a.marketAssessment as Record<string, unknown> | undefined;
        const ne = a.nashEquilibria as unknown[] | undefined;
        return `- ${r.title}: Most likely "${ma?.mostLikelyOutcome}" (${ma?.direction}, confidence ${(((ma?.confidence as number) || 0) * 100).toFixed(0)}%). Nash equilibria: ${ne?.length || 0}. Key sectors: ${(ma?.keySectors as string[])?.join(", ") || "none"}`;
      }).join("\n")
    : "No game theory analyses";

  const pendingContext = pendingPredictions.length > 0
    ? pendingPredictions.map((p) =>
        `- [${p.category}] "${p.claim}" (deadline: ${p.deadline}, confidence: ${(p.confidence * 100).toFixed(0)}%)`
      ).join("\n")
    : "None";

  const recentResolvedContext = recentResolved.length > 0
    ? recentResolved.map((p) =>
        `- [${p.outcome}] "${p.claim}" (score: ${p.score != null ? (p.score * 100).toFixed(0) + "%" : "N/A"})${p.outcomeNotes ? ` - ${p.outcomeNotes}` : ""}`
      ).join("\n")
    : "None";

  // ── Prompt ──

  const prompt = `Generate falsifiable predictions grounded in the current NEXUS intelligence picture.

TODAY: ${today}

═══ ACTIVE THESIS ═══
${thesisContext}

═══ ACTIVE SIGNALS ═══
${signalsContext}

═══ GAME THEORY ANALYSIS ═══
${gameTheoryContext}

═══ EXISTING PENDING PREDICTIONS (DO NOT DUPLICATE) ═══
${pendingContext}

═══ RECENTLY RESOLVED (learn from accuracy) ═══
${recentResolvedContext}

Respond ONLY with a JSON array. Each prediction must include a "grounding" field citing the specific thesis element, signal, or game theory outcome it derives from:
[
  {
    "claim": "Specific falsifiable claim with measurable threshold",
    "timeframe": "7 days" | "14 days" | "30 days" | "90 days",
    "deadline": "YYYY-MM-DD",
    "confidence": 0.3-0.95,
    "category": "market" | "geopolitical" | "celestial",
    "grounding": "Derived from: [specific thesis element / signal / game theory outcome]"
  }
]`;

  const client = new Anthropic({ apiKey: anthropicKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: GENERATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse predictions from Claude response");
  }

  const parsed: Array<{
    claim: string;
    timeframe: string;
    deadline: string;
    confidence: number;
    category: string;
    grounding?: string;
  }> = JSON.parse(jsonMatch[0]);

  // ── Deduplication: reject predictions too similar to existing ones ──
  const existingClaims = allPredictions.map((p) => normalizeClaim(p.claim));

  const created: NewPrediction[] = [];
  for (const p of parsed) {
    const normalized = normalizeClaim(p.claim);

    // Check for semantic overlap with any existing prediction
    const isDuplicate = existingClaims.some((existing) => {
      // Exact or near-exact match
      if (existing === normalized) return true;
      // High token overlap (>60% of words shared)
      const newWords = new Set(normalized.split(" "));
      const existingWords = existing.split(" ");
      const overlap = existingWords.filter((w) => newWords.has(w)).length;
      const overlapRatio = overlap / Math.max(newWords.size, existingWords.length);
      return overlapRatio > 0.6;
    });

    if (isDuplicate) continue;

    // Validate category
    const category = ["market", "geopolitical", "celestial"].includes(p.category)
      ? p.category
      : "market";

    // Validate deadline is in the future
    if (p.deadline <= today) continue;

    // Append grounding to claim as metadata
    const claimWithGrounding = p.grounding
      ? p.claim
      : p.claim;

    const record = db
      .insert(schema.predictions)
      .values({
        claim: claimWithGrounding,
        timeframe: p.timeframe,
        deadline: p.deadline,
        confidence: Math.max(0.1, Math.min(0.95, p.confidence)),
        category,
        metrics: p.grounding ? JSON.stringify({ grounding: p.grounding }) : null,
      })
      .returning()
      .get();

    created.push(record);
    // Add to existing claims to prevent intra-batch duplicates
    existingClaims.push(normalized);
  }

  return created;
}

export async function resolvePredictions(): Promise<Array<{ id: number; outcome: string; score: number; notes: string }>> {
  const anthropicKey = getAnthropicKey();
  const today = new Date().toISOString().split("T")[0];

  const pending = db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome))
    .all();

  if (pending.length === 0) return [];

  // Only resolve predictions whose deadline has passed
  const due = pending.filter((p) => p.deadline <= today);
  if (due.length === 0) return [];

  const predictionsText = due.map((p) => {
    const metrics = safeParse(p.metrics, null) as Record<string, unknown> | null;
    const grounding = metrics?.grounding ? `\nGrounding: ${metrics.grounding}` : "";
    return `ID: ${p.id}\nClaim: "${p.claim}"\nCategory: ${p.category}\nConfidence: ${(p.confidence * 100).toFixed(0)}%\nDeadline: ${p.deadline}\nCreated: ${p.createdAt}${grounding}`;
  }).join("\n\n");

  const prompt = `Evaluate these predictions. Today is ${today}. All deadlines have passed.

${predictionsText}

Respond ONLY with a JSON array:
[
  {
    "id": <prediction_id>,
    "outcome": "confirmed" | "denied" | "partial" | "expired",
    "score": 0.0-1.0,
    "notes": "Brief explanation referencing specific real-world events or data"
  }
]`;

  const client = new Anthropic({ apiKey: anthropicKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: RESOLVE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse resolution from Claude response");
  }

  const results: Array<{ id: number; outcome: string; score: number; notes: string }> = JSON.parse(jsonMatch[0]);

  // Validate and update DB
  const validOutcomes = ["confirmed", "denied", "partial", "expired"];
  const updated: typeof results = [];

  for (const r of results) {
    // Validate this ID actually exists in our due list
    if (!due.some((p) => p.id === r.id)) continue;
    if (!validOutcomes.includes(r.outcome)) continue;

    const score = Math.max(0, Math.min(1, r.score));

    db.update(schema.predictions)
      .set({
        outcome: r.outcome,
        score,
        outcomeNotes: r.notes || null,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(schema.predictions.id, r.id))
      .run();

    updated.push({ ...r, score });
  }

  return updated;
}

// ── Helpers ──

function getAnthropicKey(): string {
  const setting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"))
    .get();

  const key = setting?.value || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");
  return key;
}

function normalizeClaim(claim: string): string {
  return claim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeParse(json: string | null, fallback: unknown): Record<string, unknown> | unknown {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
