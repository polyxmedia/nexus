"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Trash2, X, CreditCard } from "lucide-react";
import type { Tier } from "./types";

export function TierEditor({
  tier,
  onSave,
  onDelete,
  onCancel,
}: {
  tier: Partial<Tier>;
  onSave: (tier: Partial<Tier>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: tier.name || "",
    price: tier.price !== undefined ? String(tier.price / 100) : "",
    interval: tier.interval || "month",
    stripePriceId: tier.stripePriceId || "",
    stripeProductId: tier.stripeProductId || "",
    features: tier.features
      ? JSON.parse(tier.features).join("\n")
      : "",
    limits: tier.limits || "{}",
    highlighted: tier.highlighted === 1,
    active: tier.active !== 0,
    position: tier.position ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showLimits, setShowLimits] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      id: tier.id,
      name: form.name,
      price: Math.round(parseFloat(form.price || "0") * 100),
      interval: form.interval,
      stripePriceId: form.stripePriceId || null,
      stripeProductId: form.stripeProductId || null,
      features: form.features.split("\n").filter((f: string) => f.trim()),
      limits: typeof form.limits === "string" ? JSON.parse(form.limits) : form.limits,
      highlighted: form.highlighted ? 1 : 0,
      active: form.active ? 1 : 0,
      position: form.position,
    } as unknown as Partial<Tier>);
    setSaving(false);
  };

  return (
    <div className="border border-navy-700 rounded p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy-100 font-mono">
          {tier.id ? tier.name : "New Tier"}
        </h3>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-navy-500 hover:text-navy-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Tier Name
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Analyst"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Price (USD)
            </label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="49"
            />
          </div>
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Interval
            </label>
            <select
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
              className="w-full bg-navy-900/50 border border-navy-700/50 rounded px-3 py-2 text-sm text-navy-200 focus:outline-none"
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Stripe Price ID
          </label>
          <Input
            value={form.stripePriceId}
            onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
            placeholder="price_..."
          />
        </div>
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Stripe Product ID
          </label>
          <Input
            value={form.stripeProductId}
            onChange={(e) => setForm({ ...form, stripeProductId: e.target.value })}
            placeholder="prod_..."
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
          Features (one per line)
        </label>
        <textarea
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          className="w-full h-32 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[12px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500"
          placeholder="Signal detection engine&#10;AI chat analyst (100 msgs/day)&#10;..."
        />
      </div>

      <div>
        <button
          onClick={() => setShowLimits(!showLimits)}
          className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
        >
          {showLimits ? "Hide" : "Edit"} limits JSON
        </button>
        {showLimits && (
          <textarea
            value={typeof form.limits === "string" ? form.limits : JSON.stringify(form.limits, null, 2)}
            onChange={(e) => setForm({ ...form, limits: e.target.value })}
            className="mt-2 w-full h-28 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[11px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500"
          />
        )}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-navy-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.highlighted}
            onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
            className="rounded border-navy-600"
          />
          Highlighted (recommended)
        </label>
        <label className="flex items-center gap-2 text-xs text-navy-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="rounded border-navy-600"
          />
          Active
        </label>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-navy-500 uppercase tracking-wider">Position</label>
          <Input
            type="number"
            value={String(form.position)}
            onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
            className="w-16"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-navy-700/50">
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-accent-rose hover:text-accent-rose"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            }}
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
            Delete Tier
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {syncResult && (
            <span className={`text-[10px] font-mono ${syncResult.ok ? "text-accent-emerald" : "text-accent-rose"}`}>
              {syncResult.msg}
            </span>
          )}
          {tier.id && (
            <Button
              variant="outline"
              size="sm"
              disabled={syncing || !form.name}
              onClick={async () => {
                setSyncing(true);
                setSyncResult(null);
                try {
                  const res = await fetch("/api/admin/tiers/stripe-sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tierId: tier.id }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setForm((f) => ({
                      ...f,
                      stripePriceId: data.stripePriceId || f.stripePriceId,
                      stripeProductId: data.stripeProductId || f.stripeProductId,
                    }));
                    setSyncResult({ ok: true, msg: "Synced" });
                  } else {
                    setSyncResult({ ok: false, msg: data.error || "Failed" });
                  }
                } catch {
                  setSyncResult({ ok: false, msg: "Network error" });
                }
                setSyncing(false);
                setTimeout(() => setSyncResult(null), 4000);
              }}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
              Sync to Stripe
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !form.name}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            {tier.id ? "Save Changes" : "Create Tier"}
          </Button>
        </div>
      </div>
    </div>
  );
}
