"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

const HIDDEN_PATHS = ["/", "/landing", "/login", "/register", "/forgot-password", "/reset-password", "/subscribe"];

function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!endDate) return;

    function calc() {
      const diff = Math.max(0, new Date(endDate!).getTime() - Date.now());
      if (diff === 0) {
        setRemaining("0h 0m 0s");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0) {
        setRemaining(`${d}d ${h}h ${m}m ${s}s`);
      } else {
        setRemaining(`${h}h ${m}m ${s}s`);
      }
    }

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return remaining;
}

export function TrialBanner() {
  const { status, currentPeriodEnd, tier, loading, isAdmin } = useSubscription();
  const pathname = usePathname();
  const countdown = useCountdown(status === "trialing" ? currentPeriodEnd : null);

  if (loading || isAdmin) return null;
  if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/research/") || pathname.startsWith("/r/")) return null;

  const isTrial = status === "trialing";
  const isExpired = tier === "free" && status === "canceled";
  const isFree = tier === "free" && !status;

  if (!isTrial && !isExpired && !isFree) return null;

  return (
    <div className="md:ml-48 bg-navy-900/95 border-b border-navy-700/50 backdrop-blur-sm z-40 sticky top-0">
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-accent-amber shrink-0" />
          <span className="text-[11px] font-mono text-navy-300">
            {isTrial && (
              <>
                Free trial <span className="text-accent-amber">{countdown}</span> remaining
              </>
            )}
            {isExpired && "Your trial has expired. Subscribe to continue using NEXUS."}
            {isFree && "Intelligence is running. Start your free trial to see it."}
          </span>
        </div>
        <Link
          href="/settings?tab=subscription"
          className="flex items-center gap-1.5 px-3 py-1 rounded border border-navy-600/40 text-[10px] font-mono uppercase tracking-wider text-navy-200 hover:text-white hover:border-navy-500 transition-colors shrink-0"
        >
          {isTrial ? "Subscribe now" : "Upgrade"}
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}
