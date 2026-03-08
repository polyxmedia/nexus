"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function probColor(p: number): string {
  if (p >= 0.8) return "#10b981";
  if (p >= 0.5) return "#06b6d4";
  if (p >= 0.2) return "#f59e0b";
  return "#f43f5e";
}

function MarketRow({ m }: { m: any }) {
  const prob = m.probability ?? 0;
  const change24h = m.priceChange24h ?? 0;
  return (
    <div className="py-2 border-b border-navy-800/50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] text-navy-300 leading-tight truncate">{m.title}</div>
          {m.category && (
            <span className="font-mono text-[8px] text-navy-600 uppercase">{m.category}</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-bold" style={{ color: probColor(prob) }}>
            {(prob * 100).toFixed(0)}%
          </div>
          {change24h !== 0 && (
            <div className="font-mono text-[9px]" style={{ color: change24h > 0 ? "#10b981" : "#f43f5e" }}>
              {change24h > 0 ? "+" : ""}{(change24h * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PredictionMarketsWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    markets = [],
    topMovers = [],
    geopolitical = [],
    economic = [],
    political = [],
    totalMarkets = 0,
  } = data;

  const sections = [
    { label: "Top Movers", items: topMovers },
    { label: "Geopolitical", items: geopolitical },
    { label: "Economic", items: economic },
    { label: "Political", items: political },
  ].filter(s => s.items.length > 0);

  // If no categorized sections, show all markets
  if (sections.length === 0 && markets.length > 0) {
    sections.push({ label: "Markets", items: markets });
  }

  return (
    <div className="my-2 space-y-3">
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500">
            Prediction Markets
          </div>
          <span className="font-mono text-[9px] text-navy-600">{totalMarkets} markets tracked</span>
        </div>

        {sections.map((section) => (
          <div key={section.label} className="mb-3 last:mb-0">
            <div className="font-mono text-[9px] uppercase tracking-widest text-accent-cyan/60 mb-1 mt-2">
              {section.label}
            </div>
            {section.items.slice(0, 5).map((m: any, i: number) => (
              <MarketRow key={i} m={m} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
