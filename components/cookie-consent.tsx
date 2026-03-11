"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "nexus-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-navy-700 bg-navy-900/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <p className="text-[11px] font-mono text-navy-300 leading-relaxed">
          This site uses essential cookies for authentication and security. No tracking cookies are used.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/cookies"
            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 transition-colors"
          >
            Manage
          </Link>
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 rounded hover:bg-accent-cyan/25 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
