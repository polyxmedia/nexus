"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BriefingCard } from "@/components/ui/briefing-card";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { IntensityIndicator } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import {
  TradeRecommendationCard,
  type TradeRecommendation,
} from "@/components/signals/trade-recommendation-card";
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

const CHART_COLORS = ["#06b6d4", "#10b981", "#f59e0b"];

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

  useEffect(() => {
    Promise.all([
      fetch(`/api/signals/${id}`).then((r) => r.json()),
      fetch(`/api/analysis?signalId=${id}`).then((r) => r.json()),
    ])
      .then(([signalData, analysisData]) => {
        const sig = signalData.signal || signalData;
        setSignal(sig);
        const analyses = Array.isArray(analysisData) ? analysisData : analysisData.analyses || [];
        if (analyses.length > 0) {
          setAnalysis(analyses[0]);
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
        body: JSON.stringify({ signalId: Number(id) }),
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
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
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
        <div className="flex items-center gap-2">
          <IntensityIndicator intensity={signal.intensity} />
          <StatusDot
            color={signal.status === "active" ? "green" : signal.status === "upcoming" ? "cyan" : "gray"}
            label={signal.status}
          />
        </div>
      }
    >
      {/* Metadata Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Category" value={signal.category} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Layers" value={layers.join(", ")} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Sectors" value={sectors.length > 0 ? sectors.join(", ") : "N/A"} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Intensity" value={`${signal.intensity}/5`} />
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
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Celestial</h4>
            <p className="text-sm text-navy-200">{signal.celestialType.replace(/_/g, " ")}</p>
          </div>
        )}
        {signal.hebrewHoliday && (
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Hebrew Calendar</h4>
            <p className="text-sm text-navy-200">{signal.hebrewHoliday}</p>
            {signal.hebrewDate && (
              <p className="text-xs text-navy-500 mt-1">{signal.hebrewDate}</p>
            )}
          </div>
        )}
        {signal.geopoliticalContext && (
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Geopolitical</h4>
            <p className="text-sm text-navy-200">{signal.geopoliticalContext}</p>
          </div>
        )}
        {signal.historicalPrecedent && (
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Historical Precedent</h4>
            <p className="text-sm text-navy-200">{signal.historicalPrecedent}</p>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div className="border border-navy-700 rounded p-5">
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
          <div className="space-y-4">
            <p className="font-sans text-sm text-navy-200 leading-relaxed">
              {analysis.summary}
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="border border-navy-700 rounded px-4">
                <Metric
                  label="Confidence"
                  value={`${(analysis.confidence * 100).toFixed(0)}%`}
                />
              </div>
              {analysis.escalationProbability !== null && (
                <div className="border border-navy-700 rounded px-4">
                  <Metric
                    label="Escalation"
                    value={`${(analysis.escalationProbability * 100).toFixed(0)}%`}
                  />
                </div>
              )}
              <div className="border border-navy-700 rounded px-4">
                <Metric
                  label="Direction"
                  value={marketImpact.direction?.toUpperCase() || "N/A"}
                />
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
                <h4 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
                  Risk Factors
                </h4>
                <ul className="space-y-1">
                  {riskFactors.map((risk, i) => (
                    <li key={i} className="text-xs text-navy-400 flex items-start gap-2">
                      <span className="text-accent-rose mt-0.5">-</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Red Team Challenge */}
            {redTeam && (
              <div className="border border-accent-rose/20 rounded-lg bg-accent-rose/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-medium uppercase tracking-widest text-accent-rose">
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
                            n <= redTeam.biasScore
                              ? redTeam.biasScore >= 4
                                ? "bg-accent-rose"
                                : redTeam.biasScore >= 3
                                  ? "bg-accent-amber"
                                  : "bg-accent-emerald"
                              : "bg-navy-700"
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
                    <span className={`text-sm font-mono ${
                      redTeam.suggestedConfidence < analysis.confidence
                        ? "text-accent-rose"
                        : "text-accent-emerald"
                    }`}>
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
                    <span className="text-[9px] font-mono text-accent-rose/70 uppercase tracking-wider block mb-1.5">
                      Kill Conditions
                    </span>
                    <ul className="space-y-1">
                      {redTeam.killConditions.map((kc, i) => (
                        <li key={i} className="text-xs text-navy-300 flex items-start gap-2">
                          <span className="text-accent-rose mt-0.5 shrink-0">x</span>
                          {kc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternative Scenarios */}
                {redTeam.alternativeScenarios.length > 0 && (
                  <div>
                    <span className="text-[9px] font-mono text-accent-amber/70 uppercase tracking-wider block mb-1.5">
                      Alternative Scenarios
                    </span>
                    <div className="space-y-2">
                      {redTeam.alternativeScenarios.map((alt, i) => (
                        <div key={i} className="bg-navy-900/40 rounded p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-navy-200">{alt.scenario}</span>
                            <span className="text-[10px] font-mono text-accent-amber tabular-nums">
                              {(alt.probability * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 bg-navy-800 rounded-full overflow-hidden mb-1.5">
                            <div
                              className="h-full bg-accent-amber/40 rounded-full"
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
        <div className="mt-6 border border-navy-700 rounded p-5">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-4">
            Market Impact
          </h3>

          {/* Change Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {backtest.series.map((s, i) => (
              <div key={s.ticker} className="border border-navy-700 rounded p-3">
                <div className="text-[10px] text-navy-500 uppercase tracking-wider mb-2">
                  {s.label}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "+7d", value: s.changes.d7 },
                    { label: "+14d", value: s.changes.d14 },
                    { label: "+30d", value: s.changes.d30 },
                  ].map((c) => (
                    <div key={c.label}>
                      <span className="text-[9px] text-navy-500 block">
                        {c.label}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          c.value === null
                            ? "text-navy-500"
                            : c.value >= 0
                              ? "text-accent-emerald"
                              : "text-accent-rose"
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
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "SIGNAL",
                    position: "top",
                    fill: "#f43f5e",
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
    </PageContainer>
  );
}
