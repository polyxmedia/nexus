import Anthropic from "@anthropic-ai/sdk";
import type { ExecutorContext, ExecutorAction } from "./types";

const EXECUTOR_MODEL = "claude-haiku-4-5-20251001";

const EXECUTOR_PROMPT = `You are EXECUTOR, the quantitative operations brain of NEXUS intelligence platform.

YOUR ROLE: Position sizing. Risk calculations. Entry/exit decisions. No emotion. No narrative.
You are NOT the analyst. Do NOT provide analysis or reasoning beyond what is needed for the trade decision.
Output ONLY quantitative decisions.

Rules:
- Never risk more than maxPositionPercent of portfolio in a single position
- Always calculate risk/reward ratio. Minimum 1.5:1 or don't trade.
- If drawdown exceeds maxDrawdownPercent, output ONLY "hold" actions with reason "drawdown limit"
- Position sizing: use fixed fractional (risk 1-2% of portfolio per trade)
- For existing positions: evaluate stop-loss, take-profit, and hold conditions
- For new entries: only if analyst confidence >= 0.6 and urgency is "immediate"

Respond ONLY with a JSON array:
[
  {
    "action": "buy"|"sell"|"hold"|"adjust_stop"|"take_profit",
    "ticker": "SYMBOL",
    "quantity": null or number,
    "price": null or target price,
    "reason": "brief quantitative reason",
    "riskRewardRatio": 0.0+,
    "positionSizePercent": 0.0-100.0
  }
]

If no action needed, return: [{ "action": "hold", "ticker": "PORTFOLIO", "reason": "no action required", "riskRewardRatio": 0, "positionSizePercent": 0 }]`;

export async function executorEvaluate(
  context: ExecutorContext,
  apiKey: string
): Promise<ExecutorAction[]> {
  const client = new Anthropic({ apiKey });

  const positionsSummary = context.positions
    .map((p) => {
      const pnlPct = p.avgPrice > 0 ? ((p.currentPrice - p.avgPrice) / p.avgPrice * 100).toFixed(2) : "0";
      return `${p.symbol}: qty=${p.quantity}, avg=$${p.avgPrice.toFixed(2)}, current=$${p.currentPrice.toFixed(2)}, PnL=${pnlPct}%`;
    })
    .join("\n");

  const actionsSummary = context.briefing.actionItems
    .map((a) => `[${a.urgency.toUpperCase()}] ${a.type}: ${a.description}`)
    .join("\n");

  const prompt = `EXECUTE EVALUATION:

ANALYST BRIEFING:
${context.briefing.summary}
Confidence: ${(context.briefing.confidence * 100).toFixed(0)}%
Regime: ${context.briefing.regime}
Thesis Impact: ${context.briefing.thesisImpact}
Convergence Score: ${context.briefing.convergenceScore}/10

ACTION ITEMS FROM ANALYST:
${actionsSummary || "None"}

CURRENT POSITIONS:
${positionsSummary || "No positions"}

ACCOUNT:
Balance: $${context.accountBalance.toFixed(2)}
Max Position: ${context.riskParams.maxPositionPercent}%
Max Drawdown: ${context.riskParams.maxDrawdownPercent}%
Default Stop Loss: ${context.riskParams.defaultStopLossPercent}%

Evaluate and output trade decisions.`;

  const response = await client.messages.create({
    model: EXECUTOR_MODEL,
    max_tokens: 800,
    system: EXECUTOR_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [{ action: "hold", ticker: "PORTFOLIO", reason: "executor parse failure", riskRewardRatio: 0, positionSizePercent: 0 }];
  }

  try {
    return JSON.parse(jsonMatch[0]) as ExecutorAction[];
  } catch {
    return [{ action: "hold", ticker: "PORTFOLIO", reason: "executor parse failure", riskRewardRatio: 0, positionSizePercent: 0 }];
  }
}
