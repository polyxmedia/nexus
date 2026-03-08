// SEC/Corporate Filing & Earnings Call NLP Analysis

const POSITIVE_WORDS = new Set([
  "growth", "strong", "record", "exceeded", "momentum", "outperformed", "robust",
  "accelerating", "confident", "optimistic", "tailwind", "opportunity", "innovative",
  "profitable", "improved", "beat", "surpassed", "expanded", "gained", "leadership",
]);

const NEGATIVE_WORDS = new Set([
  "decline", "weak", "challenging", "headwind", "uncertainty", "pressure", "deteriorating",
  "softening", "concerned", "cautious", "restructuring", "impairment", "loss", "missed",
  "below", "underperformed", "contraction", "risk", "downturn", "disruption",
]);

const HEDGING_WORDS = new Set([
  "may", "might", "could", "possibly", "potentially", "approximately", "uncertain",
  "subject-to", "depending", "contingent", "estimate", "believe", "expect", "anticipate",
  "likely", "probable", "foreseeable", "intend", "plan", "seek", "endeavor",
]);

const BUZZWORDS = new Set([
  "ai", "artificial-intelligence", "machine-learning", "synergy", "disruptive", "paradigm",
  "transformative", "ecosystem", "leverage", "scalable", "blockchain", "metaverse",
  "omnichannel", "holistic", "best-in-class", "world-class", "next-generation",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(w => w.length > 2);
}

export interface EarningsAnalysis {
  company: string;
  sentimentScore: number;
  confidenceLevel: "high" | "moderate" | "low" | "very-low";
  hedgingLanguage: { count: number; density: number; examples: string[] };
  keyTopics: string[];
  guidanceDirection: "raised" | "maintained" | "lowered" | "withdrawn" | "not-provided";
  riskFactors: string[];
  buzzwordDensity: number;
  managementTone: "confident" | "cautious" | "defensive" | "evasive";
  summary: string;
}

export function analyzeEarningsCall(transcript: string, company: string): EarningsAnalysis {
  const tokens = tokenize(transcript);
  const totalWords = tokens.length || 1;

  const positive = tokens.filter(t => POSITIVE_WORDS.has(t));
  const negative = tokens.filter(t => NEGATIVE_WORDS.has(t));
  const hedging = tokens.filter(t => HEDGING_WORDS.has(t));
  const buzzwords = tokens.filter(t => BUZZWORDS.has(t));

  const sentimentScore = Math.round(((positive.length - negative.length) / totalWords) * 1000) / 1000;
  const hedgingDensity = Math.round((hedging.length / totalWords) * 10000) / 10000;
  const buzzDensity = Math.round((buzzwords.length / totalWords) * 10000) / 10000;

  let confidenceLevel: EarningsAnalysis["confidenceLevel"];
  if (hedgingDensity < 0.005 && sentimentScore > 0.005) confidenceLevel = "high";
  else if (hedgingDensity < 0.01) confidenceLevel = "moderate";
  else if (hedgingDensity < 0.02) confidenceLevel = "low";
  else confidenceLevel = "very-low";

  let managementTone: EarningsAnalysis["managementTone"];
  if (sentimentScore > 0.005 && hedgingDensity < 0.008) managementTone = "confident";
  else if (sentimentScore > 0 && hedgingDensity < 0.015) managementTone = "cautious";
  else if (sentimentScore < -0.003) managementTone = "defensive";
  else managementTone = "evasive";

  // Guidance detection
  const lower = transcript.toLowerCase();
  let guidanceDirection: EarningsAnalysis["guidanceDirection"] = "not-provided";
  if (lower.includes("raising guidance") || lower.includes("raised our outlook") || lower.includes("increasing our forecast")) {
    guidanceDirection = "raised";
  } else if (lower.includes("lowering guidance") || lower.includes("revised downward") || lower.includes("reducing our outlook")) {
    guidanceDirection = "lowered";
  } else if (lower.includes("reaffirming") || lower.includes("maintaining guidance") || lower.includes("reiterate our outlook")) {
    guidanceDirection = "maintained";
  } else if (lower.includes("withdrawing guidance") || lower.includes("suspending outlook")) {
    guidanceDirection = "withdrawn";
  }

  // Risk factors (simple extraction)
  const riskPhrases = ["supply chain", "inflation", "competition", "regulation", "currency", "geopolitical", "recession", "interest rate", "cybersecurity", "talent"];
  const riskFactors = riskPhrases.filter(r => lower.includes(r));

  const summary = `${company} earnings call reads ${managementTone} (sentiment: ${sentimentScore > 0 ? "+" : ""}${sentimentScore}). Hedging density: ${(hedgingDensity * 100).toFixed(1)}%. Guidance: ${guidanceDirection}. ${riskFactors.length} risk themes mentioned.`;

  return {
    company,
    sentimentScore,
    confidenceLevel,
    hedgingLanguage: {
      count: hedging.length,
      density: hedgingDensity,
      examples: Array.from(new Set(hedging)).slice(0, 10),
    },
    keyTopics: Array.from(new Set([...positive.slice(0, 5), ...negative.slice(0, 5)])),
    guidanceDirection,
    riskFactors,
    buzzwordDensity: buzzDensity,
    managementTone,
    summary,
  };
}
