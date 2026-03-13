"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";
import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, ArrowRight, Zap, Activity, TrendingUp, Shield, Loader2, X } from "lucide-react";
import { PaymentForm } from "@/components/stripe/payment-form";

const TIER_LABELS: Record<string, string> = {
  analyst: "Observer",
  operator: "Operator",
  institution: "Station",
};

const TIER_PERKS: Record<string, string[]> = {
  analyst: [
    "Signal detection engine",
    "Daily thesis generation",
    "Market sentiment analysis",
    "Prediction tracking with Brier scores",
    "War Room with OSINT feeds",
  ],
  operator: [
    "Everything in Observer, plus",
    "Game theory scenarios",
    "Vessel tracking & dark fleet intel",
    "Monte Carlo simulation & portfolio risk",
    "GEX, BOCPD & regime detection",
    "On-chain, options flow & congressional trading",
  ],
  institution: [
    "Everything in Operator, plus",
    "API access & white-label briefings",
    "PDF intelligence exports",
    "Unlimited AI credits",
    "Custom data integrations",
  ],
};

const LIVE_STATS = [
  { icon: Activity, text: "47 signals detected in the last 24h", color: "text-accent-amber" },
  { icon: TrendingUp, text: "3 high-conviction theses generated today", color: "text-accent-emerald" },
  { icon: Shield, text: "2 escalation alerts triggered this session", color: "text-accent-rose" },
  { icon: Activity, text: "Hormuz corridor risk elevated to INT-5", color: "text-accent-rose" },
  { icon: TrendingUp, text: "73% prediction accuracy over 90 days", color: "text-accent-cyan" },
];

interface UpgradeGateProps {
  minTier: "free" | "analyst" | "operator" | "institution";
  feature: string;
  children: React.ReactNode;
  blur?: boolean;
}

export function UpgradeGate({ minTier, feature, children, blur }: UpgradeGateProps) {
  const { meetsMinTier, loading, tier, refresh } = useSubscription();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [statIndex, setStatIndex] = useState(0);
  const [statVisible, setStatVisible] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [tierPrice, setTierPrice] = useState<number | null>(null);
  const [matchedTierId, setMatchedTierId] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<"payment" | "setup">("payment");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Rotate live stats
  useEffect(() => {
    const interval = setInterval(() => {
      setStatVisible(false);
      setTimeout(() => {
        setStatIndex((i) => (i + 1) % LIVE_STATS.length);
        setStatVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch tier data
  useEffect(() => {
    fetch("/api/subscription/tiers")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.tiers) return;
        // Map internal tier keys to DB tier names (supports both old and new names)
        const tierNameMap: Record<string, string[]> = {
          analyst: ["observer", "analyst"],
          operator: ["operator"],
          institution: ["station", "institution"],
        };
        const validNames = tierNameMap[minTier] || [minTier];
        const match = data.tiers.find((t: { name: string }) =>
          validNames.includes(t.name.toLowerCase())
        );
        if (match) {
          if (match.price) setTierPrice(match.price);
          setMatchedTierId(match.id);
        }
      })
      .catch((err) => console.error("[UpgradeGate] fetch tier data failed:", err));
  }, [minTier]);

  // Poll for subscription activation after checkout
  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      await refresh();
    }, 2000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // If tier changes while checkout is open, subscription activated
  useEffect(() => {
    if (showCheckout && meetsMinTier(minTier)) {
      stopPolling();
      setShowCheckout(false);
      setClientSecret(null);
    }
  }, [tier, showCheckout, minTier, meetsMinTier]);

  const handleSubscribe = useCallback(async () => {
    if (!matchedTierId) {
      setCheckoutError("Plan not available. Please try again.");
      return;
    }

    setCheckoutError(null);
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: matchedTierId }),
      });

      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setCheckoutError(data.error || "Failed to start checkout");
        return;
      }

      setClientSecret(data.clientSecret);
      setIntentType(data.type || "payment");
      setShowCheckout(true);
      startPolling();
    } catch {
      setCheckoutError("Failed to connect to payment service");
    } finally {
      setCheckoutLoading(false);
    }
  }, [matchedTierId]);

  const priceDisplay = tierPrice ? `$${(tierPrice / 100).toFixed(0)}/mo` : null;

  // Show payment form -- must be checked BEFORE loading so that polling
  // during checkout doesn't unmount the Stripe Elements form
  if (showCheckout && clientSecret) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] uppercase tracking-wider text-navy-400">
              Subscribe to {TIER_LABELS[minTier]}
              {priceDisplay && <span className="text-navy-500 ml-2">{priceDisplay}</span>}
            </span>
            <button
              onClick={() => { setShowCheckout(false); setClientSecret(null); }}
              className="text-navy-500 hover:text-navy-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="border border-navy-700/50 rounded-lg p-5">
            <PaymentForm
              clientSecret={clientSecret}
              intentType={intentType}
              submitLabel={intentType === "setup" ? "Start free trial" : "Subscribe"}
              onSuccess={() => {
                refresh();
              }}
              returnUrl={`${window.location.origin}/settings?tab=subscription&status=success`}
            />
          </div>
          <p className="mt-3 font-mono text-[9px] text-navy-600 tracking-wider text-center">
            {intentType === "setup"
              ? "2 days free, full access. Cancel anytime before you're charged."
              : "Secured by Stripe. Cancel anytime."
            }
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-4 h-4 border-2 border-navy-600 border-t-navy-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (meetsMinTier(minTier)) {
    return <>{children}</>;
  }

  // Not authenticated - redirect to login
  if (tier === null) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-4 h-4 border-2 border-navy-600 border-t-navy-300 rounded-full animate-spin" />
      </div>
    );
  }

  const perks = TIER_PERKS[minTier] || TIER_PERKS.analyst;
  const stat = LIVE_STATS[statIndex];
  const StatIcon = stat.icon;

  return (
    <div className="relative min-h-[70vh]">
      {blur && (
        <div className="pointer-events-none select-none blur-md opacity-15 min-h-[60vh]">
          {children}
        </div>
      )}
      <div className={`${blur ? "absolute inset-0" : ""} flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center py-24 px-8">
          {/* Animated live stat ticker */}
          <div className="mb-10 h-6 flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-2 transition-all duration-400 ${
                statVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <StatIcon className={`w-3 h-3 ${stat.color}`} />
              <span className="font-mono text-[10px] text-navy-400 tracking-wide">
                {stat.text}
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/60 mb-3">
            <Lock className="w-3.5 h-3.5 text-navy-600" />
            {TIER_LABELS[minTier]} tier
            {priceDisplay && (
              <span className="text-navy-500 normal-case tracking-normal ml-1">{priceDisplay}</span>
            )}
          </div>

          <h3 className="font-sans text-xl font-semibold text-navy-100 mb-2.5">
            Unlock {feature}
          </h3>

          <p className="font-sans text-[13px] text-navy-500 mb-10 leading-relaxed max-w-sm mx-auto">
            You're missing live intelligence right now. {feature} is running, you just can't see it yet.
          </p>

          {/* Perks list */}
          <div className="text-left max-w-xs mx-auto mb-10 space-y-2.5">
            {perks.map((perk) => (
              <div key={perk} className="flex items-start gap-2.5">
                <Zap className="w-3 h-3 text-accent-cyan/40 mt-0.5 shrink-0" />
                <span className="font-sans text-[12px] text-navy-400 leading-snug">{perk}</span>
              </div>
            ))}
          </div>

          {/* Error message */}
          {checkoutError && (
            <p className="mb-4 font-mono text-[11px] text-accent-rose">{checkoutError}</p>
          )}

          {/* CTA */}
          <button
            onClick={handleSubscribe}
            disabled={!matchedTierId || checkoutLoading}
            className="group inline-flex items-center gap-2.5 px-8 py-3 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!matchedTierId || checkoutLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading
              </>
            ) : (
              <>
                Start free trial
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <p className="mt-4 font-mono text-[9px] text-navy-600 tracking-wider">
            2 days free, full access. Cancel anytime before you're charged.
          </p>
        </div>
      </div>
    </div>
  );
}
