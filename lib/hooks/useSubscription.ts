"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import React from "react";

interface TierLimits {
  chatMessages: number;
  warRoomAccess: "none" | "view" | "full";
  tradingIntegration: boolean;
  apiAccess: boolean;
  customSignalLayers: boolean;
}

interface SubscriptionState {
  tier: string | null;
  tierName: string | null;
  limits: TierLimits | null;
  loading: boolean;
  canAccess: (feature: keyof TierLimits) => boolean;
  meetsMinTier: (minTier: "analyst" | "operator" | "institution") => boolean;
}

const TIER_LEVELS: Record<string, number> = {
  free: 0,
  analyst: 1,
  operator: 2,
  institution: 3,
};

const SubscriptionContext = createContext<SubscriptionState>({
  tier: null,
  tierName: null,
  limits: null,
  loading: true,
  canAccess: () => false,
  meetsMinTier: () => false,
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (data.tier) {
          setTierName(data.tier.name);
          setTier(data.tier.name?.toLowerCase() || "free");
          try {
            setLimits(JSON.parse(data.tier.limits));
          } catch {
            // no limits
          }
        } else {
          setTier("free");
        }
        setLoading(false);
      })
      .catch(() => {
        setTier("free");
        setLoading(false);
      });
  }, []);

  const canAccess = useCallback(
    (feature: keyof TierLimits): boolean => {
      if (!limits) return false;
      const val = limits[feature];
      if (typeof val === "boolean") return val;
      if (typeof val === "number") return val !== 0;
      if (typeof val === "string") return val !== "none";
      return false;
    },
    [limits]
  );

  const meetsMinTier = useCallback(
    (minTier: "analyst" | "operator" | "institution"): boolean => {
      const userLevel = TIER_LEVELS[tier || "free"] ?? 0;
      const requiredLevel = TIER_LEVELS[minTier] ?? 1;
      return userLevel >= requiredLevel;
    },
    [tier]
  );

  return React.createElement(
    SubscriptionContext.Provider,
    { value: { tier, tierName, limits, loading, canAccess, meetsMinTier } },
    children
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
