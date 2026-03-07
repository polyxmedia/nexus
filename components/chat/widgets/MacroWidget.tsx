"use client";

import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface MacroIndicator {
  name: string;
  value: number | string;
  change?: number | string;
  unit?: string;
}

interface MacroData {
  snapshot?: Record<string, MacroIndicator>;
  id?: string;
  name?: string;
  unit?: string;
  latest?: { date: string; value: number };
  history?: Array<{ date: string; value: number }>;
  error?: string;
}

const GROUPS: Record<string, string[]> = {
  Rates: ["FEDFUNDS", "DGS2", "DGS10", "DGS30", "T10Y2Y", "T10YIE"],
  Commodities: ["GOLDAMGBD228NLBM", "DCOILWTICO", "VIXCLS", "DTWEXBGS"],
  Labor: ["UNRATE", "ICSA", "PAYEMS", "CIVPART"],
};

function groupIndicators(
  snapshot: Record<string, MacroIndicator>
): { label: string; items: [string, MacroIndicator][] }[] {
  const entries = Object.entries(snapshot);
  const used = new Set<string>();
  const groups: { label: string; items: [string, MacroIndicator][] }[] = [];

  for (const [groupLabel, keys] of Object.entries(GROUPS)) {
    const items = entries.filter(([k]) => keys.includes(k));
    if (items.length > 0) {
      items.forEach(([k]) => used.add(k));
      groups.push({ label: groupLabel, items });
    }
  }

  const remaining = entries.filter(([k]) => !used.has(k));
  if (remaining.length > 0) {
    groups.push({ label: "Other", items: remaining });
  }

  if (groups.length === 0) {
    groups.push({ label: "Indicators", items: entries });
  }

  return groups;
}

function changeColor(change: number | string | undefined): "green" | "red" | "neutral" {
  if (change == null) return "neutral";
  const n = typeof change === "number" ? change : parseFloat(String(change));
  if (isNaN(n)) return "neutral";
  if (n > 0) return "green";
  if (n < 0) return "red";
  return "neutral";
}

function formatValue(val: number | string, unit?: string): string {
  if (typeof val === "string") return val;
  const formatted = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
  if (unit === "%") return `${formatted}%`;
  if (unit === "$") return `$${formatted}`;
  if (unit) return `${formatted} ${unit}`;
  return formatted;
}

function formatChange(change: number | string | undefined): string | undefined {
  if (change == null) return undefined;
  const n = typeof change === "number" ? change : parseFloat(String(change));
  if (isNaN(n)) return String(change);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function MacroWidget({ data }: { data: MacroData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  // Single series view
  if (data.latest && data.name) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            Macro Data
          </span>
          <Badge variant="category">{data.name}</Badge>
          {data.id && (
            <Badge variant="default">{data.id}</Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Metric
            label="Latest Value"
            value={formatValue(data.latest.value, data.unit)}
          />
          <Metric
            label="Date"
            value={data.latest.date}
          />
          {data.history && data.history.length > 1 && (
            <Metric
              label="Change"
              value={formatValue(
                data.latest.value - data.history[data.history.length - 2].value,
                data.unit
              )}
              changeColor={changeColor(
                data.latest.value - data.history[data.history.length - 2].value
              )}
            />
          )}
        </div>
      </div>
    );
  }

  // Snapshot view
  if (data.snapshot) {
    const groups = groupIndicators(data.snapshot);

    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            Macro Snapshot
          </span>
        </div>

        {groups.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <span className="text-[10px] uppercase tracking-wider text-navy-600 font-mono">
              {group.label}
            </span>
            <div className="grid grid-cols-3 gap-4 mt-1">
              {group.items.map(([key, indicator]) => (
                <Metric
                  key={key}
                  label={indicator.name || key}
                  value={formatValue(indicator.value, indicator.unit)}
                  change={formatChange(indicator.change)}
                  changeColor={changeColor(indicator.change)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
