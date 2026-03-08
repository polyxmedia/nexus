// Source enrichment - integrates reliability scoring with existing systems

import {
  getSourceProfile,
  getReliabilityScore,
  assessInformation,
  formatAdmiraltyRating,
  type SourceReliability,
  type InformationAccuracy,
} from "./reliability";

export function enrichNewsArticle(article: { domain: string; title: string }): {
  reliability: SourceReliability;
  reliabilityScore: number;
  bias: string;
  rating: string;
  sourceName: string;
  stateAffiliated: boolean;
} {
  const profile = getSourceProfile(article.domain);
  const info = assessInformation([article.domain]);
  return {
    reliability: profile.reliability,
    reliabilityScore: getReliabilityScore(profile.reliability),
    bias: profile.biasDirection,
    rating: formatAdmiraltyRating(profile.reliability, info.accuracy),
    sourceName: profile.name,
    stateAffiliated: profile.stateAffiliated,
  };
}

export function enrichKnowledgeEntry(sources: string[]): {
  compositeConfidence: number;
  rating: string;
  bestSource: SourceReliability;
  sourceCount: number;
  explanation: string;
} {
  if (sources.length === 0) {
    return { compositeConfidence: 0.3, rating: "F6", bestSource: "F", sourceCount: 0, explanation: "No sources" };
  }

  const profiles = sources.map(s => getSourceProfile(s));
  const reliabilities = profiles.map(p => p.reliability);
  const bestReliability = reliabilities.sort((a, b) => {
    const order = "ABCDEF";
    return order.indexOf(a) - order.indexOf(b);
  })[0];

  const info = assessInformation(sources);
  const avgReliabilityScore = profiles.reduce((sum, p) => sum + getReliabilityScore(p.reliability), 0) / profiles.length;
  const accScore = Math.max(0, (7 - info.accuracy) / 6);
  const compositeConfidence = Math.round((avgReliabilityScore * 0.4 + accScore * 0.6) * 100) / 100;

  return {
    compositeConfidence,
    rating: formatAdmiraltyRating(bestReliability, info.accuracy),
    bestSource: bestReliability,
    sourceCount: sources.length,
    explanation: info.explanation,
  };
}

export function enrichGdeltArticles(articles: Array<{ domain: string; title: string }>): {
  avgReliability: number;
  sourceDiversity: number;
  rating: string;
  sourceBreakdown: Record<SourceReliability, number>;
  stateMediaCount: number;
} {
  if (articles.length === 0) {
    return { avgReliability: 0, sourceDiversity: 0, rating: "F6", sourceBreakdown: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }, stateMediaCount: 0 };
  }

  const profiles = articles.map(a => getSourceProfile(a.domain));
  const avgReliability = profiles.reduce((sum, p) => sum + getReliabilityScore(p.reliability), 0) / profiles.length;
  const uniqueDomains = new Set(articles.map(a => a.domain.replace(/^www\./, "")));
  const sourceDiversity = uniqueDomains.size;

  const breakdown: Record<SourceReliability, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (const p of profiles) {
    breakdown[p.reliability]++;
  }

  const stateMediaCount = profiles.filter(p => p.stateAffiliated).length;
  const domains = Array.from(uniqueDomains);
  const info = assessInformation(domains);
  const bestProfile = profiles.sort((a, b) => getReliabilityScore(b.reliability) - getReliabilityScore(a.reliability))[0];

  return {
    avgReliability: Math.round(avgReliability * 100) / 100,
    sourceDiversity,
    rating: formatAdmiraltyRating(bestProfile?.reliability || "F", info.accuracy),
    sourceBreakdown: breakdown,
    stateMediaCount,
  };
}
