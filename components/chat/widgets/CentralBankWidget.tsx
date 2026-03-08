"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function toneColor(net: number): string {
  if (net > 0.3) return "#f43f5e"; // hawkish
  if (net < -0.3) return "#10b981"; // dovish
  return "#f59e0b";
}

function rateColor(path: string): string {
  if (path === "hiking") return "#f43f5e";
  if (path === "cutting") return "#10b981";
  if (path === "pausing") return "#f59e0b";
  return "#06b6d4";
}

export function CentralBankWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    institution,
    netScore = 0,
    hawkishScore = 0,
    dovishScore = 0,
    uncertaintyLevel = 0,
    keyPhrases = [],
    forwardGuidance,
    ratePathImplication,
    topicBreakdown = {},
    marketImplications = {},
    summary,
  } = data;

  const toneLabel = netScore > 0.3 ? "Hawkish" : netScore < -0.3 ? "Dovish" : "Neutral";

  return (
    <div className="my-2 space-y-3">
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Central Bank Analysis
            </div>
            {institution && <div className="font-mono text-sm text-navy-300">{institution}</div>}
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-bold" style={{ color: toneColor(netScore) }}>
              {toneLabel}
            </div>
            <div className="font-mono text-[9px] text-navy-600">
              net: {netScore >= 0 ? "+" : ""}{netScore.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Hawk/Dove meter */}
        <div className="relative h-2 w-full bg-navy-800 rounded-full overflow-hidden mb-2">
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${((netScore + 1) / 2) * 100}%`,
              backgroundColor: toneColor(netScore),
              opacity: 0.8,
            }}
          />
          <div className="absolute top-0 left-1/2 h-full w-px bg-navy-600" />
        </div>
        <div className="flex justify-between font-mono text-[8px] text-navy-700">
          <span>dovish</span>
          <span>neutral</span>
          <span>hawkish</span>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <div className="font-mono text-[9px] text-navy-600">Hawkish</div>
            <div className="font-mono text-sm text-accent-rose">{(hawkishScore * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Dovish</div>
            <div className="font-mono text-sm text-accent-emerald">{(dovishScore * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Rate Path</div>
            <div className="font-mono text-sm" style={{ color: rateColor(ratePathImplication) }}>
              {ratePathImplication}
            </div>
          </div>
        </div>
      </div>

      {/* Topic breakdown */}
      {Object.keys(topicBreakdown).length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">Topic Focus</div>
          {Object.entries(topicBreakdown).map(([topic, score]: [string, any]) => (
            <div key={topic} className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-navy-400 w-28 shrink-0">{topic}</span>
              <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
                <div className="h-full bg-accent-cyan rounded-full" style={{ width: `${(score || 0) * 100}%`, opacity: 0.6 }} />
              </div>
              <span className="font-mono text-[9px] text-navy-500 w-8 text-right">{((score || 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Market implications */}
      {Object.keys(marketImplications).length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">Market Implications</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(marketImplications).map(([asset, impl]: [string, any]) => (
              <div key={asset}>
                <div className="font-mono text-[9px] text-navy-600 uppercase">{asset}</div>
                <div className="font-mono text-[10px] text-navy-400">{impl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key phrases */}
      {keyPhrases.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keyPhrases.slice(0, 6).map((p: string, i: number) => (
            <span key={i} className="font-mono text-[8px] text-accent-cyan/60 border border-accent-cyan/20 rounded px-1.5 py-0.5">
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Forward guidance + summary */}
      {forwardGuidance && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Forward Guidance</div>
          <div className="font-mono text-[10px] text-navy-400">{forwardGuidance}</div>
        </div>
      )}

      {summary && (
        <div className="font-mono text-[10px] text-navy-500 px-1">{summary}</div>
      )}
    </div>
  );
}
