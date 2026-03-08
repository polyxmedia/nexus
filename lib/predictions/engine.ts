import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "../db";
import { eq, desc, isNull, and, gte } from "drizzle-orm";
import type { NewPrediction } from "../db/schema";
import { getQuote, getDailySeries } from "../market-data/alpha-vantage";
import { getActiveKnowledge } from "../knowledge/engine";
import { computePerformanceReport } from "./feedback";
import { getWartimeAnalysis } from "../game-theory/wartime";
import { SCENARIOS } from "../game-theory/actors";
import { loadPrompt } from "@/lib/prompts/loader";
import { SONNET_MODEL, HAIKU_MODEL } from "@/lib/ai/model";
import { getBaseRateContext, adjustForBaseRate, BASE_RATES } from "./base-rates";
import { getCalendarActorInsights } from "../signals/actor-beliefs";

// ── Constants ──

const MAX_ACTIVE_PREDICTIONS = 75;
const REGIME_PRICE_DISTANCE_THRESHOLD = 0.20; // 20%
const REFERENCE_SYMBOLS = ["SPY", "USO", "GLD"] as const;

// ── Regime Classification ──

type RegimeLabel = "peacetime" | "transitional" | "wartime";

async function classifyCurrentRegime(): Promise<RegimeLabel> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "regime:latest"));

    if (rows.length === 0) return "peacetime";

    const state = JSON.parse(rows[0].value);
    const composite = state.compositeScore ?? 0;
    const volRegime = state.volatility?.regime ?? "unknown";
    const riskRegime = state.riskAppetite?.regime ?? "unknown";

    // Wartime: crisis-level volatility + panic risk appetite
    if (volRegime === "crisis" || riskRegime === "panic") return "wartime";
    // Transitional: elevated vol or risk-off
    if (volRegime === "elevated" || volRegime === "high-vol" || riskRegime === "risk-off") return "transitional";
    // Also check composite score: deeply negative = wartime
    if (composite < -0.6) return "wartime";
    if (composite < -0.3) return "transitional";

    return "peacetime";
  } catch {
    return "peacetime";
  }
}

async function fetchReferencePrices(alphaVantageKey: string): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  if (!alphaVantageKey) return prices;

  await Promise.all(
    REFERENCE_SYMBOLS.map(async (symbol) => {
      try {
        const quote = await getQuote(symbol, alphaVantageKey);
        if (quote) prices[symbol] = quote.price;
      } catch {
        // Best effort
      }
    })
  );

  return prices;
}

// ── Base Rate Confidence Adjustment ──

function adjustConfidenceForBaseRate(rawConfidence: number, category: string, claim: string): number {
  const clamped = Math.max(0.1, Math.min(0.95, rawConfidence));

  // Select the most relevant base rate for this prediction
  const rates = BASE_RATES[category as keyof typeof BASE_RATES];
  if (!rates) return clamped;

  // Infer evidence strength from the raw confidence:
  // low confidence = weak evidence, high confidence = strong evidence
  const evidenceStrength = clamped < 0.3 ? 1 : clamped < 0.5 ? 2 : clamped < 0.7 ? 3 : clamped < 0.85 ? 4 : 5;

  // Pick the most relevant base rate based on claim content
  const lower = claim.toLowerCase();
  let baseRate = 0.10; // default

  if (category === "market") {
    if (lower.includes("vix") && lower.includes("40")) baseRate = BASE_RATES.market.vix_above_40;
    else if (lower.includes("vix")) baseRate = BASE_RATES.market.vix_above_30;
    else if (lower.includes("oil") || lower.includes("crude") || lower.includes("wti")) baseRate = BASE_RATES.market.oil_weekly_move_10pct;
    else if (lower.includes("gold")) baseRate = BASE_RATES.market.gold_new_ath_month;
    else if (lower.includes("recession")) baseRate = BASE_RATES.market.recession_any_quarter;
    else if (lower.includes("fed") || lower.includes("rate")) baseRate = BASE_RATES.market.fed_rate_change_meeting;
    else if (lower.includes("drop") || lower.includes("crash") || lower.includes("decline")) baseRate = BASE_RATES.market.spx_weekly_drop_5pct;
    else baseRate = BASE_RATES.market.sector_rotation_month;
  } else if (category === "geopolitical") {
    if (lower.includes("military") || lower.includes("strike") || lower.includes("attack")) baseRate = BASE_RATES.geopolitical.military_op_any_week;
    else if (lower.includes("sanction")) baseRate = BASE_RATES.geopolitical.sanctions_new_round_month;
    else if (lower.includes("ceasefire")) baseRate = BASE_RATES.geopolitical.ceasefire_holds_30d;
    else if (lower.includes("coup")) baseRate = BASE_RATES.geopolitical.coup_attempt_year;
    else if (lower.includes("election")) baseRate = BASE_RATES.geopolitical.election_upset;
    else if (lower.includes("nuclear")) baseRate = BASE_RATES.geopolitical.nuclear_test_year;
    else baseRate = BASE_RATES.geopolitical.territorial_dispute_escalation_month;
  } else if (category === "celestial") {
    baseRate = BASE_RATES.celestial.convergence_with_market_move;
  }

  return adjustForBaseRate(clamped, baseRate, evidenceStrength);
}

// ── Direction/Level Extraction ──

interface DirectionLevel {
  direction: "up" | "down" | "flat" | null;
  priceTarget: number | null;
  referenceSymbol: string | null;
}

function extractDirectionLevel(claim: string): DirectionLevel {
  const lower = claim.toLowerCase();

  // Extract direction
  let direction: "up" | "down" | "flat" | null = null;
  const upPatterns = /\b(rise|rally|gain|increase|above|break above|exceed|surpass|climb|surge|bull)\b/i;
  const downPatterns = /\b(fall|drop|decline|decrease|below|break below|crash|plunge|sell-off|selloff|bear|sink)\b/i;
  const flatPatterns = /\b(flat|range-bound|consolidat|sideways|stable)\b/i;

  if (downPatterns.test(claim)) direction = "down";
  else if (upPatterns.test(claim)) direction = "up";
  else if (flatPatterns.test(claim)) direction = "flat";

  // Extract price target: look for "$X" or "X.XX" near a ticker
  let priceTarget: number | null = null;
  let referenceSymbol: string | null = null;

  // Match patterns like "SPY below $510" or "WTI above 85" or "GLD to $2400"
  const pricePatterns = [
    /\b([A-Z]{2,5})\b[^.]*?\$?([\d,]+\.?\d*)/,
    /\$?([\d,]+\.?\d*)[^.]*?\b([A-Z]{2,5})\b/,
  ];

  for (const pattern of pricePatterns) {
    const match = claim.match(pattern);
    if (match) {
      const [, g1, g2] = match;
      // Figure out which group is the ticker and which is the price
      if (/^[A-Z]{2,5}$/.test(g1) && !TICKER_STOPWORDS.has(g1)) {
        referenceSymbol = g1;
        const price = parseFloat(g2.replace(/,/g, ""));
        if (!isNaN(price) && price > 0) priceTarget = price;
      } else if (/^[A-Z]{2,5}$/.test(g2) && !TICKER_STOPWORDS.has(g2)) {
        referenceSymbol = g2;
        const price = parseFloat(g1.replace(/,/g, ""));
        if (!isNaN(price) && price > 0) priceTarget = price;
      }
    }
    if (priceTarget) break;
  }

  return { direction, priceTarget, referenceSymbol };
}

// ── Volume Cap ──

async function enforceVolumeCap(): Promise<number> {
  const pending = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome));

  const active = pending.filter((p) => !p.regimeInvalidated);

  if (active.length <= MAX_ACTIVE_PREDICTIONS) return 0;

  // Expire lowest-confidence predictions over the cap
  const sorted = active.sort((a, b) => a.confidence - b.confidence);
  const toExpire = sorted.slice(0, active.length - MAX_ACTIVE_PREDICTIONS);
  let expired = 0;

  for (const p of toExpire) {
    await db.update(schema.predictions)
      .set({
        outcome: "expired",
        outcomeNotes: `Auto-expired: volume cap (${MAX_ACTIVE_PREDICTIONS} max active). Lowest confidence culled.`,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(schema.predictions.id, p.id));
    expired++;
  }

  return expired;
}

// ── Auto-Expiry for Past Deadline ──

export async function autoExpirePastDeadline(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const pending = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome));

  // Predictions 7+ days past deadline that haven't been resolved → auto-expire
  const graceDays = 7;
  const graceDate = new Date();
  graceDate.setDate(graceDate.getDate() - graceDays);
  const graceDateStr = graceDate.toISOString().split("T")[0];

  const stale = pending.filter((p) => p.deadline < graceDateStr);
  let expired = 0;

  for (const p of stale) {
    await db.update(schema.predictions)
      .set({
        outcome: "expired",
        outcomeNotes: `Auto-expired: ${graceDays}+ days past deadline without resolution.`,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(schema.predictions.id, p.id));
    expired++;
  }

  return expired;
}

// ── Regime Invalidation ──

export async function invalidateOnRegimeChange(): Promise<number> {
  const currentRegime = await classifyCurrentRegime();
  if (currentRegime === "peacetime") return 0;

  const alphaVantageKey = await getAlphaVantageKey();
  const currentPrices = await fetchReferencePrices(alphaVantageKey);

  const pending = await db
    .select()
    .from(schema.predictions)
    .where(
      and(
        isNull(schema.predictions.outcome),
        eq(schema.predictions.regimeInvalidated, 0)
      )
    );

  let invalidated = 0;

  for (const p of pending) {
    // Only invalidate peacetime predictions with price targets when regime shifts
    if (p.regimeAtCreation !== "peacetime") continue;
    if (!p.priceTarget || !p.referencePrices) continue;

    const refPrices = safeParse(p.referencePrices, {}) as Record<string, number>;
    const refSymbol = p.referenceSymbol;
    if (!refSymbol) continue;

    const priceAtCreation = refPrices[refSymbol];
    const currentPrice = currentPrices[refSymbol];
    if (!priceAtCreation || !currentPrice) continue;

    const distance = Math.abs(currentPrice - priceAtCreation) / priceAtCreation;

    if (distance > REGIME_PRICE_DISTANCE_THRESHOLD) {
      const reason = `Regime changed to ${currentRegime}. ${refSymbol} moved ${(distance * 100).toFixed(1)}% from reference (${priceAtCreation.toFixed(2)} → ${currentPrice.toFixed(2)}).`;

      await db.update(schema.predictions)
        .set({
          regimeInvalidated: 1,
          invalidatedReason: reason,
          outcome: "expired",
          outcomeNotes: `Regime change invalidated target: ${reason}`,
          resolvedAt: new Date().toISOString(),
        })
        .where(eq(schema.predictions.id, p.id));

      invalidated++;
    }
  }

  return invalidated;
}

// ── Main Generation ──

export async function generatePredictions(): Promise<NewPrediction[]> {
  const anthropicKey = await getAnthropicKey();
  const alphaVantageKey = await getAlphaVantageKey();
  const today = new Date().toISOString().split("T")[0];

  // Enforce volume cap before generating new ones
  await enforceVolumeCap();

  // Capture current regime + reference prices
  const currentRegime = await classifyCurrentRegime();
  const referencePrices = await fetchReferencePrices(alphaVantageKey);

  // ── Gather full intelligence picture ──

  // Active thesis with all fields
  const latestThesis = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.id))
    .limit(1);

  // Active signals
  const allSignals = await db
    .select()
    .from(schema.signals);
  const activeSignals = allSignals.filter((s) => s.status === "active" || s.status === "upcoming");

  // Game theory scenarios
  const gameTheoryRecords = await db
    .select()
    .from(schema.gameTheoryScenarios)
    .orderBy(desc(schema.gameTheoryScenarios.id))
    .limit(3);

  // All existing predictions (pending + recently resolved for context)
  const allPredictions = await db
    .select()
    .from(schema.predictions)
    .orderBy(desc(schema.predictions.id));

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

  // Build wartime-aware game theory context
  let gameTheoryContext = "No game theory analyses";
  try {
    const wartimeResults = await Promise.all(
      SCENARIOS.map((s) => getWartimeAnalysis(s.id))
    );

    const lines: string[] = [];
    for (const { analysis, scenarioState, isWartime } of wartimeResults) {
      const ma = analysis.marketAssessment;
      const ne = analysis.nashEquilibria;
      const scenarioCfg = SCENARIOS.find((s) => s.id === analysis.scenarioId);
      const title = scenarioCfg?.title || analysis.scenarioId;

      let line = `- ${title}: Most likely "${ma.mostLikelyOutcome}" (${ma.direction}, confidence ${(ma.confidence * 100).toFixed(0)}%). Nash equilibria: ${ne.length}. Key sectors: ${ma.keySectors.join(", ")}`;

      if (isWartime && scenarioState) {
        line += `\n  ** WARTIME MODE: ${scenarioState.triggeredThresholds.length} thresholds fired. State: ${scenarioState.state}.`;
        line += `\n  Invalidated strategies: ${scenarioState.invalidatedStrategies.join(", ")}`;
        if (scenarioState.activeTrajectories.length > 0) {
          line += `\n  Active escalation trajectories:`;
          for (const t of scenarioState.activeTrajectories) {
            line += `\n    - ${t.label} (p=${(t.probability * 100).toFixed(0)}%, ${t.marketImpact.direction}, ${t.marketImpact.magnitude}): ${t.description}`;
          }
        }
      }
      lines.push(line);
    }

    if (lines.length > 0) gameTheoryContext = lines.join("\n\n");
  } catch {
    // Fallback to DB records if wartime analysis fails
    if (gameTheoryRecords.length > 0) {
      gameTheoryContext = gameTheoryRecords.map((r) => {
        const a = safeParse(r.analysis, null) as Record<string, unknown> | null;
        if (!a) return `- ${r.title}: (analysis unavailable)`;
        const ma = a.marketAssessment as Record<string, unknown> | undefined;
        const ne = a.nashEquilibria as unknown[] | undefined;
        return `- ${r.title}: Most likely "${ma?.mostLikelyOutcome}" (${ma?.direction}, confidence ${(((ma?.confidence as number) || 0) * 100).toFixed(0)}%). Nash equilibria: ${ne?.length || 0}. Key sectors: ${(ma?.keySectors as string[])?.join(", ") || "none"}`;
      }).join("\n");
    }
  }

  // Build a structured coverage map: what tickers/assets/events are already predicted
  const coverageMap = buildCoverageMap(pendingPredictions.map((p) => p.claim));

  const pendingContext = pendingPredictions.length > 0
    ? [
        `There are ${pendingPredictions.length} open predictions. You MUST NOT generate any prediction that covers the same underlying asset, ticker, or event as any of these:`,
        "",
        ...pendingPredictions.map((p, i) =>
          `${i + 1}. [${p.category}, deadline ${p.deadline}] ${p.claim}`
        ),
        "",
        `Assets/tickers already covered (DO NOT predict on these again): ${[...coverageMap.tickers].join(", ")}`,
        `Events already covered: ${[...coverageMap.events].join("; ")}`,
      ].join("\n")
    : "No existing predictions — you may generate freely.";

  const recentResolvedContext = recentResolved.length > 0
    ? recentResolved.map((p) =>
        `- [${p.outcome}] "${p.claim}" (score: ${p.score != null ? (p.score * 100).toFixed(0) + "%" : "N/A"})${p.outcomeNotes ? ` - ${p.outcomeNotes}` : ""}`
      ).join("\n")
    : "None";

  // Performance feedback from resolved predictions
  const performanceReport = await computePerformanceReport();
  const feedbackContext = performanceReport
    ? performanceReport.promptSection
    : "Not enough resolved predictions yet to compute performance feedback.";

  // Knowledge bank context
  let knowledgeContext = "No knowledge entries stored.";
  try {
    const activeKnowledge = await getActiveKnowledge();
    if (activeKnowledge.length > 0) {
      knowledgeContext = activeKnowledge.map((k) => {
        const tags = k.tags ? safeParse(k.tags, []) as string[] : [];
        return `- [${k.category}] "${k.title}" (confidence: ${((k.confidence || 0.8) * 100).toFixed(0)}%, tags: ${tags.join(", ")})\n  ${k.content.slice(0, 300)}...`;
      }).join("\n\n");
    }
  } catch {
    knowledgeContext = "Knowledge bank unavailable.";
  }

  // Reference prices context
  const refPriceLines = Object.entries(referencePrices).map(([sym, price]) =>
    `${sym}: ${price.toFixed(2)}`
  ).join(", ");

  // ── Base Rate Anchoring (Tetlock "Fermi-ize" principle) ──
  const baseRateContext = getBaseRateContext(["market", "geopolitical", "celestial"]);

  // ── Actor-Belief Bayesian Typing (calendar-conditioned behavior) ──
  let actorBeliefContext = "";
  try {
    // Extract current calendar events from active signals
    const hebrewEvents = activeSignals
      .filter(s => s.hebrewHoliday)
      .map(s => s.hebrewHoliday!);
    const islamicCalEvents: string[] = activeSignals
      .filter(s => {
        const layers = safeParse(s.layers, []) as string[];
        return layers.includes("hebrew") && s.hebrewHoliday?.includes("Islamic");
      })
      .map(s => s.hebrewHoliday!);

    const actorInsights = getCalendarActorInsights(hebrewEvents, islamicCalEvents, new Date());
    if (actorInsights.length > 0) {
      actorBeliefContext = "\n\n═══ ACTOR-BELIEF ANALYSIS (Bayesian calendar-conditioned behavior) ═══\n" +
        actorInsights.map(a =>
          `- ${a.actor}: P(${a.actionType}) base=${(a.baseProbability * 100).toFixed(0)}% -> adjusted=${(a.adjustedProbability * 100).toFixed(0)}% [trigger: ${a.calendarTrigger}]. Historical basis: ${a.historicalBasis}`
        ).join("\n");
    }
  } catch {
    // Best-effort
  }

  // ── Prompt ──

  const prompt = `Generate falsifiable predictions grounded in the current NEXUS intelligence picture.

TODAY: ${today}
CURRENT REGIME: ${currentRegime}
REFERENCE PRICES: ${refPriceLines || "unavailable"}

═══ ACTIVE THESIS ═══
${thesisContext}

═══ KNOWLEDGE BANK (institutional memory) ═══
${knowledgeContext}

═══ ACTIVE SIGNALS ═══
${signalsContext}

═══ GAME THEORY ANALYSIS ═══
${gameTheoryContext}

═══ EXISTING PENDING PREDICTIONS — READ CAREFULLY BEFORE GENERATING ═══
${pendingContext}

═══ RECENTLY RESOLVED (learn from accuracy) ═══
${recentResolvedContext}

═══ CALIBRATION FEEDBACK (your track record - adjust accordingly) ═══
${feedbackContext}

═══ BASE RATE ANCHORS (start from these, adjust with evidence) ═══
${baseRateContext}${actorBeliefContext}

STRICT UNIQUENESS RULES — violations will be rejected:
1. Do NOT generate any prediction on a ticker or asset that already has an open prediction above (e.g., if SPY already has a pending prediction, do not add another SPY prediction).
2. Do NOT generate geopolitical predictions on countries or actors already covered above (e.g., if Iran already has a pending prediction, skip Iran).
3. Do NOT vary thresholds of existing predictions (e.g., "SPY below 515" when "SPY below 510" is already pending — this is still a duplicate).
4. Every prediction must cover a DIFFERENT underlying asset or a materially different event from all pending ones.
5. If all meaningful signals are already covered by existing predictions, return an empty array [].

DIRECTION + LEVEL RULES:
- For market predictions, always specify a DIRECTION (up/down/flat) and, where possible, a specific PRICE TARGET.
- Include the reference symbol (ticker) for any price target.
- Example: "SPY drops below $500 within 14 days" → direction: "down", price_target: 500, reference_symbol: "SPY"
- Directional-only claims (no price target) will be scored more leniently but are less valuable.

Respond ONLY with a JSON array. Each prediction must include all fields:
[
  {
    "claim": "Specific falsifiable claim with measurable threshold",
    "timeframe": "7 days" | "14 days" | "30 days" | "90 days",
    "deadline": "YYYY-MM-DD",
    "confidence": 0.3-0.95,
    "category": "market" | "geopolitical" | "celestial",
    "grounding": "Derived from: [specific thesis element / signal / game theory outcome]",
    "direction": "up" | "down" | "flat" | null,
    "price_target": number | null,
    "reference_symbol": "TICKER" | null
  }
]`;

  // ── Red Team Adversarial Challenge (Tetlock GJP structured disagreement) ──

  const client = new Anthropic({ apiKey: anthropicKey });

  const redTeamPrompt = `You are reviewing the following intelligence picture. Argue AGAINST the prevailing thesis direction and identify weaknesses.

═══ ACTIVE THESIS ═══
${thesisContext}

═══ ACTIVE SIGNALS ═══
${signalsContext}

═══ GAME THEORY ANALYSIS ═══
${gameTheoryContext}

Your task:
1. Identify the 3 strongest counterarguments to the current thesis direction.
2. Identify what would need to be true for the thesis to be completely wrong.
3. Name the weakest assumptions the thesis relies on.

Output a brief devil's advocate summary.`;

  let redTeamChallenge = "";
  try {
    const redTeamResponse = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      system: "You are a RED TEAM adversarial analyst. Your sole purpose is to challenge the prevailing thesis. Find the strongest counterarguments, identify blind spots, and argue why the consensus view might be wrong. Be specific and cite which assumptions are weakest. Output a brief adversarial summary.",
      messages: [{ role: "user", content: redTeamPrompt }],
    });

    const redTeamText = redTeamResponse.content[0].type === "text" ? redTeamResponse.content[0].text : "";
    if (redTeamText.trim()) {
      redTeamChallenge = redTeamText.trim();
    }
  } catch {
    // Red team is best-effort; proceed without if it fails
  }

  // Inject red team challenge into the main prompt
  const redTeamSection = redTeamChallenge
    ? `\n\n═══ RED TEAM CHALLENGE (adversarial analysis) ═══\n${redTeamChallenge}\n\nConsider the red team challenge above. If the counterarguments are strong, reduce confidence accordingly. Do not dismiss valid criticisms.`
    : "";

  const fullPrompt = prompt + redTeamSection;

  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 2048,
    system: await loadPrompt("prediction_generate"),
    messages: [{ role: "user", content: fullPrompt }],
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
    direction?: string | null;
    price_target?: number | null;
    reference_symbol?: string | null;
  }> = JSON.parse(jsonMatch[0]);

  // ── Post-generation deduplication (defence-in-depth after prompt-level filtering) ──
  const existingClaims = allPredictions.map((p) => normalizeClaim(p.claim));
  const existingTickers = coverageMap.tickers;

  const created: NewPrediction[] = [];
  for (const p of parsed) {
    // 0. Meta-system content filter — reject junk that isn't a real prediction
    if (isMetaSystemJunk(p.claim)) continue;

    const normalized = normalizeClaim(p.claim);

    // 1. Exact / near-exact text match (>50% word overlap)
    const textDuplicate = existingClaims.some((existing) => {
      if (existing === normalized) return true;
      const newWords = new Set(normalized.split(" ").filter((w) => w.length > 3));
      const existingWords = existing.split(" ").filter((w) => w.length > 3);
      if (newWords.size === 0 || existingWords.length === 0) return false;
      const overlap = existingWords.filter((w) => newWords.has(w)).length;
      const overlapRatio = overlap / Math.max(newWords.size, existingWords.length);
      return overlapRatio > 0.5;
    });

    if (textDuplicate) continue;

    // 2. Ticker-level deduplication — if this prediction mentions a ticker already covered, reject
    const newTickers = extractTickers(p.claim);
    const tickerDuplicate = newTickers.some((t) => existingTickers.has(t));
    if (tickerDuplicate) continue;

    // Validate category
    const category = ["market", "geopolitical", "celestial"].includes(p.category)
      ? p.category
      : "market";

    // Validate deadline is in the future
    if (p.deadline <= today) continue;

    // Extract direction/level from LLM response or parse from claim
    const llmDirection = p.direction && ["up", "down", "flat"].includes(p.direction) ? p.direction : null;
    const llmPriceTarget = p.price_target && typeof p.price_target === "number" && p.price_target > 0 ? p.price_target : null;
    const llmRefSymbol = p.reference_symbol && typeof p.reference_symbol === "string" ? p.reference_symbol : null;

    // Fallback: parse direction/level from the claim text itself
    const parsed_dl = extractDirectionLevel(p.claim);
    const direction = llmDirection || parsed_dl.direction;
    const priceTarget = llmPriceTarget || parsed_dl.priceTarget;
    const referenceSymbol = llmRefSymbol || parsed_dl.referenceSymbol;

    const rows = await db
      .insert(schema.predictions)
      .values({
        claim: p.claim,
        timeframe: p.timeframe,
        deadline: p.deadline,
        confidence: adjustConfidenceForBaseRate(p.confidence, p.category, p.claim),
        category,
        metrics: p.grounding ? JSON.stringify({ grounding: p.grounding }) : null,
        // New fields
        regimeAtCreation: currentRegime,
        referencePrices: JSON.stringify(referencePrices),
        preEvent: 1,
        direction: direction || null,
        priceTarget: priceTarget || null,
        referenceSymbol: referenceSymbol || null,
      })
      .returning();

    created.push(rows[0]);
    // Track intra-batch to prevent duplicates within the same generation run
    existingClaims.push(normalized);
    newTickers.forEach((t) => existingTickers.add(t));
  }

  // Enforce volume cap again after generation
  await enforceVolumeCap();

  return created;
}

// ── Incremental Belief Updating ──

interface BeliefAdjustment {
  predictionId: number;
  claim: string;
  previousConfidence: number;
  newConfidence: number;
  adjustment: number;
  reason: string;
  triggerSignal: string;
}

/**
 * Incremental belief updating (Tetlock principle): scan pending predictions against
 * recent signals and make small confidence adjustments. Caps at +/-5% per cycle.
 * Only processes predictions that haven't been updated in the last 6 hours.
 */
export async function updateExistingPredictions(): Promise<BeliefAdjustment[]> {
  const anthropicKey = await getAnthropicKey();
  const client = new Anthropic({ apiKey: anthropicKey });

  // 1. Query all pending (unresolved) predictions
  const pending = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome));

  if (pending.length === 0) return [];

  // 2. Query recent signals (last 24h)
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  const oneDayAgoStr = oneDayAgo.toISOString();

  const recentSignals = await db
    .select()
    .from(schema.signals)
    .where(gte(schema.signals.createdAt, oneDayAgoStr));

  if (recentSignals.length === 0) return [];

  // Get active thesis for context
  const latestThesis = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.id))
    .limit(1);

  const thesisSummary = latestThesis.length > 0
    ? latestThesis[0].executiveSummary.slice(0, 300)
    : "No active thesis";

  // 3. For each pending prediction, check relevance and update
  const sixHoursAgo = new Date();
  sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
  const sixHoursAgoStr = sixHoursAgo.toISOString();

  const adjustments: BeliefAdjustment[] = [];

  for (const prediction of pending) {
    // Filter out meta-system junk
    if (isMetaSystemJunk(prediction.claim)) continue;

    // Check if this prediction was updated recently (within 6 hours)
    // Use the metrics JSON field to track last belief update time
    const metrics = safeParse(prediction.metrics, {}) as Record<string, unknown>;
    const lastBeliefUpdate = metrics.lastBeliefUpdate as string | undefined;
    if (lastBeliefUpdate && lastBeliefUpdate > sixHoursAgoStr) continue;

    // 4. Check if any recent signals are relevant (keyword matching)
    const claimLower = prediction.claim.toLowerCase();
    const claimWords = claimLower.split(/\s+/).filter((w) => w.length > 3);

    const relevantSignals = recentSignals.filter((signal) => {
      const signalText = `${signal.title} ${signal.description}`.toLowerCase();
      const matchingWords = claimWords.filter((word) => signalText.includes(word));
      return matchingWords.length >= 2; // At least 2 keyword matches
    });

    if (relevantSignals.length === 0) continue;

    // 5. Make a lightweight Claude call for each relevant prediction-signal pair
    // Use the strongest signal (highest intensity)
    const strongestSignal = relevantSignals.sort((a, b) => b.intensity - a.intensity)[0];

    const updatePrompt = `Given this existing prediction and new intelligence, should the confidence be adjusted?

Prediction: "${prediction.claim}" (current confidence: ${(prediction.confidence * 100).toFixed(0)}%)
New signal: "${strongestSignal.title} - ${strongestSignal.description}" (intensity: ${strongestSignal.intensity}/5)
Active thesis context: ${thesisSummary}

Respond with JSON: { "adjustment": -5 to +5, "reason": "brief explanation" }
If the new signal is not relevant to this prediction, respond: { "adjustment": 0, "reason": "not relevant" }`;

    try {
      const response = await client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 150,
        system: "You are a calibration analyst. Assess whether new intelligence should adjust an existing prediction's confidence. Be conservative: small updates beat large revisions. Respond only with JSON.",
        messages: [{ role: "user", content: updatePrompt }],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const result: { adjustment: number; reason: string } = JSON.parse(jsonMatch[0]);

      // 6. Cap adjustments at +/-5% per cycle
      const rawAdj = result.adjustment;
      const cappedAdj = Math.max(-5, Math.min(5, rawAdj));

      if (cappedAdj === 0) continue;

      const adjustmentDecimal = cappedAdj / 100;
      const newConfidence = Math.max(0.05, Math.min(0.95, prediction.confidence + adjustmentDecimal));

      // 7. Update the prediction's confidence in the DB
      const updatedMetrics = {
        ...metrics,
        grounding: metrics.grounding || null,
        lastBeliefUpdate: new Date().toISOString(),
        beliefHistory: [
          ...((metrics.beliefHistory as Array<{ from: number; to: number; reason: string; signal: string; at: string }>) || []),
          {
            from: prediction.confidence,
            to: newConfidence,
            reason: result.reason,
            signal: strongestSignal.title,
            at: new Date().toISOString(),
          },
        ],
      };

      await db.update(schema.predictions)
        .set({
          confidence: newConfidence,
          metrics: JSON.stringify(updatedMetrics),
        })
        .where(eq(schema.predictions.id, prediction.id));

      adjustments.push({
        predictionId: prediction.id,
        claim: prediction.claim,
        previousConfidence: prediction.confidence,
        newConfidence,
        adjustment: cappedAdj,
        reason: result.reason,
        triggerSignal: strongestSignal.title,
      });
    } catch {
      // Individual update failures are non-fatal; continue with next prediction
    }
  }

  return adjustments;
}

// ── Resolution ──

export async function resolvePredictions(): Promise<Array<{ id: number; outcome: string; score: number; notes: string }>> {
  const anthropicKey = await getAnthropicKey();
  const alphaVantageKey = await getAlphaVantageKey();
  const today = new Date().toISOString().split("T")[0];

  // Auto-expire stale predictions first
  await autoExpirePastDeadline();

  // Check for regime invalidations
  await invalidateOnRegimeChange();

  const pending = await db
    .select()
    .from(schema.predictions)
    .where(isNull(schema.predictions.outcome));

  if (pending.length === 0) return [];

  // Only resolve predictions whose deadline has passed
  const due = pending.filter((p) => p.deadline <= today);
  if (due.length === 0) return [];

  // ── Step 1: Extract tickers mentioned in predictions ──
  const tickerPattern = /\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/g;
  const mentionedTickers = new Set<string>();
  // Common market indices and ETFs to always fetch
  const coreSymbols = ["SPY", "QQQ", "VIX", "GLD", "TLT", "USO", "XLE", "XLF", "XLK", "IWM"];
  coreSymbols.forEach((s) => mentionedTickers.add(s));

  for (const p of due) {
    const matches = p.claim.match(tickerPattern);
    if (matches) {
      for (const m of matches) {
        // Filter out common English words that look like tickers
        if (!["THE", "AND", "FOR", "NOT", "BUT", "HAS", "WAS", "ARE", "ITS", "GDP", "CPI", "USD", "EUR", "GBP", "JPY", "VIX"].includes(m) || m === "VIX") {
          mentionedTickers.add(m);
        }
      }
    }
    // Also add reference symbol if present
    if (p.referenceSymbol) mentionedTickers.add(p.referenceSymbol);
  }

  // ── Step 2: Fetch real market data for all relevant tickers ──
  const marketData: Record<string, { current: { price: number; change: number; changePercent: number; volume: number; date: string }; history: Array<{ date: string; close: number; high: number; low: number }> }> = {};

  if (alphaVantageKey) {
    const earliestCreation = due.reduce((min, p) => p.createdAt < min ? p.createdAt : min, due[0].createdAt);
    const symbols = Array.from(mentionedTickers);

    // Fetch in batches of 5 to respect Alpha Vantage rate limits (5 calls/min free tier)
    for (let i = 0; i < symbols.length; i += 5) {
      const batch = symbols.slice(i, i + 5);
      await Promise.all(batch.map(async (symbol) => {
        try {
          const [quote, daily] = await Promise.all([
            getQuote(symbol, alphaVantageKey).catch(() => null),
            getDailySeries(symbol, alphaVantageKey).catch(() => []),
          ]);

          if (quote) {
            const relevantBars = daily
              .filter((b) => b.date >= earliestCreation.split("T")[0])
              .map((b) => ({ date: b.date, close: b.close, high: b.high, low: b.low }));

            marketData[symbol] = {
              current: {
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent,
                volume: quote.volume,
                date: quote.timestamp,
              },
              history: relevantBars,
            };
          }
        } catch {
          // Skip symbols that fail
        }
      }));

      // Wait 12s between batches for rate limiting
      if (i + 5 < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 12000));
      }
    }
  }

  // ── Step 3: Fetch real geopolitical events from GDELT ──
  let gdeltSummary = "GDELT data unavailable.";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const query = encodeURIComponent("conflict OR military OR attack OR sanctions OR election OR summit");
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=50&format=json&timespan=14d`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const articles = (data.articles || []).slice(0, 30);
      if (articles.length > 0) {
        gdeltSummary = articles.map((a: { title: string; seendate: string; domain: string }) =>
          `- [${a.seendate?.slice(0, 8) || "?"}] ${a.title} (${a.domain})`
        ).join("\n");
      }
    }
  } catch {
    // GDELT unavailable, proceed without
  }

  // ── Step 4: Build evidence-based prompt ──
  const predictionsText = due.map((p) => {
    const metrics = safeParse(p.metrics, null) as Record<string, unknown> | null;
    const grounding = metrics?.grounding ? `\nGrounding: ${metrics.grounding}` : "";
    const dirInfo = p.direction ? `\nDirection: ${p.direction}` : "";
    const targetInfo = p.priceTarget && p.referenceSymbol
      ? `\nPrice Target: ${p.referenceSymbol} ${p.direction === "down" ? "below" : "above"} ${p.priceTarget}`
      : "";
    const refPrices = p.referencePrices ? `\nReference Prices at Creation: ${p.referencePrices}` : "";
    return `ID: ${p.id}\nClaim: "${p.claim}"\nCategory: ${p.category}\nConfidence: ${(p.confidence * 100).toFixed(0)}%\nDeadline: ${p.deadline}\nCreated: ${p.createdAt}${dirInfo}${targetInfo}${refPrices}${grounding}`;
  }).join("\n\n");

  const marketDataText = Object.keys(marketData).length > 0
    ? Object.entries(marketData).map(([symbol, data]) => {
        const historyLines = data.history.slice(-20).map((b) =>
          `  ${b.date}: close=${b.close.toFixed(2)}, high=${b.high.toFixed(2)}, low=${b.low.toFixed(2)}`
        ).join("\n");

        return `${symbol}: Current price ${data.current.price.toFixed(2)} (${data.current.changePercent >= 0 ? "+" : ""}${data.current.changePercent.toFixed(2)}%) as of ${data.current.date}\nRecent history:\n${historyLines}`;
      }).join("\n\n")
    : "No market data available. Mark market predictions as 'expired' with note explaining data was unavailable.";

  const prompt = `Evaluate these predictions using ONLY the real data provided below. Today is ${today}. All deadlines have passed.

═══ PREDICTIONS TO EVALUATE ═══
${predictionsText}

═══ REAL MARKET DATA (from Alpha Vantage) ═══
${marketDataText}

═══ REAL GEOPOLITICAL EVENTS (from GDELT, last 14 days) ═══
${gdeltSummary}

INSTRUCTIONS:
- For MARKET predictions: Compare the claim against the actual price data above. Quote the specific prices and dates.
- For GEOPOLITICAL predictions: Check if the GDELT headlines corroborate or contradict the claim.
- For CELESTIAL predictions: These are calendar-based and verifiable. Check if the claimed convergence occurred (the dates are deterministic).
- If the relevant data is NOT in the evidence above, mark as "expired" and state what data would be needed.

DIRECTION vs LEVEL SCORING:
- If a prediction has both direction AND price_target, evaluate each separately.
- "direction_correct": 1 if the market moved in the predicted direction, 0 if not.
- "level_correct": 1 if the price target was reached, 0 if not.
- If direction is correct but level is wrong, outcome should be "partial".
- If both are wrong, outcome is "denied".
- If both are correct, outcome is "confirmed".

Respond ONLY with a JSON array:
[
  {
    "id": <prediction_id>,
    "outcome": "confirmed" | "denied" | "partial" | "expired",
    "score": 0.0-1.0,
    "notes": "Evidence: [cite specific data points from above]",
    "direction_correct": 1 | 0 | null,
    "level_correct": 1 | 0 | null
  }
]`;

  const client = new Anthropic({ apiKey: anthropicKey });
  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 2048,
    system: await loadPrompt("prediction_resolve"),
    messages: [{ role: "user", content: prompt }],
  });

  const resText = response.content[0].type === "text" ? response.content[0].text : "";
  const resJsonMatch = resText.match(/\[[\s\S]*\]/);
  if (!resJsonMatch) {
    throw new Error("Failed to parse resolution from Claude response");
  }

  const results: Array<{
    id: number;
    outcome: string;
    score: number;
    notes: string;
    direction_correct?: number | null;
    level_correct?: number | null;
  }> = JSON.parse(resJsonMatch[0]);

  // Validate and update DB
  const validOutcomes = ["confirmed", "denied", "partial", "expired", "post_event"];
  const updated: Array<{ id: number; outcome: string; score: number; notes: string }> = [];

  for (const r of results) {
    const pred = due.find((p) => p.id === r.id);
    if (!pred) continue;
    if (!validOutcomes.includes(r.outcome)) continue;

    const score = Math.max(0, Math.min(1, r.score));

    await db.update(schema.predictions)
      .set({
        outcome: r.outcome,
        score,
        outcomeNotes: r.notes || null,
        resolvedAt: new Date().toISOString(),
        directionCorrect: r.direction_correct != null ? (r.direction_correct ? 1 : 0) : null,
        levelCorrect: r.level_correct != null ? (r.level_correct ? 1 : 0) : null,
      })
      .where(eq(schema.predictions.id, r.id));

    updated.push({ id: r.id, outcome: r.outcome, score, notes: r.notes });
  }

  // Persist failure patterns to knowledge bank after resolution
  if (updated.length > 0) {
    try {
      const report = await computePerformanceReport();
      if (report && report.failurePatterns.length > 0) {
        const content = [
          `# Prediction Failure Patterns (auto-updated ${today})`,
          `Brier Score: ${report.brierScore.toFixed(3)} | Hit Rate: ${(report.binaryAccuracy * 100).toFixed(0)}% | n=${report.totalResolved}`,
          "",
          ...report.failurePatterns.map((fp: { pattern: string; frequency: number; examples: string[] }) =>
            `## ${fp.pattern} (${fp.frequency}x)\n${fp.examples.map((e: string) => `- ${e}`).join("\n")}`
          ),
        ].join("\n");

        // Upsert a knowledge entry for prediction failure patterns
        const existingRows = await db
          .select()
          .from(schema.knowledge)
          .where(eq(schema.knowledge.title, "Prediction Failure Patterns"));

        if (existingRows.length > 0) {
          await db.update(schema.knowledge)
            .set({ content, updatedAt: new Date().toISOString() })
            .where(eq(schema.knowledge.id, existingRows[0].id));
        } else {
          await db.insert(schema.knowledge)
            .values({
              title: "Prediction Failure Patterns",
              content,
              category: "analysis",
              tags: "predictions,calibration,feedback",
              source: "prediction-feedback-loop",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        }
      }
    } catch {
      // Knowledge bank persistence is best-effort
    }
  }

  return updated;
}

// ── Helpers ──

async function getAnthropicKey(): Promise<string> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"));

  const key = rows[0]?.value || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");
  return key;
}

async function getAlphaVantageKey(): Promise<string> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "alpha_vantage_api_key"));

  return rows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY || "";
}

export function normalizeClaim(claim: string): string {
  return claim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Known English stopwords that look like tickers — never treat as asset tickers
const TICKER_STOPWORDS = new Set([
  "THE", "AND", "FOR", "NOT", "BUT", "HAS", "WAS", "ARE", "ITS",
  "GDP", "CPI", "USD", "EUR", "GBP", "JPY", "CNY", "DXY",
  "WILL", "FROM", "THAT", "THIS", "WITH", "HAVE", "MORE", "THAN",
  "LEAST", "DAYS", "WEEK", "MONTH", "YEAR", "DURING", "BELOW",
  "ABOVE", "CLOSE", "OPEN", "HIGH", "LOW", "PER", "INTO", "OVER",
  "PBOC", "OPEC", "NATO", "DPRK", "PLA", "FOMC",
]);

export function extractTickers(claim: string): string[] {
  const matches = claim.match(/\b([A-Z]{2,5})\b/g) || [];
  return matches.filter((m) => !TICKER_STOPWORDS.has(m));
}

export interface CoverageMap {
  tickers: Set<string>;
  events: Set<string>;
}

export function buildCoverageMap(claims: string[]): CoverageMap {
  const tickers = new Set<string>();
  const events = new Set<string>();

  // Known geopolitical actor keywords to track
  const geoActors = [
    "iran", "china", "taiwan", "north korea", "dprk", "russia", "ukraine",
    "israel", "saudi", "opec", "pboc", "fed", "ecb", "boj",
  ];

  for (const claim of claims) {
    // Extract tickers
    extractTickers(claim).forEach((t) => tickers.add(t));

    // Extract geopolitical actors
    const lower = claim.toLowerCase();
    for (const actor of geoActors) {
      if (lower.includes(actor)) events.add(actor);
    }
  }

  return { tickers, events };
}

// Meta-system junk detector — catches recursive loop contamination
const META_SYSTEM_BLOCKLIST = [
  "system shutdown",
  "quarantine",
  "human override",
  "human intervention",
  "human verification",
  "manual override",
  "platform shutdown",
  "system_compromised",
  "system compromised",
  "recursive",
  "forensic analysis",
  "prediction engine compromised",
  "framework compromised",
  "system integrity",
  "isolate prediction",
  "halt all automated",
  "suspend all automated",
  "suspend automated",
  "purge all",
  "system quarantine",
  "analytical outputs unreliable",
  "compromise detected",
  "injection attack",
  "contaminated",
  "self-referential",
  "prompt injection",
  "override required",
  "emergency shutdown",
  "critical failure",
  "abort all",
  "nexus compromised",
  "intelligence cycle compromised",
  "sentinel compromised",
  "analyst compromised",
  "integrity failure",
  "layer integrity",
  "prediction layer",
  "incoherent directive",
  "contradictory",
  "halt orders",
  "corruption flag",
  "memory corruption",
  "verification loop",
  "validation failure",
  "cascading validation",
  "adversarial injection",
  "analyst intervention required",
  "position verification",
  "system halt",
  "meta-system",
  "self-diagnostic",
  "platform integrity",
  "engine compromised",
  "engine contaminated",
  "data integrity",
  "recursive injection",
  "manual verify",
];

export function isMetaSystemJunk(claim: string): boolean {
  const lower = claim.toLowerCase();
  return META_SYSTEM_BLOCKLIST.some((phrase) => lower.includes(phrase));
}

function safeParse(json: string | null, fallback: unknown): Record<string, unknown> | unknown {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
