"use client";

import Link from "next/link";
import {
  Radio,
  Target,
  ArrowRightLeft,
  BarChart3,
  ChevronRight,
} from "lucide-react";

interface LineagePrediction {
  id: number;
  uuid: string;
  claim: string;
  confidence: number;
  deadline: string;
  direction: string | null;
  referenceSymbol: string | null;
  priceTarget: number | null;
  outcome: string | null;
  score: number | null;
  directionCorrect: number | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface LineageTrade {
  id: number;
  ticker: string;
  direction: string;
  orderType: string;
  quantity: number;
  filledPrice: number | null;
  limitPrice: number | null;
  status: string;
  environment: string;
  predictionId: number | null;
  t212OrderId: string | null;
  createdAt: string;
}

interface LineageSummary {
  totalPredictions: number;
  resolvedPredictions: number;
  avgBrierScore: number | null;
  directionAccuracy: number | null;
  totalTrades: number;
  filledTrades: number;
}

interface LineageData {
  signal: {
    id: number;
    uuid: string;
    title: string;
    date: string;
    intensity: number;
    category: string;
    status: string;
  };
  predictions: LineagePrediction[];
  trades: LineageTrade[];
  summary: LineageSummary;
}

const outcomeBadge: Record<string, string> = {
  confirmed: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25",
  denied: "bg-accent-rose/10 text-accent-rose border-accent-rose/25",
  partial: "bg-accent-amber/10 text-accent-amber border-accent-amber/25",
  expired: "bg-navy-800/30 text-navy-500 border-navy-700/30",
  post_event: "bg-navy-800/30 text-navy-500 border-navy-700/30",
};

const statusDot: Record<string, string> = {
  filled: "bg-accent-emerald",
  pending: "bg-accent-amber",
  rejected: "bg-accent-rose",
  cancelled: "bg-navy-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stage({
  icon: Icon,
  label,
  color,
  count,
  last,
  children,
}: {
  icon: typeof Radio;
  label: string;
  color: string;
  count?: number;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      {/* Vertical line + node */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full border ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!last && <div className="w-px flex-1 bg-navy-700/50 my-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-navy-300 font-semibold">
            {label}
          </span>
          {count != null && (
            <span className="font-mono text-[10px] text-navy-500">{count}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function SignalLineagePanel({ data }: { data: LineageData }) {
  const { predictions, trades, summary } = data;
  const hasPredictions = predictions.length > 0;
  const hasTrades = trades.length > 0;
  const hasOutcome = summary.resolvedPredictions > 0 || summary.filledTrades > 0;

  return (
    <div className="border border-navy-700/30 rounded-lg bg-navy-900/20 p-6 mt-6">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-400 mb-6">
        Decision Lineage
      </h3>

      {/* Stage 1: Signal (always present) */}
      <Stage
        icon={Radio}
        label="Signal Detected"
        color="border-accent-cyan/40 text-accent-cyan"
        last={!hasPredictions && !hasTrades}
      >
        <div className="font-sans text-[13px] text-navy-200">{data.signal.title}</div>
        <div className="font-mono text-[10px] text-navy-500 mt-1">
          {formatDate(data.signal.date)} / Intensity {data.signal.intensity} / {data.signal.category}
        </div>
      </Stage>

      {/* Stage 2: Predictions */}
      {hasPredictions && (
        <Stage
          icon={Target}
          label="Predictions"
          color="border-accent-amber/40 text-accent-amber"
          count={predictions.length}
          last={!hasTrades && !hasOutcome}
        >
          <div className="space-y-2">
            {predictions.map((p) => (
              <Link
                key={p.uuid}
                href={`/predictions`}
                className="block border border-navy-800/40 rounded-lg p-3 bg-navy-900/30 hover:bg-navy-900/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-[12px] text-navy-200 leading-snug line-clamp-2">
                      {p.claim}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-navy-500">
                      <span>{Math.round(p.confidence * 100)}% conf</span>
                      {p.direction && (
                        <span className={p.direction === "up" ? "text-accent-emerald" : p.direction === "down" ? "text-accent-rose" : "text-navy-400"}>
                          {p.direction}
                          {p.referenceSymbol ? ` ${p.referenceSymbol}` : ""}
                          {p.priceTarget ? ` @ ${p.priceTarget}` : ""}
                        </span>
                      )}
                      <span>due {formatDate(p.deadline)}</span>
                      {p.score != null && (
                        <span>Brier {p.score.toFixed(3)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.outcome ? (
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${outcomeBadge[p.outcome] || outcomeBadge.expired}`}>
                        {p.outcome}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded border bg-accent-cyan/10 text-accent-cyan border-accent-cyan/25">
                        pending
                      </span>
                    )}
                    <ChevronRight className="w-3 h-3 text-navy-600 group-hover:text-navy-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Stage>
      )}

      {/* Stage 3: Trades */}
      {hasTrades && (
        <Stage
          icon={ArrowRightLeft}
          label="Trades Executed"
          color="border-accent-emerald/40 text-accent-emerald"
          count={trades.length}
          last={!hasOutcome}
        >
          <div className="space-y-2">
            {trades.map((t) => (
              <div
                key={t.id}
                className="border border-navy-800/40 rounded-lg p-3 bg-navy-900/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[11px] font-bold ${t.direction === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
                      {t.direction}
                    </span>
                    <span className="font-mono text-[12px] text-navy-100 font-semibold">{t.ticker}</span>
                    <span className="font-mono text-[10px] text-navy-500">
                      x{t.quantity} {t.orderType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.filledPrice && (
                      <span className="font-mono text-[11px] text-navy-300">
                        @ ${t.filledPrice.toFixed(2)}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusDot[t.status] || statusDot.pending}`} />
                      <span className="font-mono text-[10px] text-navy-500">{t.status}</span>
                    </div>
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${t.environment === "live" ? "bg-accent-rose/10 text-accent-rose" : "bg-navy-800/50 text-navy-500"}`}>
                      {t.environment}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-navy-600 mt-1">
                  {formatDate(t.createdAt)}
                  {t.t212OrderId && <span className="ml-3">T212: {t.t212OrderId.slice(0, 12)}...</span>}
                </div>
              </div>
            ))}
          </div>
        </Stage>
      )}

      {/* Stage 4: Outcome scorecard */}
      {hasOutcome && (
        <Stage
          icon={BarChart3}
          label="Outcome"
          color={
            summary.directionAccuracy != null && summary.directionAccuracy >= 0.6
              ? "border-accent-emerald/40 text-accent-emerald"
              : summary.directionAccuracy != null && summary.directionAccuracy < 0.4
              ? "border-accent-rose/40 text-accent-rose"
              : "border-navy-500/40 text-navy-400"
          }
          last
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summary.directionAccuracy != null && (
              <div className="border border-navy-800/40 rounded-lg p-3 bg-navy-900/30 text-center">
                <div className="font-mono text-[16px] font-bold text-navy-100">
                  {Math.round(summary.directionAccuracy * 100)}%
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mt-1">
                  Direction Accuracy
                </div>
              </div>
            )}
            {summary.avgBrierScore != null && (
              <div className="border border-navy-800/40 rounded-lg p-3 bg-navy-900/30 text-center">
                <div className="font-mono text-[16px] font-bold text-navy-100">
                  {summary.avgBrierScore.toFixed(3)}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mt-1">
                  Avg Brier Score
                </div>
              </div>
            )}
            <div className="border border-navy-800/40 rounded-lg p-3 bg-navy-900/30 text-center">
              <div className="font-mono text-[16px] font-bold text-navy-100">
                {summary.resolvedPredictions}/{summary.totalPredictions}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mt-1">
                Predictions Resolved
              </div>
            </div>
            {summary.totalTrades > 0 && (
              <div className="border border-navy-800/40 rounded-lg p-3 bg-navy-900/30 text-center">
                <div className="font-mono text-[16px] font-bold text-navy-100">
                  {summary.filledTrades}/{summary.totalTrades}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-navy-500 mt-1">
                  Trades Filled
                </div>
              </div>
            )}
          </div>
        </Stage>
      )}

      {/* Empty state */}
      {!hasPredictions && !hasTrades && (
        <div className="text-center py-4 font-sans text-[12px] text-navy-500">
          No downstream predictions or trades linked to this signal yet.
        </div>
      )}
    </div>
  );
}
