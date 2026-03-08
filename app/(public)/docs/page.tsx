import { Metadata } from "next";
import { Lock } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "NEXUS Intelligence API documentation. Integrate signal detection, convergence data, and intelligence outputs into your own systems.",
  openGraph: { title: "NEXUS Intelligence API Docs", description: "Integrate NEXUS signal detection and convergence data into your systems." },
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
            Developers
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-4">
          API Documentation
        </h1>
        <p className="font-sans text-base text-navy-400 leading-relaxed max-w-2xl mb-12">
          Integrate NEXUS signal intelligence into your own systems.
        </p>

        <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-8 text-center">
          <Lock className="w-6 h-6 text-navy-500 mx-auto mb-4" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-3">
            Coming Soon
          </div>
          <p className="font-sans text-sm text-navy-300 leading-relaxed max-w-md mx-auto mb-4">
            The NEXUS API is currently in private beta. Programmatic access to
            signal data, convergence events, and intelligence briefs will be
            available to Operator and Institution tier subscribers.
          </p>
          <p className="font-sans text-sm text-navy-400 leading-relaxed max-w-md mx-auto mb-6">
            Interested in early access? Get in touch.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}
