"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Shield, X } from "lucide-react";

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [impersonation, setImpersonation] = useState<{
    active: boolean;
    target?: string;
    remainingSeconds?: number;
  } | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function check() {
      try {
        const res = await fetch("/api/admin/impersonate");
        if (res.ok) {
          const data = await res.json();
          setImpersonation(data);
        }
      } catch {
        // ignore
      }
    }

    check();
    interval = setInterval(check, 120_000); // re-check every 2min for expiry

    return () => clearInterval(interval);
  }, [session]);

  const bannerRef = useRef<HTMLDivElement>(null);

  // Set CSS variable so fixed sidebar can shift down
  useEffect(() => {
    if (impersonation?.active && bannerRef.current) {
      const h = bannerRef.current.offsetHeight;
      document.documentElement.style.setProperty("--impersonation-banner-h", `${h}px`);
    } else {
      document.documentElement.style.setProperty("--impersonation-banner-h", "0px");
    }
    return () => {
      document.documentElement.style.setProperty("--impersonation-banner-h", "0px");
    };
  }, [impersonation?.active]);

  if (!impersonation?.active) return null;

  const minutes = Math.floor((impersonation.remainingSeconds || 0) / 60);
  const seconds = (impersonation.remainingSeconds || 0) % 60;

  async function exitImpersonation() {
    setExiting(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      // Force full page reload to reset session
      window.location.href = "/admin";
    } catch {
      setExiting(false);
    }
  }

  return (
    <div ref={bannerRef} className="sticky top-0 left-0 right-0 z-[100] bg-accent-amber/95 text-black px-4 py-2 flex items-center justify-center gap-3 text-xs font-mono shadow-lg">
      <Shield className="h-3.5 w-3.5" />
      <span className="uppercase tracking-wider font-medium">
        Impersonating: {impersonation.target}
      </span>
      <span className="text-black/60 tabular-nums">
        {minutes}:{seconds.toString().padStart(2, "0")} remaining
      </span>
      <button
        onClick={exitImpersonation}
        disabled={exiting}
        className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 transition-colors font-medium uppercase tracking-wider disabled:opacity-50"
      >
        {exiting ? "Exiting..." : (
          <>
            <X className="h-3 w-3" />
            Exit
          </>
        )}
      </button>
    </div>
  );
}
