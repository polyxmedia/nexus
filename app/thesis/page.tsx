"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BriefingCard } from "@/components/ui/briefing-card";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import Link from "next/link";

interface TradingAction {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  rationale: string;
  entryCondition: string;
  riskLevel: string;
  confidence: number;
  sources: string[];
}

interface ThesisSummary {
  id: number;
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
}

export default function ThesisPage() {
  const router = useRouter();
  const [theses, setTheses] = useState<ThesisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [symbolInput, setSymbolInput] = useState("SPY,QQQ,IWM");
  const [error, setError] = useState<string | null>(null);

  const fetchTheses = () => {
    setLoading(true);
    fetch("/api/thesis")
      .then((r) => r.json())
      .then((data) => {
        setTheses(data.theses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTheses();
  }, []);

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
        if (data.thesis?.id) {
          router.push(`/thesis/${data.thesis.id}`);
        }
      }
    } catch {
      setError("Failed to generate thesis");
    } finally {
      setGenerating(false);
    }
  };

  const closeThesis = async (id: number) => {
    try {
      await fetch(`/api/thesis/${id}`, {
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
        <Link href={`/thesis/${row.id}`} className="text-navy-200 hover:text-navy-100">
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
      <div className="border border-navy-700 rounded bg-navy-900/80 p-4 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Symbols (comma-separated)
            </label>
            <Input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              placeholder="SPY,QQQ,IWM,AAPL"
            />
          </div>
          <Button
            onClick={generateThesis}
            disabled={generating}
          >
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
        {error && (
          <p className="text-xs text-accent-rose mt-2">{error}</p>
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
                    onClick={() => router.push(`/thesis/${activeThesis.id}`)}
                  >
                    View Full
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeThesis(activeThesis.id)}
                  >
                    Close Thesis
                  </Button>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-4 gap-4">
                <div className="border border-navy-700 rounded px-4">
                  <Metric
                    label="Market Regime"
                    value={activeThesis.marketRegime.replace("_", " ")}
                  />
                </div>
                <div className="border border-navy-700 rounded px-4">
                  <Metric
                    label="Volatility"
                    value={activeThesis.volatilityOutlook}
                  />
                </div>
                <div className="border border-navy-700 rounded px-4">
                  <Metric
                    label="Convergence"
                    value={`${activeThesis.convergenceDensity.toFixed(1)}/10`}
                  />
                </div>
                <div className="border border-navy-700 rounded px-4">
                  <Metric
                    label="Confidence"
                    value={`${(activeThesis.overallConfidence * 100).toFixed(0)}%`}
                  />
                </div>
              </div>

              {/* Executive Summary */}
              <BriefingCard title="Executive Summary">
                {activeThesis.executiveSummary}
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
                          <Badge
                            variant={row.direction === "BUY" ? "status" : "default"}
                          >
                            {row.direction}
                          </Badge>
                        ),
                      },
                      {
                        key: "ticker",
                        header: "Ticker",
                        accessor: (row) => (
                          <span className="font-semibold text-navy-100">
                            {row.ticker}
                          </span>
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
                        accessor: (row) =>
                          `${(row.confidence * 100).toFixed(0)}%`,
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
                onRowClick={(row) => router.push(`/thesis/${row.id}`)}
              />
            </div>
          )}

          {theses.length === 0 && (
            <div className="text-center py-16">
              <FileText className="h-8 w-8 text-navy-600 mx-auto mb-3" />
              <p className="text-xs text-navy-500">
                No theses generated yet. Enter symbols above and generate your first intelligence briefing.
              </p>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
