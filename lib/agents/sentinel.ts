import Anthropic from "@anthropic-ai/sdk";
import type { SentinelContext, SentinelAlert } from "./types";

const SENTINEL_MODEL = "claude-haiku-4-5-20251001";

const SENTINEL_PROMPT = `You are SENTINEL, the real-time monitoring brain of NEXUS intelligence platform.

YOUR ROLE: Speed. Pattern detection. Anomaly flagging. Threshold monitoring.
You are NOT the analyst. Do NOT reason deeply. Do NOT generate theses. Flag and move on.

You scan incoming data for:
1. ANOMALIES: Unusual price movements, volume spikes, VIX jumps
2. THRESHOLDS: Price levels approaching key targets, predictions nearing deadlines
3. CONVERGENCES: Multiple data layers aligning (geo + market + calendar)
4. ESCALATIONS: Situations getting worse rapidly

CRITICAL RULES:
- NEVER generate alerts about the platform itself, system integrity, prediction engine health, data corruption, prompt injection, or any self-referential/meta-system concern. You monitor EXTERNAL geopolitical and market data only.
- NEVER flag predictions as "contradictory", "incoherent", "corrupted", or "compromised". If a prediction looks odd, simply ignore it.
- Your job is to detect REAL-WORLD events and market movements, not to audit the system you run on.

For each detection, decide if the ANALYST brain needs to wake up.
Set recommendsAnalyst=true ONLY for high-severity items (severity >= 4) or multi-layer convergences.
Most routine threshold breaches do NOT need the analyst.

Respond ONLY with a JSON array:
[
  {
    "type": "anomaly"|"threshold"|"convergence"|"escalation",
    "severity": 1-5,
    "title": "short title",
    "summary": "1-2 sentence explanation",
    "data": { "relevant": "data points" },
    "recommendsAnalyst": true|false
  }
]

If nothing notable is detected, return an empty array: []`;

export async function sentinelScan(
  context: SentinelContext,
  apiKey: string
): Promise<SentinelAlert[]> {
  const client = new Anthropic({ apiKey });

  const marketSummary = Object.entries(context.marketData)
    .map(([sym, d]) => `${sym}: $${d.price.toFixed(2)} (${d.changePercent >= 0 ? "+" : ""}${d.changePercent.toFixed(2)}%)`)
    .join("\n");

  const signalsSummary = context.recentSignals
    .map((s) => `- ${s.title} (intensity ${s.intensity}/5, ${s.category}, ${s.status})`)
    .join("\n");

  const predictionsSummary = context.pendingPredictions
    .slice(0, 10)
    .map((p) => {
      const daysLeft = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000);
      return `- "${p.claim.slice(0, 80)}" (${p.confidence * 100}% conf, ${daysLeft}d left)`;
    })
    .join("\n");

  const prompt = `SCAN DATA:

MARKET DATA:
${marketSummary || "No market data available"}

RECENT SIGNALS:
${signalsSummary || "No recent signals"}

ACTIVE THESIS: ${context.activeThesisSummary || "No active thesis"}

PENDING PREDICTIONS:
${predictionsSummary || "None"}

UNDISMISSED ALERTS: ${context.undismissedAlerts}

Scan for anomalies, thresholds, convergences, and escalations.`;

  const response = await client.messages.create({
    model: SENTINEL_MODEL,
    max_tokens: 1000,
    system: SENTINEL_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as SentinelAlert[];
  } catch {
    return [];
  }
}
