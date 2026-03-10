"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { BriefingCard } from "@/components/ui/briefing-card";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { IntensityIndicator } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  ArrowLeft,
  Globe,
  Moon,
  Star,
  BookOpen,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  TradeRecommendationCard,
  type TradeRecommendation,
} from "@/components/signals/trade-recommendation-card";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { SignalLineagePanel } from "@/components/signals/signal-lineage-panel";
import { CommentSection } from "@/components/social/comment-section";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Signal {
  id: number;
  uuid: string;
  title: string;
  description: string;
  date: string;
  intensity: number;
  category: string;
  status: string;
  layers: string;
  marketSectors: string | null;
  celestialType: string | null;
  hebrewDate: string | null;
  hebrewHoliday: string | null;
  geopoliticalContext: string | null;
  historicalPrecedent: string | null;
}

interface Analysis {
  id: number;
  summary: string;
  confidence: number;
  escalationProbability: number | null;
  marketImpact: string;
  tradeRecommendations: string;
  reasoning: string;
  hebrewCalendarAnalysis: string | null;
  celestialAnalysis: string | null;
  historicalParallels: string | null;
  riskFactors: string;
  redTeamAssessment: string | null;
  createdAt: string;
}

interface RedTeamData {
  challenge: string;
  killConditions: string[];
  alternativeScenarios: { scenario: string; probability: number; impact: string }[];
  suggestedConfidence: number;
  confidenceReason: string;
  biasScore: number;
  biasNotes: string;
}

interface BacktestSeries {
  ticker: string;
  label: string;
  data: Array<{ date: string; close: number; normalizedReturn: number }>;
  signalDatePrice: number | null;
  changes: { d7: number | null; d14: number | null; d30: number | null };
}

interface BacktestData {
  signalDate: string;
  series: BacktestSeries[];
}

const CHART_COLORS = ["#6b7280", "#9ca3af", "#a1a1aa"];

const INTENSITY_COLORS = ["#4a5568", "#5a6577", "#8b8b6e", "#9a7b6a", "#8b5c5c"];
const INTENSITY_LABELS = ["Low", "Moderate", "Elevated", "High", "Critical"];

const LAYER_ICONS: Record<string, typeof Globe> = {
  geopolitical: Globe,
  celestial: Star,
  hebrew: BookOpen,
  islamic: Moon,
};

export default function SignalDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [signal, setSignal] = useState<Signal | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lineage, setLineage] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/signals/${id}`)
      .then((r) => r.json())
      .then((signalData) => {
        const sig = signalData.signal || signalData;
        setSignal(sig);

        // Fetch analysis using numeric signal ID
        if (sig?.id) {
          fetch(`/api/analysis?signalId=${sig.id}`)
            .then((r) => r.json())
            .then((analysisData) => {
              const analyses = Array.isArray(analysisData) ? analysisData : analysisData.analyses || [];
              if (analyses.length > 0) {
                setAnalysis(analyses[0]);
              }
            })
            .catch((err) => console.error("[SignalDetail] analysis fetch failed:", err));
        }

        // Fetch backtest if signal is in the past
        if (sig && new Date(sig.date) < new Date()) {
          setBacktestLoading(true);
          fetch(`/api/signals/${id}/backtest`)
            .then((r) => r.json())
            .then((bt) => {
              if (bt.series && bt.series.length > 0) {
                setBacktest(bt);
              }
              setBacktestLoading(false);
            })
            .catch(() => setBacktestLoading(false));
        }

        // Fetch lineage chain
        fetch(`/api/signals/${id}/lineage`)
          .then((r) => r.json())
          .then((lin) => {
            if (lin.signal) setLineage(lin);
          })
          .catch((err) => console.error("[SignalDetail] lineage fetch failed:", err));

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: signal!.id }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data);
      }
    } catch {
      setError("Failed to run analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Signal Detail" subtitle="Loading...">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!signal) {
    return (
      <PageContainer title="Signal Not Found">
        <p className="text-xs text-navy-500">Signal #{id} not found.</p>
      </PageContainer>
    );
  }

  const layers: string[] = JSON.parse(signal.layers);
  const sectors: string[] = signal.marketSectors
    ? JSON.parse(signal.marketSectors)
    : [];

  let tradeRecs: TradeRecommendation[] = [];
  let riskFactors: string[] = [];
  let marketImpact: { direction?: string; magnitude?: string; sectors?: string[] } = {};
  let redTeam: RedTeamData | null = null;

  if (analysis) {
    try { tradeRecs = JSON.parse(analysis.tradeRecommendations); } catch { /* empty */ }
    try { riskFactors = JSON.parse(analysis.riskFactors); } catch { /* empty */ }
    try { marketImpact = JSON.parse(analysis.marketImpact); } catch { /* empty */ }
    if (analysis.redTeamAssessment) {
      try { redTeam = JSON.parse(analysis.redTeamAssessment); } catch { /* empty */ }
    }
  }

  const intensityColor = INTENSITY_COLORS[signal.intensity - 1] || "#6b7280";
  const isHighIntensity = signal.intensity >= 4;

  return (
    <PageContainer
      title={signal.title}
      subtitle={new Date(signal.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      actions={
        <div className="flex items-center gap-3">
          <Link
            href="/signals"
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500 hover:text-navy-300 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            All Signals
          </Link>
          <span className="text-navy-700">|</span>
          <IntensityIndicator intensity={signal.intensity} />
          <StatusDot
            color={signal.status === "active" ? "green" : signal.status === "upcoming" ? "cyan" : "gray"}
            label={signal.status}
          />
        </div>
      }
    >
      <UpgradeGate minTier="analyst" feature="Signal detection and monitoring" blur>
      {/* Intensity + Metadata Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-4 py-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Intensity</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold tabular-nums" style={{ color: intensityColor }}>{signal.intensity}</span>
            <span className="text-[10px] font-mono text-navy-600">/5</span>
            <div className="flex gap-0.5 ml-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-1.5 w-3 rounded-sm"
                  style={{ backgroundColor: n <= signal.intensity ? intensityColor : "#1a1a1a" }}
                />
              ))}
            </div>
          </div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: `${intensityColor}99` }}>{INTENSITY_LABELS[signal.intensity - 1]}</div>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-4 py-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Category</div>
          <div className="text-sm font-mono text-navy-200 capitalize">{signal.category}</div>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-4 py-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Layers</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {layers.map((l) => {
              const Icon = LAYER_ICONS[l] || Globe;
              return (
                <span key={l} className="inline-flex items-center gap-1 text-[10px] font-mono text-navy-300 bg-navy-800/50 px-1.5 py-0.5 rounded capitalize">
                  <Icon className="h-2.5 w-2.5 text-navy-500" />
                  {l.replace(/_/g, " ")}
                </span>
              );
            })}
          </div>
        </div>
        <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-4 py-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Sectors</div>
          <div className="text-[11px] font-mono text-navy-300">{sectors.length > 0 ? sectors.join(", ") : "N/A"}</div>
        </div>
      </div>

      {/* Description */}
      <BriefingCard title="Signal Breakdown" className="mb-4">
        {signal.description.split(" | ").map((part, i) => (
          <span key={i} className="block mb-1">{part}</span>
        ))}
      </BriefingCard>

      {/* Layer Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {signal.celestialType && (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-3 w-3 text-navy-500" />
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Celestial</h4>
            </div>
            <p className="text-sm text-navy-200 capitalize">{signal.celestialType.replace(/_/g, " ")}</p>
          </div>
        )}
        {signal.hebrewHoliday && (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-3 w-3 text-navy-500" />
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Hebrew Calendar</h4>
            </div>
            <p className="text-sm text-navy-200">{signal.hebrewHoliday}</p>
            {signal.hebrewDate && (
              <p className="text-[10px] text-navy-500 mt-1.5 font-mono">{signal.hebrewDate}</p>
            )}
          </div>
        )}
        {signal.geopoliticalContext && (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-3 w-3 text-navy-500" />
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Geopolitical</h4>
            </div>
            <p className="text-sm text-navy-200">{signal.geopoliticalContext}</p>
          </div>
        )}
        {signal.historicalPrecedent && (
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-3 w-3 text-navy-500" />
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Historical Precedent</h4>
            </div>
            <p className="text-sm text-navy-200">{signal.historicalPrecedent}</p>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
            AI Analysis
          </h3>
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            size="sm"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : analysis ? (
              "Re-analyze"
            ) : (
              "Run Analysis"
            )}
          </Button>
        </div>

        {error && (
          <p className="text-xs text-accent-rose mb-3">{error}</p>
        )}

        {analysis ? (
          <div className="space-y-5">
            <p className="font-sans text-sm text-navy-200 leading-relaxed">
              {analysis.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/30 px-4 py-3">
                <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Confidence</div>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-mono font-bold text-navy-100 tabular-nums leading-tight">
                    {(analysis.confidence * 100).toFixed(0)}
                  </span>
                  <span className="text-[10px] font-mono text-navy-500 mb-0.5">%</span>
                </div>
                <div className="mt-1.5 h-1 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-navy-400"
                    style={{ width: `${analysis.confidence * 100}%` }}
                  />
                </div>
              </div>
              {analysis.escalationProbability !== null && (
                <div className="border border-navy-700/30 rounded-lg bg-navy-900/30 px-4 py-3">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Escalation</div>
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-mono font-bold tabular-nums leading-tight text-navy-100">
                      {(analysis.escalationProbability * 100).toFixed(0)}
                    </span>
                    <span className="text-[10px] font-mono text-navy-500 mb-0.5">%</span>
                  </div>
                  <div className="mt-1.5 h-1 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-navy-400"
                      style={{ width: `${analysis.escalationProbability * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/30 px-4 py-3">
                <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-1">Direction</div>
                <div className="flex items-center gap-2">
                  {marketImpact.direction === "bearish" ? (
                    <TrendingDown className="h-4 w-4 text-navy-400" />
                  ) : marketImpact.direction === "bullish" ? (
                    <TrendingUp className="h-4 w-4 text-navy-400" />
                  ) : null}
                  <span className="text-lg font-mono font-bold uppercase leading-tight text-navy-200">
                    {marketImpact.direction || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Trade Recommendations */}
            {tradeRecs.length > 0 && (
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
                  Trade Recommendations
                </h4>
                <div className="space-y-2">
                  {tradeRecs.map((rec) => (
                    <TradeRecommendationCard
                      key={`${rec.ticker}-${rec.direction}`}
                      rec={rec}
                      signalId={id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {riskFactors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3 w-3 text-navy-500" />
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
                    Risk Factors
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {riskFactors.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded bg-navy-900/30 border border-navy-800/50">
                      <AlertTriangle className="h-3 w-3 text-navy-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-navy-300">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Red Team Challenge */}
            {redTeam && (
              <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-navy-400">
                    Red Team Challenge
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">
                      Bias Score
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={`h-2 w-2 rounded-full ${
                            n <= redTeam.biasScore ? "bg-navy-400" : "bg-navy-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-navy-200 leading-relaxed">
                  {redTeam.challenge}
                </p>

                {/* Confidence comparison */}
                <div className="flex items-center gap-4 py-2 px-3 bg-navy-900/50 rounded">
                  <div>
                    <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider block">
                      Analyst
                    </span>
                    <span className="text-sm font-mono text-navy-200">
                      {(analysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-navy-600">→</span>
                  <div>
                    <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider block">
                      Red Team Suggests
                    </span>
                    <span className="text-sm font-mono text-navy-200">
                      {(redTeam.suggestedConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-navy-400 ml-auto max-w-[50%]">
                    {redTeam.confidenceReason}
                  </span>
                </div>

                {/* Kill Conditions */}
                {redTeam.killConditions.length > 0 && (
                  <div>
                    <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider block mb-1.5">
                      Kill Conditions
                    </span>
                    <ul className="space-y-1">
                      {redTeam.killConditions.map((kc, i) => (
                        <li key={i} className="text-xs text-navy-300 flex items-start gap-2">
                          <span className="text-navy-500 mt-0.5 shrink-0">x</span>
                          {kc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternative Scenarios */}
                {redTeam.alternativeScenarios.length > 0 && (
                  <div>
                    <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider block mb-1.5">
                      Alternative Scenarios
                    </span>
                    <div className="space-y-2">
                      {redTeam.alternativeScenarios.map((alt, i) => (
                        <div key={i} className="bg-navy-900/40 rounded p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-navy-200">{alt.scenario}</span>
                            <span className="text-[10px] font-mono text-navy-300 tabular-nums">
                              {(alt.probability * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 bg-navy-800 rounded-full overflow-hidden mb-1.5">
                            <div
                              className="h-full bg-navy-500/40 rounded-full"
                              style={{ width: `${alt.probability * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-navy-500">{alt.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bias Notes */}
                {redTeam.biasNotes && (
                  <p className="text-[10px] text-navy-500 italic border-t border-navy-700/30 pt-2">
                    {redTeam.biasNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-navy-500 text-center py-6">
            Run AI analysis to get trade recommendations and risk assessment.
          </p>
        )}
      </div>

      {/* Market Impact Backtest */}
      {backtestLoading && (
        <div className="mt-6">
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {backtest && backtest.series.length > 0 && (
        <div className="mt-6 border border-navy-700/30 rounded-lg bg-navy-900/20 p-5">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-4">
            Market Impact Backtest
          </h3>

          {/* Change Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {backtest.series.map((s, i) => (
              <div key={s.ticker} className="border border-navy-700/30 rounded-lg bg-navy-900/30 p-3">
                <div className="text-[10px] text-navy-500 uppercase tracking-wider font-mono mb-2">
                  {s.label}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "+7d", value: s.changes.d7 },
                    { label: "+14d", value: s.changes.d14 },
                    { label: "+30d", value: s.changes.d30 },
                  ].map((c) => (
                    <div key={c.label}>
                      <span className="text-[9px] text-navy-500 block font-mono">
                        {c.label}
                      </span>
                      <span
                        className={`text-xs font-mono font-medium tabular-nums ${
                          c.value === null
                            ? "text-navy-500"
                            : c.value >= 0
                              ? "text-navy-300"
                              : "text-navy-400"
                        }`}
                      >
                        {c.value !== null
                          ? `${c.value >= 0 ? "+" : ""}${c.value.toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Price Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f1f1f"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#5c5c5c" }}
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  stroke="#1f1f1f"
                  allowDuplicatedCategory={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#5c5c5c" }}
                  stroke="#1f1f1f"
                  tickFormatter={(val: number) => `${val.toFixed(1)}%`}
                  domain={["auto", "auto"]}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(10,10,10,0.95)",
                    border: "1px solid #1f1f1f",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                  labelStyle={{ color: "#8a8a8a" }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, ""]}
                />
                <ReferenceLine
                  x={backtest.signalDate}
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: "SIGNAL",
                    position: "top",
                    fill: "#9ca3af",
                    fontSize: 9,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "10px", fontFamily: "IBM Plex Mono" }}
                />
                {backtest.series.map((s, i) => (
                  <Line
                    key={s.ticker}
                    data={s.data}
                    dataKey="normalizedReturn"
                    name={s.label}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Decision Lineage */}
      {lineage && <SignalLineagePanel data={lineage} />}

      {/* Discussion */}
      {signal && <CommentSection targetType="signal" targetId={signal.id} />}
      </UpgradeGate>
    </PageContainer>
  );
}
