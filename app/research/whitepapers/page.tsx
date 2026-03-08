"use client";

import { FileText } from "lucide-react";

export default function WhitepapersPage() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-px h-5 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-cyan/60">
            Research Library
          </span>
        </div>
        <h1 className="text-2xl font-sans font-bold text-navy-100 mb-1">
          Working Papers
        </h1>
        <p className="text-sm font-sans text-navy-500 max-w-xl mb-12">
          Peer-reviewed research from the NEXUS Intelligence team covering signal analysis,
          geopolitical risk modelling, and quantitative frameworks.
        </p>

        <div className="rounded border border-navy-700/20 bg-navy-900/30 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-navy-800/60 flex items-center justify-center mx-auto mb-4">
            <FileText size={20} className="text-navy-500" />
          </div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-navy-300 mb-2">
            Coming Soon
          </h2>
          <p className="font-sans text-[13px] text-navy-500 max-w-md mx-auto leading-relaxed">
            Our research team is preparing the first batch of working papers for publication.
            Topics will include multi-layer signal convergence, geopolitical risk simulation,
            and calendar-based volatility analysis.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded border border-navy-700/20 bg-navy-900/30 p-8 text-center">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-navy-300 mb-2">
            Get notified when papers drop
          </h3>
          <p className="font-sans text-[13px] text-navy-500 mb-5 max-w-md mx-auto leading-relaxed">
            Platform members will receive early access to all working papers,
            appendix data, and the underlying models.
          </p>
          <a
            href="/register"
            className="inline-block px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-navy-200 bg-accent-cyan/10 border border-accent-cyan/20 rounded hover:bg-accent-cyan/15 hover:border-accent-cyan/30 transition-all"
          >
            Request Access
          </a>
        </div>
      </div>
    </main>
  );
}
