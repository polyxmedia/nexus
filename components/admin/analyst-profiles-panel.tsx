"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Save, Trash2, ChevronDown, ChevronRight, RefreshCw, Sparkles, CheckCircle2, XCircle } from "lucide-react";

interface AnalystProfile {
  id: number;
  userId: string;
  displayName: string;
  bio: string | null;
  expertise: string | null;
  status: string;
  totalJobs: number;
  totalEarnings: number;
  avgAccuracy: number | null;
  scoredDeliverables: number;
  payoutsEnabled: number;
  createdAt: string;
}

export function AnalystProfilesPanel() {
  const [profiles, setProfiles] = useState<AnalystProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/analyst-jobs/profiles?status=${filter === "all" ? "" : filter}`);
      if (res.ok) setProfiles(await res.json());
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const updateStatus = async (profileId: number, status: string) => {
    setActionLoading(profileId);
    try {
      await fetch("/api/analyst-jobs/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, status }),
      });
      fetchProfiles();
    } finally { setActionLoading(null); }
  };

  const statusColor = (s: string) =>
    s === "approved" ? "text-accent-emerald bg-accent-emerald/10" :
    s === "suspended" ? "text-accent-rose bg-accent-rose/10" :
    "text-accent-amber bg-accent-amber/10";

  const pending = profiles.filter(p => p.status === "pending");
  const approved = profiles.filter(p => p.status === "approved");
  const suspended = profiles.filter(p => p.status === "suspended");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded border border-navy-700/30 bg-navy-900/60 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Total Profiles</span>
          <span className="text-xl font-mono font-bold text-navy-100">{profiles.length}</span>
        </div>
        <div className="rounded border border-accent-amber/20 bg-accent-amber/5 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Pending Review</span>
          <span className="text-xl font-mono font-bold text-accent-amber">{pending.length}</span>
        </div>
        <div className="rounded border border-accent-emerald/20 bg-accent-emerald/5 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Approved</span>
          <span className="text-xl font-mono font-bold text-accent-emerald">{approved.length}</span>
        </div>
        <div className="rounded border border-accent-rose/20 bg-accent-rose/5 p-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500 block">Suspended</span>
          <span className="text-xl font-mono font-bold text-accent-rose">{suspended.length}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "pending", "approved", "suspended"] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              filter === f ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
          <span className="text-xs text-navy-500">Loading profiles...</span>
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="text-center py-8 text-sm text-navy-500">
          No analyst profiles {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="border border-navy-700/30 rounded-md overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy-800/40 border-b border-navy-700/20">
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">Name</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">User ID</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500">Expertise</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500">Status</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Jobs</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Accuracy</span>
            <span className="col-span-1 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Earnings</span>
            <span className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-navy-500 text-right">Actions</span>
          </div>

          {profiles.map(p => {
            const expertiseTags: string[] = p.expertise ? (() => { try { return JSON.parse(p.expertise); } catch { return []; } })() : [];
            return (
              <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-navy-700/10 hover:bg-navy-800/20 transition-colors items-center">
                <div className="col-span-2">
                  <span className="text-[11px] text-navy-200 font-semibold">{p.displayName}</span>
                  {p.bio && <p className="text-[9px] text-navy-500 truncate mt-0.5">{p.bio}</p>}
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-mono text-navy-400">{p.userId.replace("user:", "")}</span>
                </div>
                <div className="col-span-2 flex flex-wrap gap-0.5">
                  {expertiseTags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[8px] font-mono px-1 py-0.5 rounded bg-navy-800/60 text-navy-400">{tag}</span>
                  ))}
                  {expertiseTags.length > 3 && (
                    <span className="text-[8px] text-navy-600">+{expertiseTags.length - 3}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-mono text-navy-300">{p.totalJobs}</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-mono text-navy-300">
                    {p.avgAccuracy !== null ? `${(p.avgAccuracy * 100).toFixed(0)}%` : "--"}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[11px] font-mono text-navy-300">
                    ${(p.totalEarnings / 100).toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  {actionLoading === p.id ? (
                    <Loader2 className="h-3 w-3 animate-spin text-accent-cyan" />
                  ) : (
                    <>
                      {p.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(p.id, "approved")}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-accent-emerald/10 text-accent-emerald text-[9px] font-mono uppercase hover:bg-accent-emerald/20 transition-colors"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(p.id, "suspended")}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-accent-rose/10 text-accent-rose text-[9px] font-mono uppercase hover:bg-accent-rose/20 transition-colors"
                          >
                            <XCircle className="h-2.5 w-2.5" /> Reject
                          </button>
                        </>
                      )}
                      {p.status === "approved" && (
                        <button
                          onClick={() => updateStatus(p.id, "suspended")}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-accent-rose/10 text-accent-rose text-[9px] font-mono uppercase hover:bg-accent-rose/20 transition-colors"
                        >
                          <Shield className="h-2.5 w-2.5" /> Suspend
                        </button>
                      )}
                      {p.status === "suspended" && (
                        <button
                          onClick={() => updateStatus(p.id, "approved")}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-accent-emerald/10 text-accent-emerald text-[9px] font-mono uppercase hover:bg-accent-emerald/20 transition-colors"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" /> Reinstate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

