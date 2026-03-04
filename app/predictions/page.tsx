"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PlusCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface Prediction {
  id: number;
  claim: string;
  timeframe: string;
  deadline: string;
  confidence: number;
  category: string;
  outcome: string | null;
  outcomeNotes: string | null;
  score: number | null;
  createdAt: string;
}

const OUTCOME_COLORS: Record<string, { dot: "green" | "red" | "amber" | "gray" | "cyan"; badge: string }> = {
  confirmed: { dot: "green", badge: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30" },
  denied: { dot: "red", badge: "bg-accent-rose/15 text-accent-rose border-accent-rose/30" },
  partial: { dot: "amber", badge: "bg-accent-amber/15 text-accent-amber border-accent-amber/30" },
  expired: { dot: "gray", badge: "bg-navy-700/30 text-navy-400 border-navy-600/30" },
};

const CATEGORY_COLORS: Record<string, string> = {
  market: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30",
  geopolitical: "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
  celestial: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
};

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<string | null>(null);

  const [claim, setClaim] = useState("");
  const [timeframe, setTimeframe] = useState("30 days");
  const [deadline, setDeadline] = useState("");
  const [confidence, setConfidence] = useState("0.5");
  const [category, setCategory] = useState("market");

  const [scoringId, setScoringId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("confirmed");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const fetchPredictions = () => {
    setLoading(true);
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((data) => {
        setPredictions(Array.isArray(data) ? data : data.predictions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const createPrediction = async () => {
    if (!claim || !deadline) return;
    setSubmitting(true);
    try {
      await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim,
          timeframe,
          deadline,
          confidence: parseFloat(confidence),
          category,
        }),
      });
      setClaim("");
      setDeadline("");
      setShowForm(false);
      fetchPredictions();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const scorePrediction = async () => {
    if (!scoringId) return;
    setSubmitting(true);
    try {
      await fetch("/api/predictions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scoringId,
          outcome,
          outcomeNotes: outcomeNotes || undefined,
        }),
      });
      setScoringId(null);
      setOutcomeNotes("");
      fetchPredictions();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const aiGenerate = async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch("/api/predictions/generate", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setGenerateResult(`Error: ${data.error}`);
      } else {
        setGenerateResult(`Generated ${data.count} predictions`);
        fetchPredictions();
      }
    } catch {
      setGenerateResult("Failed to generate predictions");
    } finally {
      setGenerating(false);
    }
  };

  const aiResolve = async () => {
    setResolving(true);
    setResolveResult(null);
    try {
      const res = await fetch("/api/predictions/resolve", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResolveResult(`Error: ${data.error}`);
      } else if (data.count === 0) {
        setResolveResult("No predictions past deadline to resolve");
      } else {
        setResolveResult(`Resolved ${data.count} predictions`);
        fetchPredictions();
      }
    } catch {
      setResolveResult("Failed to resolve predictions");
    } finally {
      setResolving(false);
    }
  };

  const resolved = predictions.filter((p) => p.outcome);
  const pending = predictions.filter((p) => !p.outcome);
  const pastDeadline = pending.filter((p) => p.deadline <= new Date().toISOString().split("T")[0]);
  const accuracy =
    resolved.length > 0
      ? resolved.filter((p) => p.outcome === "confirmed").length / resolved.length
      : 0;
  const avgScore =
    resolved.length > 0
      ? resolved.reduce((sum, p) => sum + (p.score || 0), 0) / resolved.length
      : 0;

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "today";
    return `${diff}d`;
  };

  const pendingColumns: Column<Prediction>[] = [
    {
      key: "claim",
      header: "Claim",
      accessor: (row) => (
        <span className="text-navy-200 leading-tight block max-w-md">{row.claim}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      accessor: (row) => (
        <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[row.category] || ""}`}>
          {row.category}
        </span>
      ),
      sortAccessor: (row) => row.category,
    },
    {
      key: "confidence",
      header: "Conf.",
      accessor: (row) => (
        <span className="text-navy-200 font-medium">{(row.confidence * 100).toFixed(0)}%</span>
      ),
      sortAccessor: (row) => row.confidence,
    },
    {
      key: "deadline",
      header: "Deadline",
      accessor: (row) => {
        const overdue = row.deadline <= new Date().toISOString().split("T")[0];
        return (
          <div>
            <span className={overdue ? "text-accent-rose" : "text-navy-300"}>
              {new Date(row.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span className={`text-[10px] block ${overdue ? "text-accent-rose/70" : "text-navy-500"}`}>
              {daysUntil(row.deadline)}
            </span>
          </div>
        );
      },
      sortAccessor: (row) => row.deadline,
    },
    {
      key: "action",
      header: "",
      accessor: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setScoringId(row.id);
          }}
        >
          Score
        </Button>
      ),
    },
  ];

  const resolvedColumns: Column<Prediction>[] = [
    {
      key: "claim",
      header: "Claim",
      accessor: (row) => (
        <span className="text-navy-200 leading-tight block max-w-md">{row.claim}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      accessor: (row) => (
        <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[row.category] || ""}`}>
          {row.category}
        </span>
      ),
    },
    {
      key: "confidence",
      header: "Conf.",
      accessor: (row) => (
        <span className="text-navy-300">{(row.confidence * 100).toFixed(0)}%</span>
      ),
      sortAccessor: (row) => row.confidence,
    },
    {
      key: "outcome",
      header: "Outcome",
      accessor: (row) => {
        const style = OUTCOME_COLORS[row.outcome || ""] || OUTCOME_COLORS.expired;
        return (
          <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.badge}`}>
            {row.outcome}
          </span>
        );
      },
    },
    {
      key: "score",
      header: "Score",
      accessor: (row) => (
        <span className={`font-medium ${
          (row.score || 0) >= 0.7 ? "text-accent-emerald" :
          (row.score || 0) >= 0.4 ? "text-accent-amber" :
          "text-accent-rose"
        }`}>
          {row.score != null ? `${(row.score * 100).toFixed(0)}%` : "--"}
        </span>
      ),
      sortAccessor: (row) => row.score || 0,
    },
    {
      key: "notes",
      header: "Notes",
      accessor: (row) => (
        <span className="text-navy-400 text-[10px] leading-tight block max-w-xs">{row.outcomeNotes || ""}</span>
      ),
    },
  ];

  return (
    <PageContainer
      title="Predictions"
      subtitle="AI-generated falsifiable claims"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={aiGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Generate
          </Button>
          {pastDeadline.length > 0 && (
            <Button variant="outline" size="sm" onClick={aiResolve} disabled={resolving}>
              {resolving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Resolve ({pastDeadline.length})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
            <PlusCircle className="h-3 w-3 mr-1" />
            Manual
          </Button>
        </div>
      }
    >
      {/* Status messages */}
      {generateResult && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-xs ${
          generateResult.startsWith("Error") ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose" : "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"
        }`}>
          {generateResult}
        </div>
      )}
      {resolveResult && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-xs ${
          resolveResult.startsWith("Error") ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose" : "border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan"
        }`}>
          {resolveResult}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))
        ) : (
          <>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Total" value={predictions.length} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Pending" value={pending.length} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Overdue" value={pastDeadline.length} changeColor={pastDeadline.length > 0 ? "red" : "neutral"} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Resolved" value={resolved.length} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="Accuracy"
                value={`${(accuracy * 100).toFixed(0)}%`}
                change={resolved.length > 0 ? `avg score ${(avgScore * 100).toFixed(0)}%` : undefined}
                changeColor={accuracy >= 0.6 ? "green" : accuracy >= 0.4 ? "neutral" : "red"}
              />
            </div>
          </>
        )}
      </div>

      {/* Manual prediction form */}
      {showForm && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
          <div className="px-4 py-3 border-b border-navy-700/20">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
              Manual Prediction
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Falsifiable Claim</label>
              <Input
                placeholder="S&P 500 will close above 5,200 by..."
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-32">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Timeframe</label>
                <Input
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                />
              </div>
              <div className="w-40">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Deadline</label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Confidence</label>
                <Input
                  type="number"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  min="0"
                  max="1"
                  step="0.05"
                />
              </div>
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Category</label>
                <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden w-fit">
                  {["market", "geopolitical", "celestial"].map((cat, i) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                        i > 0 ? "border-l border-navy-700/30" : ""
                      } ${category === cat ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-navy-700/20 flex gap-2">
            <Button variant="primary" onClick={createPrediction} disabled={submitting || !claim || !deadline}>
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Scoring dialog */}
      {scoringId && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
          <div className="px-4 py-3 border-b border-navy-700/20">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
              Score Prediction #{scoringId}
            </h3>
            <p className="text-xs text-navy-300 mt-1">
              {predictions.find((p) => p.id === scoringId)?.claim}
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Outcome</label>
              <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden w-fit">
                {["confirmed", "denied", "partial", "expired"].map((o, i) => (
                  <button
                    key={o}
                    onClick={() => setOutcome(o)}
                    className={`px-4 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      i > 0 ? "border-l border-navy-700/30" : ""
                    } ${outcome === o
                      ? o === "confirmed" ? "bg-accent-emerald/10 text-accent-emerald"
                        : o === "denied" ? "bg-accent-rose/10 text-accent-rose"
                        : o === "partial" ? "bg-accent-amber/10 text-accent-amber"
                        : "bg-navy-700/20 text-navy-300"
                      : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Notes</label>
              <Input
                placeholder="What happened..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="px-4 py-3 border-t border-navy-700/20 flex gap-2">
            <Button variant="primary" onClick={scorePrediction} disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Score
            </Button>
            <Button variant="ghost" onClick={() => setScoringId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
              Pending ({pending.length})
            </h2>
            <DataGrid
              data={pending}
              columns={pendingColumns}
              keyExtractor={(row) => row.id}
              emptyMessage="No pending predictions. Click Generate to create AI predictions."
            />
          </div>

          {resolved.length > 0 && (
            <div>
              <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
                Resolved ({resolved.length})
              </h2>
              <DataGrid
                data={resolved}
                columns={resolvedColumns}
                keyExtractor={(row) => row.id}
                emptyMessage="No resolved predictions yet"
              />
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
