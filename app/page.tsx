"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { BriefingCard } from "@/components/ui/briefing-card";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Badge, IntensityIndicator } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/ui/markdown";
import {
  FileText,
  Target,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { TradeSuggestionCard } from "@/components/trading/trade-suggestion-card";
import { TradeApprovalModal } from "@/components/trading/trade-approval-modal";
import { useDismissedTrades } from "@/components/trading/use-dismissed-trades";

// ── Types ──

interface Signal {
  id: number;
  title: string;
  date: string;
  intensity: number;
  category: string;
  status: string;
  layers: string;
}

interface ThesisSummary {
  id: number;
  title: string;
  status: string;
  generatedAt: string;
  marketRegime: string;
  volatilityOutlook: string;
  convergenceDensity: number;
  overallConfidence: number;
  executiveSummary: string;
  tradingActions: Array<{
    ticker: string;
    direction: string;
    rationale: string;
    entryCondition?: string;
    confidence?: number;
    riskLevel?: string;
    sources?: string[];
  }>;
  layerInputs?: {
    celestial: { activeEvents: string[]; convergenceIntensity: number };
    hebrew: { activeHolidays: string[]; shmitaRelevance: string | null };
    geopolitical: { activeEvents: string[]; escalationRisk: number };
    market: { regime: string; volatilityOutlook: string };
    gameTheory: {
      activeScenarios: string[];
      analyses: Array<{
        scenarioId: string;
        marketAssessment: {
          mostLikelyOutcome: string;
          direction: string;
          confidence: number;
          keySectors: string[];
        };
      }>;
    };
  };
}

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

interface WarRoomMetrics {
  maxEscalation: number;
  convergenceDensity: number;
  marketRegime: string;
  volatilityOutlook: string;
  activeSignalCount: number;
  highIntensityCount: number;
}

interface AccountInfo {
  currencyCode?: string;
}

interface AccountCash {
  free?: number;
  total?: number;
  ppiCash?: number;
  blockedCash?: number;
  invested?: number;
  pieCash?: number;
  result?: number;
}

// ── Component ──

export default function DashboardPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeThesis, setActiveThesis] = useState<ThesisSummary | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [warRoomMetrics, setWarRoomMetrics] = useState<WarRoomMetrics | null>(null);
  const [accountCash, setAccountCash] = useState<AccountCash | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalAction, setApprovalAction] = useState<{
    ticker: string;
    direction: "BUY" | "SELL" | "HOLD";
    rationale: string;
    entryCondition: string;
    riskLevel: string;
    confidence: number;
    sources: string[];
  } | null>(null);
  const dismissed = useDismissedTrades();

  useEffect(() => {
    Promise.all([
      fetch("/api/signals").then((r) => r.json()).catch(() => []),
      fetch("/api/thesis?status=active").then((r) => r.json()).catch(() => ({ theses: [] })),
      fetch("/api/predictions").then((r) => r.json()).catch(() => []),
      fetch("/api/warroom").then((r) => r.json()).catch(() => null),
      fetch("/api/trading212/account").then((r) => r.json()).catch(() => null),
    ])
      .then(([signalData, thesisData, predData, warData, accountData]) => {
        setSignals(Array.isArray(signalData) ? signalData : signalData.signals || []);
        const theses = thesisData.theses || [];
        if (theses.length > 0) setActiveThesis(theses[0]);
        setPredictions(Array.isArray(predData) ? predData : predData.predictions || []);
        if (warData?.metrics) setWarRoomMetrics(warData.metrics);
        if (accountData?.cash) setAccountCash(accountData.cash);
        if (accountData?.info) setAccountInfo(accountData.info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Computed values ──

  const activeSignals = signals.filter((s) => s.status === "active");
  const upcomingSignals = signals.filter((s) => s.status === "upcoming");
  const highIntensity = signals.filter((s) => s.intensity >= 4);

  const pendingPredictions = predictions.filter((p) => !p.outcome);
  const resolvedPredictions = predictions.filter((p) => p.outcome);
  const today = new Date().toISOString().split("T")[0];
  const overduePredictions = pendingPredictions.filter((p) => p.deadline <= today);
  const confirmedCount = resolvedPredictions.filter((p) => p.outcome === "confirmed").length;
  const avgScore = resolvedPredictions.length > 0
    ? resolvedPredictions.reduce((sum, p) => sum + (p.score || 0), 0) / resolvedPredictions.length
    : 0;

  const portfolioValue = accountCash?.total ?? null;
  const pnl = accountCash?.result ?? null;
  const pnlPercent = portfolioValue && pnl && accountCash?.invested
    ? (pnl / accountCash.invested) * 100
    : null;
  const currency = accountInfo?.currencyCode || "GBP";

  const threatLevel = warRoomMetrics?.maxEscalation ?? 0;

  // ── Signal columns ──

  const signalColumns: Column<Signal>[] = [
    {
      key: "intensity",
      header: "Level",
      accessor: (row) => <IntensityIndicator intensity={row.intensity} />,
      sortAccessor: (row) => row.intensity,
    },
    {
      key: "title",
      header: "Signal",
      accessor: (row) => (
        <span className="text-navy-200">{row.title}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      accessor: (row) =>
        new Date(row.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      sortAccessor: (row) => row.date,
    },
    {
      key: "category",
      header: "Type",
      accessor: (row) => (
        <Badge variant="category">{row.category}</Badge>
      ),
      sortAccessor: (row) => row.category,
    },
  ];

  // ── Prediction columns ──

  const predictionColumns: Column<Prediction>[] = [
    {
      key: "category",
      header: "Cat",
      accessor: (row) => {
        const colors: Record<string, string> = {
          market: "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30",
          geopolitical: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
          celestial: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
        };
        return (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium font-mono border ${colors[row.category] || "bg-navy-700 text-navy-200"}`}>
            {row.category.slice(0, 3).toUpperCase()}
          </span>
        );
      },
    },
    {
      key: "claim",
      header: "Claim",
      accessor: (row) => (
        <span className="text-navy-200 text-xs line-clamp-1">{row.claim}</span>
      ),
    },
    {
      key: "confidence",
      header: "Conf",
      accessor: (row) => (
        <span className="text-navy-300 text-xs font-mono">
          {(row.confidence * 100).toFixed(0)}%
        </span>
      ),
      sortAccessor: (row) => row.confidence,
    },
    {
      key: "deadline",
      header: "Due",
      accessor: (row) => {
        const daysLeft = Math.ceil(
          (new Date(row.deadline).getTime() - Date.now()) / 86400000
        );
        const isOverdue = daysLeft < 0;
        return (
          <span className={`text-xs font-mono ${isOverdue ? "text-accent-rose" : daysLeft <= 3 ? "text-accent-amber" : "text-navy-400"}`}>
            {isOverdue ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
          </span>
        );
      },
      sortAccessor: (row) => row.deadline,
    },
  ];

  // ── Loading state ──

  if (loading) {
    return (
      <PageContainer title="Dashboard" subtitle="Intelligence overview">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-40 col-span-2 rounded" />
            <Skeleton className="h-40 rounded" />
          </div>
          <Skeleton className="h-60 w-full rounded" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" subtitle="Intelligence overview">
      {/* ── Row 1: Key Metrics (bento) ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* HERO: Threat Level -- colored accent */}
        <div className={`rounded-lg px-4 py-1 border ${threatLevel >= 4 ? "bg-accent-rose/6 border-accent-rose/30 shadow-[0_0_20px_rgba(244,63,94,0.06)]" : threatLevel >= 3 ? "bg-accent-amber/6 border-accent-amber/25 shadow-[0_0_20px_rgba(245,158,11,0.06)]" : "bg-navy-800/60 border-navy-700/40"}`}>
          <Metric
            label="Threat Level"
            value={`${threatLevel}/5`}
            change={warRoomMetrics?.volatilityOutlook || ""}
            changeColor={threatLevel >= 4 ? "red" : threatLevel >= 3 ? "neutral" : "green"}
          />
        </div>
        {/* Quiet */}
        <div className="rounded-lg px-4 py-1 bg-navy-900/50 border border-navy-800/60">
          <Metric
            label="Market Regime"
            value={warRoomMetrics?.marketRegime?.replace("_", " ") || "N/A"}
            change={`${activeSignals.length} active`}
            changeColor="neutral"
          />
        </div>
        {/* Quiet */}
        <div className="rounded-lg px-4 py-1 bg-navy-900/50 border border-navy-800/60">
          <Metric
            label="Thesis Confidence"
            value={activeThesis ? `${(activeThesis.overallConfidence * 100).toFixed(0)}%` : "N/A"}
            change={activeThesis?.volatilityOutlook || "no thesis"}
            changeColor={activeThesis && activeThesis.overallConfidence >= 0.7 ? "green" : "neutral"}
          />
        </div>
        {/* Quiet */}
        <div className="rounded-lg px-4 py-1 bg-navy-900/50 border border-navy-800/60">
          <Metric
            label="Predictions"
            value={pendingPredictions.length}
            change={overduePredictions.length > 0 ? `${overduePredictions.length} overdue` : `${resolvedPredictions.length} resolved`}
            changeColor={overduePredictions.length > 0 ? "red" : "neutral"}
          />
        </div>
        {/* Quiet */}
        <div className="rounded-lg px-4 py-1 bg-navy-900/50 border border-navy-800/60">
          <Metric
            label="Accuracy"
            value={resolvedPredictions.length > 0 ? `${(avgScore * 100).toFixed(0)}%` : "N/A"}
            change={resolvedPredictions.length > 0 ? `${confirmedCount}/${resolvedPredictions.length} confirmed` : "no data"}
            changeColor={avgScore >= 0.6 ? "green" : avgScore > 0 ? "red" : "neutral"}
          />
        </div>
        {/* HERO: Portfolio -- colored accent */}
        <div className={`rounded-lg px-4 py-1 border ${pnl != null && pnl >= 0 ? "bg-accent-emerald/6 border-accent-emerald/25 shadow-[0_0_20px_rgba(16,185,129,0.06)]" : pnl != null && pnl < 0 ? "bg-accent-rose/6 border-accent-rose/30 shadow-[0_0_20px_rgba(244,63,94,0.06)]" : "bg-navy-800/60 border-navy-700/40"}`}>
          <Metric
            label="Portfolio"
            value={portfolioValue != null ? `${currency} ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "N/A"}
            change={pnl != null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}${pnlPercent != null ? ` (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)` : ""}` : ""}
            changeColor={pnl != null ? (pnl >= 0 ? "green" : "red") : "neutral"}
          />
        </div>
      </div>

      {/* ── Row 2: Thesis + Prediction Scorecard ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Active Thesis */}
        <div className="col-span-2">
          {activeThesis ? (
            <div className="border border-navy-700/40 rounded-lg bg-navy-800/40 p-5 shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
                    Active Thesis
                  </h2>
                  <StatusDot
                    color={activeThesis.marketRegime === "risk_off" ? "red" : activeThesis.marketRegime === "risk_on" ? "green" : "amber"}
                    label={activeThesis.marketRegime.replace("_", " ")}
                  />
                  <span className="text-[10px] text-navy-500">
                    Convergence {activeThesis.convergenceDensity.toFixed(1)}/10
                  </span>
                </div>
                <Link
                  href={`/thesis/${activeThesis.id}`}
                  className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
                >
                  Full Briefing <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="font-sans text-sm text-navy-300 leading-relaxed mb-4">
                <Markdown>{activeThesis.executiveSummary}</Markdown>
              </div>
              {/* Trading action count summary */}
              {activeThesis.tradingActions && activeThesis.tradingActions.length > 0 && (
                <div className="border-t border-navy-700/30 pt-3">
                  <div className="text-[10px] text-navy-500">
                    {activeThesis.tradingActions.length} trading action{activeThesis.tradingActions.length !== 1 ? "s" : ""} suggested below
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-navy-800/60 rounded-lg bg-navy-900/50 p-8 text-center h-full flex flex-col items-center justify-center">
              <FileText className="h-8 w-8 text-navy-700 mb-3" />
              <p className="text-xs text-navy-500 mb-1">No active thesis</p>
              <Link href="/thesis" className="text-xs text-navy-400 hover:text-navy-200 transition-colors">
                Generate one
              </Link>
            </div>
          )}
        </div>

        {/* Prediction Scorecard */}
        <div className="border border-navy-800/60 rounded-lg bg-navy-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
              Prediction Scorecard
            </h2>
            <Link
              href="/predictions"
              className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-accent-cyan" />
                <span className="text-xs text-navy-300">Pending</span>
              </div>
              <span className="text-sm font-bold text-navy-100 font-mono">{pendingPredictions.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-accent-rose" />
                <span className="text-xs text-navy-300">Overdue</span>
              </div>
              <span className={`text-sm font-bold font-mono ${overduePredictions.length > 0 ? "text-accent-rose" : "text-navy-400"}`}>
                {overduePredictions.length}
              </span>
            </div>

            <div className="border-t border-navy-700/30 pt-3" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald" />
                <span className="text-xs text-navy-300">Confirmed</span>
              </div>
              <span className="text-sm font-bold text-accent-emerald font-mono">{confirmedCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-navy-500" />
                <span className="text-xs text-navy-300">Denied</span>
              </div>
              <span className="text-sm font-bold text-navy-400 font-mono">
                {resolvedPredictions.filter((p) => p.outcome === "denied").length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-accent-amber" />
                <span className="text-xs text-navy-300">Partial</span>
              </div>
              <span className="text-sm font-bold text-accent-amber font-mono">
                {resolvedPredictions.filter((p) => p.outcome === "partial").length}
              </span>
            </div>

            <div className="border-t border-navy-700/30 pt-3" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-navy-400" />
                <span className="text-xs text-navy-300">Avg Score</span>
              </div>
              <span className={`text-sm font-bold font-mono ${avgScore >= 0.6 ? "text-accent-emerald" : avgScore > 0 ? "text-accent-amber" : "text-navy-400"}`}>
                {resolvedPredictions.length > 0 ? `${(avgScore * 100).toFixed(0)}%` : "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] font-bold text-navy-400">#</span>
                <span className="text-xs text-navy-300">Total Resolved</span>
              </div>
              <span className="text-sm font-bold text-navy-200 font-mono">{resolvedPredictions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recommended Trades ── */}
      {activeThesis?.tradingActions && activeThesis.tradingActions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
              Recommended Trades
            </h2>
            <Link
              href="/trading"
              className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
            >
              Trading <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {activeThesis.tradingActions
              .filter((a) => !dismissed.isDismissed(activeThesis.id, a.ticker, a.direction))
              .map((action, i) => (
                <TradeSuggestionCard
                  key={`${action.ticker}-${action.direction}-${i}`}
                  action={{
                    ticker: action.ticker,
                    direction: action.direction as "BUY" | "SELL" | "HOLD",
                    rationale: action.rationale,
                    confidence: action.confidence ?? 0,
                    riskLevel: action.riskLevel,
                  }}
                  executed={dismissed.isExecuted(activeThesis.id, action.ticker, action.direction)}
                  onApprove={() =>
                    setApprovalAction({
                      ticker: action.ticker,
                      direction: action.direction as "BUY" | "SELL" | "HOLD",
                      rationale: action.rationale,
                      entryCondition: (action as Record<string, unknown>).entryCondition as string || "",
                      riskLevel: action.riskLevel || "medium",
                      confidence: action.confidence ?? 0,
                      sources: (action as Record<string, unknown>).sources as string[] || [],
                    })
                  }
                  onDecline={() => dismissed.dismiss(activeThesis.id, action.ticker, action.direction)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Trade Approval Modal */}
      <TradeApprovalModal
        action={approvalAction}
        thesisContext={activeThesis?.layerInputs ? {
          id: activeThesis.id,
          title: activeThesis.title,
          marketRegime: activeThesis.marketRegime,
          volatilityOutlook: activeThesis.volatilityOutlook,
          convergenceDensity: activeThesis.convergenceDensity,
          overallConfidence: activeThesis.overallConfidence,
          layerInputs: activeThesis.layerInputs,
        } : undefined}
        onClose={() => setApprovalAction(null)}
        onExecuted={(ticker, direction) => {
          if (activeThesis) dismissed.markExecuted(activeThesis.id, ticker, direction);
          setApprovalAction(null);
        }}
      />

      {/* ── Row 3: Signals + Pending Predictions ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* High Intensity Signals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
              High Intensity Signals
            </h2>
            <Link
              href="/signals"
              className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
            >
              All Signals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <DataGrid
            data={highIntensity.slice(0, 10)}
            columns={signalColumns}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => router.push(`/signals/${row.id}`)}
            emptyMessage="No high intensity signals"
          />
        </div>

        {/* Pending Predictions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
              Pending Predictions
            </h2>
            <Link
              href="/predictions"
              className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
            >
              All Predictions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <DataGrid
            data={pendingPredictions.slice(0, 10)}
            columns={predictionColumns}
            keyExtractor={(row) => row.id}
            onRowClick={() => router.push("/predictions")}
            emptyMessage="No pending predictions"
          />
        </div>
      </div>
    </PageContainer>
  );
}
