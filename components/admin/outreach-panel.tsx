"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  Target,
  Trash2,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Prospect {
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  followers: number;
  score: number;
  tags: string[];
  status: string;
  engagedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface OutreachData {
  total: number;
  byStatus: Record<string, number>;
  topProspects: Prospect[];
  recentlyEngaged: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  discovered: { label: "Discovered", color: "text-navy-400", bg: "bg-navy-800/40" },
  engaged: { label: "Engaged", color: "text-accent-cyan", bg: "bg-accent-cyan/10" },
  replied: { label: "Replied", color: "text-accent-emerald", bg: "bg-accent-emerald/10" },
  visited: { label: "Visited", color: "text-accent-amber", bg: "bg-accent-amber/10" },
  converted: { label: "Converted", color: "text-accent-emerald", bg: "bg-accent-emerald/15" },
  ignored: { label: "Ignored", color: "text-navy-600", bg: "bg-navy-900/40" },
};

export function OutreachPanel() {
  const [data, setData] = useState<OutreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outreach");
      const json = await res.json();
      setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover" }),
      });
      const result = await res.json();
      if (result.discovered > 0 || result.updated > 0) fetchData();
    } catch { /* silent */ }
    finally { setDiscovering(false); }
  };

  const updateStatus = async (id: number, status: string, notes?: string) => {
    await fetch("/api/admin/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status, notes }),
    });
    fetchData();
  };

  const deleteProspect = async (id: number) => {
    await fetch("/api/admin/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchData();
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-4 w-4 animate-spin inline-block text-navy-500" /></div>;
  if (!data) return <div className="py-12 text-center text-xs text-navy-500">Failed to load outreach data</div>;

  const filtered = data.topProspects
    .filter((p) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.username.toLowerCase().includes(q) || (p.bio?.toLowerCase().includes(q) ?? false) || p.tags.some((t) => t.includes(q));
      }
      return true;
    });

  return (
    <div className="space-y-4">
      {/* Pipeline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md border border-navy-700/20 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Total Prospects</div>
          <div className="text-lg font-bold font-mono text-navy-100 mt-1">{data.total}</div>
        </div>
        <div className="rounded-md border border-navy-700/20 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Engaged</div>
          <div className="text-lg font-bold font-mono text-accent-cyan mt-1">{data.recentlyEngaged}</div>
        </div>
        <div className="rounded-md border border-navy-700/20 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Converted</div>
          <div className="text-lg font-bold font-mono text-accent-emerald mt-1">{data.byStatus.converted || 0}</div>
        </div>
        <div className="rounded-md border border-navy-700/20 bg-navy-950 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Conversion Rate</div>
          <div className="text-lg font-bold font-mono text-navy-100 mt-1">
            {data.total > 0 ? `${(((data.byStatus.converted || 0) / data.total) * 100).toFixed(1)}%` : "0%"}
          </div>
        </div>
      </div>

      {/* Pipeline funnel */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = data.byStatus[status] || 0;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(isActive ? null : status)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all",
                isActive ? `${cfg.bg} ${cfg.color} border border-current/20` : "text-navy-500 hover:text-navy-300"
              )}
            >
              {cfg.label}
              <span className="text-navy-600">{count}</span>
            </button>
          );
        })}
        {filterStatus && (
          <button onClick={() => setFilterStatus(null)} className="text-[10px] text-navy-600 hover:text-navy-400">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-navy-900/60 border border-navy-700/50 rounded text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-500"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleDiscover} disabled={discovering}>
          {discovering ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Radar className="h-3 w-3 mr-1" />}
          Discover
        </Button>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Prospect list */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-6 w-6 text-navy-700 mx-auto mb-2" />
            <p className="text-[11px] text-navy-600">{data.total === 0 ? "No prospects yet. Click Discover to scan Twitter." : "No prospects match filters."}</p>
          </div>
        ) : (
          filtered.map((p) => {
            const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.discovered;
            return (
              <div key={p.id} className="rounded-lg border border-navy-700/20 bg-navy-900/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Score */}
                  <div className={cn(
                    "w-10 text-center text-sm font-bold font-mono rounded py-0.5",
                    p.score >= 30 ? "text-accent-emerald bg-accent-emerald/10" :
                    p.score >= 15 ? "text-accent-cyan bg-accent-cyan/10" :
                    p.score >= 8 ? "text-accent-amber bg-accent-amber/10" :
                    "text-navy-500 bg-navy-800/40"
                  )}>
                    {p.score.toFixed(0)}
                  </div>

                  {/* Profile */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://x.com/${p.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-navy-100 font-medium hover:text-accent-cyan transition-colors"
                      >
                        @{p.username}
                      </a>
                      <ExternalLink className="h-2.5 w-2.5 text-navy-700" />
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", statusCfg.bg, statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </div>
                    {p.bio && <p className="text-[10px] text-navy-500 mt-0.5 line-clamp-1">{p.bio}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {p.tags.map((tag) => (
                        <span key={tag} className="text-[8px] font-mono text-navy-600 bg-navy-800/40 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                      <span className="text-[9px] font-mono text-navy-600">{p.followers} engagement</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.status === "discovered" && (
                      <button
                        onClick={() => updateStatus(p.id, "engaged")}
                        className="text-[9px] font-mono text-accent-cyan hover:text-accent-cyan/80 px-2 py-1 rounded border border-accent-cyan/20 hover:bg-accent-cyan/10 transition-colors"
                      >
                        Engage
                      </button>
                    )}
                    {p.status === "engaged" && (
                      <button
                        onClick={() => updateStatus(p.id, "replied")}
                        className="text-[9px] font-mono text-accent-emerald hover:text-accent-emerald/80 px-2 py-1 rounded border border-accent-emerald/20 hover:bg-accent-emerald/10 transition-colors"
                      >
                        Replied
                      </button>
                    )}
                    {(p.status === "replied" || p.status === "visited") && (
                      <button
                        onClick={() => updateStatus(p.id, "converted")}
                        className="text-[9px] font-mono text-accent-emerald hover:text-accent-emerald/80 px-2 py-1 rounded border border-accent-emerald/20 hover:bg-accent-emerald/10 transition-colors"
                      >
                        Converted
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(p.id, "ignored")}
                      className="text-navy-700 hover:text-navy-500 transition-colors"
                      title="Ignore"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteProspect(p.id)}
                      className="text-navy-700 hover:text-accent-rose transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
