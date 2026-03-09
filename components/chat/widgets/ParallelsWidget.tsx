"use client";

import { Badge } from "@/components/ui/badge";

interface HistoricalParallel {
  event: string;
  date: string;
  similarity: number;
  outcome: string;
  timeToResolution: string;
  marketImpact: string;
  keyDifferences: string[];
  keySimilarities: string[];
}

interface ParallelsData {
  query?: string;
  parallels?: HistoricalParallel[];
  synthesis?: string;
  probabilityOfRepetition?: number;
  regime?: string;
  confidenceInAnalysis?: number;
  actionableInsights?: string[];
  warning?: string | null;
  error?: string;
}

const REGIME_STYLE: Record<string, string> = {
  peacetime: "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30",
  wartime: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  transition: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
};

function similarityColor(s: number): string {
  if (s >= 0.7) return "text-accent-emerald";
  if (s >= 0.4) return "text-accent-amber";
  return "text-navy-400";
}

function ParallelCard({ parallel }: { parallel: HistoricalParallel }) {
  // Handle both old typo (keySimlarities) and corrected spelling
  const similarities = parallel.keySimilarities || (parallel as any).keySimlarities || [];
  const differences = parallel.keyDifferences || [];

  return (
    <div className="border border-navy-700 rounded bg-navy-900/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-navy-200">{parallel.event}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-navy-500">{parallel.date}</span>
          <span className={`text-[10px] font-mono font-bold tabular-nums ${similarityColor(parallel.similarity)}`}>
            {(parallel.similarity * 100).toFixed(0)}% match
          </span>
        </div>
      </div>

      <div className="text-xs text-navy-300 mb-2">{parallel.outcome}</div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1">Resolution</div>
          <div className="text-[11px] text-navy-300">{parallel.timeToResolution}</div>
        </div>
        <div className="col-span-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1">Market Impact</div>
          <div className="text-[11px] text-navy-300">{parallel.marketImpact}</div>
        </div>
      </div>

      {(similarities.length > 0 || differences.length > 0) && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-800/50">
          {similarities.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-accent-cyan/60 mb-1">Similarities</div>
              <ul className="space-y-0.5">
                {similarities.map((s, i) => (
                  <li key={i} className="text-[10px] text-navy-400 flex items-start gap-1">
                    <span className="text-accent-cyan/50 mt-px shrink-0">&gt;</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {differences.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-accent-amber/60 mb-1">Differences</div>
              <ul className="space-y-0.5">
                {differences.map((d, i) => (
                  <li key={i} className="text-[10px] text-navy-400 flex items-start gap-1">
                    <span className="text-accent-amber/50 mt-px shrink-0">&gt;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ParallelsWidget({ data }: { data: ParallelsData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  if (!data.parallels || data.parallels.length === 0) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-400">
        No historical parallels found for this scenario.
      </div>
    );
  }

  return (
    <div className="my-2 space-y-3">
      {/* Header with metrics */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-2">
          Historical Parallels
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {data.regime && (
            <Badge className={REGIME_STYLE[data.regime] || "bg-navy-700/30 text-navy-400 border-navy-700/40"}>
              {data.regime}
            </Badge>
          )}
          {data.probabilityOfRepetition != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase text-navy-600">Repetition</span>
              <span className={`text-[11px] font-mono font-bold tabular-nums ${
                data.probabilityOfRepetition >= 0.6 ? "text-accent-rose" :
                data.probabilityOfRepetition >= 0.3 ? "text-accent-amber" :
                "text-accent-emerald"
              }`}>
                {(data.probabilityOfRepetition * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {data.confidenceInAnalysis != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase text-navy-600">Confidence</span>
              <span className="text-[11px] font-mono font-bold tabular-nums text-navy-300">
                {(data.confidenceInAnalysis * 100).toFixed(0)}%
              </span>
            </div>
          )}
          <span className="text-[9px] font-mono text-navy-600">
            {data.parallels.length} parallel{data.parallels.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Warning */}
      {data.warning && (
        <div className="border border-accent-amber/20 rounded bg-accent-amber/5 px-3 py-2 text-[11px] text-accent-amber/80">
          {data.warning}
        </div>
      )}

      {/* Synthesis */}
      {data.synthesis && (
        <div className="border border-navy-700 rounded bg-navy-900/40 p-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-1.5">Synthesis</div>
          <p className="text-xs text-navy-300 leading-relaxed">{data.synthesis}</p>
        </div>
      )}

      {/* Parallel cards */}
      <div className="space-y-2">
        {data.parallels.map((p, i) => (
          <ParallelCard key={i} parallel={p} />
        ))}
      </div>

      {/* Actionable Insights */}
      {data.actionableInsights && data.actionableInsights.length > 0 && (
        <div className="border border-accent-cyan/20 rounded bg-accent-cyan/5 p-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-accent-cyan/70 mb-1.5">Actionable Insights</div>
          <ul className="space-y-1">
            {data.actionableInsights.map((insight, i) => (
              <li key={i} className="text-[11px] text-navy-200 flex items-start gap-1.5">
                <span className="text-accent-cyan/50 mt-px shrink-0 font-mono text-[10px]">{i + 1}.</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
