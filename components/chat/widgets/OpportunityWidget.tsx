"use client";

interface AsymmetryData {
  score: number;
  grade: string;
  upsideMultiple: number;
  downsideExposure: string;
  crowdedness: string;
  timingSignal: string;
  factors: string[];
}

interface MonetizationPath {
  path: string;
  instruments: string[];
  rationale: string;
}

interface MarketItem {
  symbol: string;
  price: number | null;
  change: number | null;
  rsi: number | null;
  trend: string | null;
  volatilityRegime: string | null;
}

interface OpportunityData {
  opportunity: {
    description: string;
    type: string;
    timeframe: string;
    conviction: number | null;
  };
  asymmetry: AsymmetryData;
  signalSupport: { count: number; maxIntensity: number; sectors: string[] };
  marketData: MarketItem[] | null;
  gameTheory: {
    scenario: string;
    nashEquilibria: number;
    dominantOutcome: string | null;
    marketDirection: string | null;
    escalationRisk: string | null;
  } | null;
  actors: Array<{ id: string; name: string; type: string }> | null;
  regime: { label: string | null; score: number | null };
  knowledgeContext: { count: number; entries: Array<{ title: string; summary: string }> };
  monetizationPaths: MonetizationPath[];
  error?: string;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#10b981";
    case "B": return "#06b6d4";
    case "C": return "#f59e0b";
    case "D": return "#f97316";
    default: return "#f43f5e";
  }
}

function intensityDots(intensity: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: i <= intensity ? (intensity >= 4 ? "#f43f5e" : intensity >= 3 ? "#f59e0b" : "#06b6d4") : "#1a1a2e",
          }}
        />
      ))}
    </div>
  );
}

function AsymmetryGauge({ score, grade }: { score: number; grade: string }) {
  const color = gradeColor(grade);
  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500">
          Asymmetry Score
        </div>
        <div className="font-mono text-2xl font-bold" style={{ color }}>
          {grade}
        </div>
      </div>
      <div className="h-2 w-full bg-navy-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score * 100}%`, backgroundColor: color, opacity: 0.9 }}
        />
      </div>
      <div className="flex justify-between font-mono text-[9px] text-navy-700 mt-1">
        <span>poor</span>
        <span>fair</span>
        <span>good</span>
        <span>excellent</span>
      </div>
    </div>
  );
}

export function OpportunityWidget({ data }: { data: OpportunityData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { opportunity, asymmetry, signalSupport, marketData, gameTheory, regime, knowledgeContext, monetizationPaths } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Header */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
          Opportunity Analysis
        </div>
        <div className="text-sm text-navy-200 mb-3">{opportunity.description}</div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan">
            {opportunity.type}
          </span>
          <span className="font-mono text-[10px] text-navy-400">
            {opportunity.timeframe}
          </span>
          {opportunity.conviction != null && (
            <span className="font-mono text-[10px] text-navy-400">
              Prior conviction: {(opportunity.conviction * 100).toFixed(0)}%
            </span>
          )}
          {regime.label && (
            <span className="font-mono text-[10px] text-navy-500">
              Regime: {regime.label}
            </span>
          )}
        </div>
      </div>

      {/* Asymmetry gauge */}
      <div className="border border-navy-700/40 rounded bg-navy-900/60 p-4">
        <AsymmetryGauge score={asymmetry.score} grade={asymmetry.grade} />
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Upside Multiple</div>
          <div className="font-mono text-sm font-semibold text-accent-emerald">{asymmetry.upsideMultiple}x</div>
        </div>
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Downside</div>
          <div className="font-mono text-sm font-semibold" style={{
            color: asymmetry.downsideExposure === "contained" ? "#10b981" :
                   asymmetry.downsideExposure === "moderate" ? "#f59e0b" : "#f43f5e"
          }}>
            {asymmetry.downsideExposure}
          </div>
        </div>
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Crowdedness</div>
          <div className="font-mono text-sm font-semibold" style={{
            color: asymmetry.crowdedness.startsWith("low") ? "#10b981" :
                   asymmetry.crowdedness.startsWith("moderate") ? "#f59e0b" : "#f43f5e"
          }}>
            {asymmetry.crowdedness.split(" (")[0]}
          </div>
          {asymmetry.crowdedness.includes("(") && (
            <div className="font-mono text-[9px] text-navy-600 mt-0.5">
              {asymmetry.crowdedness.match(/\(([^)]+)\)/)?.[1]}
            </div>
          )}
        </div>
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">Timing</div>
          <div className="font-mono text-sm font-semibold" style={{
            color: asymmetry.timingSignal.startsWith("act") ? "#f43f5e" :
                   asymmetry.timingSignal.startsWith("prepare") ? "#f59e0b" : "#06b6d4"
          }}>
            {asymmetry.timingSignal.split(" (")[0]}
          </div>
          {asymmetry.timingSignal.includes("(") && (
            <div className="font-mono text-[9px] text-navy-600 mt-0.5">
              {asymmetry.timingSignal.match(/\(([^)]+)\)/)?.[1]}
            </div>
          )}
        </div>
      </div>

      {/* Signal support */}
      <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
        <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
          Signal Convergence Support
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-navy-400">{signalSupport.count} signals</span>
            {intensityDots(signalSupport.maxIntensity)}
          </div>
          {signalSupport.sectors.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {signalSupport.sectors.map((s) => (
                <span key={s} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-navy-800 text-navy-400">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Market data */}
      {marketData && marketData.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Market Data
          </div>
          <div className="space-y-1.5">
            {marketData.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-navy-300 font-semibold">{m.symbol}</span>
                <div className="flex items-center gap-3">
                  {m.price != null && (
                    <span className="font-mono text-[10px] text-navy-300">${m.price.toFixed(2)}</span>
                  )}
                  {m.change != null && (
                    <span className="font-mono text-[10px]" style={{ color: m.change >= 0 ? "#10b981" : "#f43f5e" }}>
                      {m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}%
                    </span>
                  )}
                  {m.rsi != null && (
                    <span className="font-mono text-[9px] text-navy-500">RSI {m.rsi.toFixed(0)}</span>
                  )}
                  {m.trend && (
                    <span className="font-mono text-[9px] text-navy-500">{m.trend}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game theory */}
      {gameTheory && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Game Theory Context
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-navy-500">Scenario: </span>
              <span className="text-navy-300">{gameTheory.scenario}</span>
            </div>
            <div>
              <span className="text-navy-500">Nash equilibria: </span>
              <span className="text-navy-300">{gameTheory.nashEquilibria}</span>
            </div>
            {gameTheory.dominantOutcome && (
              <div>
                <span className="text-navy-500">Dominant: </span>
                <span className="text-navy-300">{gameTheory.dominantOutcome}</span>
              </div>
            )}
            {gameTheory.marketDirection && (
              <div>
                <span className="text-navy-500">Direction: </span>
                <span style={{ color: gameTheory.marketDirection === "bullish" ? "#10b981" : gameTheory.marketDirection === "bearish" ? "#f43f5e" : "#f59e0b" }}>
                  {gameTheory.marketDirection}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Factors */}
      {asymmetry.factors.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Assessment Factors
          </div>
          <div className="space-y-1">
            {asymmetry.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-accent-cyan" />
                <span className="font-mono text-[10px] text-navy-400">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monetization paths */}
      {monetizationPaths.length > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Monetization Paths
          </div>
          <div className="space-y-2">
            {monetizationPaths.map((mp, i) => (
              <div key={i} className="border-l-2 border-navy-700 pl-3">
                <div className="font-mono text-[11px] text-navy-300 font-semibold">{mp.path}</div>
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {mp.instruments.map((inst) => (
                    <span key={inst} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan/80">
                      {inst}
                    </span>
                  ))}
                </div>
                <div className="font-mono text-[9px] text-navy-500 mt-0.5">{mp.rationale}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge context */}
      {knowledgeContext.count > 0 && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Knowledge Context ({knowledgeContext.count} entries)
          </div>
          <div className="space-y-1.5">
            {knowledgeContext.entries.map((e, i) => (
              <div key={i} className="font-mono text-[10px] text-navy-400">
                <span className="text-navy-300">{e.title}</span>
                {e.summary && <span className="text-navy-600"> - {e.summary.slice(0, 100)}...</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[9px] text-navy-600">
          {[
            signalSupport.count > 0 ? `${signalSupport.count} signals` : null,
            marketData ? `${marketData.length} instruments` : null,
            gameTheory ? "game theory" : null,
          ].filter(Boolean).join(" + ")} analyzed
        </span>
        <span className="font-mono text-[9px] text-navy-700">
          Asymmetric opportunity framework
        </span>
      </div>
    </div>
  );
}
