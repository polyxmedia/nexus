"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

export function OutageBanner() {
  const [outage, setOutage] = useState<{ message: string; since: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = () => {
      fetch("/api/status")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.status === "degraded") {
            setOutage({ message: data.message, since: data.since });
          } else {
            setOutage(null);
          }
        })
        .catch(() => {});
    };

    check();
    intervalRef.current = setInterval(check, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!outage) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-accent-amber/10 border-b border-accent-amber/30 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-center">
        <AlertTriangle className="h-3.5 w-3.5 text-accent-amber shrink-0" />
        <span className="text-[11px] font-mono text-accent-amber">
          {outage.message}
        </span>
      </div>
    </div>
  );
}
