"use client";

import { useEffect, useState, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Users, Building2, AlertTriangle } from "lucide-react";

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

const TABS = [
  { key: "recent", label: "Recent Trades" },
  { key: "buys", label: "Top Buys" },
  { key: "sells", label: "Top Sells" },
  { key: "clusters", label: "Cluster Buys" },
  { key: "insiders", label: "Insider Filings" },
] as const;

// ── Page ──

export default function CongressionalTradingPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("recent");
  const [search, setSearch] = useState("");
  const [chamberFilter, setChamberFilter] = useState<"all" | "senate" | "house">("all");
  const [partyFilter, setPartyFilter] = useState<"all" | "D" | "R">("all");
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
    pollRef.current = setInterval(load, 300_000); // refresh every 5 min
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (loading) {
    return (
      <PageContainer title="Congressional Trading" subtitle="STOCK Act + SEC Form 4 disclosures">
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded" />)}
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
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-colors ${
                tab === t.key
                  ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                  : "border-navy-700/30 text-navy-500 hover:text-navy-300 hover:border-navy-600/40"
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
                className="pl-7 pr-3 py-1.5 w-48 rounded border border-navy-700/40 bg-navy-800/60 text-xs text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40"
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
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Party</span>
            <span className="col-span-3 text-[9px] font-mono uppercase tracking-wider text-navy-500">Name</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Ticker</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Type</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">Amount</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Owner</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Trade Date</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Filed</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Chamber</span>
          </div>

          {filteredTrades.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-navy-500">No trades match your filters.</div>
          )}

          {filteredTrades.slice(0, 100).map((t, i) => (
            <div
              key={t.id || i}
              className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-navy-700/10 hover:bg-navy-800/20 transition-colors"
            >
              <div className="col-span-1 flex items-center">
                <span className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center border ${partyBg(t.party)} ${partyColor(t.party)}`}>
                  {partyLabel(t.party)}
                </span>
              </div>
              <div className="col-span-3 flex items-center">
                <div>
                  <span className="text-[11px] text-navy-200 block">{t.name}</span>
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
              <div className="col-span-1 flex items-center">
                <span className="text-[10px] text-navy-400">{t.owner}</span>
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
            </div>
          ))}
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
                  <div>
                    <span className="text-lg font-mono text-accent-cyan font-bold">{c.ticker}</span>
                    <span className="text-sm text-navy-300 ml-3">{c.company}</span>
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
