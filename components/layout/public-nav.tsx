"use client";

import Link from "next/link";
import { Radar } from "lucide-react";

export function PublicNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-700/40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Radar className="h-5 w-5 text-white" />
          <span className="text-sm font-semibold tracking-[0.15em] text-navy-200 font-mono">
            NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/research/methodology" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
            METHODOLOGY
          </Link>
          <Link href="/research/whitepapers" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
            RESEARCH
          </Link>
          <Link href="/about" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
            ABOUT
          </Link>
          <Link href="/investors" className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block">
            INVESTORS
          </Link>
          <Link
            href="/login"
            className="text-[11px] text-navy-400 hover:text-navy-200 transition-colors tracking-wide hidden md:block"
          >
            SIGN IN
          </Link>
          <Link
            href="/register"
            className="px-4 py-1.5 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
          >
            Request Access
          </Link>
        </div>
      </div>
    </header>
  );
}
