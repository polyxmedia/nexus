"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function momentumColor(m: string): string {
  if (m === "rising" || m === "surging") return "#10b981";
  if (m === "peaking") return "#f59e0b";
  if (m === "fading") return "#f43f5e";
  return "#06b6d4";
}

function sentimentColor(s: number): string {
  if (s > 0.3) return "#10b981";
  if (s < -0.3) return "#f43f5e";
  return "#f59e0b";
}

export function NarrativesWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { narratives = [], topThemes = [], divergences = [] } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Top themes */}
      {topThemes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topThemes.map((t: string, i: number) => (
            <span key={i} className="font-mono text-[9px] text-accent-cyan border border-accent-cyan/20 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Narratives */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
        <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
          Active Narratives ({narratives.length})
        </div>
        <div className="space-y-2">
          {narratives.slice(0, 8).map((n: any, i: number) => (
            <div key={i} className="pb-2 border-b border-navy-800/50 last:border-0 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-navy-300">{n.theme}</div>
                  {n.description && (
                    <div className="font-mono text-[9px] text-navy-500 mt-0.5 truncate">{n.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="font-mono text-[9px]" style={{ color: momentumColor(n.momentum) }}>
                    {n.momentum}
                  </span>
                  {n.sentimentScore != null && (
                    <span className="font-mono text-[9px]" style={{ color: sentimentColor(n.sentimentScore) }}>
                      {n.sentimentScore >= 0 ? "+" : ""}{n.sentimentScore.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[8px] text-navy-600">{n.articleCount} articles</span>
                {(n.relatedAssets || []).slice(0, 3).map((a: string) => (
                  <span key={a} className="font-mono text-[8px] text-accent-cyan/50">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divergences */}
      {divergences.length > 0 && (
        <div className="border border-accent-amber/20 rounded bg-accent-amber/5 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-accent-amber/70 mb-2">
            Narrative-Price Divergences
          </div>
          {divergences.slice(0, 5).map((d: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-navy-800/30 last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-accent-cyan">{d.asset}</span>
                <span className="font-mono text-[9px] text-navy-500">{d.theme}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-navy-400">
                  narrative: {d.narrativeDirection} / price: {d.priceDirection}
                </span>
                <span className="font-mono text-[9px] text-accent-amber">
                  {d.divergenceScore?.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
