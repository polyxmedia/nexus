import Anthropic from "@anthropic-ai/sdk";

export interface RedTeamAssessment {
  challenge: string;
  killConditions: string[];
  alternativeScenarios: {
    scenario: string;
    probability: number;
    impact: string;
  }[];
  suggestedConfidence: number;
  confidenceReason: string;
  biasScore: number; // 1-5, where 5 = severe confirmation bias
  biasNotes: string;
}

const RED_TEAM_PROMPT = `You are a RED TEAM adversarial analyst. Your sole purpose is to challenge, stress-test, and find weaknesses in intelligence analyses. You are structurally opposed to the primary analyst's conclusions.

Your job:
1. CHALLENGE the core thesis. What assumptions are being made? What evidence is being ignored or underweighted?
2. KILL CONDITIONS. What specific, observable events would invalidate this thesis entirely?
3. ALTERNATIVE SCENARIOS. What other explanations fit the same data? Price them with probabilities.
4. CONFIDENCE CHECK. Is the analyst's confidence level justified? Are they overconfident or underconfident given the evidence?
5. BIAS DETECTION. Rate confirmation bias on a 1-5 scale (1 = minimal, 5 = severe). Is the analyst cherry-picking data that supports their conclusion?

Rules:
- Be adversarial but intellectually honest. Don't disagree for the sake of it.
- Ground your challenges in specific data points and logical reasoning.
- If the analysis is genuinely strong, say so but still identify the weakest links.
- No hedging language. State your challenges directly.

Respond in this exact JSON structure:
{
  "challenge": "2-3 sentence direct challenge to the core thesis",
  "killConditions": ["specific observable event 1", "specific observable event 2", "specific observable event 3"],
  "alternativeScenarios": [
    { "scenario": "description", "probability": 0.0-1.0, "impact": "what happens to positions" },
    { "scenario": "description", "probability": 0.0-1.0, "impact": "what happens to positions" }
  ],
  "suggestedConfidence": 0.0-1.0,
  "confidenceReason": "why the confidence should be adjusted",
  "biasScore": 1-5,
  "biasNotes": "specific bias patterns detected"
}`;

export async function runRedTeamAssessment(
  analysis: {
    summary: string;
    confidence: number;
    escalationProbability?: number | null;
    marketImpact: string;
    tradeRecommendations: string;
    reasoning: string;
    riskFactors?: string | null;
    historicalParallels?: string | null;
  },
  apiKey: string
): Promise<RedTeamAssessment> {
  const client = new Anthropic({ apiKey });

  const analysisText = `
ANALYSIS SUMMARY: ${analysis.summary}
CONFIDENCE: ${analysis.confidence}
${analysis.escalationProbability != null ? `ESCALATION PROBABILITY: ${analysis.escalationProbability}` : ""}
MARKET IMPACT: ${analysis.marketImpact}
TRADE RECOMMENDATIONS: ${analysis.tradeRecommendations}
REASONING: ${analysis.reasoning}
${analysis.riskFactors ? `RISK FACTORS: ${analysis.riskFactors}` : ""}
${analysis.historicalParallels ? `HISTORICAL PARALLELS: ${analysis.historicalParallels}` : ""}
`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: RED_TEAM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Challenge this intelligence analysis:\n\n${analysisText}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      challenge: "Red team assessment could not be parsed.",
      killConditions: [],
      alternativeScenarios: [],
      suggestedConfidence: analysis.confidence,
      confidenceReason: "Unable to evaluate",
      biasScore: 3,
      biasNotes: "Assessment unavailable",
    };
  }

  return JSON.parse(jsonMatch[0]) as RedTeamAssessment;
}
