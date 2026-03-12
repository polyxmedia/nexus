"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Metric } from "@/components/ui/metric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  AlertTriangle,
  Globe,
  BarChart3,
  Star,
  Brain,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Shield,
  Crosshair,
  Activity,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
} from "lucide-react";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Prediction {
  id: number;
  uuid: string;
  claim: string;
  timeframe: string;
  deadline: string;
  confidence: number;
  category: string;
  outcome: string | null;
  outcomeNotes: string | null;
  score: number | null;
  metrics: string | null;
  createdAt: string;
  resolvedAt: string | null;
  direction: string | null;
  priceTarget: number | null;
  referenceSymbol: string | null;
  directionCorrect: number | null;
  levelCorrect: number | null;
  regimeAtCreation: string | null;
  referencePrices: string | null;
  regimeInvalidated: number | null;
  preEvent: number | null;
}

interface BeliefUpdate {
  date: string;
  confidence: number;
  reason?: string;
}

const CATEGORY_CONFIG: Record<string, {
  label: string;
  color: string;
  border: string;
  bg: string;
  hex: string;
  icon: typeof Globe;
}> = {
  market: {
    label: "Market",
    color: "text-accent-cyan",
    border: "border-accent-cyan/30",
    bg: "bg-accent-cyan/8",
    hex: "#22d3ee",
    icon: BarChart3,
  },
  geopolitical: {
    label: "Geopolitical",
    color: "text-accent-rose",
    border: "border-accent-rose/30",
    bg: "bg-accent-rose/8",
    hex: "#f43f5e",
    icon: Globe,
  },
  celestial: {
    label: "Astronomical",
    color: "text-accent-amber",
    border: "border-accent-amber/30",
    bg: "bg-accent-amber/8",
    hex: "#f59e0b",
    icon: Star,
  },
};

const OUTCOME_CONFIG: Record<string, {
  icon: typeof CheckCircle2;
  label: string;
  color: string;
  bg: string;
  border: string;
  hex: string;
}> = {
  confirmed: { icon: CheckCircle2, label: "HIT", color: "text-accent-emerald", bg: "bg-accent-emerald/8", border: "border-accent-emerald/25", hex: "#10b981" },
  denied: { icon: XCircle, label: "MISS", color: "text-accent-rose", bg: "bg-accent-rose/8", border: "border-accent-rose/25", hex: "#f43f5e" },
  partial: { icon: MinusCircle, label: "PARTIAL", color: "text-accent-amber", bg: "bg-accent-amber/8", border: "border-accent-amber/25", hex: "#f59e0b" },
  expired: { icon: Clock, label: "EXPIRED", color: "text-navy-400", bg: "bg-navy-800/40", border: "border-navy-700/30", hex: "#64748b" },
};

interface FeedbackReport {
  totalResolved: number;
  sampleSufficient: boolean;
  brierScore: number;
  logLoss: number;
  binaryAccuracy: number;
  avgConfidence: number;
  calibrationGap: number;
  calibration: Array<{ range: string; midpoint: number; count: number; confirmedRate: number; brierContribution: number; reliable: boolean }>;
  byCategory: Array<{ category: string; total: number; confirmed: number; denied: number; partial: number; expired: number; brierScore: number; avgConfidence: number; calibrationGap: number; reliable: boolean }>;
  failurePatterns: Array<{ pattern: string; frequency: number; examples: string[] }>;
  timeframeAccuracy: Record<string, { count: number; brierScore: number; binaryAccuracy: number; reliable: boolean }>;
  recentTrend: { recentBrier: number; priorBrier: number; improving: boolean; windowSize: number } | null;
  resolutionBias: { avgLlmScore: number; binaryAccuracy: number; partialRate: number; biasDirection: string; biasWarning: string | null };
  directionLevel: { totalWithDirection: number; directionCorrectRate: number; totalWithLevel: number; levelCorrectRate: number; partialRate: number };
  regimeInvalidatedCount: number;
  postEventCount: number;
  bin: {
    bias: number;
    biasDirection: string;
    noise: number;
    information: number;
    brierScore: number;
    interpretation: string;
    recommendation: string;
    byCategory: Array<{ category: string; bias: number; noise: number; information: number }>;
  } | null;
}

const POLL_INTERVAL = 120_000; // 2min - reduced from 30s

// ---------------------------------------------------------------------------
// Helper: parse belief history from metrics JSON
// ---------------------------------------------------------------------------
function parseBeliefHistory(metrics: string | null): BeliefUpdate[] {
  if (!metrics) return [];
  try {
    const parsed = JSON.parse(metrics);
    return Array.isArray(parsed.beliefHistory) ? parsed.beliefHistory : [];
  } catch { return []; }
}

function parseGrounding(metrics: string | null): string | null {
  if (!metrics) return null;
  try { return JSON.parse(metrics).grounding || null; } catch { return null; }
}

// ---------------------------------------------------------------------------
// Helper: compute Brier score for a single prediction
// ---------------------------------------------------------------------------
function singleBrier(confidence: number, outcome: string | null): number {
  const o = outcome === "confirmed" ? 1 : outcome === "partial" ? 0.5 : 0;
  return (confidence - o) ** 2;
}

// ---------------------------------------------------------------------------
// Section Header component
// ---------------------------------------------------------------------------
function SectionHeader({ label, icon, badge }: { label: string; icon?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-navy-700/20">
      {icon}
      <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">{label}</h3>
      {badge}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictionsPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeOutcome, setActiveOutcome] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"deadline" | "confidence" | "created">("deadline");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoResolved = useRef(false);

  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  const [claim, setClaim] = useState("");
  const [timeframe, setTimeframe] = useState("30 days");
  const [deadline, setDeadline] = useState("");
  const [confidence, setConfidence] = useState("0.5");
  const [category, setCategory] = useState("market");

  const [showRequest, setShowRequest] = useState(false);
  const [requestTopic, setRequestTopic] = useState("");
  const [requesting, setRequesting] = useState(false);

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await fetch("/api/predictions");
      const data = await res.json();
      const preds = Array.isArray(data) ? data : data.predictions || [];
      setPredictions(preds);
      // Fetch comment counts
      if (preds.length > 0) {
        const ids = preds.map((p: Prediction) => p.id).join(",");
        fetch(`/api/comments?view=counts&targetType=prediction&ids=${ids}`)
          .then((r) => r.ok ? r.json() : { counts: {} })
          .then((d) => setCommentCounts(d.counts || {}))
          .catch((err) => console.error("[Predictions] comment counts fetch failed:", err));
      }
    } catch (err) {
      console.error("[Predictions] fetch predictions failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const autoResolve = useCallback(async (preds: Prediction[]) => {
    const today = new Date().toISOString().split("T")[0];
    const overdue = preds.filter((p) => !p.outcome && p.deadline <= today);
    if (overdue.length === 0 || hasAutoResolved.current) return;
    hasAutoResolved.current = true;
    setResolving(true);
    try {
      const res = await fetch("/api/predictions/resolve", { method: "POST" });
      const data = await res.json();
      if (data.count > 0) {
        setStatusMessage({ text: `Auto-resolved ${data.count} overdue prediction${data.count > 1 ? "s" : ""}`, type: "info" });
        fetchPredictions();
      }
    } catch (err) {
      console.error("[Predictions] auto-resolve failed:", err);
    } finally {
      setResolving(false);
    }
  }, [fetchPredictions]);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/predictions/feedback");
      const data = await res.json();
      setFeedbackReport(data.report || null);
    } catch (err) {
      console.error("[Predictions] feedback fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
    fetchFeedback();
    // Pause polling when tab hidden
    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (document.visibilityState === "visible") {
        pollRef.current = setInterval(fetchPredictions, POLL_INTERVAL);
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", startPolling);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", startPolling);
    };
  }, [fetchPredictions, fetchFeedback]);

  useEffect(() => {
    if (predictions.length > 0 && !hasAutoResolved.current) autoResolve(predictions);
  }, [predictions, autoResolve]);

  useEffect(() => {
    if (!statusMessage) return;
    if (statusMessage.type === "info") return;
    const t = setTimeout(() => setStatusMessage(null), 8000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  const createPrediction = async () => {
    if (!claim || !deadline) return;
    setSubmitting(true);
    try {
      await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim, timeframe, deadline, confidence: parseFloat(confidence), category }),
      });
      setClaim("");
      setDeadline("");
      setShowForm(false);
      fetchPredictions();
    } catch (err) { console.error("[Predictions] submit prediction failed:", err); } finally { setSubmitting(false); }
  };

  const aiGenerate = async () => {
    setGenerating(true);
    setStatusMessage({ text: "Generating predictions from intelligence picture... this may take up to 60s", type: "info" });
    try {
      const res = await fetch("/api/predictions/generate", { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        try { const data = JSON.parse(text); setStatusMessage({ text: data.error || `Generation failed (${res.status})`, type: "error" }); }
        catch { setStatusMessage({ text: `Generation failed (${res.status})`, type: "error" }); }
        return;
      }
      const data = await res.json();
      if (data.error) setStatusMessage({ text: data.error, type: "error" });
      else { setStatusMessage({ text: `Generated ${data.count} new prediction${data.count !== 1 ? "s" : ""}`, type: "success" }); fetchPredictions(); fetchFeedback(); }
    } catch { setStatusMessage({ text: "Failed to generate predictions - request may have timed out", type: "error" }); }
    finally { setGenerating(false); }
  };

  const aiResolve = async () => {
    setResolving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/predictions/resolve", { method: "POST" });
      const data = await res.json();
      if (data.error) setStatusMessage({ text: data.error, type: "error" });
      else if (data.count === 0) setStatusMessage({ text: "No predictions past deadline to resolve", type: "info" });
      else { setStatusMessage({ text: `Resolved ${data.count} predictions`, type: "success" }); fetchPredictions(); fetchFeedback(); }
    } catch { setStatusMessage({ text: "Failed to resolve predictions", type: "error" }); }
    finally { setResolving(false); }
  };

  const aiRequest = async () => {
    if (!requestTopic.trim()) return;
    setRequesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/predictions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: requestTopic.trim() }),
      });
      const data = await res.json();
      if (data.error) setStatusMessage({ text: data.error, type: "error" });
      else {
        setStatusMessage({ text: `Generated ${data.count} prediction${data.count !== 1 ? "s" : ""} for "${requestTopic.trim()}"`, type: "success" });
        setRequestTopic("");
        setShowRequest(false);
        fetchPredictions();
        fetchFeedback();
      }
    } catch { setStatusMessage({ text: "Failed to generate requested prediction", type: "error" }); }
    finally { setRequesting(false); }
  };

  // ── Derived data ──
  const today = new Date().toISOString().split("T")[0];
  const resolved = predictions.filter((p) => p.outcome);
  const pending = predictions.filter((p) => !p.outcome);
  const pastDeadline = pending.filter((p) => p.deadline <= today);
  const hits = resolved.filter((p) => p.outcome === "confirmed");
  const misses = resolved.filter((p) => p.outcome === "denied");
  const partials = resolved.filter((p) => p.outcome === "partial");
  const accuracy = resolved.length > 0 ? hits.length / resolved.length : 0;
  const avgScore = resolved.length > 0 ? resolved.reduce((s, p) => s + (p.score || 0), 0) / resolved.length : 0;

  // Category stats
  const categories = ["market", "geopolitical", "celestial"];
  const categoryStats = categories.map((cat) => {
    const all = predictions.filter((p) => p.category === cat);
    const res = all.filter((p) => p.outcome);
    const h = res.filter((p) => p.outcome === "confirmed");
    const acc = res.length > 0 ? h.length / res.length : 0;
    const avg = res.length > 0 ? res.reduce((s, p) => s + (p.score || 0), 0) / res.length : 0;
    return { cat, total: all.length, pending: all.filter((p) => !p.outcome).length, resolved: res.length, hits: h.length, accuracy: acc, avgScore: avg };
  });

  // Outcome distribution pie data
  const pieData = [
    { name: "Hits", value: hits.length, fill: OUTCOME_CONFIG.confirmed.hex },
    { name: "Misses", value: misses.length, fill: OUTCOME_CONFIG.denied.hex },
    { name: "Partial", value: partials.length, fill: OUTCOME_CONFIG.partial.hex },
    { name: "Expired (legacy)", value: resolved.filter((p) => p.outcome === "expired").length, fill: OUTCOME_CONFIG.expired.hex },
  ].filter((d) => d.value > 0);

  // Category accuracy bar data
  const barData = categoryStats
    .filter((s) => s.resolved > 0)
    .map((s) => ({
      category: CATEGORY_CONFIG[s.cat].label,
      accuracy: Math.round(s.accuracy * 100),
      avgScore: Math.round(s.avgScore * 100),
      fill: CATEGORY_CONFIG[s.cat].hex,
    }));

  // Accuracy over time (cumulative)
  const sortedResolved = [...resolved].sort((a, b) => (a.resolvedAt || "").localeCompare(b.resolvedAt || ""));
  const accuracyOverTime: Array<{ date: string; accuracy: number; cumHits: number; cumTotal: number }> = [];
  let cumHits = 0;
  let cumTotal = 0;
  for (const p of sortedResolved) {
    cumTotal++;
    if (p.outcome === "confirmed") cumHits++;
    const date = (p.resolvedAt || p.deadline).split("T")[0];
    accuracyOverTime.push({ date, accuracy: Math.round((cumHits / cumTotal) * 100), cumHits, cumTotal });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW ANALYTICS COMPUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Sharpness distribution - histogram of confidence values
  const sharpnessData = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}%`,
      min: i * 0.1,
      max: (i + 1) * 0.1,
      count: 0,
      pending: 0,
      resolved: 0,
    }));
    for (const p of predictions) {
      const idx = Math.min(Math.floor(p.confidence * 10), 9);
      buckets[idx].count++;
      if (p.outcome) buckets[idx].resolved++;
      else buckets[idx].pending++;
    }
    return buckets;
  }, [predictions]);

  // 2. Calibration curve data (scatter points for reliability diagram)
  const calibrationCurveData = useMemo(() => {
    if (!feedbackReport?.calibration) return [];
    return feedbackReport.calibration
      .filter((b) => b.count >= 1)
      .map((b) => ({
        predicted: Math.round(b.midpoint * 100),
        observed: Math.round(b.confirmedRate * 100),
        count: b.count,
        reliable: b.reliable,
      }));
  }, [feedbackReport]);

  // 3. Paper portfolio simulation
  const portfolioData = useMemo(() => {
    const sorted = [...resolved]
      .filter((p) => p.outcome && p.outcome !== "expired")
      .sort((a, b) => (a.resolvedAt || a.deadline).localeCompare(b.resolvedAt || b.deadline));

    if (sorted.length < 2) return null;

    let equity = 1000; // start with $1000
    let peak = equity;
    let maxDrawdown = 0;
    let wins = 0;
    let losses = 0;
    const returns: number[] = [];
    const curve: Array<{ date: string; equity: number; drawdown: number }> = [
      { date: sorted[0]?.createdAt?.split("T")[0] || "", equity: 1000, drawdown: 0 },
    ];

    for (const p of sorted) {
      // Position size: Kelly-inspired, scaled by confidence
      const size = Math.min(p.confidence * 0.3, 0.15) * equity; // max 15% of equity per trade
      const isWin = p.outcome === "confirmed";
      const isPartial = p.outcome === "partial";

      let pnl: number;
      if (isWin) {
        pnl = size * (0.5 + p.confidence * 0.5); // higher confidence wins pay more
        wins++;
      } else if (isPartial) {
        pnl = size * 0.1; // small gain on partials
        wins++;
      } else {
        pnl = -size * 0.8; // losses are sized down (stop loss)
        losses++;
      }

      const ret = pnl / equity;
      returns.push(ret);
      equity += pnl;
      peak = Math.max(peak, equity);
      const dd = (peak - equity) / peak;
      maxDrawdown = Math.max(maxDrawdown, dd);

      curve.push({
        date: (p.resolvedAt || p.deadline).split("T")[0],
        equity: Math.round(equity * 100) / 100,
        drawdown: Math.round(dd * 10000) / 100,
      });
    }

    // Sharpe ratio (annualized, assuming ~252 trading days)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - avgReturn) ** 2, 0) / returns.length;
    const stdReturn = Math.sqrt(variance);
    const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

    const totalReturn = (equity - 1000) / 1000;

    return {
      curve,
      sharpe: Math.round(sharpe * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      totalReturn: Math.round(totalReturn * 10000) / 100,
      winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
      finalEquity: Math.round(equity * 100) / 100,
      tradeCount: sorted.length,
    };
  }, [resolved]);

  // 4. Forecast horizon decay
  const horizonData = useMemo(() => {
    return resolved
      .filter((p) => p.outcome && p.outcome !== "expired" && p.createdAt)
      .map((p) => {
        const created = new Date(p.createdAt);
        const dead = new Date(p.deadline);
        const horizonDays = Math.max(1, Math.ceil((dead.getTime() - created.getTime()) / 86400000));
        const brier = singleBrier(p.confidence, p.outcome);
        return {
          horizon: horizonDays,
          brier: Math.round(brier * 1000) / 1000,
          outcome: p.outcome,
          category: p.category,
        };
      });
  }, [resolved]);

  // 5. Regime-conditional performance
  const regimePerformance = useMemo(() => {
    const regimes: Record<string, { total: number; hits: number; brierSum: number }> = {};
    for (const p of resolved) {
      if (!p.outcome || p.outcome === "expired") continue;
      const regime = p.regimeAtCreation || "unknown";
      if (!regimes[regime]) regimes[regime] = { total: 0, hits: 0, brierSum: 0 };
      regimes[regime].total++;
      if (p.outcome === "confirmed") regimes[regime].hits++;
      regimes[regime].brierSum += singleBrier(p.confidence, p.outcome);
    }
    return Object.entries(regimes).map(([regime, data]) => ({
      regime,
      total: data.total,
      accuracy: data.total > 0 ? Math.round((data.hits / data.total) * 100) : 0,
      brier: data.total > 0 ? Math.round((data.brierSum / data.total) * 1000) / 1000 : 0,
    }));
  }, [resolved]);

  // 6. Rolling Brier (model health / kill switch)
  const rollingBrierData = useMemo(() => {
    const windowSize = 10;
    const sorted = [...resolved]
      .filter((p) => p.outcome && p.outcome !== "expired")
      .sort((a, b) => (a.resolvedAt || a.deadline).localeCompare(b.resolvedAt || b.deadline));

    if (sorted.length < windowSize) return [];

    const points: Array<{ index: number; brier: number; date: string }> = [];
    for (let i = windowSize - 1; i < sorted.length; i++) {
      const window = sorted.slice(i - windowSize + 1, i + 1);
      const avgBrier = window.reduce((sum, p) => sum + singleBrier(p.confidence, p.outcome), 0) / windowSize;
      points.push({
        index: i + 1,
        brier: Math.round(avgBrier * 1000) / 1000,
        date: (sorted[i].resolvedAt || sorted[i].deadline).split("T")[0],
      });
    }
    return points;
  }, [resolved]);

  // 7. Belief revision trails (predictions with history)
  const beliefTrails = useMemo(() => {
    return predictions
      .map((p) => ({
        ...p,
        history: parseBeliefHistory(p.metrics),
      }))
      .filter((p) => p.history.length > 0)
      .sort((a, b) => b.history.length - a.history.length)
      .slice(0, 8);
  }, [predictions]);

  // 8. Tail risk monitor
  const tailRisks = useMemo(() => {
    return pending
      .filter((p) => {
        // Low probability but potentially high impact
        const isLowProb = p.confidence <= 0.3;
        const isGeopolitical = p.category === "geopolitical";
        const hasDirection = !!p.direction;
        return isLowProb || (isGeopolitical && p.confidence <= 0.4) || (hasDirection && p.confidence <= 0.35);
      })
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 6);
  }, [pending]);

  // 9. Direction accuracy breakdown
  const directionStats = useMemo(() => {
    const withDir = resolved.filter((p) => p.direction && p.directionCorrect !== null);
    const correct = withDir.filter((p) => p.directionCorrect === 1);
    const withLevel = resolved.filter((p) => p.priceTarget && p.levelCorrect !== null);
    const levelCorrect = withLevel.filter((p) => p.levelCorrect === 1);
    return {
      total: withDir.length,
      correct: correct.length,
      rate: withDir.length > 0 ? Math.round((correct.length / withDir.length) * 100) : 0,
      levelTotal: withLevel.length,
      levelCorrect: levelCorrect.length,
      levelRate: withLevel.length > 0 ? Math.round((levelCorrect.length / withLevel.length) * 100) : 0,
    };
  }, [resolved]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  const filterPredictions = (list: Prediction[]) => {
    let filtered = list;
    if (activeCategory) filtered = filtered.filter((p) => p.category === activeCategory);
    if (confidenceRange[0] > 0 || confidenceRange[1] < 1) {
      filtered = filtered.filter((p) => p.confidence >= confidenceRange[0] && p.confidence <= confidenceRange[1]);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.claim.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.outcomeNotes || "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      filtered = filtered.filter((p) => p.deadline >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((p) => p.deadline <= dateTo);
    }
    return filtered;
  };

  const sortPredictions = (list: Prediction[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === "confidence") return b.confidence - a.confidence;
      if (sortBy === "created") return b.createdAt.localeCompare(a.createdAt);
      return a.deadline.localeCompare(b.deadline);
    });
  };

  const displayPending = sortPredictions(filterPredictions(pending));
  const displayResolved = sortPredictions(
    filterPredictions(resolved).filter((p) => activeOutcome ? p.outcome === activeOutcome : true)
  );

  const activeList = activeTab === "pending" ? displayPending : displayResolved;
  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = activeList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const hasActiveFilters = activeCategory !== null || activeOutcome !== null || confidenceRange[0] > 0 || confidenceRange[1] < 1 || searchQuery.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const clearFilters = () => {
    setActiveCategory(null);
    setActiveOutcome(null);
    setConfidenceRange([0, 1]);
    setSearchQuery("");
    setSortBy("deadline");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "today";
    return `${diff}d`;
  };

  /** Compute urgency info for a prediction based on time elapsed vs total window */
  const getUrgency = (p: Prediction) => {
    const now = Date.now();
    const deadlineMs = new Date(p.deadline).getTime();
    const createdMs = new Date(p.createdAt).getTime();
    const totalWindow = deadlineMs - createdMs;
    const elapsed = now - createdMs;
    const remaining = deadlineMs - now;
    const daysLeft = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    const progress = totalWindow > 0 ? Math.min(Math.max(elapsed / totalWindow, 0), 1) : 1;

    if (remaining <= 0) return { label: `${Math.abs(daysLeft)}d overdue`, color: "bg-signal-5", textColor: "text-signal-5", progress: 1, level: "overdue" as const };
    if (daysLeft === 0) return { label: "Due today", color: "bg-signal-5", textColor: "text-signal-5", progress, level: "critical" as const };
    if (daysLeft <= 2) return { label: `${daysLeft}d left`, color: "bg-accent-rose", textColor: "text-accent-rose", progress, level: "urgent" as const };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: "bg-accent-amber", textColor: "text-accent-amber", progress, level: "soon" as const };
    return { label: `${daysLeft}d left`, color: "bg-accent-cyan", textColor: "text-navy-400", progress, level: "normal" as const };
  };

  const confidenceBar = (conf: number) => (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-navy-700/50 overflow-hidden">
        <div className={`h-full rounded-full ${conf >= 0.7 ? "bg-accent-emerald" : conf >= 0.5 ? "bg-accent-amber" : "bg-navy-400"}`} style={{ width: `${conf * 100}%` }} />
      </div>
      <span className="text-[10px] text-navy-400 font-mono">{(conf * 100).toFixed(0)}%</span>
    </div>
  );

  const chartTooltipStyle = {
    contentStyle: { background: "var(--color-navy-950, #0a0e1a)", border: "1px solid var(--color-navy-700, #1e293b)", borderRadius: "6px", fontSize: "11px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", color: "var(--color-navy-100, #e0e0e0)" },
    labelStyle: { color: "var(--color-navy-400, #94a3b8)", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
    itemStyle: { color: "var(--color-navy-100, #e0e0e0)", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px" },
  };

  // Model health status
  const latestRollingBrier = rollingBrierData.length > 0 ? rollingBrierData[rollingBrierData.length - 1].brier : null;
  const modelDegraded = latestRollingBrier !== null && latestRollingBrier > 0.35;
  const modelWarning = latestRollingBrier !== null && latestRollingBrier > 0.28;

  return (
    <PageContainer
      title="Predictions"
      subtitle="AI-generated falsifiable claims with auto-resolution and forecasting analytics"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={aiGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Generate
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowRequest(!showRequest)} disabled={requesting}>
            {requesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Crosshair className="h-3 w-3 mr-1" />}
            Request
          </Button>
          {pastDeadline.length > 0 && (
            <Button variant="outline" size="sm" onClick={aiResolve} disabled={resolving}>
              {resolving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Target className="h-3 w-3 mr-1" />}
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
      <UpgradeGate minTier="analyst" feature="Prediction tracking and accuracy scoring">
      {statusMessage && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-xs ${
          statusMessage.type === "error" ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose"
          : statusMessage.type === "success" ? "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"
          : "border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* ── Request Prediction Form ── */}
      {showRequest && (
        <div className="mb-4 rounded-md border border-navy-700/30 bg-navy-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="h-3.5 w-3.5 text-accent-cyan" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-400">Request Prediction</span>
          </div>
          <p className="text-xs text-navy-400 mb-3">
            Enter a topic, asset, or question and the system will generate focused predictions using the full intelligence picture.
          </p>
          <div className="flex gap-2">
            <Input
              value={requestTopic}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestTopic(e.target.value)}
              placeholder="e.g. SPY, gold prices, will Trump resign, Iran-Israel conflict..."
              className="flex-1 text-sm"
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && !requesting) aiRequest(); }}
              disabled={requesting}
            />
            <Button variant="primary" size="sm" onClick={aiRequest} disabled={requesting || !requestTopic.trim()}>
              {requesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {requesting ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Model Health Kill Switch ── */}
      {modelDegraded && (
        <div className="mb-4 rounded-md border border-signal-5/40 bg-signal-5/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-signal-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-signal-5 font-bold">Model Degradation Detected</span>
          </div>
          <p className="text-xs text-navy-300">
            Rolling Brier score ({latestRollingBrier?.toFixed(3)}) exceeds 0.35 threshold.
            Recent predictions are performing worse than historical baseline.
            Consider reducing position sizing and reviewing generation parameters.
          </p>
        </div>
      )}

      {/* ── Category panels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : (
          categoryStats.map((stat) => {
            const config = CATEGORY_CONFIG[stat.cat];
            const Icon = config.icon;
            const isActive = activeCategory === stat.cat;
            return (
              <button
                key={stat.cat}
                onClick={() => setActiveCategory(isActive ? null : stat.cat)}
                className={`text-left border rounded-md p-4 transition-all ${
                  isActive
                    ? `${config.border} ${config.bg}`
                    : "border-navy-700/30 bg-navy-900/60 hover:border-navy-600/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-widest ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-navy-100">{stat.total}</span>
                  <div className="flex items-center gap-2 text-[10px] text-navy-500">
                    <span>{stat.pending} pending</span>
                    <span className="text-navy-700">|</span>
                    <span>{stat.resolved} resolved</span>
                  </div>
                </div>
                {stat.resolved > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs font-medium ${stat.accuracy >= 0.6 ? "text-accent-emerald" : stat.accuracy >= 0.4 ? "text-accent-amber" : "text-accent-rose"}`}>
                      {(stat.accuracy * 100).toFixed(0)}% accuracy
                    </span>
                    <span className="text-[10px] text-navy-500">
                      {stat.hits}/{stat.resolved} hits
                    </span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ── Accuracy charts ── */}
      {!loading && resolved.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* Outcome distribution */}
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">Outcome Distribution</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 mt-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: d.fill }} />
                  <span className="text-[9px] text-navy-400">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category accuracy */}
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">Accuracy by Category</h3>
            {barData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" barSize={14}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip {...chartTooltipStyle} formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-navy-600 text-xs">No resolved predictions yet</div>
            )}
          </div>

          {/* Accuracy over time */}
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3">Accuracy Over Time</h3>
            {accuracyOverTime.length > 1 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipStyle} formatter={(v: number) => `${v}%`} labelFormatter={(l) => `Date: ${l}`} />
                    <Line type="monotone" dataKey="accuracy" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3, fill: "#22d3ee" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-navy-600 text-xs">Need 2+ resolved predictions</div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RESEARCH ANALYTICS SECTION                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!loading && resolved.length >= 3 && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-accent-cyan" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-navy-400">
                Research Analytics
              </span>
              <span className="text-[9px] text-navy-600 font-mono">
                {resolved.length} resolved / {predictions.length} total
              </span>
            </div>
            {analyticsOpen ? <ChevronDown className="h-3.5 w-3.5 text-navy-500" /> : <ChevronRight className="h-3.5 w-3.5 text-navy-500" />}
          </button>

          {analyticsOpen && (
            <div className="px-4 pb-4 space-y-6">

              {/* ── Row 1: Calibration Curve + Sharpness ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Calibration Curve (Reliability Diagram) */}
                <div>
                  <SectionHeader
                    label="Calibration Curve"
                    icon={<Crosshair className="h-3 w-3 text-accent-cyan" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Brier 1950 / Murphy 1973</span>}
                  />
                  {calibrationCurveData.length >= 2 ? (
                    <div className="h-56 rounded bg-navy-950/60 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            type="number"
                            dataKey="predicted"
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: "Predicted (%)", position: "bottom", fontSize: 9, fill: "#475569", offset: 5 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="observed"
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: "Observed (%)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#475569" }}
                          />
                          {/* Perfect calibration line */}
                          <ReferenceLine
                            segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                            stroke="#475569"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                          />
                          <Tooltip
                            {...chartTooltipStyle}
                            formatter={(v: number, name: string) => [`${v}%`, name === "observed" ? "Observed" : "Predicted"]}
                          />
                          <Scatter
                            data={calibrationCurveData}
                            fill="#22d3ee"
                            fillOpacity={0.8}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            shape={((props: any) => {
                              const { cx, cy, payload } = props;
                              const r = Math.max(4, Math.min(10, payload.count * 1.5));
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={r}
                                  fill={payload.reliable ? "#22d3ee" : "#475569"}
                                  fillOpacity={payload.reliable ? 0.8 : 0.4}
                                  stroke={payload.reliable ? "#22d3ee" : "#475569"}
                                  strokeWidth={1}
                                />
                              );
                            })}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 rounded bg-navy-950/60 flex items-center justify-center text-navy-600 text-xs font-mono">
                      Need 2+ calibration buckets with data
                    </div>
                  )}
                  <p className="text-[9px] text-navy-600 mt-1.5">
                    Points on the diagonal = perfect calibration. Above = underconfident. Below = overconfident. Size = sample count.
                  </p>
                </div>

                {/* Sharpness Distribution */}
                <div>
                  <SectionHeader
                    label="Sharpness Distribution"
                    icon={<Zap className="h-3 w-3 text-accent-amber" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Confidence histogram</span>}
                  />
                  <div className="h-56 rounded bg-navy-950/60 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sharpnessData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 8, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "Confidence Range", position: "bottom", fontSize: 9, fill: "#475569", offset: 5 }}
                        />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip {...chartTooltipStyle} />
                        <Bar dataKey="resolved" stackId="a" fill="#22d3ee" fillOpacity={0.6} name="Resolved" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="pending" stackId="a" fill="#f59e0b" fillOpacity={0.4} name="Pending" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[9px] text-navy-600 mt-1.5">
                    A well-calibrated forecaster issues extreme probabilities (near 0% or 100%) and is right about them.
                    A flat histogram at 50% means no discriminating power.
                  </p>
                </div>
              </div>

              {/* ── Row 2: Paper Portfolio + Model Health ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Paper Portfolio */}
                <div className="md:col-span-2">
                  <SectionHeader
                    label="Paper Portfolio Simulation"
                    icon={<TrendingUp className="h-3 w-3 text-accent-emerald" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Kelly-sized, 15% max position</span>}
                  />
                  {portfolioData ? (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Total Return</span>
                          <span className={`text-sm font-bold font-mono ${portfolioData.totalReturn >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                            {portfolioData.totalReturn >= 0 ? "+" : ""}{portfolioData.totalReturn}%
                          </span>
                        </div>
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Sharpe</span>
                          <span className={`text-sm font-bold font-mono ${portfolioData.sharpe >= 1 ? "text-accent-emerald" : portfolioData.sharpe >= 0.5 ? "text-accent-amber" : "text-accent-rose"}`}>
                            {portfolioData.sharpe}
                          </span>
                        </div>
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Max DD</span>
                          <span className="text-sm font-bold font-mono text-accent-rose">
                            -{portfolioData.maxDrawdown}%
                          </span>
                        </div>
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Win Rate</span>
                          <span className="text-sm font-bold font-mono text-navy-100">
                            {portfolioData.winRate}%
                          </span>
                        </div>
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Trades</span>
                          <span className="text-sm font-bold font-mono text-navy-100">
                            {portfolioData.tradeCount}
                          </span>
                        </div>
                      </div>
                      <div className="h-44 rounded bg-navy-950/60 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={portfolioData.curve} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`$${v}`, "Equity"]} />
                            <ReferenceLine y={1000} stroke="#475569" strokeDasharray="4 4" />
                            <Area
                              type="monotone"
                              dataKey="equity"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill="#10b981"
                              fillOpacity={0.08}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="h-56 rounded bg-navy-950/60 flex items-center justify-center text-navy-600 text-xs font-mono">
                      Need 2+ non-expired resolved predictions with outcomes
                    </div>
                  )}
                </div>

                {/* Model Health / Kill Switch */}
                <div>
                  <SectionHeader
                    label="Model Health"
                    icon={<Shield className="h-3 w-3" style={{ color: modelDegraded ? "#ef4444" : modelWarning ? "#f59e0b" : "#10b981" }} />}
                    badge={
                      <span className={`text-[8px] font-mono font-bold ${modelDegraded ? "text-signal-5" : modelWarning ? "text-accent-amber" : "text-accent-emerald"}`}>
                        {modelDegraded ? "DEGRADED" : modelWarning ? "WARNING" : "HEALTHY"}
                      </span>
                    }
                  />
                  {rollingBrierData.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Rolling Brier</span>
                          <span className={`text-sm font-bold font-mono ${latestRollingBrier! < 0.2 ? "text-accent-emerald" : latestRollingBrier! < 0.28 ? "text-accent-amber" : "text-accent-rose"}`}>
                            {latestRollingBrier?.toFixed(3)}
                          </span>
                        </div>
                        <div className="rounded px-2.5 py-1.5 bg-navy-800/40">
                          <span className="text-[8px] text-navy-500 uppercase tracking-wider block">Window</span>
                          <span className="text-sm font-bold font-mono text-navy-100">10</span>
                        </div>
                      </div>
                      <div className="h-36 rounded bg-navy-950/60 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={rollingBrierData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="index" tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 0.5]} tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <Tooltip {...chartTooltipStyle} formatter={(v: number) => [v.toFixed(3), "Brier"]} />
                            {/* Degradation threshold */}
                            <ReferenceLine y={0.35} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
                            {/* Warning threshold */}
                            <ReferenceLine y={0.28} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
                            {/* Good threshold */}
                            <ReferenceLine y={0.2} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} />
                            <Line type="monotone" dataKey="brier" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2, fill: "#22d3ee" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-3 h-px bg-accent-emerald" />
                          <span className="text-[8px] text-navy-600">&lt;0.20 good</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-3 h-px bg-accent-amber" />
                          <span className="text-[8px] text-navy-600">0.28 warning</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-3 h-px bg-accent-rose" />
                          <span className="text-[8px] text-navy-600">0.35 kill switch</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-56 rounded bg-navy-950/60 flex items-center justify-center text-navy-600 text-xs font-mono">
                      Need 10+ resolved predictions
                    </div>
                  )}
                </div>
              </div>

              {/* ── Row 3: Forecast Horizon + Regime Performance + Direction Stats ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Forecast Horizon Decay */}
                <div>
                  <SectionHeader
                    label="Horizon Decay"
                    icon={<Clock className="h-3 w-3 text-accent-cyan" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Brier vs forecast window</span>}
                  />
                  {horizonData.length >= 3 ? (
                    <div className="h-48 rounded bg-navy-950/60 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            type="number"
                            dataKey="horizon"
                            tick={{ fontSize: 9, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: "Horizon (days)", position: "bottom", fontSize: 9, fill: "#475569", offset: 5 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="brier"
                            domain={[0, 1]}
                            tick={{ fontSize: 9, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            {...chartTooltipStyle}
                            formatter={(v: number, name: string) => [name === "brier" ? v.toFixed(3) : v, name === "brier" ? "Brier" : name]}
                          />
                          <ReferenceLine y={0.25} stroke="#475569" strokeDasharray="4 4" />
                          <Scatter
                            data={horizonData}
                            fill="#22d3ee"
                            fillOpacity={0.6}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            shape={((props: any) => {
                              const color = props.payload.outcome === "confirmed" ? "#10b981" : props.payload.outcome === "partial" ? "#f59e0b" : "#f43f5e";
                              return <circle cx={props.cx} cy={props.cy} r={3} fill={color} fillOpacity={0.7} />;
                            })}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 rounded bg-navy-950/60 flex items-center justify-center text-navy-600 text-xs font-mono">
                      Need 3+ resolved predictions
                    </div>
                  )}
                  <div className="flex gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-accent-emerald" />
                      <span className="text-[8px] text-navy-600">Hit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-accent-amber" />
                      <span className="text-[8px] text-navy-600">Partial</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-accent-rose" />
                      <span className="text-[8px] text-navy-600">Miss</span>
                    </div>
                  </div>
                </div>

                {/* Regime-Conditional Performance */}
                <div>
                  <SectionHeader
                    label="Regime Performance"
                    icon={<Shield className="h-3 w-3 text-accent-emerald" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Accuracy by market regime</span>}
                  />
                  {regimePerformance.length > 0 ? (
                    <div className="space-y-3">
                      {regimePerformance.map((r) => {
                        const regimeColor = r.regime === "wartime" ? "#ef4444" : r.regime === "transitional" ? "#f59e0b" : r.regime === "peacetime" ? "#10b981" : "#64748b";
                        return (
                          <div key={r.regime} className="rounded bg-navy-950/60 px-3 py-2.5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: regimeColor }}>
                                {r.regime}
                              </span>
                              <span className="text-[9px] text-navy-500 font-mono">n={r.total}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-[8px] text-navy-600 block">Accuracy</span>
                                <span className={`text-lg font-bold font-mono ${r.accuracy >= 60 ? "text-accent-emerald" : r.accuracy >= 40 ? "text-accent-amber" : "text-accent-rose"}`}>
                                  {r.accuracy}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-navy-600 block">Brier</span>
                                <span className={`text-lg font-bold font-mono ${r.brier < 0.2 ? "text-accent-emerald" : r.brier < 0.3 ? "text-accent-amber" : "text-accent-rose"}`}>
                                  {r.brier}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="h-2 rounded-full bg-navy-700/50 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${r.accuracy}%`, backgroundColor: regimeColor, opacity: 0.7 }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-48 rounded bg-navy-950/60 flex items-center justify-center text-navy-600 text-xs font-mono">
                      No regime data available
                    </div>
                  )}
                </div>

                {/* Direction vs Level Stats */}
                <div>
                  <SectionHeader
                    label="Direction vs Level"
                    icon={<ArrowUpRight className="h-3 w-3 text-accent-cyan" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Split scoring</span>}
                  />
                  <div className="space-y-3">
                    {/* Direction accuracy */}
                    <div className="rounded bg-navy-950/60 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Direction Calls</span>
                        <span className="text-[9px] text-navy-500 font-mono">n={directionStats.total}</span>
                      </div>
                      {directionStats.total > 0 ? (
                        <>
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl font-bold font-mono ${directionStats.rate >= 60 ? "text-accent-emerald" : directionStats.rate >= 50 ? "text-accent-amber" : "text-accent-rose"}`}>
                              {directionStats.rate}%
                            </span>
                            <span className="text-[10px] text-navy-500">{directionStats.correct}/{directionStats.total} correct</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-navy-700/50 overflow-hidden">
                            <div className={`h-full rounded-full ${directionStats.rate >= 60 ? "bg-accent-emerald" : directionStats.rate >= 50 ? "bg-accent-amber" : "bg-accent-rose"}`} style={{ width: `${directionStats.rate}%`, opacity: 0.7 }} />
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            {directionStats.rate >= 55 ? (
                              <ArrowUpRight className="h-3 w-3 text-accent-emerald" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-accent-rose" />
                            )}
                            <span className="text-[9px] text-navy-500">
                              {directionStats.rate >= 55 ? "Edge detected in directional calls" : "Below random on direction (needs work)"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-navy-600">No directional predictions resolved yet</span>
                      )}
                    </div>

                    {/* Level accuracy */}
                    <div className="rounded bg-navy-950/60 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Price Level Calls</span>
                        <span className="text-[9px] text-navy-500 font-mono">n={directionStats.levelTotal}</span>
                      </div>
                      {directionStats.levelTotal > 0 ? (
                        <>
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl font-bold font-mono ${directionStats.levelRate >= 50 ? "text-accent-emerald" : directionStats.levelRate >= 30 ? "text-accent-amber" : "text-accent-rose"}`}>
                              {directionStats.levelRate}%
                            </span>
                            <span className="text-[10px] text-navy-500">{directionStats.levelCorrect}/{directionStats.levelTotal} correct</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-navy-700/50 overflow-hidden">
                            <div className={`h-full rounded-full ${directionStats.levelRate >= 50 ? "bg-accent-emerald" : directionStats.levelRate >= 30 ? "bg-accent-amber" : "bg-accent-rose"}`} style={{ width: `${directionStats.levelRate}%`, opacity: 0.7 }} />
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-navy-600">No price target predictions resolved yet</span>
                      )}
                    </div>

                    {/* BIN decomposition summary */}
                    {feedbackReport?.bin && (
                      <div className="rounded bg-navy-950/60 px-3 py-2.5">
                        <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider block mb-2">BIN Decomposition</span>
                        <div className="space-y-1.5">
                          {[
                            { label: "Bias", value: feedbackReport.bin.bias, note: feedbackReport.bin.biasDirection, color: "#f43f5e" },
                            { label: "Information", value: feedbackReport.bin.information, note: "signal extraction", color: "#10b981" },
                            { label: "Noise", value: feedbackReport.bin.noise, note: "random scatter", color: "#f59e0b" },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2">
                              <span className="text-[9px] text-navy-500 w-16">{item.label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-navy-700/50 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(item.value * 400, 100)}%`, backgroundColor: item.color, opacity: 0.7 }} />
                              </div>
                              <span className="text-[9px] text-navy-400 font-mono w-12 text-right">{item.value.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] text-navy-600 mt-1.5">{feedbackReport.bin.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Row 4: Belief Revision Trail ── */}
              {beliefTrails.length > 0 && (
                <div>
                  <SectionHeader
                    label="Belief Revision Trail"
                    icon={<Eye className="h-3 w-3 text-accent-amber" />}
                    badge={<span className="text-[8px] text-navy-600 font-mono">Tetlock incremental updating</span>}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {beliefTrails.map((p) => {
                      const catConfig = CATEGORY_CONFIG[p.category];
                      const history = p.history;
                      const initialConf = p.confidence;
                      const latestConf = history.length > 0 ? history[history.length - 1].confidence : initialConf;
                      const shift = latestConf - initialConf;

                      // SVG sparkline for belief history
                      const allConfs = [initialConf, ...history.map((h) => h.confidence)];
                      const minC = Math.min(...allConfs) - 0.05;
                      const maxC = Math.max(...allConfs) + 0.05;
                      const range = maxC - minC || 0.1;
                      const w = 160;
                      const h = 28;
                      const points = allConfs.map((c, i) => {
                        const x = (i / (allConfs.length - 1 || 1)) * w;
                        const y = h - ((c - minC) / range) * h;
                        return `${x},${y}`;
                      }).join(" ");

                      return (
                        <div key={p.id} className="rounded bg-navy-950/60 px-3 py-2.5 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-navy-300 leading-snug truncate">{p.claim}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-mono uppercase ${catConfig?.color || "text-navy-400"}`}>{p.category}</span>
                              <span className="text-[8px] text-navy-600 font-mono">{history.length} updates</span>
                              <span className={`text-[8px] font-mono font-bold ${shift > 0 ? "text-accent-emerald" : shift < 0 ? "text-accent-rose" : "text-navy-400"}`}>
                                {shift > 0 ? "+" : ""}{(shift * 100).toFixed(1)}pp
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
                              <polyline points={points} fill="none" stroke={shift >= 0 ? "#10b981" : "#f43f5e"} strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
                              {allConfs.map((c, i) => (
                                <circle
                                  key={i}
                                  cx={(i / (allConfs.length - 1 || 1)) * w}
                                  cy={h - ((c - minC) / range) * h}
                                  r={i === 0 ? 2.5 : i === allConfs.length - 1 ? 2.5 : 1.5}
                                  fill={i === 0 ? "#64748b" : i === allConfs.length - 1 ? (shift >= 0 ? "#10b981" : "#f43f5e") : "#475569"}
                                />
                              ))}
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Row 5: Tail Risk Monitor ── */}
              {tailRisks.length > 0 && (
                <div>
                  <SectionHeader
                    label="Tail Risk Monitor"
                    icon={<AlertTriangle className="h-3 w-3 text-accent-rose" />}
                    badge={
                      <span className="text-[8px] text-signal-5 font-mono font-bold px-1.5 py-0.5 rounded bg-signal-5/10 border border-signal-5/20">
                        {tailRisks.length} ACTIVE
                      </span>
                    }
                  />
                  <p className="text-[9px] text-navy-600 mb-2">
                    Low-probability, high-impact pending predictions. These are the scenarios that blow up portfolios.
                  </p>
                  <div className="space-y-1.5">
                    {tailRisks.map((p) => {
                      const catConfig = CATEGORY_CONFIG[p.category];
                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/predictions/${p.uuid}`)}
                          className="flex items-center gap-3 rounded bg-navy-950/60 px-3 py-2 cursor-pointer hover:bg-navy-900/60 transition-colors border border-transparent hover:border-navy-700/30"
                        >
                          <div className="w-12 flex-shrink-0">
                            <div className="h-2 rounded-full bg-navy-700/50 overflow-hidden">
                              <div className="h-full rounded-full bg-accent-rose" style={{ width: `${p.confidence * 100}%`, opacity: 0.8 }} />
                            </div>
                            <span className="text-[9px] text-accent-rose font-mono font-bold block text-center mt-0.5">
                              {(p.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-navy-300 truncate">{p.claim}</p>
                          </div>
                          <span className={`text-[8px] font-mono uppercase ${catConfig?.color || "text-navy-400"}`}>{p.category}</span>
                          <span className="text-[9px] text-navy-500 font-mono flex-shrink-0">{daysUntil(p.deadline)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── Self-Learning Feedback ── */}
      {!loading && feedbackReport && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-accent-cyan" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-navy-400">
                Calibration Feedback
              </span>
              <span className={`text-[10px] font-mono ${feedbackReport.brierScore < 0.2 ? "text-accent-emerald" : feedbackReport.brierScore < 0.3 ? "text-accent-amber" : "text-accent-rose"}`}>
                Brier {feedbackReport.brierScore.toFixed(3)}
              </span>
              {!feedbackReport.sampleSufficient && (
                <span className="text-[9px] text-accent-amber font-mono">low sample</span>
              )}
              {feedbackReport.recentTrend && (
                <span className={`flex items-center gap-1 text-[10px] font-mono ${feedbackReport.recentTrend.improving ? "text-accent-emerald" : "text-accent-rose"}`}>
                  {feedbackReport.recentTrend.improving ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {feedbackReport.recentTrend.improving ? "improving" : "declining"}
                </span>
              )}
            </div>
            {feedbackOpen ? <ChevronDown className="h-3.5 w-3.5 text-navy-500" /> : <ChevronRight className="h-3.5 w-3.5 text-navy-500" />}
          </button>

          {feedbackOpen && (
            <div className="px-4 pb-4 space-y-4">
              {/* Scoring metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="rounded px-3 py-2 bg-navy-800/40">
                  <span className="text-[9px] text-navy-500 uppercase tracking-wider block">Brier Score</span>
                  <span className={`text-lg font-bold font-mono ${feedbackReport.brierScore < 0.2 ? "text-accent-emerald" : feedbackReport.brierScore < 0.25 ? "text-navy-100" : "text-accent-rose"}`}>
                    {feedbackReport.brierScore.toFixed(3)}
                  </span>
                  <span className="text-[9px] text-navy-600 block">
                    {feedbackReport.brierScore < 0.1 ? "excellent" : feedbackReport.brierScore < 0.2 ? "good" : feedbackReport.brierScore < 0.25 ? "baseline" : "poor"}
                  </span>
                </div>
                <div className="rounded px-3 py-2 bg-navy-800/40">
                  <span className="text-[9px] text-navy-500 uppercase tracking-wider block">Log Loss</span>
                  <span className="text-lg font-bold font-mono text-navy-100">{feedbackReport.logLoss.toFixed(3)}</span>
                </div>
                <div className="rounded px-3 py-2 bg-navy-800/40">
                  <span className="text-[9px] text-navy-500 uppercase tracking-wider block">Hit Rate</span>
                  <span className="text-lg font-bold text-navy-100">{(feedbackReport.binaryAccuracy * 100).toFixed(0)}%</span>
                </div>
                <div className="rounded px-3 py-2 bg-navy-800/40">
                  <span className="text-[9px] text-navy-500 uppercase tracking-wider block">Avg Confidence</span>
                  <span className="text-lg font-bold text-navy-100">{(feedbackReport.avgConfidence * 100).toFixed(0)}%</span>
                </div>
                <div className="rounded px-3 py-2 bg-navy-800/40">
                  <span className="text-[9px] text-navy-500 uppercase tracking-wider block">Calibration Gap</span>
                  <span className={`text-lg font-bold ${Math.abs(feedbackReport.calibrationGap) > 0.1 ? (feedbackReport.calibrationGap > 0 ? "text-accent-rose" : "text-accent-emerald") : "text-navy-100"}`}>
                    {feedbackReport.calibrationGap > 0 ? "+" : ""}{(feedbackReport.calibrationGap * 100).toFixed(0)}pp
                  </span>
                  <span className="text-[9px] text-navy-600 block">
                    {feedbackReport.calibrationGap > 0.1 ? "overconfident" : feedbackReport.calibrationGap < -0.1 ? "underconfident" : "well calibrated"}
                  </span>
                </div>
              </div>

              {/* Reliability diagram data */}
              {feedbackReport.calibration.filter((b) => b.count >= 1).length > 0 && (
                <div>
                  <h4 className="text-[9px] text-navy-500 uppercase tracking-wider mb-2">Reliability Diagram (Confidence vs Outcome)</h4>
                  <div className="space-y-1.5">
                    {feedbackReport.calibration.filter((b) => b.count >= 1).map((bucket) => {
                      const deviation = bucket.confirmedRate - bucket.midpoint;
                      return (
                        <div key={bucket.range} className={`flex items-center gap-3 overflow-x-auto ${!bucket.reliable ? "opacity-50" : ""}`}>
                          <span className="text-[10px] text-navy-400 w-32 flex-shrink-0 font-mono">{bucket.range}</span>
                          <div className="flex-1 h-2 rounded-full bg-navy-700/50 overflow-hidden relative">
                            <div className="absolute h-full w-px bg-navy-400/40" style={{ left: `${bucket.midpoint * 100}%` }} />
                            <div
                              className={`h-full rounded-full ${bucket.confirmedRate >= 0.6 ? "bg-accent-emerald" : bucket.confirmedRate >= 0.3 ? "bg-accent-amber" : "bg-accent-rose"}`}
                              style={{ width: `${Math.max(bucket.confirmedRate * 100, 2)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-navy-400 font-mono w-16 text-right">
                            {(bucket.confirmedRate * 100).toFixed(0)}% hit
                          </span>
                          <span className={`text-[10px] font-mono w-20 text-right ${Math.abs(deviation) > 0.15 ? (deviation > 0 ? "text-accent-emerald" : "text-accent-rose") : "text-navy-500"}`}>
                            {deviation > 0 ? "+" : ""}{(deviation * 100).toFixed(0)}pp
                          </span>
                          <span className={`text-[10px] font-mono w-10 text-right ${bucket.reliable ? "text-navy-500" : "text-navy-700"}`}>
                            n={bucket.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-navy-600 mt-1">Ideal: hit rate matches confidence band midpoint. Faded rows have n &lt; 3 (unreliable).</p>
                </div>
              )}

              {/* Category performance */}
              {feedbackReport.byCategory.length > 0 && (
                <div>
                  <h4 className="text-[9px] text-navy-500 uppercase tracking-wider mb-2">Category Brier Scores</h4>
                  <div className="space-y-1.5">
                    {feedbackReport.byCategory.map((cat) => {
                      const catConfig = CATEGORY_CONFIG[cat.category];
                      const quality = cat.brierScore < 0.2 ? "good" : cat.brierScore < 0.3 ? "moderate" : "poor";
                      return (
                        <div key={cat.category} className={`flex items-center gap-3 ${!cat.reliable ? "opacity-50" : ""}`}>
                          <span className={`text-[10px] w-20 font-mono ${catConfig?.color || "text-navy-400"}`}>{cat.category}</span>
                          <div className="flex-1 h-2 rounded-full bg-navy-700/50 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max((1 - cat.brierScore) * 100, 5)}%`,
                                backgroundColor: cat.brierScore < 0.2 ? "#10b981" : cat.brierScore < 0.3 ? "#f59e0b" : "#f43f5e",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-navy-400 font-mono w-24 text-right">
                            Brier {cat.brierScore.toFixed(3)}
                          </span>
                          <span className={`text-[10px] font-mono w-16 text-right ${cat.brierScore < 0.2 ? "text-accent-emerald" : cat.brierScore < 0.3 ? "text-accent-amber" : "text-accent-rose"}`}>
                            {quality}
                          </span>
                          <span className={`text-[10px] font-mono w-24 text-right ${Math.abs(cat.calibrationGap) > 0.15 ? (cat.calibrationGap > 0 ? "text-accent-rose" : "text-accent-emerald") : "text-navy-500"}`}>
                            {cat.calibrationGap > 0.15 ? `+${(cat.calibrationGap * 100).toFixed(0)}pp over` : cat.calibrationGap < -0.15 ? `${(cat.calibrationGap * 100).toFixed(0)}pp under` : "calibrated"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeframe performance */}
              {Object.keys(feedbackReport.timeframeAccuracy).length > 0 && (
                <div>
                  <h4 className="text-[9px] text-navy-500 uppercase tracking-wider mb-2">Timeframe Performance</h4>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(feedbackReport.timeframeAccuracy)
                      .sort(([, a], [, b]) => a.brierScore - b.brierScore)
                      .map(([tf, data]) => (
                      <div key={tf} className={`rounded px-2.5 py-1.5 bg-navy-800/40 border border-navy-700/20 ${!data.reliable ? "opacity-50" : ""}`}>
                        <span className="text-[10px] text-navy-400 font-mono block">{tf}</span>
                        <span className={`text-xs font-bold font-mono ${data.brierScore < 0.2 ? "text-accent-emerald" : data.brierScore < 0.3 ? "text-accent-amber" : "text-accent-rose"}`}>
                          {data.brierScore.toFixed(3)}
                        </span>
                        <span className="text-[9px] text-navy-500 ml-1">{(data.binaryAccuracy * 100).toFixed(0)}% hit</span>
                        <span className="text-[9px] text-navy-600 ml-1">n={data.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution bias */}
              {feedbackReport.resolutionBias.biasWarning && (
                <div className="rounded px-3 py-2 bg-accent-amber/5 border border-accent-amber/10">
                  <h4 className="text-[9px] text-accent-amber uppercase tracking-wider mb-1">Resolution Bias Detected</h4>
                  <p className="text-[10px] text-navy-400">{feedbackReport.resolutionBias.biasWarning}</p>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-[9px] text-navy-500 font-mono">LLM score: {(feedbackReport.resolutionBias.avgLlmScore * 100).toFixed(0)}%</span>
                    <span className="text-[9px] text-navy-500 font-mono">Binary accuracy: {(feedbackReport.resolutionBias.binaryAccuracy * 100).toFixed(0)}%</span>
                    <span className="text-[9px] text-navy-500 font-mono">Partial rate: {(feedbackReport.resolutionBias.partialRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}

              {/* Failure patterns */}
              {feedbackReport.failurePatterns.length > 0 && (
                <div>
                  <h4 className="text-[9px] text-accent-rose uppercase tracking-wider mb-2">Failure Patterns</h4>
                  <div className="space-y-2">
                    {feedbackReport.failurePatterns.map((fp, i) => (
                      <div key={i} className="rounded px-3 py-2 bg-accent-rose/5 border border-accent-rose/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-navy-200">{fp.pattern}</span>
                          <span className="text-[9px] text-navy-500 font-mono">{fp.frequency}x</span>
                        </div>
                        {fp.examples.map((ex, j) => (
                          <p key={j} className="text-[10px] text-navy-500 truncate">{ex}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent trend */}
              {feedbackReport.recentTrend && (
                <div className="flex items-center gap-3 pt-1 border-t border-navy-700/20">
                  {feedbackReport.recentTrend.improving ? (
                    <TrendingUp className="h-4 w-4 text-accent-emerald" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-accent-rose" />
                  )}
                  <span className="text-xs text-navy-300">
                    Last {feedbackReport.recentTrend.windowSize}: Brier <span className="font-mono font-bold">{feedbackReport.recentTrend.recentBrier.toFixed(3)}</span>
                    {" vs prior "}{feedbackReport.recentTrend.windowSize}{": "}
                    <span className="font-mono">{feedbackReport.recentTrend.priorBrier.toFixed(3)}</span>
                    <span className="text-navy-500 ml-1">(lower = better)</span>
                  </span>
                </div>
              )}

              <p className="text-[9px] text-navy-600 pt-1">
                Brier score and calibration data are fed into prediction generation with damped corrections to prevent oscillation.
                Scored using proper scoring rules (Brier, log-loss) with 60-day exponential decay weighting.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Summary metrics ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
            <Metric label="Total" value={predictions.length} />
          </div>
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
            <Metric label="Pending" value={pending.length} />
          </div>
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
            <Metric label="Hits" value={hits.length} change={resolved.length > 0 ? `${(accuracy * 100).toFixed(0)}%` : undefined} changeColor="green" />
          </div>
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
            <Metric label="Misses" value={misses.length} changeColor="red" />
          </div>
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
            <Metric label="Avg Score" value={resolved.length > 0 ? `${(avgScore * 100).toFixed(0)}%` : "--"} changeColor={avgScore >= 0.6 ? "green" : avgScore >= 0.4 ? "neutral" : "red"} />
          </div>
          <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
            <Metric label="Overdue" value={pastDeadline.length} change={pastDeadline.length > 0 ? "needs resolve" : undefined} changeColor={pastDeadline.length > 0 ? "red" : "neutral"} />
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      {!loading && predictions.length > 0 && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-52">
              <Input
                placeholder="Search predictions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 text-[11px]"
              />
            </div>

            {activeTab === "resolved" && (
              <div className="flex h-7 rounded-md border border-navy-700/30 overflow-x-auto max-w-full">
                <button
                  onClick={() => { setActiveOutcome(null); setCurrentPage(1); }}
                  className={`px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    activeOutcome === null ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                  }`}
                >
                  All
                </button>
                {(["confirmed", "denied", "partial"] as const).map((outcome) => {
                  const cfg = OUTCOME_CONFIG[outcome];
                  return (
                    <button
                      key={outcome}
                      onClick={() => { setActiveOutcome(activeOutcome === outcome ? null : outcome); setCurrentPage(1); }}
                      className={`px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors border-l border-navy-700/30 ${
                        activeOutcome === outcome ? `${cfg.bg} ${cfg.color}` : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-navy-500 uppercase tracking-wider">Conf:</span>
              <select
                value={confidenceRange[0]}
                onChange={(e) => setConfidenceRange([parseFloat(e.target.value), confidenceRange[1]])}
                className="h-7 bg-navy-900 border border-navy-700/30 rounded text-[10px] text-navy-300 px-1.5"
              >
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((v) => (
                  <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
                ))}
              </select>
              <span className="text-[9px] text-navy-600">to</span>
              <select
                value={confidenceRange[1]}
                onChange={(e) => setConfidenceRange([confidenceRange[0], parseFloat(e.target.value)])}
                className="h-7 bg-navy-900 border border-navy-700/30 rounded text-[10px] text-navy-300 px-1.5"
              >
                {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => (
                  <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-navy-500 uppercase tracking-wider">Deadline:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-7 bg-navy-900 border border-navy-700/30 rounded text-[10px] text-navy-300 px-1.5 w-[120px]"
                placeholder="From"
              />
              <span className="text-[9px] text-navy-600">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-7 bg-navy-900 border border-navy-700/30 rounded text-[10px] text-navy-300 px-1.5 w-[120px]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-navy-500 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "deadline" | "confidence" | "created")}
                className="h-7 bg-navy-900 border border-navy-700/30 rounded text-[10px] text-navy-300 px-1.5"
              >
                <option value="deadline">Deadline</option>
                <option value="confidence">Confidence</option>
                <option value="created">Newest</option>
              </select>
            </div>

            <div className="flex-1" />

            <span className="text-[9px] text-navy-600 font-mono">
              {activeList.length} {activeTab} / {predictions.length} total
            </span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[9px] text-accent-cyan hover:text-accent-cyan/80 underline">
                clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual form */}
      {showForm && (
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
          <div className="px-4 py-3 border-b border-navy-700/20">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">Manual Prediction</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Falsifiable Claim</label>
              <Input placeholder="S&P 500 will close above 5,200 by..." value={claim} onChange={(e) => setClaim(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="w-32">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Timeframe</label>
                <Input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
              </div>
              <div className="w-40">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Deadline</label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="w-28">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Confidence</label>
                <Input type="number" value={confidence} onChange={(e) => setConfidence(e.target.value)} min="0" max="1" step="0.05" />
              </div>
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Category</label>
                <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden w-fit">
                  {categories.map((cat, i) => (
                    <button key={cat} onClick={() => setCategory(cat)} className={`px-3 text-[10px] font-medium uppercase tracking-wider transition-colors ${i > 0 ? "border-l border-navy-700/30" : ""} ${category === cat ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"}`}>
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

      {/* ── Prediction cards ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {displayPending.length > 0 && (
            <div>
              <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 pb-2 border-b border-navy-700/20 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Pending ({displayPending.length})
                {resolving && <Loader2 className="h-3 w-3 animate-spin text-accent-cyan" />}
              </h2>
              <div className="space-y-2">
                {displayPending.map((p) => {
                  const overdue = p.deadline <= today;
                  const grounding = parseGrounding(p.metrics);
                  const catConfig = CATEGORY_CONFIG[p.category];
                  const CatIcon = catConfig?.icon || Globe;
                  const urgency = getUrgency(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/predictions/${p.uuid}`)}
                      className={`border rounded-md overflow-hidden transition-colors cursor-pointer hover:border-navy-600/60 ${overdue ? "border-accent-rose/20 bg-accent-rose/[0.03]" : "border-navy-700/30 bg-navy-900/60"}`}
                    >
                      {/* Urgency progress bar */}
                      <div className="h-1 w-full bg-navy-800/40">
                        <div
                          className={`h-full transition-all ${urgency.color}`}
                          style={{ width: `${urgency.progress * 100}%` }}
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <CatIcon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${catConfig?.color || "text-navy-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-navy-200 leading-snug">{p.claim}</p>
                              {grounding && <p className="text-[10px] text-navy-500 mt-1.5 italic">{grounding}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap ml-6 sm:ml-0">
                            {p.direction && (
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                p.direction === "up" ? "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20" :
                                p.direction === "down" ? "bg-accent-rose/10 text-accent-rose border border-accent-rose/20" :
                                "bg-navy-800/40 text-navy-400 border border-navy-700/20"
                              }`}>
                                {p.direction === "up" ? "LONG" : p.direction === "down" ? "SHORT" : "FLAT"}
                              </span>
                            )}
                            {confidenceBar(p.confidence)}
                            <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${catConfig?.border || ""} ${catConfig?.bg || ""} ${catConfig?.color || ""}`}>
                              {p.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2.5 ml-6">
                          <span className="text-[10px] text-navy-500 font-mono">
                            {new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          {/* Urgency badge */}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                            urgency.level === "overdue" ? "bg-signal-5/15 text-signal-5" :
                            urgency.level === "critical" ? "bg-signal-5/15 text-signal-5" :
                            urgency.level === "urgent" ? "bg-accent-rose/10 text-accent-rose" :
                            urgency.level === "soon" ? "bg-accent-amber/10 text-accent-amber" :
                            "bg-navy-800/40 text-navy-400"
                          }`}>
                            {(urgency.level === "overdue" || urgency.level === "critical") && <AlertTriangle className="h-2.5 w-2.5" />}
                            {urgency.level === "urgent" && <Zap className="h-2.5 w-2.5" />}
                            {urgency.level === "soon" && <Clock className="h-2.5 w-2.5" />}
                            {urgency.label}
                          </span>
                          <span className="text-[10px] text-navy-600 font-mono">{p.timeframe}</span>
                          {p.regimeAtCreation && (
                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                              p.regimeAtCreation === "wartime" ? "bg-accent-rose/10 text-accent-rose" :
                              p.regimeAtCreation === "transitional" ? "bg-accent-amber/10 text-accent-amber" :
                              "bg-accent-emerald/10 text-accent-emerald"
                            }`}>
                              {p.regimeAtCreation}
                            </span>
                          )}
                          {commentCounts[p.id] > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-mono text-navy-500">
                              <MessageSquare className="h-3 w-3" />
                              {commentCounts[p.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resolved */}
          {displayResolved.length > 0 && (
            <div>
              <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-3 pb-2 border-b border-navy-700/20 flex items-center gap-2">
                <Target className="h-3 w-3" />
                Resolved ({displayResolved.length})
              </h2>
              <div className="space-y-2">
                {displayResolved.map((p) => {
                  const config = OUTCOME_CONFIG[p.outcome || "expired"] || OUTCOME_CONFIG.expired;
                  const Icon = config.icon;
                  const grounding = parseGrounding(p.metrics);
                  const catConfig = CATEGORY_CONFIG[p.category];
                  const isHit = p.outcome === "confirmed";
                  const isMiss = p.outcome === "denied";
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/predictions/${p.uuid}`)}
                      className={`border rounded-md overflow-hidden cursor-pointer hover:border-navy-600/60 transition-colors ${config.border} ${config.bg}`}
                    >
                      <div className="flex">
                        <div className={`w-14 flex-shrink-0 flex flex-col items-center justify-center gap-1 ${
                          isHit ? "bg-accent-emerald/15" : isMiss ? "bg-accent-rose/15" : p.outcome === "partial" ? "bg-accent-amber/15" : "bg-navy-800/30"
                        }`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <span className={`text-[9px] font-bold font-mono uppercase tracking-widest ${config.color}`}>
                            {config.label}
                          </span>
                          {p.score != null && (
                            <span className={`text-xs font-bold font-mono ${p.score >= 0.7 ? "text-accent-emerald" : p.score >= 0.4 ? "text-accent-amber" : "text-accent-rose"}`}>
                              {(p.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <div className="flex-1 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-navy-200 leading-snug">{p.claim}</p>
                              {p.outcomeNotes && <p className="text-[10px] text-navy-400 mt-1.5 leading-relaxed">{p.outcomeNotes}</p>}
                              {grounding && !p.outcomeNotes && <p className="text-[10px] text-navy-500 mt-1.5 italic">{grounding}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              {p.direction && (
                                <div className="flex items-center gap-1">
                                  <span className={`text-[9px] font-mono font-bold ${
                                    p.direction === "up" ? "text-accent-emerald" : p.direction === "down" ? "text-accent-rose" : "text-navy-400"
                                  }`}>
                                    {p.direction === "up" ? "LONG" : p.direction === "down" ? "SHORT" : "FLAT"}
                                  </span>
                                  {p.directionCorrect !== null && (
                                    <span className={`text-[8px] font-mono ${p.directionCorrect === 1 ? "text-accent-emerald" : "text-accent-rose"}`}>
                                      {p.directionCorrect === 1 ? "OK" : "WRONG"}
                                    </span>
                                  )}
                                </div>
                              )}
                              {confidenceBar(p.confidence)}
                              <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${catConfig?.border || ""} ${catConfig?.bg || ""} ${catConfig?.color || ""}`}>
                                {p.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                            <span className="text-[10px] text-navy-500 font-mono">Deadline: {new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            {p.resolvedAt && <span className="text-[10px] text-navy-600 font-mono">Resolved: {new Date(p.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            {p.regimeAtCreation && (
                              <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                                p.regimeAtCreation === "wartime" ? "bg-accent-rose/10 text-accent-rose" :
                                p.regimeAtCreation === "transitional" ? "bg-accent-amber/10 text-accent-amber" :
                                "bg-accent-emerald/10 text-accent-emerald"
                              }`}>
                                {p.regimeAtCreation}
                              </span>
                            )}
                            {p.regimeInvalidated === 1 && (
                              <span className="text-[9px] font-mono text-navy-500 px-1 py-0.5 rounded bg-navy-800/40">regime invalidated</span>
                            )}
                            {commentCounts[p.id] > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] font-mono text-navy-500">
                                <MessageSquare className="h-3 w-3" />
                                {commentCounts[p.id]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {predictions.length === 0 && (
            <div className="text-center py-12 text-navy-500">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-navy-600" />
              <p className="text-sm">No predictions yet.</p>
              <p className="text-xs mt-1">Click Generate to create AI predictions from the current intelligence picture.</p>
            </div>
          )}
        </div>
      )}

      {/* Polling indicator */}
      <div className="fixed bottom-4 right-4 text-[9px] text-navy-600 font-mono flex items-center gap-1">
        <span className="inline-block w-1 h-1 rounded-full bg-accent-emerald/50 animate-pulse" />
        live
      </div>
      </UpgradeGate>
    </PageContainer>
  );
}
