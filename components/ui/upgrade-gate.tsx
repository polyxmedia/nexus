"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";
import Link from "next/link";
import { Lock } from "lucide-react";

interface UpgradeGateProps {
  minTier: "analyst" | "observer" | "operator" | "institution";
  feature: string;
  children: React.ReactNode;
}

const TIER_LABELS: Record<string, string> = {
  analyst: "Observer",
  observer: "Observer",
  operator: "Operator",
  institution: "Institution",
};

/**
 * Wraps content that requires a minimum tier.
 * Shows upgrade prompt if user doesn't meet the requirement.
 */
export function UpgradeGate({ minTier, feature, children }: UpgradeGateProps) {
  const { meetsMinTier, loading, tier } = useSubscription();

  if (loading) return <>{children}</>;

  if (meetsMinTier(minTier)) {
    return <>{children}</>;
  }

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-900/60 p-6 text-center">
      <Lock className="h-6 w-6 text-navy-500 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-navy-200 mb-1">
        {feature}
      </h3>
      <p className="text-xs text-navy-500 mb-4 max-w-sm mx-auto">
        This feature requires a {TIER_LABELS[minTier]} subscription
        {tier && tier !== "free" ? ` (you are on ${TIER_LABELS[tier] || tier})` : ""}.
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-navy-100 bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg hover:bg-accent-cyan/20 transition-all"
      >
        Upgrade Plan
      </Link>
    </div>
  );
}
