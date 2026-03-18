"use client";

import { useState, useEffect } from "react";

export interface TierData {
  id: number;
  name: string;
  price: number;
  interval: string;
  features: string[];
  highlighted: boolean;
}

let tiersCache: TierData[] | null = null;

export function useTiers(): { tiers: TierData[]; loading: boolean } {
  const [tiers, setTiers] = useState<TierData[]>(tiersCache || []);
  const [loading, setLoading] = useState(!tiersCache);

  useEffect(() => {
    if (tiersCache) return;
    fetch("/api/subscription/tiers")
      .then((r) => r.json())
      .then((data) => {
        const fetched = (data.tiers || []) as TierData[];
        tiersCache = fetched;
        setTiers(fetched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { tiers, loading };
}

/** Format price for display: 19900 -> "$199.00", 0 -> "Custom" */
export function formatPrice(price: number): string {
  if (price === 0) return "Custom";
  return `$${(price / 100).toFixed(2)}`;
}

/** Rough annual discount (15% off) */
export function formatAnnualPrice(price: number): string {
  if (price === 0) return "Custom";
  return `$${((price * 0.85) / 100).toFixed(2)}`;
}
