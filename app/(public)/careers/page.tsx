import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join NEXUS Intelligence. We're building the intersection of geopolitical signal detection and market intelligence. Roles for engineers, analysts, and researchers.",
  openGraph: { title: "Careers at NEXUS Intelligence", description: "Join the team building geopolitical-market signal intelligence. Engineering, analysis, and research roles." },
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
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
          Careers
        </h1>
        <p className="font-sans text-base text-navy-400 leading-relaxed max-w-2xl mb-12">
          We are a small team building intelligence infrastructure at the
          intersection of geopolitics, markets, and AI.
        </p>

        <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-8 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-navy-500 mb-3">
            Current Openings
          </div>
          <p className="font-sans text-sm text-navy-300 leading-relaxed max-w-md mx-auto mb-6">
            There are no open positions at this time. We are a lean,
            focused team and hire selectively when the need arises.
          </p>
          <p className="font-sans text-sm text-navy-400 leading-relaxed max-w-md mx-auto">
            If you are exceptional at what you do and believe you can
            contribute to our mission, reach out via the{" "}
            <Link href="/contact" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors">
              contact page
            </Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
