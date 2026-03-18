"use client";
import { Skeleton } from "@/components/ui/skeleton";

import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Save, Trash2, RefreshCw, Activity } from "lucide-react";

interface BaseRate {
  id: number;
  category: string;
  pattern: string;
  label: string;
  timeframe: string;
  base_rate: number;
  observed_rate: number | null;
  sample_count: number;
  last_updated: string;
  keywords: string;
}

export function BaseRatesPanel() {
  const [rates, setRates] = useState<BaseRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<BaseRate>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ category: "market", pattern: "", label: "", timeframe: "week", base_rate: "0.10", keywords: "" });
  const [filterCat, setFilterCat] = useState("all");

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/base-rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/base-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) {
        setEditing(null);
        setEditForm({});
        await fetchRates();
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/base-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newForm, base_rate: parseFloat(newForm.base_rate) }),
      });
      if (res.ok) {
        setAdding(false);
        setNewForm({ category: "market", pattern: "", label: "", timeframe: "week", base_rate: "0.10", keywords: "" });
        await fetchRates();
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this base rate?")) return;
    try {
      await fetch(`/api/admin/base-rates?id=${id}`, { method: "DELETE" });
      await fetchRates();
    } catch { /* */ }
  };

  const categories = [...new Set(rates.map((r) => r.category))].sort();
  const filtered = filterCat === "all" ? rates : rates.filter((r) => r.category === filterCat);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-navy-100 uppercase tracking-wider">Prediction Base Rates</h2>
          <p className="text-[10px] text-navy-500 mt-0.5">
            Prior probabilities for prediction calibration. Observed rates auto-update from resolved predictions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-navy-900/50 border border-navy-700/50 rounded px-2 py-1 text-[10px] text-navy-300 font-mono outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" onClick={() => setAdding(!adding)} className="text-[10px]">
            <Plus className="w-3 h-3 mr-1" /> Add Rate
          </Button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Category</label>
              <select value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })} className="w-full bg-navy-900/50 border border-navy-700/50 rounded px-2 py-1.5 text-xs text-navy-200 outline-none">
                <option value="market">market</option>
                <option value="geopolitical">geopolitical</option>
                <option value="celestial">celestial</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Pattern ID</label>
              <Input value={newForm.pattern} onChange={(e) => setNewForm({ ...newForm, pattern: e.target.value })} placeholder="e.g. oil_price_spike" className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Base Rate (0-1)</label>
              <Input value={newForm.base_rate} onChange={(e) => setNewForm({ ...newForm, base_rate: e.target.value })} placeholder="0.10" className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Label</label>
              <Input value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value })} placeholder="Human-readable description" className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Timeframe</label>
              <Input value={newForm.timeframe} onChange={(e) => setNewForm({ ...newForm, timeframe: e.target.value })} placeholder="week" className="text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Keywords (comma-sep)</label>
              <Input value={newForm.keywords} onChange={(e) => setNewForm({ ...newForm, keywords: e.target.value })} placeholder="oil,crude,wti" className="text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="text-[10px]">Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newForm.pattern || !newForm.label} className="text-[10px]">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-navy-700/60">
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Category</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Pattern</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Label</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 text-right">Prior</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 text-right">Observed</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 text-right">Samples</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500">Keywords</th>
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-navy-500 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isEditing = editing === r.id;
                const effective = r.observed_rate != null && r.sample_count >= 5 ? r.observed_rate : r.base_rate;
                const catColor = r.category === "market" ? "text-accent-cyan" : r.category === "geopolitical" ? "text-accent-amber" : "text-accent-emerald";
                return (
                  <tr key={r.id} className="border-b border-navy-700/30 hover:bg-navy-800/30 transition-colors">
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-mono uppercase ${catColor}`}>{r.category}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[11px] font-mono text-navy-300">{r.pattern}</span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.label ?? r.label}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                          className="text-xs h-7"
                        />
                      ) : (
                        <span className="text-[11px] text-navy-200">{r.label}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={editForm.base_rate ?? r.base_rate}
                          onChange={(e) => setEditForm({ ...editForm, base_rate: parseFloat(e.target.value) })}
                          className="text-xs h-7 w-20 text-right"
                        />
                      ) : (
                        <span className="text-[11px] font-mono text-navy-200">{(r.base_rate * 100).toFixed(1)}%</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.observed_rate != null ? (
                        <span className={`text-[11px] font-mono font-bold ${r.sample_count >= 5 ? "text-accent-emerald" : "text-navy-400"}`}>
                          {(r.observed_rate * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-navy-600">--</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-[11px] font-mono ${r.sample_count >= 5 ? "text-navy-200" : "text-navy-500"}`}>
                        {r.sample_count}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.keywords ?? r.keywords}
                          onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                          className="text-xs h-7"
                        />
                      ) : (
                        <span className="text-[10px] text-navy-500 font-mono truncate max-w-[200px] block">{r.keywords}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSave(r.id)} disabled={saving} className="text-[10px] font-mono text-accent-emerald hover:text-accent-emerald/80 transition-colors">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </button>
                            <button onClick={() => { setEditing(null); setEditForm({}); }} className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors ml-2">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditing(r.id); setEditForm({ base_rate: r.base_rate, label: r.label, keywords: r.keywords }); }} className="text-[10px] font-mono text-navy-500 hover:text-accent-cyan transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="text-[10px] font-mono text-navy-500 hover:text-accent-rose transition-colors ml-2">
                              Del
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[9px] font-mono text-navy-600">
        <span>Prior = manually set anchor</span>
        <span>Observed = auto-computed from resolved predictions (active at 5+ samples)</span>
        <span className="text-accent-emerald">Green observed = active (overrides prior)</span>
      </div>
    </div>
  );
}

