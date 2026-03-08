// Central Bank Statement NLP Analysis
// Hawkish/dovish scoring, forward guidance extraction, tone shift detection

const HAWKISH_WORDS = new Set([
  "inflation", "tightening", "overheating", "restrictive", "above-target", "persistent",
  "vigilant", "higher-for-longer", "quantitative-tightening", "rate-hike", "price-stability",
  "upside-risks", "demand-driven", "wage-pressure", "tight-labor", "strong-employment",
  "raising", "elevated", "sustained", "broadening", "embedded", "unanchored",
  "hawkish", "normalize", "reduce-accommodation", "balance-sheet-reduction",
  "inflationary", "overheated", "excessive", "unsustainable", "pricing-pressure",
  "robust-demand", "capacity-constraints", "bottlenecks", "cost-push", "pass-through",
  "firm", "determined", "commitment", "price-pressures", "expectations-unanchored",
  "strong-growth", "above-trend", "labor-shortage", "overshoot", "stickier",
]);

const DOVISH_WORDS = new Set([
  "accommodative", "easing", "downside-risks", "below-target", "slack", "patient",
  "gradual", "supportive", "data-dependent", "balance-sheet-expansion", "rate-cut",
  "growth-concerns", "soft-landing", "normalizing", "disinflationary", "cooling",
  "weakening", "recession-risk", "financial-stress", "credit-tightening", "dovish",
  "lowering", "moderating", "transitory", "subdued", "muted", "fragile",
  "uncertainty", "headwinds", "deteriorating", "softening", "contraction",
  "deflationary", "below-potential", "spare-capacity", "output-gap", "underemployment",
  "precautionary", "insurance-cut", "mid-cycle", "adjustment", "recalibrate",
  "measured", "cautious", "flexible", "pivot", "pause", "wait-and-see",
]);

const UNCERTAINTY_WORDS = new Set([
  "uncertain", "evolving", "monitoring", "assessing", "watching", "depends",
  "conditional", "cautious", "range-of-outcomes", "balanced-risks", "two-sided",
  "data-dependent", "meeting-by-meeting", "optionality", "nimble", "agile",
  "judgment", "appropriate", "evaluate", "consider", "review",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function countMatches(tokens: string[], wordSet: Set<string>): { count: number; matches: string[] } {
  const matches: string[] = [];
  for (const token of tokens) {
    if (wordSet.has(token)) matches.push(token);
    // Also check hyphenated compounds
    for (const word of wordSet) {
      if (word.includes("-") && token.includes(word.split("-")[0])) {
        // Rough compound match
        const parts = word.split("-");
        if (parts.every(p => tokens.includes(p) || tokens.some(t => t.includes(p)))) {
          if (!matches.includes(word)) matches.push(word);
        }
      }
    }
  }
  return { count: matches.length, matches: Array.from(new Set(matches)) };
}

export interface CentralBankAnalysis {
  institution: string;
  date: string;
  hawkishScore: number;
  dovishScore: number;
  netScore: number;
  uncertaintyLevel: number;
  keyPhrases: string[];
  forwardGuidance: string;
  ratePathImplication: "hiking" | "pausing" | "cutting" | "uncertain";
  topicBreakdown: Record<string, number>;
  marketImplications: {
    bonds: string;
    equities: string;
    dollar: string;
    gold: string;
  };
  summary: string;
}

export function analyzeCentralBankText(text: string, institution: string): CentralBankAnalysis {
  const tokens = tokenize(text);
  const totalWords = tokens.length || 1;

  const hawkish = countMatches(tokens, HAWKISH_WORDS);
  const dovish = countMatches(tokens, DOVISH_WORDS);
  const uncertain = countMatches(tokens, UNCERTAINTY_WORDS);

  const hawkishScore = Math.round((hawkish.count / totalWords) * 1000) / 1000;
  const dovishScore = Math.round((dovish.count / totalWords) * 1000) / 1000;
  const netScore = Math.round((hawkishScore - dovishScore) * 1000) / 1000;
  const uncertaintyLevel = Math.round((uncertain.count / totalWords) * 1000) / 1000;

  // Rate path implication
  let ratePathImplication: CentralBankAnalysis["ratePathImplication"];
  if (netScore > 0.005) ratePathImplication = "hiking";
  else if (netScore < -0.005) ratePathImplication = "cutting";
  else if (uncertaintyLevel > 0.005) ratePathImplication = "uncertain";
  else ratePathImplication = "pausing";

  // Topic breakdown
  const inflationTokens = tokens.filter(t => ["inflation", "cpi", "price", "prices", "cost", "costs", "wage", "wages"].includes(t));
  const employmentTokens = tokens.filter(t => ["employment", "labor", "jobs", "unemployment", "hiring", "workers", "payrolls"].includes(t));
  const growthTokens = tokens.filter(t => ["growth", "gdp", "output", "expansion", "recession", "contraction", "activity"].includes(t));
  const stabilityTokens = tokens.filter(t => ["stability", "financial", "banking", "credit", "liquidity", "systemic", "stress"].includes(t));

  const topicBreakdown = {
    inflation: Math.round((inflationTokens.length / totalWords) * 10000) / 10000,
    employment: Math.round((employmentTokens.length / totalWords) * 10000) / 10000,
    growth: Math.round((growthTokens.length / totalWords) * 10000) / 10000,
    financialStability: Math.round((stabilityTokens.length / totalWords) * 10000) / 10000,
  };

  // Market implications
  const marketImplications = {
    bonds: netScore > 0.003 ? "Bearish. Higher rates ahead." : netScore < -0.003 ? "Bullish. Rate cuts supportive." : "Neutral. No clear direction signal.",
    equities: netScore > 0.005 ? "Headwind from tighter policy." : netScore < -0.005 ? "Tailwind from easing bias." : "Muted impact. Watch data.",
    dollar: netScore > 0.003 ? "Supportive. Higher yield differential." : netScore < -0.003 ? "Weakening. Rate cut expectations." : "Range-bound.",
    gold: netScore > 0.003 ? "Headwind from higher real rates." : netScore < -0.003 ? "Bullish. Lower real rates support gold." : "Neutral.",
  };

  // Key phrases (top hawkish and dovish matches)
  const keyPhrases = [...hawkish.matches.slice(0, 5), ...dovish.matches.slice(0, 5), ...uncertain.matches.slice(0, 3)];

  // Forward guidance extraction (simple heuristic)
  let forwardGuidance = "No clear forward guidance detected.";
  const lowerText = text.toLowerCase();
  if (lowerText.includes("further tightening") || lowerText.includes("additional increases")) {
    forwardGuidance = "Signals further tightening ahead.";
  } else if (lowerText.includes("rate cuts") || lowerText.includes("begin easing") || lowerText.includes("reduce rates")) {
    forwardGuidance = "Signals rate cuts or easing cycle beginning.";
  } else if (lowerText.includes("data dependent") || lowerText.includes("meeting by meeting")) {
    forwardGuidance = "Data-dependent stance. No pre-commitment to direction.";
  } else if (lowerText.includes("maintain") || lowerText.includes("hold") || lowerText.includes("unchanged")) {
    forwardGuidance = "Signals rates on hold for extended period.";
  }

  // Summary
  const toneLabel = netScore > 0.005 ? "hawkish" : netScore < -0.005 ? "dovish" : "balanced";
  const summary = `${institution} statement reads ${toneLabel} (net score: ${netScore > 0 ? "+" : ""}${netScore}). ${hawkish.count} hawkish signals vs ${dovish.count} dovish. Uncertainty: ${uncertain.count} markers. ${forwardGuidance}`;

  return {
    institution,
    date: new Date().toISOString(),
    hawkishScore,
    dovishScore,
    netScore,
    uncertaintyLevel,
    keyPhrases,
    forwardGuidance,
    ratePathImplication,
    topicBreakdown,
    marketImplications,
    summary,
  };
}

export function compareStatements(current: string, previous: string, institution: string): {
  currentAnalysis: CentralBankAnalysis;
  previousAnalysis: CentralBankAnalysis;
  toneShift: number;
  direction: "more-hawkish" | "more-dovish" | "unchanged";
  significantChanges: string[];
} {
  const currentAnalysis = analyzeCentralBankText(current, institution);
  const previousAnalysis = analyzeCentralBankText(previous, institution);

  const toneShift = Math.round((currentAnalysis.netScore - previousAnalysis.netScore) * 1000) / 1000;

  let direction: "more-hawkish" | "more-dovish" | "unchanged";
  if (toneShift > 0.002) direction = "more-hawkish";
  else if (toneShift < -0.002) direction = "more-dovish";
  else direction = "unchanged";

  const significantChanges: string[] = [];
  if (currentAnalysis.ratePathImplication !== previousAnalysis.ratePathImplication) {
    significantChanges.push(`Rate path shifted from "${previousAnalysis.ratePathImplication}" to "${currentAnalysis.ratePathImplication}"`);
  }
  if (Math.abs(toneShift) > 0.003) {
    significantChanges.push(`Tone shifted ${direction} by ${Math.abs(toneShift)} points`);
  }

  // Compare topic emphasis
  for (const topic of Object.keys(currentAnalysis.topicBreakdown) as Array<keyof typeof currentAnalysis.topicBreakdown>) {
    const diff = currentAnalysis.topicBreakdown[topic] - previousAnalysis.topicBreakdown[topic];
    if (Math.abs(diff) > 0.002) {
      significantChanges.push(`${topic} emphasis ${diff > 0 ? "increased" : "decreased"} significantly`);
    }
  }

  return { currentAnalysis, previousAnalysis, toneShift, direction, significantChanges };
}
