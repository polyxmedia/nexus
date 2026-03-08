"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function statusColor(status: string): string {
  if (status === "covered" || status === "good") return "#10b981";
  if (status === "partial" || status === "stale") return "#f59e0b";
  if (status === "gap" || status === "blind_spot") return "#f43f5e";
  return "#06b6d4";
}

function critColor(crit: string): string {
  if (crit === "critical" || crit === "high") return "#f43f5e";
  if (crit === "medium") return "#f59e0b";
  return "#06b6d4";
}

export function CollectionGapsWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    overallScore = 0,
    areas = [],
    gaps = [],
    silences = [],
    collectionPriorities = [],
  } = data;

  return (
    <div className="my-2 space-y-3">
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Intelligence Collection Coverage
            </div>
            <div className="font-mono text-sm text-navy-300">{areas.length} areas monitored</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold" style={{ color: overallScore >= 70 ? "#10b981" : overallScore >= 40 ? "#f59e0b" : "#f43f5e" }}>
              {overallScore}%
            </div>
            <div className="font-mono text-[9px] text-navy-600">coverage</div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${overallScore}%`,
              backgroundColor: overallScore >= 70 ? "#10b981" : overallScore >= 40 ? "#f59e0b" : "#f43f5e",
              opacity: 0.9,
            }}
          />
        </div>
      </div>

      {/* Areas */}
      {areas.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">Coverage Areas</div>
          <div className="space-y-1.5">
            {areas.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor(a.status) }} />
                  <span className="font-mono text-[10px] text-navy-300">{a.region}</span>
                  <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ color: critColor(a.criticality), backgroundColor: `${critColor(a.criticality)}10` }}>
                    {a.criticality}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-navy-500">{a.knowledgeEntries} entries</span>
                  <span className="font-mono text-[9px]" style={{ color: statusColor(a.status) }}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps & Silences */}
      {(gaps.length > 0 || silences.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {gaps.length > 0 && (
            <div className="border border-accent-rose/20 rounded bg-accent-rose/5 p-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-accent-rose/70 mb-1">
                Gaps ({gaps.length})
              </div>
              {gaps.slice(0, 5).map((g: string, i: number) => (
                <div key={i} className="font-mono text-[9px] text-navy-400 mb-0.5">{g}</div>
              ))}
            </div>
          )}
          {silences.length > 0 && (
            <div className="border border-accent-amber/20 rounded bg-accent-amber/5 p-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-accent-amber/70 mb-1">
                Silences ({silences.length})
              </div>
              {silences.slice(0, 5).map((s: string, i: number) => (
                <div key={i} className="font-mono text-[9px] text-navy-400 mb-0.5">{s}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Priorities */}
      {collectionPriorities.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">Collection Priorities</div>
          {collectionPriorities.slice(0, 5).map((p: any, i: number) => (
            <div key={i} className="py-1 border-b border-navy-800/50 last:border-0">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-navy-300">{p.region}</span>
                <span className="font-mono text-[9px]" style={{ color: critColor(p.priority) }}>{p.priority}</span>
              </div>
              {p.suggestedAction && (
                <div className="font-mono text-[9px] text-navy-500 mt-0.5">{p.suggestedAction}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
