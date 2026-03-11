"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, MinusCircle, Clock, Loader2, Target, ArrowLeft } from "lucide-react";

interface Prediction {
  id: number;
  claim: string;
  timeframe: string;
  deadline: string;
  confidence: number;
  category: string;
  outcome: string | null;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  market: "#06b6d4",
  geopolitical: "#f43f5e",
  celestial: "#8b5cf6",
  economic: "#f59e0b",
};

const OUTCOMES = [
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "#10b981", score: (conf: number) => conf },
  { value: "denied", label: "Denied", icon: XCircle, color: "#f43f5e", score: (conf: number) => 1 - conf },
  { value: "partial", label: "Partial", icon: MinusCircle, color: "#f59e0b", score: () => 0.5 },
] as const;

function daysOverdue(deadline: string): number {
  return Math.floor((Date.now() - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24));
}

function PredictionCard({
  prediction,
  onResolved,
}: {
  prediction: Prediction;
  onResolved: (id: number) => void;
}) {
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const overdue = daysOverdue(prediction.deadline);
  const color = CATEGORY_COLORS[prediction.category] || "#64748b";

  const resolve = async (outcome: string, score: number) => {
    setResolving(outcome);
    try {
      const res = await fetch("/api/predictions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: prediction.id,
          outcome,
          outcomeNotes: notes || null,
          score,
        }),
      });
      if (res.ok) {
        onResolved(prediction.id);
      }
    } catch { /* fail silently */ }
    setResolving(null);
  };

  return (
    <div className="border border-navy-800/40 rounded-lg bg-navy-900/40 overflow-hidden">
      <div
        className="h-0.5"
        style={{ backgroundColor: overdue > 14 ? "#f43f5e" : overdue > 7 ? "#f59e0b" : "#f97316" }}
      />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm text-navy-200 leading-snug flex-1">{prediction.claim}</p>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-navy-600 hover:text-navy-400 font-mono shrink-0 mt-0.5"
          >
            {expanded ? "Less" : "Add notes"}
          </button>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4 text-[10px] font-mono">
          <span
            className="px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
          >
            {prediction.category}
          </span>
          <span className="text-accent-rose font-medium">{overdue}d overdue</span>
          <span className="text-navy-500">Deadline: {new Date(prediction.deadline).toLocaleDateString()}</span>
          <span className="text-navy-500">Confidence: {(prediction.confidence * 100).toFixed(0)}%</span>
        </div>

        {/* Notes (expanded) */}
        {expanded && (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Outcome notes (optional)..."
            rows={2}
            className="w-full mb-3 bg-navy-800 border border-navy-700 rounded px-3 py-2 text-xs text-navy-200 placeholder:text-navy-600 outline-none focus:border-accent-cyan/50 resize-none"
          />
        )}

        {/* Resolve buttons */}
        <div className="flex items-center gap-2">
          {OUTCOMES.map(({ value, label, icon: Icon, color: c, score }) => {
            const isResolving = resolving === value;
            return (
              <button
                key={value}
                onClick={() => resolve(value, score(prediction.confidence))}
                disabled={!!resolving}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors disabled:opacity-40"
                style={{
                  color: c,
                  backgroundColor: `${c}12`,
                  border: `1px solid ${c}30`,
                }}
              >
                {isResolving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PredictionResolvePage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<number[]>([]);

  const fetchOverdue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predictions?status=pending");
      const data = await res.json();
      const all: Prediction[] = Array.isArray(data) ? data : [];
      const now = new Date();
      const overdue = all
        .filter(p => new Date(p.deadline) < now)
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      setPredictions(overdue);
    } catch { /* fail silently */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOverdue(); }, [fetchOverdue]);

  const handleResolved = (id: number) => {
    setResolved(prev => [...prev, id]);
  };

  const visible = predictions.filter(p => !resolved.includes(p.id));
  const resolvedCount = resolved.length;

  return (
    <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 pt-12 md:pt-0">
      {/* Header */}
      <div className="border-b border-navy-700 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/predictions")}
            className="text-navy-500 hover:text-navy-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Target className="h-4 w-4 text-accent-amber" />
          <div>
            <h1 className="text-sm font-bold text-navy-100 tracking-wide">Resolution Queue</h1>
            <p className="text-[10px] text-navy-500 uppercase tracking-wider font-mono">
              {loading ? "Loading..." : `${visible.length} overdue predictions`}
              {resolvedCount > 0 && ` / ${resolvedCount} resolved this session`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-navy-500 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading overdue predictions...
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24">
            <CheckCircle2 className="h-10 w-10 text-accent-emerald mx-auto mb-3 opacity-60" />
            <p className="text-sm text-navy-400 mb-1">
              {resolvedCount > 0
                ? `All done. ${resolvedCount} predictions resolved this session.`
                : "No overdue predictions to resolve."}
            </p>
            <button
              onClick={() => router.push("/predictions")}
              className="mt-4 text-xs text-accent-cyan hover:text-accent-cyan/80 font-mono"
            >
              Back to predictions
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 rounded bg-accent-amber/[0.06] border border-accent-amber/20 text-xs text-navy-400 leading-relaxed">
              <span className="text-accent-amber font-mono">Note:</span> Score is calculated automatically from your confidence at prediction time. Confirmed = you were right, Denied = wrong, Partial = half credit, Expired = prediction window closed without resolution.
            </div>
            <div className="space-y-3">
              {visible.map(p => (
                <PredictionCard key={p.id} prediction={p} onResolved={handleResolved} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
