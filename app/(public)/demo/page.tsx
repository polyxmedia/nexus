import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle,
  ChevronRight,
  Globe,
  Radar,
  Shield,
  Target,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Strategic Intelligence Demo — NEXUS × Emergent Approach",
  robots: { index: false, follow: false },
};

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-mono text-navy-500 uppercase tracking-[0.25em] mb-3">{label}</p>
  );
}

function Rule() {
  return <div className="h-px w-8 bg-navy-700 mb-6" />;
}

function SignalBadge({ intensity, label }: { intensity: 1 | 2 | 3 | 4 | 5; label: string }) {
  const colors = ["", "#6b7280", "#9ca3af", "#f59e0b", "#f97316", "#ef4444"];
  const bg = ["", "#6b728015", "#9ca3af15", "#f59e0b20", "#f9731620", "#ef444420"];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border"
      style={{ color: colors[intensity], borderColor: colors[intensity] + "40", background: bg[intensity] }}
    >
      <span className="inline-block w-1 h-1 rounded-full" style={{ background: colors[intensity] }} />
      {label} · {intensity}/5
    </span>
  );
}

function BottleneckSignalCard({
  bottleneck,
  gpr,
  signals,
  regime,
  killCondition,
}: {
  bottleneck: string;
  gpr: number;
  signals: Array<{ label: string; intensity: 1 | 2 | 3 | 4 | 5 }>;
  regime: string;
  killCondition: string;
}) {
  return (
    <div className="border border-navy-700/60 rounded-lg bg-navy-900/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-1">Bottleneck</p>
          <p className="text-sm text-navy-100 font-sans leading-snug">{bottleneck}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-mono text-navy-500 mb-0.5">GPR INDEX</p>
          <p className="text-lg font-mono text-accent-rose font-bold">{gpr.toFixed(0)}</p>
          <p className="text-[9px] font-mono text-navy-600">EXTREME</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-2">Active Signals</p>
        <div className="flex flex-wrap gap-1.5">
          {signals.map((s) => (
            <SignalBadge key={s.label} intensity={s.intensity} label={s.label} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-navy-800/40 rounded p-2.5">
          <p className="text-[9px] font-mono text-navy-600 uppercase mb-1">Market Regime</p>
          <p className="text-xs font-mono text-accent-amber">{regime}</p>
        </div>
        <div className="bg-navy-800/40 rounded p-2.5">
          <p className="text-[9px] font-mono text-navy-600 uppercase mb-1">Turbulence</p>
          <p className="text-xs font-mono text-accent-rose">99th pct</p>
        </div>
      </div>

      <div className="border-t border-navy-800/60 pt-3">
        <p className="text-[9px] font-mono text-navy-600 uppercase mb-1">Kill Condition</p>
        <p className="text-[11px] text-navy-400 font-sans leading-snug">{killCondition}</p>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
        <span className="text-[10px] font-mono text-navy-500">Live NEXUS data · updated 4 min ago</span>
      </div>
    </div>
  );
}

function MiniModuleCard({
  title,
  description,
  icon: Icon,
  preview,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  preview: React.ReactNode;
}) {
  return (
    <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-navy-800/60">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className="w-3.5 h-3.5 text-navy-400" />
          <p className="text-xs font-mono text-navy-200">{title}</p>
        </div>
        <p className="text-[11px] text-navy-500 font-sans leading-snug">{description}</p>
      </div>
      <div className="p-4">{preview}</div>
    </div>
  );
}

function StrategyRow({
  letter,
  strategy,
  nexusScore,
  nexusLabel,
  signals,
  direction,
}: {
  letter: string;
  strategy: string;
  nexusScore: number;
  nexusLabel: string;
  signals: string;
  direction: "bullish" | "bearish" | "neutral";
}) {
  const dirColor = direction === "bullish" ? "#10b981" : direction === "bearish" ? "#ef4444" : "#f59e0b";
  const scoreColor = nexusScore >= 70 ? "#10b981" : nexusScore >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-navy-800/40 last:border-0">
      <div
        className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-mono font-bold shrink-0 bg-navy-800/60 text-navy-300"
      >
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-navy-200 font-sans leading-snug truncate">{strategy}</p>
        <p className="text-[10px] text-navy-500 font-mono mt-0.5">{signals}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono font-bold" style={{ color: scoreColor }}>{nexusScore}</p>
        <p className="text-[9px] font-mono" style={{ color: dirColor }}>{nexusLabel}</p>
      </div>
    </div>
  );
}

function ComparisonRow({ dimension, mckinsey, nexusEa }: { dimension: string; mckinsey: string; nexusEa: string }) {
  return (
    <div className="grid grid-cols-[1fr,1fr,1fr] gap-4 py-3 border-b border-navy-800/30 last:border-0">
      <p className="text-[11px] text-navy-400 font-sans">{dimension}</p>
      <p className="text-[11px] text-navy-600 font-sans">{mckinsey}</p>
      <p className="text-[11px] text-navy-200 font-sans">{nexusEa}</p>
    </div>
  );
}

export default function DemoPage() {
  return (
    <main className="pt-14 text-navy-200">

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-navy-800" />
          <span className="text-[10px] font-mono text-navy-600 tracking-[0.2em]">CONFIDENTIAL · STRATEGIC BRIEF</span>
          <div className="h-px flex-1 bg-navy-800" />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Radar className="w-8 h-8 text-white opacity-80" />
          <span className="text-[11px] font-mono text-navy-400 tracking-[0.15em]">NEXUS Intelligence</span>
          <span className="text-navy-700">×</span>
          <span className="text-[11px] font-mono text-navy-400 tracking-[0.15em]">Emergent Approach</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-sans font-bold text-white leading-[1.1] mb-6 max-w-3xl">
          The strategic environment,<br />
          <span className="text-navy-300">live inside your framework.</span>
        </h1>

        <p className="text-base text-navy-400 font-sans leading-relaxed max-w-2xl mb-8">
          Emergent Approach identifies the Bottleneck. NEXUS tells you when it is about to shift, what is driving it, and what the kill condition looks like. Together, they turn strategic planning from a quarterly exercise into a live intelligence operation.
        </p>

        <div className="flex flex-wrap gap-4 text-[11px] font-mono text-navy-500">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
            Real-time geopolitical signal layer
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-navy-500" />
            EA Triad enriched with live market data
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
            Kill conditions auto-monitored
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="border-y border-navy-800/40 bg-navy-900/20 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel label="The Gap" />
          <Rule />
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-sans font-bold text-navy-100 mb-4">
                McKinsey gives you a report. The world does not wait for reports.
              </h2>
              <p className="text-sm text-navy-400 leading-relaxed font-sans mb-4">
                Traditional strategy consulting delivers a static document. By the time it is printed, the geopolitical environment that informed it has shifted. Tariff regimes expire. Rare earth export bans are imposed overnight. Central banks pivot. Conflicts start.
              </p>
              <p className="text-sm text-navy-400 leading-relaxed font-sans">
                The Emergent Approach already solves the framework problem. The bottleneck is no longer "how do I structure my strategy?" It is "how do I know when my strategic assumptions just changed?"
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Tariff truce expiry", date: "Nov 10, 2026", risk: "HIGH" },
                { label: "China rare earth FDPR active", date: "Jan 2026", risk: "ACTIVE" },
                { label: "Hormuz closure · Op Epic Fury", date: "Mar 2, 2026", risk: "CRITICAL" },
                { label: "BIS semiconductor controls tightening", date: "Feb 2026", risk: "HIGH" },
                { label: "Taiwan gray-zone escalation", date: "Ongoing", risk: "ELEVATED" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-navy-800/40 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-3 h-3 text-accent-amber shrink-0" />
                    <span className="text-[11px] text-navy-300 font-sans">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-navy-600">{item.date}</span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: item.risk === "CRITICAL" ? "#ef444420" : item.risk === "ACTIVE" ? "#f9731620" : "#f59e0b20",
                        color: item.risk === "CRITICAL" ? "#ef4444" : item.risk === "ACTIVE" ? "#f97316" : "#f59e0b",
                      }}
                    >
                      {item.risk}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] font-mono text-navy-600 pt-1">None of these appeared in a McKinsey deck. All are live NEXUS signals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Bottleneck Demo */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel label="Live Demo — Bottleneck Intelligence" />
        <Rule />
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-sans font-bold text-navy-100 mb-3">
              Your Bottleneck. NEXUS-enriched.
            </h2>
            <p className="text-sm text-navy-400 leading-relaxed font-sans mb-4">
              When a user defines a Bottleneck inside Emergent Approach, NEXUS maps it to live signal data, geopolitical risk scores, and market regime indicators in real time. The framework stays current automatically.
            </p>
            <p className="text-sm text-navy-400 leading-relaxed font-sans">
              Below is a live example: a technology sector executive identified "US-China decoupling" as their dominant Bottleneck. NEXUS surfaces exactly what is driving it, how intense it is, and what would invalidate the strategic assumption.
            </p>
          </div>

          <div className="bg-navy-900/40 border border-navy-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-5 rounded bg-navy-800 flex items-center justify-center">
                <Target className="w-3 h-3 text-navy-400" />
              </div>
              <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Emergent Approach · Triad</span>
            </div>
            <div className="space-y-3">
              <div className="bg-navy-800/40 rounded p-3 border-l-2 border-accent-emerald">
                <p className="text-[9px] font-mono text-accent-emerald mb-1">ASPIRATION</p>
                <p className="text-[11px] text-navy-200 leading-snug">Achieve semiconductor supply chain independence by 2028</p>
              </div>
              <div className="bg-navy-800/40 rounded p-3 border-l-2 border-accent-rose">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-mono text-accent-rose">BOTTLENECK · DOMINANT</p>
                  <span className="text-[9px] font-mono text-accent-rose bg-accent-rose/10 px-1.5 py-0.5 rounded">NEXUS LINKED</span>
                </div>
                <p className="text-[11px] text-navy-200 leading-snug">US-China technology decoupling restricts access to advanced EUV tools and rare earth inputs</p>
              </div>
              <div className="bg-navy-800/40 rounded p-3 border-l-2 border-navy-600">
                <p className="text-[9px] font-mono text-navy-500 mb-1">STRATEGY A</p>
                <p className="text-[11px] text-navy-200 leading-snug">Invest in ASML partnerships and domestic SMIC-equivalent capability</p>
              </div>
            </div>
          </div>
        </div>

        <BottleneckSignalCard
          bottleneck="US-China technology decoupling: EUV access, rare earth restrictions, semiconductor export controls"
          gpr={597}
          signals={[
            { label: "Taiwan Strait", intensity: 4 },
            { label: "Rare Earth Export Ban", intensity: 4 },
            { label: "BIS Chip Controls", intensity: 3 },
            { label: "IEEPA Ruling", intensity: 3 },
            { label: "China Defence +7%", intensity: 2 },
          ]}
          regime="Risk-off · Elevated volatility · Dollar crisis"
          killCondition="Trump-Xi summit produces binding technology agreement + tariff truce extended to 2028. Probability: 12%. Monitor: November 2026 cliff."
        />
      </section>

      {/* Strategy Assessment with NEXUS */}
      <section className="border-y border-navy-800/40 bg-navy-900/20 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel label="SAM Enrichment — Strategy Assessment Matrix" />
          <Rule />
          <div className="grid md:grid-cols-[1fr,320px] gap-8">
            <div>
              <h2 className="text-xl font-sans font-bold text-navy-100 mb-3">
                NEXUS scores your strategy alternatives against the live environment.
              </h2>
              <p className="text-sm text-navy-400 leading-relaxed font-sans mb-6">
                The SAM evaluates strategies against fitness criteria. NEXUS adds a live environmental score to each strategy row, showing how well each alternative aligns with the current geopolitical-market regime. The matrix updates as conditions change.
              </p>

              <div className="border border-navy-700/50 rounded-lg overflow-hidden">
                <div className="bg-navy-800/40 px-4 py-2.5 flex items-center gap-3 border-b border-navy-800">
                  <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Strategy Alternatives</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
                    <span className="text-[9px] font-mono text-navy-600">NEXUS scoring live</span>
                  </div>
                </div>
                <div className="px-4">
                  <StrategyRow
                    letter="A"
                    strategy="ASML partnership + domestic fab investment"
                    nexusScore={74}
                    nexusLabel="ALIGNED"
                    signals="3 supporting signals · TSMC dependency risk flagged"
                    direction="bullish"
                  />
                  <StrategyRow
                    letter="B"
                    strategy="BRICS-aligned supply chain (Chinese fab route)"
                    nexusScore={22}
                    nexusLabel="EXPOSED"
                    signals="Hormuz closed · rare earth FDPR active · sanctions risk"
                    direction="bearish"
                  />
                  <StrategyRow
                    letter="C"
                    strategy="Dual-track manufacturing (Western + China-lite)"
                    nexusScore={58}
                    nexusLabel="HEDGED"
                    signals="Complex execution · 2 kill conditions active"
                    direction="neutral"
                  />
                  <StrategyRow
                    letter="D"
                    strategy="Acquire rare earth refining capacity (non-China)"
                    nexusScore={81}
                    nexusLabel="HIGH FIT"
                    signals="MP Materials, Lynas: structurally bullish · 5 signals"
                    direction="bullish"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-900/30">
                <p className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-3">Fitness Criteria · NEXUS Layer</p>
                {[
                  { label: "Geopolitical Alignment", score: 88 },
                  { label: "Supply Chain Resilience", score: 61 },
                  { label: "Regulatory Risk", score: 34 },
                  { label: "Timeline Feasibility", score: 72 },
                  { label: "Capital Efficiency", score: 55 },
                ].map((c) => (
                  <div key={c.label} className="mb-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-sans text-navy-400">{c.label}</span>
                      <span className="text-[10px] font-mono" style={{ color: c.score >= 70 ? "#10b981" : c.score >= 45 ? "#f59e0b" : "#ef4444" }}>
                        {c.score}
                      </span>
                    </div>
                    <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.score}%`,
                          background: c.score >= 70 ? "#10b981" : c.score >= 45 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-900/30">
                <p className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-2">Systemic Risk</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-mono font-bold text-accent-rose">67</span>
                  <span className="text-xs text-navy-500 font-mono mb-0.5">/100 · Fragile</span>
                </div>
                <p className="text-[10px] font-sans text-navy-500 mt-1 leading-snug">
                  Turbulence at 99th percentile. Returns highly unusual vs. historical distribution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mini Modules */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel label="NEXUS Mini Modules for Emergent Approach" />
        <Rule />
        <h2 className="text-xl font-sans font-bold text-navy-100 mb-3 max-w-2xl">
          Embeddable intelligence panels, native inside EA.
        </h2>
        <p className="text-sm text-navy-400 leading-relaxed font-sans mb-8 max-w-2xl">
          These modules sit alongside your Triad and SAM views. Each one monitors a specific intelligence dimension and surfaces live context without leaving the strategic planning workflow. No separate platform. No separate login.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <MiniModuleCard
            title="Bottleneck Signal Monitor"
            description="Live signals mapped to a specific Bottleneck. Updates automatically as new geopolitical events are detected."
            icon={Activity}
            preview={
              <div className="space-y-2">
                {[
                  { label: "Taiwan Strait · Gray-zone", intensity: 4 as const, delta: "+1" },
                  { label: "Rare Earth Export Controls", intensity: 4 as const, delta: "new" },
                  { label: "BIS Chip Rule Tightening", intensity: 3 as const, delta: "=" },
                  { label: "China Defence Budget +7%", intensity: 2 as const, delta: "new" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <SignalBadge intensity={s.intensity} label={s.label} />
                    <span className="text-[9px] font-mono text-navy-600">{s.delta}</span>
                  </div>
                ))}
              </div>
            }
          />

          <MiniModuleCard
            title="Strategic Environment Gauge"
            description="Market regime composite score showing current risk appetite, volatility, and macro direction."
            icon={BarChart3}
            preview={
              <div className="space-y-2.5">
                {[
                  { label: "Volatility", value: "Elevated", score: -0.5, color: "#ef4444" },
                  { label: "Growth", value: "Stable", score: 0.2, color: "#10b981" },
                  { label: "Risk Appetite", value: "Risk-off", score: -0.3, color: "#f59e0b" },
                  { label: "Dollar", value: "Crisis", score: -0.6, color: "#ef4444" },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-navy-500 w-20 shrink-0">{d.label}</span>
                    <div className="flex-1 h-1 bg-navy-800 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${(1 + d.score) * 50}%`, background: d.color }} />
                    </div>
                    <span className="text-[10px] font-mono w-16 text-right" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            }
          />

          <MiniModuleCard
            title="Kill Condition Tracker"
            description="Monitors the events that would invalidate a strategy. Alerts when conditions approach threshold."
            icon={Shield}
            preview={
              <div className="space-y-2">
                {[
                  { condition: "Trump-Xi binding tech deal", probability: 12, status: "MONITORING" },
                  { condition: "Tariff truce extended to 2028", probability: 18, status: "MONITORING" },
                  { condition: "TSMC Taiwan disruption", probability: 31, status: "WATCH" },
                  { condition: "Hormuz reopens < 30 days", probability: 24, status: "WATCH" },
                ].map((k) => (
                  <div key={k.condition} className="flex items-center justify-between py-1.5 border-b border-navy-800/40 last:border-0">
                    <span className="text-[10px] text-navy-400 font-sans flex-1 pr-2 leading-snug">{k.condition}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-navy-500">{k.probability}%</span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: k.status === "WATCH" ? "#f59e0b15" : "#ffffff08",
                          color: k.status === "WATCH" ? "#f59e0b" : "#6b7280",
                        }}
                      >
                        {k.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            }
          />

          <MiniModuleCard
            title="Strategy OSINT Feed"
            description="Live global news filtered to events relevant to the active strategy. Sourced from GDELT and 6 signal layers."
            icon={Globe}
            preview={
              <div className="space-y-2">
                {[
                  { headline: "China amps up pressure on Japan with export bans", source: "NYT", ago: "12d" },
                  { headline: "Semiconductor sanction paradox fuelling China domestic push", source: "HST", ago: "34d" },
                  { headline: "MP Materials reports record rare earth output", source: "GLOBE", ago: "5d" },
                  { headline: "TSMC secures 2026 US advanced fab funding", source: "Reuters", ago: "8d" },
                ].map((n) => (
                  <div key={n.headline} className="flex items-start gap-2 py-1.5 border-b border-navy-800/40 last:border-0">
                    <ChevronRight className="w-3 h-3 text-navy-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-navy-300 leading-snug line-clamp-2">{n.headline}</p>
                      <p className="text-[9px] font-mono text-navy-600 mt-0.5">{n.source} · {n.ago} ago</p>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      </section>

      {/* McKinsey comparison */}
      <section className="border-y border-navy-800/40 bg-navy-900/20 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel label="Competitive Advantage" />
          <Rule />
          <h2 className="text-xl font-sans font-bold text-navy-100 mb-3">
            What clients of the Emergent Approach now have that McKinsey cannot deliver.
          </h2>
          <p className="text-sm text-navy-400 font-sans leading-relaxed mb-8 max-w-2xl">
            McKinsey engagements cost $500K to $5M and produce static documents. The strategic environment they describe is outdated before the deck is reviewed. Emergent Approach + NEXUS is live, adaptive, and priced at a fraction of a single consulting engagement.
          </p>

          <div className="border border-navy-700/40 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr,1fr,1fr] bg-navy-800/40 px-4 py-3 border-b border-navy-800">
              <p className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Dimension</p>
              <p className="text-[10px] font-mono text-navy-600 uppercase tracking-wider">McKinsey</p>
              <p className="text-[10px] font-mono text-navy-300 uppercase tracking-wider">EA + NEXUS</p>
            </div>
            <div className="px-4">
              <ComparisonRow dimension="Strategic environment data" mckinsey="Static. Snapshot in time." nexusEa="Live. 6 signal layers. Updates continuously." />
              <ComparisonRow dimension="Bottleneck identification" mckinsey="Consultant-driven. 8-12 week engagement." nexusEa="User-driven with AI sidekick. Days, not months." />
              <ComparisonRow dimension="Strategy evaluation" mckinsey="Qualitative. Slide-based." nexusEa="Quantitative. SAM matrix + live NEXUS scoring." />
              <ComparisonRow dimension="Kill condition monitoring" mckinsey="None. Engagement ends." nexusEa="Automated. Continuous alerts." />
              <ComparisonRow dimension="Geopolitical signal layer" mckinsey="Country reports. Months stale." nexusEa="GPR index, OSINT, shipping, regime data — live." />
              <ComparisonRow dimension="Cost" mckinsey="$500K–$5M per engagement" nexusEa="Platform subscription. Fraction of one report." />
              <ComparisonRow dimension="Time to insight" mckinsey="Weeks to months" nexusEa="Minutes" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel label="Integration Architecture" />
        <Rule />
        <h2 className="text-xl font-sans font-bold text-navy-100 mb-8">Bidirectional. Seamless. No new workflow.</h2>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {[
            {
              step: "01",
              title: "EA defines the Triad",
              description: "The executive team identifies Aspirations, Bottlenecks, and Strategies using the Emergent Approach framework. This is the strategic intent layer.",
              icon: Target,
              color: "#9ca3af",
            },
            {
              step: "02",
              title: "NEXUS maps live signals",
              description: "NEXUS links each Bottleneck to the live signal environment: geopolitical events, market regime, GPR index, shipping chokepoints, macro data.",
              icon: Radar,
              color: "#f59e0b",
            },
            {
              step: "03",
              title: "Intelligence flows both ways",
              description: "Regime shifts surface as Bottleneck updates in EA. New EA Strategies are scored by the NEXUS signal layer. The framework adapts to reality.",
              icon: Zap,
              color: "#10b981",
            },
          ].map((item) => (
            <div key={item.step} className="border border-navy-700/40 rounded-lg p-5 bg-navy-900/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-mono" style={{ color: item.color }}>{item.step}</span>
                <item.icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <h3 className="text-sm font-sans font-semibold text-navy-100 mb-2">{item.title}</h3>
              <p className="text-[11px] text-navy-500 font-sans leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="border border-navy-700/30 rounded-lg p-6 bg-navy-900/20">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-navy-400" />
            <p className="text-[11px] font-mono text-navy-400 uppercase tracking-wider">The AI Analyst, EA-aware</p>
          </div>
          <p className="text-sm text-navy-400 font-sans leading-relaxed mb-4">
            The NEXUS AI Analyst already speaks the Emergent Approach language. Ask it about the strategic environment shaping a Bottleneck and it will respond with signal data, regime context, game theory scenarios, and kill conditions — framed in the vocabulary your clients already use.
          </p>
          <div className="bg-navy-800/40 rounded p-4 border border-navy-700/30">
            <p className="text-[10px] font-mono text-navy-600 mb-2">Example query →</p>
            <p className="text-[11px] text-navy-300 font-mono italic">
              "Analyse the current geopolitical bottlenecks constraining US semiconductor autonomy and map their strategic implications in Triad terms."
            </p>
          </div>
        </div>
      </section>

      {/* What clients get */}
      <section className="border-t border-navy-800/40 bg-navy-900/20 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel label="For Your Clients" />
          <Rule />
          <h2 className="text-xl font-sans font-bold text-navy-100 mb-8">What an EA client with NEXUS can do that no one else can.</h2>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Walk into a board meeting and show live geopolitical risk scores mapped directly to each strategic bottleneck",
              "Know within minutes when a kill condition on an active strategy has triggered",
              "Score competing strategy alternatives against the live market regime, not last quarter's consulting report",
              "Monitor the strategic environment 24/7 without a consultant on retainer",
              "Build a living strategy document that updates as the world changes",
              "Demonstrate to investors that strategic decisions are grounded in live intelligence, not intuition",
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 p-4 border border-navy-700/30 rounded-lg bg-navy-900/20">
                <CheckCircle className="w-4 h-4 text-accent-emerald mt-0.5 shrink-0" />
                <p className="text-[11px] text-navy-300 font-sans leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="h-px flex-1 max-w-16 bg-navy-800" />
          <Radar className="w-6 h-6 text-white opacity-40" />
          <div className="h-px flex-1 max-w-16 bg-navy-800" />
        </div>
        <h2 className="text-2xl font-sans font-bold text-white mb-4">
          The strategic framework and the signal layer.<br />
          Built for the same moment.
        </h2>
        <p className="text-sm text-navy-400 font-sans leading-relaxed max-w-xl mx-auto mb-2">
          Emergent Approach structures the thinking. NEXUS reads the environment. Together, they replace what used to require a team of consultants and a six-figure research budget.
        </p>
        <p className="text-[11px] font-mono text-navy-600 mb-10">
          nexusintelligence.io × emergentapproach.com
        </p>

        <div className="inline-flex items-center gap-2 px-6 py-3 border border-navy-700 rounded-lg bg-navy-800/40 text-navy-300 text-sm font-mono tracking-wide">
          <Radar className="w-4 h-4" />
          nexusintelligence.io
        </div>
      </section>
    </main>
  );
}
