"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
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
  isAdmin: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  canAccess: (feature: keyof TierLimits) => boolean;
  meetsMinTier: (minTier: "analyst" | "operator" | "institution") => boolean;
  refresh: () => Promise<void>;
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
  isAdmin: false,
  status: null,
  currentPeriodEnd: null,
  canAccess: () => false,
  meetsMinTier: () => false,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const r = await fetch("/api/subscription");
      if (r.status === 401) {
        setTier(null);
        setLoading(false);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!data) return;

      if (data.isAdmin) {
        setIsAdmin(true);
        setTier("institution");
        setTierName("Institution");
      }
      if (data.subscription) {
        setStatus(data.subscription.status || null);
        setCurrentPeriodEnd(data.subscription.currentPeriodEnd || null);
      }
      if (data.tier) {
        setTierName(data.tier.name);
        setTier(data.tier.name?.toLowerCase() || "free");
        try {
          setLimits(JSON.parse(data.tier.limits));
        } catch {
          // no limits
        }
      } else if (!data.isAdmin) {
        setTier("free");
      }
      setLoading(false);
    } catch {
      setTier("free");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSubscription();
    }
  }, [fetchSubscription]);

  const canAccess = useCallback(
    (feature: keyof TierLimits): boolean => {
      if (isAdmin) return true;
      if (!limits) return false;
      const val = limits[feature];
      if (typeof val === "boolean") return val;
      if (typeof val === "number") return val !== 0;
      if (typeof val === "string") return val !== "none";
      return false;
    },
    [limits, isAdmin]
  );

  const meetsMinTier = useCallback(
    (minTier: "analyst" | "operator" | "institution"): boolean => {
      if (isAdmin) return true;
      const userLevel = TIER_LEVELS[tier || "free"] ?? 0;
      const requiredLevel = TIER_LEVELS[minTier] ?? 1;
      return userLevel >= requiredLevel;
    },
    [tier, isAdmin]
  );

  return React.createElement(
    SubscriptionContext.Provider,
    { value: { tier, tierName, limits, loading, isAdmin, status, currentPeriodEnd, canAccess, meetsMinTier, refresh: fetchSubscription } },
    children
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
