"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function rankColor(rank: number): string {
  if (rank === 1) return "#10b981";
  if (rank === 2) return "#06b6d4";
  if (rank === 3) return "#f59e0b";
  return "#d4d4d4";
}

export function ACHWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    analysisId,
    hypotheses = [],
    diagnosticItems = [],
    matrixCompleteness = 0,
    analysisQuality,
  } = data;

  return (
    <div className="my-2 space-y-3">
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Analysis of Competing Hypotheses
            </div>
            {analysisId && <div className="font-mono text-[9px] text-navy-600">ID: {analysisId}</div>}
          </div>
          <div className="text-right">
            {analysisQuality && (
              <div className="font-mono text-[10px] text-accent-cyan">{analysisQuality}</div>
            )}
            <div className="font-mono text-[9px] text-navy-600">
              completeness: {(matrixCompleteness * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Hypotheses */}
        <div className="space-y-2">
          {hypotheses.map((h: any) => (
            <div
              key={h.id}
              className="border rounded p-3"
              style={{
                borderColor: h.isRejected ? "#f43f5e30" : `${rankColor(h.rank)}30`,
                backgroundColor: h.isRejected ? "#f43f5e05" : "transparent",
              }}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      color: h.isRejected ? "#f43f5e" : rankColor(h.rank),
                      backgroundColor: h.isRejected ? "#f43f5e10" : `${rankColor(h.rank)}10`,
                    }}
                  >
                    {h.isRejected ? "REJECTED" : `#${h.rank}`}
                  </span>
                  <span className="font-mono text-[10px] text-navy-300">{h.label}</span>
                </div>
                {h.probability != null && (
                  <span className="font-mono text-sm font-bold" style={{ color: rankColor(h.rank) }}>
                    {(h.probability * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {h.description && (
                <div className="font-mono text-[9px] text-navy-500 mb-1">{h.description}</div>
              )}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-navy-600">
                  inconsistency: {h.inconsistencyScore?.toFixed(2)}
                </span>
                {h.diagnosticEvidence != null && (
                  <span className="font-mono text-[9px] text-navy-600">
                    diagnostic evidence: {h.diagnosticEvidence}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic items */}
      {diagnosticItems.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Diagnostic Evidence
          </div>
          {diagnosticItems.slice(0, 5).map((d: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-navy-800/50 last:border-0">
              <span className="font-mono text-[10px] text-navy-300 truncate">{d.description}</span>
              <span className="font-mono text-[9px] text-accent-cyan shrink-0 ml-2">
                d={d.diagnosticity?.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
