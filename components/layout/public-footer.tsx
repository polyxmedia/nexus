import Link from "next/link";
import { Radar } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-navy-700/30 pt-16 pb-10 bg-navy-950">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Radar className="h-4.5 w-4.5 text-white" />
              <span className="text-[12px] font-semibold tracking-[0.15em] text-navy-200 font-mono">
                NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
              </span>
            </div>
            <p className="text-[11px] text-navy-400 leading-relaxed font-sans mb-4">
              Signal intelligence platform for geopolitical-market convergence analysis.
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="text-[10px] font-mono text-navy-500">All systems online</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[10px] font-mono text-navy-400 uppercase tracking-[0.2em] mb-4">Platform</h4>
            <div className="space-y-2.5">
              <Link href="/dashboard" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Dashboard</Link>
              <Link href="/chat" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">AI Analyst</Link>
              <Link href="/warroom" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">War Room</Link>
              <Link href="/signals" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Signals</Link>
              <Link href="/predictions" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Predictions</Link>
              <Link href="/trading" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Trading</Link>
            </div>
          </div>

          {/* Intelligence */}
          <div>
            <h4 className="text-[10px] font-mono text-navy-400 uppercase tracking-[0.2em] mb-4">Intelligence</h4>
            <div className="space-y-2.5">
              <Link href="/thesis" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Daily Thesis</Link>
              <Link href="/knowledge" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Knowledge Bank</Link>
              <Link href="/graph" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Entity Graph</Link>
              <Link href="/timeline" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Timeline</Link>
              <Link href="/calendar" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Calendar</Link>
              <Link href="/alerts" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Alerts</Link>
            </div>
          </div>

          {/* Research */}
          <div>
            <h4 className="text-[10px] font-mono text-navy-400 uppercase tracking-[0.2em] mb-4">Research</h4>
            <div className="space-y-2.5">
              <Link href="/research/methodology" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Methodology</Link>
              <Link href="/research/signal-theory" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Signal Theory</Link>
              <Link href="/research/prediction-accuracy" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Prediction Accuracy</Link>
              <Link href="/research/calendar-correlations" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Calendar Correlations</Link>
              <Link href="/research/foundation" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Foundation</Link>
              <Link href="/blog" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Blog</Link>
              <Link href="/research/faq" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">FAQ</Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] font-mono text-navy-400 uppercase tracking-[0.2em] mb-4">Company</h4>
            <div className="space-y-2.5">
              <Link href="/about" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">About</Link>
              <Link href="/investors" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Investors</Link>
              <Link href="/media" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Media</Link>
              <Link href="/careers" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Careers</Link>
              <Link href="/contact" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">Contact</Link>
              <Link href="/research/api" className="block text-[11px] text-navy-400 hover:text-navy-200 transition-colors font-sans">API</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-navy-800/40 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-[10px] text-navy-600 tracking-wide font-mono">
            <Link href="/terms" className="hover:text-navy-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-navy-400 transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="hover:text-navy-400 transition-colors">Cookie Policy</Link>
            <Link href="/security" className="hover:text-navy-400 transition-colors">Security</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-navy-700">NEXUS v1.0</span>
            <span className="text-[9px] text-navy-700 font-mono tabular-nums">
              {new Date().getFullYear()} NEXUS INTEL. All rights reserved.
            </span>
          </div>
        </div>

        {/* Polyxmedia credit */}
        <div className="border-t border-navy-800/20 mt-6 pt-4 text-center">
          <a
            href="https://polyxmedia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-mono text-navy-700 hover:text-navy-500 transition-colors tracking-wide"
          >
            A polyxmedia product
          </a>
        </div>
      </div>
    </footer>
  );
}
