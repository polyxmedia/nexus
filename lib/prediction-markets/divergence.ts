// Prediction Markets Divergence Detection Engine
// Compares prediction market probabilities against NEXUS prediction engine confidence scores

import type { PredictionMarket, MarketDivergence } from "./index";

interface NexusPrediction {
  id: number;
  claim: string;
  confidence: number;
  category: string;
  timeframe: string;
  deadline: string;
}

// Stop words to exclude from keyword matching
const STOP_WORDS = new Set([
  "the", "will", "that", "this", "with", "from", "have", "been",
  "what", "when", "where", "which", "their", "there", "about",
  "would", "could", "should", "into", "over", "more", "than",
  "before", "after", "between", "under", "above", "does", "next",
]);

/**
 * Extract meaningful keywords from a string for matching
 */
function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

/**
 * Calculate keyword overlap ratio between two texts.
 * Returns a score from 0-1 based on proportion of shared keywords.
 */
function calculateSimilarity(textA: string, textB: string): number {
  const keywordsA = extractKeywords(textA);
  const keywordsB = extractKeywords(textB);

  if (keywordsA.size === 0 || keywordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of keywordsB) {
    if (keywordsA.has(word)) overlap++;
  }

  const minSize = Math.min(keywordsA.size, keywordsB.size);
  return minSize > 0 ? overlap / minSize : 0;
}

/**
 * Detect divergences between prediction market probabilities and NEXUS prediction confidence.
 * Matches by keyword similarity in titles, then calculates divergence magnitude.
 * Flags arbitrage opportunities where divergence exceeds 15%.
 *
 * @param markets - Array of prediction markets from Polymarket/Kalshi
 * @param nexusPredictions - Array of NEXUS active predictions from DB
 * @returns Divergences sorted by magnitude (highest first)
 */
export function detectDivergences(
  markets: PredictionMarket[],
  nexusPredictions: NexusPrediction[]
): MarketDivergence[] {
  const divergences: MarketDivergence[] = [];
  const seen = new Set<string>(); // prevent duplicate market-prediction pairs

  for (const market of markets) {
    const marketKeywords = extractKeywords(market.title);

    for (const prediction of nexusPredictions) {
      const pairKey = `${market.id}:${prediction.id}`;
      if (seen.has(pairKey)) continue;

      const predKeywords = extractKeywords(prediction.claim);

      // Check for keyword overlap (at least 3 words in common)
      let overlap = 0;
      for (const word of predKeywords) {
        if (marketKeywords.has(word)) overlap++;
      }

      if (overlap >= 3) {
        const divergence = Math.abs(prediction.confidence - market.probability);

        // Only flag significant divergences (>15 percentage points)
        if (divergence > 0.15) {
          seen.add(pairKey);
          divergences.push({
            market,
            nexusConfidence: prediction.confidence,
            marketProbability: market.probability,
            divergence,
            direction:
              prediction.confidence > market.probability
                ? "nexus_higher"
                : "nexus_lower",
          });
        }
      }
    }
  }

  return divergences.sort((a, b) => b.divergence - a.divergence);
}

/**
 * Compute summary statistics for a set of divergences
 */
export function computeDivergenceStats(divergences: MarketDivergence[]) {
  if (divergences.length === 0) {
    return {
      count: 0,
      avgDivergence: 0,
      maxDivergence: 0,
      nexusHigherCount: 0,
      nexusLowerCount: 0,
      arbitrageOpportunities: 0,
    };
  }

  const avgDivergence =
    divergences.reduce((sum, d) => sum + d.divergence, 0) / divergences.length;
  const maxDivergence = divergences[0]?.divergence ?? 0;
  const nexusHigherCount = divergences.filter(
    (d) => d.direction === "nexus_higher"
  ).length;
  const nexusLowerCount = divergences.filter(
    (d) => d.direction === "nexus_lower"
  ).length;
  // Arbitrage threshold: divergence > 25%
  const arbitrageOpportunities = divergences.filter(
    (d) => d.divergence > 0.25
  ).length;

  return {
    count: divergences.length,
    avgDivergence,
    maxDivergence,
    nexusHigherCount,
    nexusLowerCount,
    arbitrageOpportunities,
  };
}

export type { NexusPrediction };
