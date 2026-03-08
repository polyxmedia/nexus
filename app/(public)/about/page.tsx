import { Radar, Shield, Globe, Zap } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
            Company
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-4">
          About NEXUS
        </h1>
        <p className="font-sans text-base text-navy-400 leading-relaxed max-w-2xl mb-12">
          NEXUS is a signal intelligence platform built for analysts, traders,
          and institutions who operate at the intersection of geopolitics and
          global markets.
        </p>

        <div className="space-y-8">
          <section className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-6">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400 mb-3">
              What We Do
            </h2>
            <p className="font-sans text-sm text-navy-300 leading-relaxed">
              We monitor five independent signal layers, geopolitical events,
              calendar systems, celestial cycles, market data, and open-source
              intelligence, to detect convergence patterns that precede major
              market dislocations. Our AI synthesis engine transforms raw signal
              data into structured intelligence briefs with directional
              assessments and scenario modelling.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: "Intelligence-Grade Analysis",
                body: "Every assessment traces back to observable data points. No black boxes, no unsubstantiated claims. Full traceability from raw signal to final recommendation.",
              },
              {
                icon: Globe,
                title: "Multi-Domain Coverage",
                body: "Five signal layers operating independently ensure that convergence events represent genuine cross-domain alignment, not noise from correlated sources.",
              },
              {
                icon: Zap,
                title: "Real-Time Detection",
                body: "Continuous monitoring with automated alerting. Signal detection runs 24/7 across all layers with configurable notification thresholds.",
              },
              {
                icon: Radar,
                title: "Self-Calibrating",
                body: "Every prediction is tracked and scored. Outcomes feed back into the system to adjust detection thresholds, convergence weights, and synthesis parameters.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-4 h-4 text-navy-500" />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200">
                      {item.title}
                    </h3>
                  </div>
                  <p className="font-sans text-sm text-navy-400 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>

          <section className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-6">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400 mb-3">
              Our Approach
            </h2>
            <p className="font-sans text-sm text-navy-300 leading-relaxed mb-3">
              Markets do not move in isolation. Geopolitical events, calendar
              cycles, and celestial patterns have historically correlated with
              significant market dislocations. NEXUS was built on the premise
              that monitoring these domains independently and scoring their
              convergence can surface high-conviction opportunities before they
              become consensus.
            </p>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              We are not a prediction engine. We are a convergence detection
              system. The distinction matters: we identify elevated-probability
              windows, not certainties. Every output is probabilistic, every
              recommendation is traceable, and every prediction is scored
              against actual outcomes.
            </p>
          </section>

          <div className="text-center pt-4">
            <Link
              href="/research/methodology"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              Read our methodology
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
