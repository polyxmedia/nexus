"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function scoreColor(score: number, invert = false): string {
  const v = invert ? 1 - score : score;
  if (v <= 0.15) return "#10b981";
  if (v <= 0.3) return "#06b6d4";
  if (v <= 0.5) return "#f59e0b";
  return "#f43f5e";
}

export function PredictionFeedbackWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    totalResolved = 0,
    brierScore = 0,
    binaryAccuracy = 0,
    avgConfidence = 0,
    calibrationGap = 0,
    calibration = [],
    byCategory = [],
    failurePatterns = [],
    recentTrend,
    resolutionBias,
  } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
          Prediction Performance
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="font-mono text-[9px] text-navy-600">Brier Score</div>
            <div className="font-mono text-lg font-bold" style={{ color: scoreColor(brierScore) }}>
              {brierScore.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Accuracy</div>
            <div className="font-mono text-lg font-bold" style={{ color: scoreColor(1 - binaryAccuracy) }}>
              {(binaryAccuracy * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Avg Confidence</div>
            <div className="font-mono text-lg font-bold text-navy-300">
              {(avgConfidence * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-navy-600">Cal. Gap</div>
            <div className="font-mono text-lg font-bold" style={{ color: scoreColor(calibrationGap) }}>
              {(calibrationGap * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="font-mono text-[9px] text-navy-600 mt-2">
          {totalResolved} predictions resolved
        </div>
      </div>

      {/* Calibration buckets */}
      {calibration.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Calibration
          </div>
          <div className="space-y-1.5">
            {calibration.map((b: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-navy-500 w-16 shrink-0">{b.range}</span>
                <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-cyan"
                    style={{ width: `${(b.confirmedRate || 0) * 100}%`, opacity: 0.7 }}
                  />
                </div>
                <span className="font-mono text-[9px] text-navy-400 w-10 text-right">
                  {((b.confirmedRate || 0) * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-[9px] text-navy-600 w-6 text-right">n={b.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By category */}
      {byCategory.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            By Category
          </div>
          <div className="space-y-1.5">
            {byCategory.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-navy-300">{c.category}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px]" style={{ color: scoreColor(c.brierScore) }}>
                    Brier {c.brierScore?.toFixed(3)}
                  </span>
                  <span className="font-mono text-[9px] text-navy-500">
                    {c.total} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent trend */}
      {recentTrend && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Trend</div>
          <div className="font-mono text-[10px]" style={{ color: recentTrend.improving ? "#10b981" : "#f43f5e" }}>
            {recentTrend.improving ? "Improving" : "Deteriorating"}: recent Brier {recentTrend.recentBrier?.toFixed(3)} vs prior {recentTrend.priorBrier?.toFixed(3)}
          </div>
        </div>
      )}

      {/* Failure patterns */}
      {failurePatterns.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Failure Patterns
          </div>
          {failurePatterns.slice(0, 3).map((f: any, i: number) => (
            <div key={i} className="font-mono text-[10px] text-navy-400 mb-1">
              {f.pattern} ({f.frequency}x)
            </div>
          ))}
        </div>
      )}

      {/* Resolution bias */}
      {resolutionBias && resolutionBias.biasWarning && (
        <div className="font-mono text-[9px] text-accent-amber/70 px-1">
          Bias: {resolutionBias.biasWarning}
        </div>
      )}
    </div>
  );
}
