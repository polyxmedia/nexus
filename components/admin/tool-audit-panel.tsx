"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditRow {
  id: number;
  sessionId: number | null;
  toolName: string;
  input: Record<string, unknown> | null;
  outputSizeBytes: number | null;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  username: string | null;
  createdAt: string;
}

interface AuditStat {
  toolName: string;
  count: number;
  avgDurationMs: number;
  errorCount: number;
}

export function ToolAuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [stats, setStats] = useState<AuditStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const [selectedTool, setSelectedTool] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days), limit: "200" });
      if (filter === "errors") params.set("success", "false");
      if (selectedTool) params.set("tool_name", selectedTool);
      const res = await fetch(`/api/admin/tool-audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setStats(data.stats || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [days, filter, selectedTool]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCalls = stats.reduce((s, r) => s + r.count, 0);
  const totalErrors = stats.reduce((s, r) => s + r.errorCount, 0);
  const avgDuration = totalCalls > 0 ? Math.round(stats.reduce((s, r) => s + r.avgDurationMs * r.count, 0) / totalCalls) : 0;
  const errorRate = totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border border-navy-700/40 rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1">Total Calls</div>
          <div className="text-2xl font-mono text-navy-100">{totalCalls.toLocaleString()}</div>
          <div className="text-[10px] text-navy-500 mt-1">Last {days}d</div>
        </div>
        <div className="border border-navy-700/40 rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1">Avg Duration</div>
          <div className="text-2xl font-mono text-navy-100">{avgDuration}ms</div>
          <div className="text-[10px] text-navy-500 mt-1">Across all tools</div>
        </div>
        <div className="border border-navy-700/40 rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1">Errors</div>
          <div className="text-2xl font-mono text-accent-rose">{totalErrors}</div>
          <div className="text-[10px] text-navy-500 mt-1">{errorRate}% error rate</div>
        </div>
        <div className="border border-navy-700/40 rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1">Unique Tools</div>
          <div className="text-2xl font-mono text-navy-100">{stats.length}</div>
          <div className="text-[10px] text-navy-500 mt-1">Tools used</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
                days === d ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "text-navy-400 border border-navy-700/40 hover:border-navy-600"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              filter === "all" ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30" : "text-navy-400 border border-navy-700/40 hover:border-navy-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("errors")}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              filter === "errors" ? "bg-accent-rose/20 text-accent-rose border border-accent-rose/30" : "text-navy-400 border border-navy-700/40 hover:border-navy-600"
            }`}
          >
            Errors Only
          </button>
        </div>
        {selectedTool && (
          <button
            onClick={() => setSelectedTool("")}
            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded bg-navy-800 text-accent-amber border border-accent-amber/30"
          >
            {selectedTool} x
          </button>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="text-[10px] font-mono">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tool Stats Table */}
      <div className="border border-navy-700/40 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-navy-700/40 bg-navy-900/50">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Tool Performance</span>
        </div>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin inline-block text-navy-500" /></div>
        ) : stats.length === 0 ? (
          <div className="py-8 text-center text-xs text-navy-500">No audit data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-800">
                  <th className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-navy-500">Tool</th>
                  <th className="px-4 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Calls</th>
                  <th className="px-4 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Avg ms</th>
                  <th className="px-4 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Errors</th>
                  <th className="px-4 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Error %</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const errPct = s.count > 0 ? ((s.errorCount / s.count) * 100).toFixed(1) : "0";
                  const durationColor = s.avgDurationMs > 10000 ? "text-accent-rose" : s.avgDurationMs > 3000 ? "text-accent-amber" : "text-accent-emerald";
                  return (
                    <tr
                      key={s.toolName}
                      className="border-b border-navy-800/50 hover:bg-navy-800/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedTool(s.toolName === selectedTool ? "" : s.toolName)}
                    >
                      <td className="px-4 py-2 text-xs font-mono text-navy-200">{s.toolName}</td>
                      <td className="px-4 py-2 text-xs font-mono text-navy-300 text-right">{s.count}</td>
                      <td className={`px-4 py-2 text-xs font-mono text-right ${durationColor}`}>{s.avgDurationMs}ms</td>
                      <td className="px-4 py-2 text-xs font-mono text-right">
                        {s.errorCount > 0 ? <span className="text-accent-rose">{s.errorCount}</span> : <span className="text-navy-600">0</span>}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-right">
                        {parseFloat(errPct) > 0 ? <span className="text-accent-rose">{errPct}%</span> : <span className="text-navy-600">0%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div className="border border-navy-700/40 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-navy-700/40 bg-navy-900/50">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
            Recent Executions {rows.length > 0 && `(${rows.length})`}
          </span>
        </div>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin inline-block text-navy-500" /></div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-navy-500">No executions found</div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-navy-900">
                <tr className="border-b border-navy-800">
                  <th className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-navy-500 w-8"></th>
                  <th className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-navy-500">Tool</th>
                  <th className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-navy-500">User</th>
                  <th className="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Duration</th>
                  <th className="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Size</th>
                  <th className="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-navy-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const time = new Date(r.createdAt);
                  const timeStr = time.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                  const sizeKB = r.outputSizeBytes ? (r.outputSizeBytes / 1024).toFixed(1) : "-";
                  return (
                    <tr key={r.id} className="border-b border-navy-800/30 hover:bg-navy-800/20 transition-colors">
                      <td className="px-3 py-1.5">
                        {r.success ? (
                          <CheckCircle className="h-3 w-3 text-accent-emerald" />
                        ) : (
                          <XCircle className="h-3 w-3 text-accent-rose" />
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-xs font-mono text-navy-200">{r.toolName}</td>
                      <td className="px-3 py-1.5 text-xs font-mono text-navy-400">{r.username || "-"}</td>
                      <td className={`px-3 py-1.5 text-xs font-mono text-right ${r.durationMs > 10000 ? "text-accent-rose" : r.durationMs > 3000 ? "text-accent-amber" : "text-navy-300"}`}>
                        {r.durationMs}ms
                      </td>
                      <td className="px-3 py-1.5 text-xs font-mono text-navy-400 text-right">{sizeKB}KB</td>
                      <td className="px-3 py-1.5 text-[10px] font-mono text-navy-500 text-right">{timeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
