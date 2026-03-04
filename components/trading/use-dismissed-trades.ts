"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nexus:trade-suggestions";

interface DismissedEntry {
  status: "dismissed" | "executed";
  timestamp: number;
}

type DismissedMap = Record<string, DismissedEntry>;

function makeKey(thesisId: number | string, ticker: string, direction: string) {
  return `${thesisId}:${ticker}:${direction}`;
}

function load(): DismissedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(map: DismissedMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage full or unavailable
  }
}

export function useDismissedTrades() {
  const [map, setMap] = useState<DismissedMap>({});

  useEffect(() => {
    setMap(load());
  }, []);

  const isDismissed = useCallback(
    (thesisId: number | string, ticker: string, direction: string) => {
      const entry = map[makeKey(thesisId, ticker, direction)];
      return entry?.status === "dismissed";
    },
    [map]
  );

  const isExecuted = useCallback(
    (thesisId: number | string, ticker: string, direction: string) => {
      const entry = map[makeKey(thesisId, ticker, direction)];
      return entry?.status === "executed";
    },
    [map]
  );

  const dismiss = useCallback(
    (thesisId: number | string, ticker: string, direction: string) => {
      const next = { ...map, [makeKey(thesisId, ticker, direction)]: { status: "dismissed" as const, timestamp: Date.now() } };
      setMap(next);
      save(next);
    },
    [map]
  );

  const markExecuted = useCallback(
    (thesisId: number | string, ticker: string, direction: string) => {
      const next = { ...map, [makeKey(thesisId, ticker, direction)]: { status: "executed" as const, timestamp: Date.now() } };
      setMap(next);
      save(next);
    },
    [map]
  );

  return { isDismissed, isExecuted, dismiss, markExecuted };
}
