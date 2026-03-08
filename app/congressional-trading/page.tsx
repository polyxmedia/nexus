"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Users,
  Building2,
  AlertTriangle,
  Brain,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Copy,
  X,
  Loader2,
  ChevronRight,
  Shield,
  ExternalLink,
} from "lucide-react";

// ── Types ──

interface CongressionalTrade {
  id: string;
  name: string;
  chamber: "senate" | "house";
  party?: string;
  state?: string;
  ticker: string;
  asset: string;
  transactionType: "purchase" | "sale" | "exchange";
  amount: string;
  transactionDate: string;
  filingDate: string;
  owner: string;
  comment?: string;
  excessReturn?: number;
  bioguideId?: string;
}

interface ClusterBuy {
  ticker: string;
  company: string;
  insiders: Array<{ name: string; title: string; shares: number; date: string }>;
  totalShares: number;
  totalValue: number;
  windowDays: number;
  significance: "high" | "medium" | "low";
}

interface Snapshot {
  congressional: {
    recent: CongressionalTrade[];
    topBuys: CongressionalTrade[];
    topSells: CongressionalTrade[];
    byParty: { democrat: number; republican: number; independent: number };
    byChamber: { senate: number; house: number };
  };
  insider: {
    recent: Array<{ insider: string; company: string; ticker: string; transactionType: string; shares: number; transactionDate: string; filingDate: string }>;
    clusterBuys: ClusterBuy[];
    buyRatio: number;
    topSectors: Array<{ sector: string; buys: number; sells: number }>;
  };
  lastUpdated: string;
}

interface AIAnalysis {
  headline: string;
  sentiment: "bullish" | "bearish" | "mixed";
  keyFindings: string[];
  potentialConflicts: string[];
  sectorFocus: string[];
  riskFlags: string[];
  outlook: string;
}

interface ConflictAnalysis {
  member: string;
  party: string;
  chamber: string;
  totalTrades: number;
  riskScore: number;
  committees: string[];
  conflicts: Array<{
    ticker: string;
    type: string;
    severity: "high" | "medium" | "low";
    explanation: string;
  }>;
  tradingPattern: string;
  notableFindings: string[];
  disclaimer: string;
}

// ── Helpers ──

function partyColor(party?: string): string {
  const p = (party || "").toLowerCase();
  if (p.includes("democrat") || p === "d") return "text-blue-400";
  if (p.includes("republican") || p === "r") return "text-red-400";
  return "text-navy-400";
}

function partyBg(party?: string): string {
  const p = (party || "").toLowerCase();
  if (p.includes("democrat") || p === "d") return "bg-blue-500/10 border-blue-500/20";
  if (p.includes("republican") || p === "r") return "bg-red-500/10 border-red-500/20";
  return "bg-navy-800/40 border-navy-700/20";
}

function partyLabel(party?: string): string {
  const p = (party || "").toLowerCase();
  if (p.includes("democrat") || p === "d") return "D";
  if (p.includes("republican") || p === "r") return "R";
  return "I";
}

function formatDate(d: string): string {
  if (!d) return "N/A";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

function bioguidePhoto(bioguideId?: string): string | null {
  if (!bioguideId) return null;
  return `https://bioguide.congress.gov/bioguide/photo/${bioguideId[0]}/${bioguideId}.jpg`;
}

const TABS = [
  { key: "recent", label: "Recent Trades" },
  { key: "buys", label: "Top Buys" },
  { key: "sells", label: "Top Sells" },
  { key: "clusters", label: "Cluster Buys" },
  { key: "insiders", label: "Insider Filings" },
] as const;

// ── Member Avatar ──

function MemberAvatar({ name, bioguideId, party, size = "sm" }: { name: string; bioguideId?: string; party?: string; size?: "sm" | "md" }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = bioguidePhoto(bioguideId);
  const sizeClass = size === "md" ? "w-10 h-10" : "w-7 h-7";

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border ${
          partyLabel(party) === "D" ? "border-blue-500/40" : partyLabel(party) === "R" ? "border-red-500/40" : "border-navy-600/40"
        }`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className={`${sizeClass} rounded-full flex items-center justify-center border text-[10px] font-mono font-bold ${partyBg(party)} ${partyColor(party)}`}>
      {partyLabel(party)}
    </span>
  );
}

// ── AI Analysis Panel ──

function AnalysisPanel() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/congressional-trading/analyze");
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
      setExpanded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sentimentColor = analysis?.sentiment === "bullish" ? "text-accent-emerald" : analysis?.sentiment === "bearish" ? "text-accent-rose" : "text-accent-amber";
  const sentimentIcon = analysis?.sentiment === "bullish" ? <TrendingUp className="h-3.5 w-3.5" /> : analysis?.sentiment === "bearish" ? <TrendingDown className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />;

  if (!analysis && !loading) {
    return (
      <button
        onClick={fetchAnalysis}
        className="w-full mb-5 flex items-center gap-3 px-4 py-3 rounded-md bg-navy-900/40 hover:bg-navy-900/60 border border-navy-700/20 hover:border-accent-cyan/20 transition-all group"
      >
        <Brain className="h-4 w-4 text-accent-cyan opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-navy-400 group-hover:text-navy-200 transition-colors">
          Generate AI Analysis
        </span>
        <ChevronRight className="h-3 w-3 text-navy-600 ml-auto group-hover:text-accent-cyan transition-colors" />
      </button>
    );
  }

  if (loading) {
    return (
      <div className="mb-5 flex items-center gap-3 px-4 py-4 rounded-md bg-navy-900/40 border border-navy-700/20">
        <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
        <span className="text-[11px] font-mono text-navy-400">Analyzing congressional trading patterns...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-md bg-accent-rose/5 border border-accent-rose/20">
        <AlertTriangle className="h-4 w-4 text-accent-rose" />
        <span className="text-[11px] text-accent-rose">{error}</span>
        <button onClick={fetchAnalysis} className="ml-auto text-[10px] font-mono text-navy-400 hover:text-navy-200">Retry</button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="mb-5 rounded-md bg-navy-900/40 border border-navy-700/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-navy-800/20 transition-colors"
      >
        <Brain className="h-4 w-4 text-accent-cyan" />
        <span className="text-[11px] font-semibold text-navy-200 flex-1 text-left">{analysis.headline}</span>
        <span className={`flex items-center gap-1 text-[10px] font-mono uppercase ${sentimentColor}`}>
          {sentimentIcon}
          {analysis.sentiment}
        </span>
        <ChevronRight className={`h-3 w-3 text-navy-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-navy-700/10 pt-3">
          {/* Key Findings */}
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Key Findings</span>
            <div className="space-y-1">
              {analysis.keyFindings.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-accent-cyan text-[8px] mt-1">&#9654;</span>
                  <span className="text-[11px] text-navy-300 leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Risk Flags */}
            {analysis.riskFlags.length > 0 && (
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Risk Flags</span>
                {analysis.riskFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <AlertTriangle className="h-2.5 w-2.5 text-accent-amber mt-0.5 shrink-0" />
                    <span className="text-[10px] text-navy-400 leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Conflicts */}
            {analysis.potentialConflicts.length > 0 && (
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Potential Conflicts</span>
                {analysis.potentialConflicts.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <Shield className="h-2.5 w-2.5 text-accent-rose mt-0.5 shrink-0" />
                    <span className="text-[10px] text-navy-400 leading-snug">{c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sector Focus */}
            {analysis.sectorFocus.length > 0 && (
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Sector Focus</span>
                <div className="flex flex-wrap gap-1">
                  {analysis.sectorFocus.map((s, i) => (
                    <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-navy-800/60 text-navy-400">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outlook */}
          <div className="pt-1 border-t border-navy-700/10">
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Outlook</span>
            <span className="text-[11px] text-navy-300">{analysis.outlook}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline Conflict Analysis Panel ──

function ConflictPanel({ memberName, onClose }: { memberName: string; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/congressional-trading/conflict?member=${encodeURIComponent(memberName)}`);
        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAnalysis(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [memberName]);

  return (
    <div className="col-span-12 bg-navy-900/50 border-b border-navy-700/20 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-accent-cyan" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Conflict of Interest Analysis</span>
          <span className="text-[11px] font-semibold text-navy-200">{memberName}</span>
        </div>
        <button onClick={onClose} className="p-1 text-navy-500 hover:text-navy-200 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-6">
          <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
          <span className="text-[11px] font-mono text-navy-400">Investigating trading patterns...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-4">
          <AlertTriangle className="h-4 w-4 text-accent-rose" />
          <span className="text-[11px] text-accent-rose">{error}</span>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Header Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-navy-800/40 rounded-md p-2.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Risk Score</span>
              <span className={`text-xl font-mono font-bold ${
                analysis.riskScore >= 7 ? "text-accent-rose" : analysis.riskScore >= 4 ? "text-accent-amber" : "text-accent-emerald"
              }`}>{analysis.riskScore}/10</span>
            </div>
            <div className="bg-navy-800/40 rounded-md p-2.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Total Trades</span>
              <span className="text-xl font-mono font-bold text-navy-100">{analysis.totalTrades}</span>
            </div>
            <div className="bg-navy-800/40 rounded-md p-2.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Party</span>
              <span className={`text-sm font-mono font-bold ${partyColor(analysis.party)}`}>{analysis.party}</span>
            </div>
            <div className="bg-navy-800/40 rounded-md p-2.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Chamber</span>
              <span className="text-sm font-mono text-navy-200 capitalize">{analysis.chamber}</span>
            </div>
          </div>

          {/* Committees */}
          {analysis.committees.length > 0 && (
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Committee Assignments</span>
              <div className="flex flex-wrap gap-1.5">
                {analysis.committees.map((c, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800/60 text-navy-300 border border-navy-700/20">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Trading Pattern */}
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Trading Pattern</span>
            <p className="text-[11px] text-navy-300 leading-relaxed">{analysis.tradingPattern}</p>
          </div>

          {/* Conflicts + Notable Findings side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Conflicts */}
            {analysis.conflicts.length > 0 && (
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-2">Identified Conflicts</span>
                <div className="space-y-2">
                  {analysis.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className={`rounded-md p-2.5 border ${
                        c.severity === "high" ? "border-accent-rose/30 bg-accent-rose/5" :
                        c.severity === "medium" ? "border-accent-amber/30 bg-accent-amber/5" :
                        "border-navy-700/20 bg-navy-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono text-accent-cyan font-bold">{c.ticker}</span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          c.severity === "high" ? "bg-accent-rose/20 text-accent-rose" :
                          c.severity === "medium" ? "bg-accent-amber/20 text-accent-amber" :
                          "bg-navy-800 text-navy-400"
                        }`}>{c.severity}</span>
                        <span className="text-[9px] font-mono text-navy-500">{c.type.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-[10px] text-navy-400 leading-relaxed">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notable Findings */}
            {analysis.notableFindings.length > 0 && (
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Notable Findings</span>
                {analysis.notableFindings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="text-accent-amber text-[8px] mt-1">&#9654;</span>
                    <span className="text-[10px] text-navy-300 leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="pt-2 border-t border-navy-700/10">
            <p className="text-[9px] text-navy-600 italic">{analysis.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──

export default function CongressionalTradingPage() {
  const router = useRouter();
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("recent");
  const [search, setSearch] = useState("");
  const [chamberFilter, setChamberFilter] = useState<"all" | "senate" | "house">("all");
  const [partyFilter, setPartyFilter] = useState<"all" | "D" | "R">("all");
  const [conflictMember, setConflictMember] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/congressional-trading");
        const json = await res.json();
        setData(json);
      } catch { setData(null); }
      finally { setLoading(false); }
    }
    load();
    pollRef.current = setInterval(load, 300_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const copyTrade = useCallback((ticker: string, type: "purchase" | "sale" | "exchange") => {
    // Navigate to trading page with the ticker pre-filled
    const side = type === "purchase" ? "BUY" : "SELL";
    router.push(`/trading?symbol=${ticker}&side=${side}`);
  }, [router]);

  if (loading) {
    return (
      <PageContainer title="Congressional Trading" subtitle="STOCK Act + SEC Form 4 disclosures">
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded" />)}
        </div>
      </PageContainer>
    );
  }

  const hasCongressData = (data?.congressional?.recent?.length || 0) > 0;
  const hasInsiderData = (data?.insider?.recent?.length || 0) > 0;

  if (!hasCongressData && !hasInsiderData) {
    return (
      <PageContainer title="Congressional Trading" subtitle="STOCK Act + SEC Form 4 disclosures">
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-6 text-center">
          <p className="text-sm text-navy-300 mb-2">No trading data available</p>
          <p className="text-xs text-navy-500 max-w-md mx-auto leading-relaxed">
            Congressional trading data is fetched from public sources. Data may be temporarily unavailable if the upstream APIs are down.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Filter trades
  const filterTrade = (t: CongressionalTrade) => {
    if (chamberFilter !== "all" && t.chamber !== chamberFilter) return false;
    if (partyFilter !== "all" && partyLabel(t.party) !== partyFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.name.toLowerCase().includes(s) || t.ticker.toLowerCase().includes(s) || t.asset.toLowerCase().includes(s);
    }
    return true;
  };

  const trades = tab === "buys" ? (data?.congressional.topBuys || [])
    : tab === "sells" ? (data?.congressional.topSells || [])
    : (data?.congressional.recent || []);

  const filteredTrades = trades.filter(filterTrade);

  const totalD = data?.congressional.byParty.democrat || 0;
  const totalR = data?.congressional.byParty.republican || 0;
  const totalI = data?.congressional.byParty.independent || 0;
  const senateCount = data?.congressional.byChamber.senate || 0;
  const houseCount = data?.congressional.byChamber.house || 0;
  const buyRatio = data?.insider.buyRatio ?? 0.5;

  return (
    <PageContainer
      title="Congressional Trading"
      subtitle="STOCK Act disclosures and SEC Form 4 insider filings"
    >
      {/* AI Analysis */}
      <AnalysisPanel />

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Senate Filings</span>
          <span className="text-xl font-mono font-bold text-navy-100">{senateCount}</span>
        </div>
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">House Filings</span>
          <span className="text-xl font-mono font-bold text-navy-100">{houseCount}</span>
        </div>
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Party Breakdown</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-blue-400">D:{totalD}</span>
            <span className="text-sm font-mono text-red-400">R:{totalR}</span>
            {totalI > 0 && <span className="text-sm font-mono text-navy-400">I:{totalI}</span>}
          </div>
        </div>
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Insider Buy Ratio</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xl font-mono font-bold ${buyRatio > 0.5 ? "text-accent-emerald" : "text-accent-rose"}`}>
              {(buyRatio * 100).toFixed(0)}%
            </span>
            <div className="flex-1 h-2 bg-navy-700/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${buyRatio > 0.5 ? "bg-accent-emerald/60" : "bg-accent-rose/60"}`}
                style={{ width: `${buyRatio * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Cluster Alerts</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-mono font-bold text-accent-amber">{data?.insider.clusterBuys.length || 0}</span>
            {(data?.insider.clusterBuys || []).some(c => c.significance === "high") && (
              <AlertTriangle className="h-4 w-4 text-accent-rose" />
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
                tab === t.key
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "clusters" && tab !== "insiders" && (
          <div className="flex items-center gap-2 ml-auto">
            {/* Chamber filter */}
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-navy-500" />
              {(["all", "senate", "house"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChamberFilter(c)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase rounded transition-colors ${
                    chamberFilter === c ? "bg-navy-800 text-navy-200" : "text-navy-500 hover:text-navy-300"
                  }`}
                >
                  {c === "all" ? "Both" : c === "senate" ? "SEN" : "HSE"}
                </button>
              ))}
            </div>

            {/* Party filter */}
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-navy-500" />
              {(["all", "D", "R"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPartyFilter(p)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase rounded transition-colors ${
                    partyFilter === p
                      ? p === "D" ? "bg-blue-500/20 text-blue-400" : p === "R" ? "bg-red-500/20 text-red-400" : "bg-navy-800 text-navy-200"
                      : "text-navy-500 hover:text-navy-300"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or ticker..."
                className="pl-7 pr-3 py-1.5 w-48 rounded bg-navy-800/60 text-xs text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Congressional Trades Table */}
      {(tab === "recent" || tab === "buys" || tab === "sells") && (
        <div className="border border-navy-700/30 rounded-md overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy-800/40 border-b border-navy-700/20">
            <span className="col-span-3 text-[9px] font-mono uppercase tracking-wider text-navy-500">Member</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Ticker</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Type</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">Amount</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Trade Date</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Filed</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Chamber</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Actions</span>
          </div>

          {filteredTrades.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-navy-500">No trades match your filters.</div>
          )}

          {filteredTrades.slice(0, 100).map((t, i) => {
            const isAnalyzing = conflictMember === t.name;
            return (
              <div key={t.id || i}>
                <div
                  className={`grid grid-cols-12 gap-2 px-4 py-2 border-b border-navy-700/10 hover:bg-navy-800/20 transition-colors group ${isAnalyzing ? "bg-navy-800/20" : ""}`}
                >
                  {/* Member with photo */}
                  <div className="col-span-3 flex items-center gap-2">
                    <MemberAvatar name={t.name} bioguideId={t.bioguideId} party={t.party} />
                    <div className="min-w-0">
                      <button
                        onClick={() => setConflictMember(isAnalyzing ? null : t.name)}
                        className={`text-[11px] transition-colors block truncate text-left ${isAnalyzing ? "text-accent-cyan" : "text-navy-200 hover:text-accent-cyan"}`}
                        title={`Analyze ${t.name} for conflicts of interest`}
                      >
                        {t.name}
                      </button>
                      {t.state && <span className="text-[9px] text-navy-500">{t.state}</span>}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-[11px] font-mono text-accent-cyan font-bold">{t.ticker}</span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`text-[10px] font-mono uppercase font-bold ${
                      t.transactionType === "purchase" ? "text-accent-emerald" : t.transactionType === "sale" ? "text-accent-rose" : "text-navy-400"
                    }`}>
                      {t.transactionType === "purchase" ? "BUY" : t.transactionType === "sale" ? "SELL" : "XCHG"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-[10px] font-mono text-navy-300">{t.amount}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="text-[10px] font-mono text-navy-400">{formatDate(t.transactionDate)}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="text-[10px] font-mono text-navy-500">{formatDate(t.filingDate)}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      t.chamber === "senate" ? "bg-purple-900/30 text-purple-400" : "bg-navy-800/60 text-navy-400"
                    }`}>
                      {t.chamber === "senate" ? "SEN" : "HSE"}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyTrade(t.ticker, t.transactionType)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-navy-100 text-navy-950 text-[9px] font-mono uppercase font-medium hover:bg-white transition-colors"
                      title={`Copy trade: ${t.transactionType === "purchase" ? "Buy" : "Sell"} ${t.ticker}`}
                    >
                      <Copy className="h-2.5 w-2.5" />
                      Copy Trade
                    </button>
                    <button
                      onClick={() => setConflictMember(isAnalyzing ? null : t.name)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono uppercase transition-colors ${
                        isAnalyzing
                          ? "bg-accent-cyan/10 text-accent-cyan"
                          : "bg-navy-800/60 text-navy-400 hover:bg-navy-800 hover:text-navy-200"
                      }`}
                      title="Analyze for conflicts"
                    >
                      <Shield className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
                {/* Inline conflict analysis */}
                {isAnalyzing && (
                  <ConflictPanel memberName={t.name} onClose={() => setConflictMember(null)} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cluster Buys */}
      {tab === "clusters" && (
        <div className="space-y-3">
          {(data?.insider.clusterBuys || []).length === 0 && (
            <div className="border border-navy-700/30 rounded-md p-8 text-center text-sm text-navy-500">
              No cluster buys detected in recent filings.
            </div>
          )}
          {(data?.insider.clusterBuys || []).map((c, i) => {
            const sigColor = c.significance === "high" ? "border-accent-rose/40 bg-accent-rose/5"
              : c.significance === "medium" ? "border-accent-amber/40 bg-accent-amber/5"
              : "border-navy-700/30 bg-navy-900/60";
            const sigText = c.significance === "high" ? "text-accent-rose" : c.significance === "medium" ? "text-accent-amber" : "text-navy-400";

            return (
              <div key={i} className={`border rounded-md p-4 ${sigColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono text-accent-cyan font-bold">{c.ticker}</span>
                    <span className="text-sm text-navy-300">{c.company}</span>
                    <button
                      onClick={() => copyTrade(c.ticker, "purchase")}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-navy-100 text-navy-950 text-[9px] font-mono uppercase font-medium hover:bg-white transition-colors"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      Copy Trade
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase font-bold ${sigText}`}>{c.significance} significance</span>
                    <span className="text-[10px] font-mono text-navy-500">{c.windowDays}d window</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div>
                    <span className="text-[9px] text-navy-500 block">Insiders</span>
                    <span className="text-sm font-mono text-navy-200 font-bold">{c.insiders.length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-navy-500 block">Total Shares</span>
                    <span className="text-sm font-mono text-navy-200">{c.totalShares.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-navy-500 block">Total Value</span>
                    <span className="text-sm font-mono text-navy-200">${c.totalValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Participants</span>
                  {c.insiders.map((ins, j) => (
                    <div key={j} className="flex items-center justify-between py-1 border-t border-navy-700/10">
                      <div>
                        <span className="text-[11px] text-navy-200">{ins.name}</span>
                        {ins.title && <span className="text-[9px] text-navy-500 ml-2">{ins.title}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-navy-300">{ins.shares.toLocaleString()} shares</span>
                        <span className="text-[10px] font-mono text-navy-500">{formatDate(ins.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insider Filings */}
      {tab === "insiders" && (
        <div className="border border-navy-700/30 rounded-md overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy-800/40 border-b border-navy-700/20">
            <span className="col-span-3 text-[9px] font-mono uppercase tracking-wider text-navy-500">Insider</span>
            <span className="col-span-3 text-[9px] font-mono uppercase tracking-wider text-navy-500">Company</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Ticker</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Type</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Shares</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Trade Date</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Filed</span>
          </div>

          {(data?.insider.recent || []).length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-navy-500">No recent insider filings available.</div>
          )}

          {(data?.insider.recent || []).map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-navy-700/10 hover:bg-navy-800/20 transition-colors">
              <div className="col-span-3 flex items-center">
                <span className="text-[11px] text-navy-200">{t.insider}</span>
              </div>
              <div className="col-span-3 flex items-center">
                <span className="text-[11px] text-navy-300">{t.company}</span>
              </div>
              <div className="col-span-1 flex items-center">
                <span className="text-[11px] font-mono text-accent-cyan font-bold">{t.ticker || "--"}</span>
              </div>
              <div className="col-span-1 flex items-center">
                <span className={`text-[10px] font-mono uppercase font-bold ${
                  t.transactionType === "purchase" ? "text-accent-emerald" : "text-accent-rose"
                }`}>
                  {t.transactionType === "purchase" ? "BUY" : "SELL"}
                </span>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <span className="text-[10px] font-mono text-navy-300">{t.shares ? t.shares.toLocaleString() : "--"}</span>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <span className="text-[10px] font-mono text-navy-400">{formatDate(t.transactionDate)}</span>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <span className="text-[10px] font-mono text-navy-500">{formatDate(t.filingDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </PageContainer>
  );
}
