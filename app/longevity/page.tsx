"use client";

import { useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronRight,
  Heart,
  Loader2,
  Search,
  Shield,
  Skull,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

interface RiskFactor {
  score: number;
  rationale: string;
}

interface Analysis {
  subject: {
    name: string;
    age: number | null;
    dateOfBirth: string | null;
    nationality: string;
    role: string;
    significance: string;
  };
  riskFactors: Record<string, RiskFactor>;
  compositeScore: {
    overallRisk: number;
    survivalProbability: number;
    confidence: number;
    primaryConcerns: string[];
    mitigatingFactors: string[];
  };
  geopoliticalImpact: {
    successionRisk: string;
    marketSectors: string[];
    estimatedMarketImpact: string;
    keyDependencies: string[];
  };
  timeline: {
    shortTerm: string;
    mediumTerm: string;
    trendDirection: string;
  };
  intelligenceGaps: string[];
  disclaimer: string;
}

interface NewsArticle {
  title: string;
  url: string;
  date: string;
  source: string;
}

const RISK_LABELS: Record<string, { label: string; icon: typeof Heart }> = {
  age: { label: "Age", icon: User },
  knownHealthConditions: { label: "Health Conditions", icon: Heart },
  lifestyle: { label: "Lifestyle", icon: Activity },
  occupationalStress: { label: "Occupational Stress", icon: Zap },
  securityThreats: { label: "Security Threats", icon: Shield },
  mentalHealth: { label: "Mental Health", icon: Brain },
  environmentalExposure: { label: "Environmental", icon: AlertTriangle },
  geneticIndicators: { label: "Genetics", icon: Target },
  accessToHealthcare: { label: "Healthcare Access", icon: Heart },
  substanceUse: { label: "Substance Use", icon: AlertTriangle },
};

function riskColor(score: number): string {
  if (score <= 2) return "text-accent-emerald";
  if (score <= 4) return "text-accent-cyan";
  if (score <= 6) return "text-accent-amber";
  if (score <= 8) return "text-accent-rose";
  return "text-red-500";
}

function riskBg(score: number): string {
  if (score <= 2) return "bg-accent-emerald";
  if (score <= 4) return "bg-accent-cyan";
  if (score <= 6) return "bg-accent-amber";
  if (score <= 8) return "bg-accent-rose";
  return "bg-red-500";
}

function riskLabel(score: number): string {
  if (score <= 2) return "LOW";
  if (score <= 4) return "MODERATE";
  if (score <= 6) return "ELEVATED";
  if (score <= 8) return "HIGH";
  return "CRITICAL";
}

function survivalColor(prob: number): string {
  if (prob >= 0.9) return "text-accent-emerald";
  if (prob >= 0.7) return "text-accent-cyan";
  if (prob >= 0.5) return "text-accent-amber";
  return "text-accent-rose";
}

function impactColor(impact: string): string {
  switch (impact) {
    case "severe": return "text-red-500";
    case "high": return "text-accent-rose";
    case "moderate": return "text-accent-amber";
    default: return "text-accent-emerald";
  }
}

function trendIcon(direction: string) {
  switch (direction) {
    case "improving": return <TrendingUp className="h-3.5 w-3.5 text-accent-emerald" />;
    case "declining": return <TrendingDown className="h-3.5 w-3.5 text-accent-rose" />;
    default: return <Activity className="h-3.5 w-3.5 text-navy-400" />;
  }
}

export default function LongevityPage() {
  const [name, setName] = useState("");
  const [years, setYears] = useState(5);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [healthNews, setHealthNews] = useState<NewsArticle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/longevity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), timeframeYears: years }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Analysis failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setNews(data.newsArticles || []);
      setHealthNews(data.healthArticles || []);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, [name, years, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") analyze();
  };

  const a = analysis;
  const composite = a?.compositeScore;

  // Sort risk factors by score descending
  const sortedRisks = a
    ? Object.entries(a.riskFactors).sort(([, a], [, b]) => b.score - a.score)
    : [];

  return (
    <PageContainer
      title="Longevity Risk Analysis"
      subtitle="Actuarial intelligence on public figures from open-source data"
    >
      <UpgradeGate minTier="analyst" feature="Longevity Risk Analysis">
        {/* Search */}
        <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-600" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Public figure name (e.g. Putin, Xi Jinping)"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-navy-700 bg-navy-900 text-sm text-navy-200 placeholder-navy-600 focus:border-accent-cyan/50 focus:outline-none font-mono"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="rounded-md border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-300 focus:border-accent-cyan/50 focus:outline-none font-mono"
              >
                <option value={1}>1yr</option>
                <option value={2}>2yr</option>
                <option value={5}>5yr</option>
                <option value={10}>10yr</option>
              </select>
              <button
                onClick={analyze}
                disabled={!name.trim() || loading}
                className="flex items-center gap-2 rounded-md border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-sm font-mono text-accent-cyan hover:bg-accent-cyan/20 transition-colors disabled:opacity-30"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Skull className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Analyze</span>
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-accent-rose mt-2">{error}</p>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-navy-500">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <p className="text-sm font-mono">Gathering intelligence and analyzing risk factors...</p>
            <p className="text-[10px] text-navy-600 mt-1">Searching GDELT, Wikipedia, and public records</p>
          </div>
        )}

        {a && composite && (
          <>
            {/* Subject Header + Composite Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Subject Info */}
              <div className="md:col-span-2 rounded-lg border border-navy-700/50 bg-navy-900/30 p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-base sm:text-xl font-bold text-navy-300 uppercase">
                      {a.subject.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-navy-100">{a.subject.name}</h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-navy-400 font-mono">
                      {a.subject.age && <span>Age {a.subject.age}</span>}
                      <span>{a.subject.nationality}</span>
                      <span className="hidden sm:inline">{a.subject.role}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-navy-500 mt-2 leading-relaxed line-clamp-3 sm:line-clamp-none">{a.subject.significance}</p>
                  </div>
                </div>
              </div>

              {/* Composite Score */}
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-5 flex flex-col items-center justify-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
                  Overall Risk
                </div>
                <div className={`text-4xl font-bold font-mono ${riskColor(composite.overallRisk)}`}>
                  {composite.overallRisk.toFixed(1)}
                </div>
                <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mt-1 ${riskColor(composite.overallRisk)}`}>
                  {riskLabel(composite.overallRisk)}
                </div>
                <div className="w-full h-1.5 rounded-full bg-navy-800 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${riskBg(composite.overallRisk)}`}
                    style={{ width: `${composite.overallRisk * 10}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">
                  Survival Probability
                </div>
                <div className={`text-2xl font-bold font-mono ${survivalColor(composite.survivalProbability)}`}>
                  {(composite.survivalProbability * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-navy-600 mt-0.5">{years}-year window</div>
              </div>

              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">
                  Confidence
                </div>
                <div className="text-2xl font-bold font-mono text-navy-200">
                  {(composite.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-navy-600 mt-0.5">Assessment certainty</div>
              </div>

              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">
                  Market Impact
                </div>
                <div className={`text-lg font-bold font-mono uppercase ${impactColor(a.geopoliticalImpact.estimatedMarketImpact)}`}>
                  {a.geopoliticalImpact.estimatedMarketImpact}
                </div>
                <div className="text-[10px] text-navy-600 mt-0.5">If incapacitated</div>
              </div>

              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">
                  Trend
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {trendIcon(a.timeline.trendDirection)}
                  <span className="text-sm font-mono text-navy-200 capitalize">{a.timeline.trendDirection}</span>
                </div>
                <div className="text-[10px] text-navy-600 mt-0.5">Health trajectory</div>
              </div>
            </div>

            {/* Risk Factor Breakdown */}
            <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 mb-6">
              <div className="px-4 py-2.5 border-b border-navy-700/50 bg-navy-900/50">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                  Risk Factor Breakdown
                </span>
              </div>
              <div className="divide-y divide-navy-800/30">
                {sortedRisks.map(([key, factor]) => {
                  const config = RISK_LABELS[key];
                  const Icon = config?.icon || AlertTriangle;
                  return (
                    <div key={key} className="px-3 sm:px-4 py-3 hover:bg-navy-800/20 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${riskColor(factor.score)}`} />
                        <span className="text-[11px] sm:text-xs font-mono text-navy-300 w-20 sm:w-36 flex-shrink-0 truncate">
                          {config?.label || key}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${riskBg(factor.score)}`}
                            style={{ width: `${factor.score * 10}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold font-mono w-8 text-right ${riskColor(factor.score)}`}>
                          {factor.score}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-navy-500 mt-1.5 ml-6 sm:ml-7 leading-relaxed">
                        {factor.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Primary Concerns */}
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-accent-rose mb-3">
                  Primary Concerns
                </h3>
                <div className="space-y-2">
                  {composite.primaryConcerns.map((concern, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-accent-rose mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-navy-300">{concern}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigating Factors */}
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-accent-emerald mb-3">
                  Mitigating Factors
                </h3>
                <div className="space-y-2">
                  {composite.mitigatingFactors.map((factor, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Shield className="h-3 w-3 text-accent-emerald mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-navy-300">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Geopolitical Impact */}
            <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4 mb-6">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
                Geopolitical Impact Assessment
              </h3>
              <p className="text-xs text-navy-300 mb-3 leading-relaxed">{a.geopoliticalImpact.successionRisk}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Affected Sectors</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {a.geopoliticalImpact.marketSectors.map((s) => (
                      <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800/60 text-navy-400 border border-navy-700/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Key Dependencies</span>
                  <div className="space-y-1 mt-1.5">
                    {a.geopoliticalImpact.keyDependencies.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <ChevronRight className="h-3 w-3 text-navy-600 mt-0.5 flex-shrink-0" />
                        <span className="text-[11px] text-navy-400">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
                  Short-term Outlook (1 year)
                </h3>
                <p className="text-xs text-navy-300 leading-relaxed">{a.timeline.shortTerm}</p>
              </div>
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">
                  Medium-term Outlook ({years} years)
                </h3>
                <p className="text-xs text-navy-300 leading-relaxed">{a.timeline.mediumTerm}</p>
              </div>
            </div>

            {/* Intelligence Gaps */}
            {a.intelligenceGaps.length > 0 && (
              <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-4 mb-6">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-accent-amber mb-3">
                  Intelligence Gaps
                </h3>
                <div className="space-y-1.5">
                  {a.intelligenceGaps.map((gap, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-mono text-accent-amber mt-0.5">?</span>
                      <span className="text-xs text-navy-400">{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News Intelligence */}
            {(news.length > 0 || healthNews.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {news.length > 0 && (
                  <div className="rounded-lg border border-navy-700/50 bg-navy-900/30">
                    <div className="px-4 py-2 border-b border-navy-700/50">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                        Recent News ({news.length})
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-navy-800/30">
                      {news.map((article, i) => (
                        <a
                          key={i}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 hover:bg-navy-800/20 transition-colors"
                        >
                          <p className="text-[11px] text-navy-300 line-clamp-2">{article.title}</p>
                          <span className="text-[9px] font-mono text-navy-600">{article.source}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {healthNews.length > 0 && (
                  <div className="rounded-lg border border-navy-700/50 bg-navy-900/30">
                    <div className="px-4 py-2 border-b border-navy-700/50">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                        Health-related Intel ({healthNews.length})
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-navy-800/30">
                      {healthNews.map((article, i) => (
                        <a
                          key={i}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 hover:bg-navy-800/20 transition-colors"
                        >
                          <p className="text-[11px] text-navy-300 line-clamp-2">{article.title}</p>
                          <span className="text-[9px] font-mono text-navy-600">{article.source}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-navy-700/30 bg-navy-950/50 p-3">
              <p className="text-[10px] text-navy-600 leading-relaxed font-mono">
                {a.disclaimer}
              </p>
            </div>
          </>
        )}

        {!loading && !a && (
          <div className="flex flex-col items-center justify-center py-20 text-navy-600">
            <Skull className="h-8 w-8 mb-3" />
            <p className="text-sm">Enter a public figure to analyze longevity risk</p>
            <p className="text-[10px] text-navy-700 mt-1.5 max-w-md text-center">
              Aggregates public health records, news, lifestyle data, security assessments, and actuarial factors to produce a comprehensive risk profile for geopolitical and market analysis.
            </p>
          </div>
        )}
      </UpgradeGate>
    </PageContainer>
  );
}
