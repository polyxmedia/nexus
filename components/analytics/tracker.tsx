"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let vid = localStorage.getItem("_nxv");
  if (!vid) {
    vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("_nxv", vid);
  }
  return vid;
}

function isLocal(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.startsWith("192.168.") || h.startsWith("10.");
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    if (isLocal()) return;
    if (pathname === lastPath.current) return;

    // Calculate duration on previous page
    const duration =
      lastPath.current && enteredAt.current
        ? Math.round((Date.now() - enteredAt.current) / 1000)
        : undefined;

    const prevPath = lastPath.current;
    lastPath.current = pathname;
    enteredAt.current = Date.now();

    // Send duration update for previous page (if any)
    if (prevPath && duration && duration > 0 && duration < 3600) {
      fetch("/api/analytics/track", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: prevPath, duration }),
      }).catch((err) => console.error("[Analytics] duration update failed:", err));
    }

    // Track new pageview
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        visitorId: getVisitorId(),
      }),
    }).catch((err) => console.error("[Analytics] pageview tracking failed:", err));
  }, [pathname]);

  // Send duration on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (isLocal()) return;
      if (!lastPath.current || !enteredAt.current) return;
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      if (duration > 0 && duration < 3600) {
        navigator.sendBeacon(
          "/api/analytics/track",
          JSON.stringify({
            _type: "duration",
            path: lastPath.current,
            duration,
          })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return null;
}
