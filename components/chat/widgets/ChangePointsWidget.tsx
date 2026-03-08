"use client";

interface ChangePoint {
  date: string;
  dataStream: string;
  probability: number;
  runLength: number;
  magnitude: number;
  direction: "up" | "down";
  priorMean: number;
  postMean: number;
}

interface BOCPDState {
  stream: string;
  label: string;
  currentValue: number | null;
  currentRunLength: number;
  lastChangePoint: ChangePoint | null;
  changePoints: ChangePoint[];
}

interface ChangePointsData {
  streams?: BOCPDState[];
  recentChangePoints?: ChangePoint[];
  activeRegimes?: number;
  generatedAt?: string;
  // Single stream filter result
  stream?: string;
  label?: string;
  currentValue?: number | null;
  currentRunLength?: number;
  lastChangePoint?: ChangePoint | null;
  changePoints?: ChangePoint[];
  error?: string;
}

function probColor(prob: number): string {
  if (prob >= 0.8) return "#f43f5e";
  if (prob >= 0.5) return "#f59e0b";
  return "#06b6d4";
}

function dirColor(dir: string): string {
  return dir === "up" ? "#10b981" : "#f43f5e";
}

function ChangePointRow({ cp }: { cp: ChangePoint }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-navy-800/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: probColor(cp.probability) }}
        />
        <span className="font-mono text-[10px] text-navy-300 truncate">
          {cp.dataStream}
        </span>
        <span
          className="font-mono text-[9px] font-semibold"
          style={{ color: dirColor(cp.direction) }}
        >
          {cp.direction === "up" ? "+" : "-"}{Math.abs(cp.magnitude).toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[9px] text-navy-500">
          p={cp.probability.toFixed(2)}
        </span>
        <span className="font-mono text-[9px] text-navy-600">
          {cp.date}
        </span>
      </div>
    </div>
  );
}

function StreamCard({ state }: { state: BOCPDState }) {
  const hasRecent = state.lastChangePoint !== null;
  const runColor = state.currentRunLength < 10 ? "#f59e0b" : state.currentRunLength < 30 ? "#06b6d4" : "#10b981";

  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500">{state.label}</div>
          {state.currentValue !== null && (
            <div className="font-mono text-sm text-navy-300 mt-0.5">
              {state.currentValue.toFixed(2)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-[9px] text-navy-600">Run Length</div>
          <div className="font-mono text-sm font-semibold" style={{ color: runColor }}>
            {state.currentRunLength}d
          </div>
        </div>
      </div>

      {/* Run length bar */}
      <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden mt-1.5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (state.currentRunLength / 120) * 100)}%`,
            backgroundColor: runColor,
            opacity: 0.7,
          }}
        />
      </div>

      {hasRecent && state.lastChangePoint && (
        <div className="mt-2 pt-2 border-t border-navy-800/50">
          <div className="font-mono text-[9px] text-navy-600 mb-0.5">Last Change Point</div>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-semibold"
              style={{ color: dirColor(state.lastChangePoint.direction) }}
            >
              {state.lastChangePoint.direction === "up" ? "+" : "-"}
              {Math.abs(state.lastChangePoint.magnitude).toFixed(2)}
            </span>
            <span className="font-mono text-[9px] text-navy-500">
              p={state.lastChangePoint.probability.toFixed(2)}
            </span>
            <span className="font-mono text-[9px] text-navy-600">
              {state.lastChangePoint.date}
            </span>
          </div>
          <div className="font-mono text-[9px] text-navy-600 mt-0.5">
            {state.lastChangePoint.priorMean.toFixed(2)} → {state.lastChangePoint.postMean.toFixed(2)}
          </div>
        </div>
      )}

      {/* All change points */}
      {state.changePoints.length > 1 && (
        <div className="mt-2 pt-2 border-t border-navy-800/50">
          <div className="font-mono text-[9px] text-navy-600 mb-1">
            {state.changePoints.length} change points detected
          </div>
          {state.changePoints.slice(0, 3).map((cp, i) => (
            <div key={i} className="flex items-center gap-2 mt-0.5">
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: probColor(cp.probability) }} />
              <span className="font-mono text-[9px] text-navy-500">{cp.date}</span>
              <span
                className="font-mono text-[9px]"
                style={{ color: dirColor(cp.direction) }}
              >
                {cp.direction === "up" ? "+" : "-"}{Math.abs(cp.magnitude).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChangePointsWidget({ data }: { data: ChangePointsData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  // Single stream result
  if (data.stream && !data.streams) {
    const state: BOCPDState = {
      stream: data.stream,
      label: data.label || data.stream,
      currentValue: data.currentValue ?? null,
      currentRunLength: data.currentRunLength ?? 0,
      lastChangePoint: data.lastChangePoint ?? null,
      changePoints: data.changePoints ?? [],
    };

    return (
      <div className="my-2">
        <StreamCard state={state} />
        <div className="font-mono text-[9px] text-navy-700 px-1 mt-2">
          BOCPD (Adams & MacKay 2007)
        </div>
      </div>
    );
  }

  const { streams = [], recentChangePoints = [], activeRegimes = 0, generatedAt } = data;

  if (streams.length === 0) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-500 font-mono">
        No change-point data available
      </div>
    );
  }

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
              Change-Point Detection
            </div>
            <div className="font-mono text-sm text-navy-300">
              {streams.length} data streams monitored
            </div>
          </div>
          <div className="text-right">
            {generatedAt && (
              <div className="font-mono text-[9px] text-navy-600 mb-1">
                {new Date(generatedAt).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short",
                })}
              </div>
            )}
            <div className="font-mono text-lg font-bold text-accent-cyan">
              {activeRegimes}
            </div>
            <div className="font-mono text-[9px] text-navy-600">active regimes</div>
          </div>
        </div>
      </div>

      {/* Recent change points */}
      {recentChangePoints.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Recent Structural Breaks
          </div>
          {recentChangePoints.slice(0, 6).map((cp, i) => (
            <ChangePointRow key={i} cp={cp} />
          ))}
        </div>
      )}

      {/* Stream cards */}
      <div className="grid grid-cols-2 gap-2">
        {streams.map((s) => (
          <StreamCard key={s.stream} state={s} />
        ))}
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] text-navy-700 px-1">
        Bayesian Online Change-Point Detection (Adams & MacKay 2007)
      </div>
    </div>
  );
}
