"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BriefingCard } from "@/components/ui/briefing-card";
import { Markdown } from "@/components/ui/markdown";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Sparkles, RefreshCw, ArrowRight, ShieldAlert, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ThesisSuggestion } from "@/app/api/thesis/suggestions/route";

interface TradingAction {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  rationale: string;
  entryCondition: string;
  riskLevel: string;
  confidence: number;
  sources: string[];
}

interface RedTeamAssessment {
  challenge: string;
  killConditions: string[];
  alternativeScenarios: { scenario: string; probability: number; impact: string }[];
  suggestedConfidence: number;
  confidenceReason: string;
  biasScore: number;
  biasNotes: string;
}

interface ThesisSummary {
  id: number;
  uuid: string;
  title: string;
  status: string;
  generatedAt: string;
  validUntil: string;
  marketRegime: string;
  volatilityOutlook: string;
  convergenceDensity: number;
  overallConfidence: number;
  tradingActions: TradingAction[];
  executiveSummary: string;
  symbols: string[];
  redTeamChallenge?: string | null;
}

const ANGLE_COLORS: Record<string, string> = {
  geopolitical: "#ef4444",
  macro: "#f59e0b",
  celestial: "#8b5cf6",
  technical: "#10b981",
  convergence: "#06b6d4",
};

function SuggestionCard({
  suggestion,
  onSelect,
}: {
  suggestion: ThesisSuggestion;
  onSelect: (symbols: string[]) => void;
}) {
  const color = ANGLE_COLORS[suggestion.angle] || "#64748b";
  return (
    <button
      onClick={() => onSelect(suggestion.symbols)}
      className="w-full text-left p-3 rounded border border-navy-700/40 bg-navy-900/40 hover:bg-navy-900 hover:border-navy-600 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-navy-200 group-hover:text-white transition-colors leading-snug">
          {suggestion.title}
        </span>
        <ArrowRight className="h-3 w-3 text-navy-600 group-hover:text-navy-400 shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="text-[11px] text-navy-500 leading-snug mb-2">{suggestion.rationale}</p>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
        >
          {suggestion.angle}
        </span>
        <div className="flex gap-1">
          {suggestion.symbols.map(s => (
            <span key={s} className="text-[10px] font-mono text-navy-400 bg-navy-800 px-1.5 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export default function ThesisPage() {
  const router = useRouter();
  const [theses, setTheses] = useState<ThesisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [symbolInput, setSymbolInput] = useState("SPY,QQQ,IWM");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ThesisSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchTheses = useCallback(() => {
    setLoading(true);
    fetch("/api/thesis")
      .then((r) => r.json())
      .then((data) => {
        setTheses(data.theses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/thesis/suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // fail silently
    }
    setSuggestionsLoading(false);
  }, []);

  useEffect(() => {
    fetchTheses();
    fetchSuggestions();
  }, [fetchTheses, fetchSuggestions]);

  const generateThesis = async () => {
    const symbols = symbolInput
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (symbols.length === 0) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        fetchTheses();
        if (data.thesis?.uuid) {
          router.push(`/thesis/${data.thesis.uuid}`);
        }
      }
    } catch {
      setError("Failed to generate thesis");
    } finally {
      setGenerating(false);
    }
  };

  const closeThesis = async (uuid: string) => {
    try {
      await fetch(`/api/thesis/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      });
      fetchTheses();
    } catch {
      // ignore
    }
  };

  const activeThesis = theses.find((t) => t.status === "active");
  const pastTheses = theses.filter((t) => t.status !== "active");

  const thesisColumns: Column<ThesisSummary>[] = [
    {
      key: "date",
      header: "Generated",
      accessor: (row) => new Date(row.generatedAt).toLocaleDateString(),
      sortAccessor: (row) => row.generatedAt,
    },
    {
      key: "title",
      header: "Title",
      accessor: (row) => (
        <Link href={`/thesis/${row.uuid}`} className="text-navy-200 hover:text-navy-100">
          {row.title}
        </Link>
      ),
    },
    {
      key: "regime",
      header: "Regime",
      accessor: (row) => row.marketRegime.replace("_", " "),
    },
    {
      key: "confidence",
      header: "Confidence",
      accessor: (row) => `${(row.overallConfidence * 100).toFixed(0)}%`,
      sortAccessor: (row) => row.overallConfidence,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => row.tradingActions.length,
      sortAccessor: (row) => row.tradingActions.length,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (
        <StatusDot
          color={row.status === "active" ? "green" : row.status === "expired" ? "red" : "gray"}
          label={row.status}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Thesis"
      subtitle="Intelligence briefings and trading actions"
    >
      {/* Generate Section */}
      <div className="border border-navy-700 rounded bg-navy-900/80 p-4 mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Symbols (comma-separated)
            </label>
            <Input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") generateThesis(); }}
              placeholder="SPY,QQQ,IWM,AAPL"
            />
          </div>
          <Button onClick={generateThesis} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 mr-2" />
                Generate Thesis
              </>
            )}
          </Button>
        </div>
        {error && <p className="text-xs text-accent-rose mt-2">{error}</p>}
      </div>

      {/* AI Suggestions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent-cyan" />
            <span className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">
              AI Suggestions
            </span>
            <span className="text-[10px] text-navy-600 font-mono">
              based on active signals and context
            </span>
          </div>
          <button
            onClick={fetchSuggestions}
            disabled={suggestionsLoading}
            className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-2.5 w-2.5 ${suggestionsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {suggestionsLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={i}
                suggestion={s}
                onSelect={(symbols) => setSymbolInput(symbols.join(","))}
              />
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-navy-600 py-2">
            No suggestions available. Ensure signals are active and your Anthropic API key is configured.
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : (
        <>
          {/* Active Thesis */}
          {activeThesis && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                    Active Thesis
                  </h2>
                  <StatusDot color="green" label={activeThesis.title} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/thesis/${activeThesis.uuid}`)}
                  >
                    View Full
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeThesis(activeThesis.uuid)}
                  >
                    Close Thesis
                  </Button>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-4 gap-4">
                <div className="border border-navy-700 rounded px-4">
                  <Metric label="Market Regime" value={activeThesis.marketRegime.replace("_", " ")} />
                </div>
                <div className="border border-navy-700 rounded px-4">
                  <Metric label="Volatility" value={activeThesis.volatilityOutlook} />
                </div>
                <div className="border border-navy-700 rounded px-4">
                  <Metric label="Convergence" value={`${activeThesis.convergenceDensity.toFixed(1)}/10`} />
                </div>
                <div className="border border-navy-700 rounded px-4">
                  <Metric label="Confidence" value={`${(activeThesis.overallConfidence * 100).toFixed(0)}%`} />
                </div>
              </div>

              {/* Executive Summary */}
              <BriefingCard title="Executive Summary">
                <Markdown>{activeThesis.executiveSummary}</Markdown>
              </BriefingCard>

              {/* Trading Actions */}
              {activeThesis.tradingActions.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
                    Proposed Trading Actions
                  </h3>
                  <DataGrid
                    data={activeThesis.tradingActions}
                    keyExtractor={(a) => `${a.ticker}-${a.direction}`}
                    columns={[
                      {
                        key: "direction",
                        header: "Direction",
                        accessor: (row) => (
                          <Badge variant={row.direction === "BUY" ? "status" : "default"}>
                            {row.direction}
                          </Badge>
                        ),
                      },
                      {
                        key: "ticker",
                        header: "Ticker",
                        accessor: (row) => (
                          <span className="font-semibold text-navy-100">{row.ticker}</span>
                        ),
                        sortAccessor: (row) => row.ticker,
                      },
                      {
                        key: "rationale",
                        header: "Rationale",
                        accessor: (row) => row.rationale,
                        className: "max-w-md",
                      },
                      {
                        key: "confidence",
                        header: "Conf.",
                        accessor: (row) => `${(row.confidence * 100).toFixed(0)}%`,
                        sortAccessor: (row) => row.confidence,
                      },
                      {
                        key: "risk",
                        header: "Risk",
                        accessor: (row) => row.riskLevel,
                      },
                      {
                        key: "sources",
                        header: "Sources",
                        accessor: (row) => row.sources.join(", "),
                      },
                    ]}
                  />
                </div>
              )}

              {/* Red Team Challenge */}
              {activeThesis.redTeamChallenge && (() => {
                let rt: RedTeamAssessment;
                try { rt = JSON.parse(activeThesis.redTeamChallenge); } catch { return null; }
                const biasColors = ["", "#10b981", "#10b981", "#f59e0b", "#ef4444", "#ef4444"];
                return (
                  <div className="border border-accent-rose/20 rounded bg-accent-rose/[0.03]">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-accent-rose/10">
                      <ShieldAlert className="h-3.5 w-3.5 text-accent-rose" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-accent-rose">
                        Red Team Challenge
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-navy-500">
                        Bias score: <span style={{ color: biasColors[rt.biasScore] }}>{rt.biasScore}/5</span>
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Core challenge */}
                      <div>
                        <p className="text-xs text-navy-300 leading-relaxed">{rt.challenge}</p>
                      </div>

                      {/* Confidence adjustment */}
                      {rt.suggestedConfidence !== activeThesis.overallConfidence && (
                        <div className="flex items-center gap-3 rounded bg-navy-900/40 px-3 py-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Suggested confidence:</span>
                          <span className="text-xs font-mono font-bold" style={{
                            color: rt.suggestedConfidence < activeThesis.overallConfidence ? "#f59e0b" : "#10b981"
                          }}>
                            {(rt.suggestedConfidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-navy-600">
                            (analyst: {(activeThesis.overallConfidence * 100).toFixed(0)}%)
                          </span>
                          <span className="text-[10px] text-navy-500 ml-auto">{rt.confidenceReason}</span>
                        </div>
                      )}

                      {/* Kill conditions */}
                      {rt.killConditions.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">
                            Kill Conditions
                          </h4>
                          <div className="space-y-1">
                            {rt.killConditions.map((kc, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-accent-amber shrink-0 mt-0.5" />
                                <span className="text-[11px] text-navy-400">{kc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alternative scenarios */}
                      {rt.alternativeScenarios.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">
                            Alternative Scenarios
                          </h4>
                          <div className="space-y-2">
                            {rt.alternativeScenarios.map((alt, i) => (
                              <div key={i} className="flex items-start gap-3 rounded bg-navy-900/30 px-3 py-2">
                                <span className="text-[10px] font-mono text-accent-cyan shrink-0 mt-0.5">
                                  {(alt.probability * 100).toFixed(0)}%
                                </span>
                                <div>
                                  <p className="text-[11px] text-navy-300">{alt.scenario}</p>
                                  <p className="text-[10px] text-navy-500 mt-0.5">{alt.impact}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bias notes */}
                      {rt.biasNotes && (
                        <p className="text-[10px] text-navy-500 italic border-t border-navy-700/20 pt-3">
                          {rt.biasNotes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Past Theses */}
          {pastTheses.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-navy-400 mb-2">
                Past Theses
              </h2>
              <DataGrid
                data={pastTheses}
                columns={thesisColumns}
                keyExtractor={(row) => row.id}
                onRowClick={(row) => router.push(`/thesis/${row.uuid}`)}
              />
            </div>
          )}

          {theses.length === 0 && (
            <div className="text-center py-16">
              <FileText className="h-8 w-8 text-navy-600 mx-auto mb-3" />
              <p className="text-xs text-navy-500">
                No theses generated yet. Select a suggestion above or enter symbols to generate your first intelligence briefing.
              </p>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
