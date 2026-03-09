"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";
import { useState, useEffect, useCallback } from "react";
import { Lock, ArrowRight, Zap, Activity, TrendingUp, Shield, X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const TIER_LABELS: Record<string, string> = {
  analyst: "Analyst",
  operator: "Operator",
  institution: "Institution",
};

const TIER_PERKS: Record<string, string[]> = {
  analyst: [
    "Signal detection across 6 intelligence layers",
    "AI analyst, 100 messages per day",
    "Prediction tracking with Brier scores",
    "Daily thesis generation",
    "Economic and calendar convergence",
  ],
  operator: [
    "Everything in Analyst, plus",
    "Unlimited AI analyst access",
    "Live trading broker integration",
    "Real-time War Room with OSINT feeds",
    "GEX, BOCPD, GPR decomposition",
    "Portfolio risk analytics and Monte Carlo",
  ],
  institution: [
    "Everything in Operator, plus",
    "Unlimited seats across your team",
    "Custom data integrations",
    "Dedicated infrastructure",
    "SLA guarantee and direct support",
  ],
};

const LIVE_STATS = [
  { icon: Activity, text: "47 signals detected in the last 24h", color: "text-accent-amber" },
  { icon: TrendingUp, text: "3 high-conviction theses generated today", color: "text-accent-emerald" },
  { icon: Shield, text: "2 escalation alerts triggered this session", color: "text-accent-rose" },
  { icon: Activity, text: "Hormuz corridor risk elevated to INT-5", color: "text-accent-rose" },
  { icon: TrendingUp, text: "73% prediction accuracy over 90 days", color: "text-accent-cyan" },
];

const TIER_IDS: Record<string, number> = {
  analyst: 1,
  operator: 2,
  institution: 3,
};

interface UpgradeGateProps {
  minTier: "analyst" | "operator" | "institution";
  feature: string;
  children: React.ReactNode;
  blur?: boolean;
}

export function UpgradeGate({ minTier, feature, children, blur }: UpgradeGateProps) {
  const { meetsMinTier, loading, tier } = useSubscription();
  const [statIndex, setStatIndex] = useState(0);
  const [statVisible, setStatVisible] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

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

  const fetchClientSecret = useCallback(() => {
    return fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId: TIER_IDS[minTier], embedded: true }),
    })
      .then((r) => r.json())
      .then((data) => data.clientSecret);
  }, [minTier]);

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

  // If not authenticated (tier is null), redirect to login instead of showing paywall
  if (tier === null && !loading) {
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

  // Embedded checkout view
  if (showCheckout) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-lg mx-auto py-12 px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/60">
              <Lock className="w-3.5 h-3.5 text-navy-600" />
              Subscribe to {TIER_LABELS[minTier]}
            </div>
            <button
              onClick={() => setShowCheckout(false)}
              className="p-1.5 text-navy-500 hover:text-navy-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl border border-navy-700/40 overflow-hidden bg-navy-900/40">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout className="stripe-embedded-checkout" />
            </EmbeddedCheckoutProvider>
          </div>

          <p className="mt-4 text-center font-mono text-[9px] text-navy-600 tracking-wider">
            Secured by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    );
  }

  // Sales pitch view
  return (
    <div className="relative min-h-[70vh]">
      {blur && (
        <div className="pointer-events-none select-none blur-md opacity-15">
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

          {/* CTA */}
          <button
            onClick={() => setShowCheckout(true)}
            className="group inline-flex items-center gap-2.5 px-8 py-3 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]"
          >
            Start free trial
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          <p className="mt-4 font-mono text-[9px] text-navy-600 tracking-wider">
            2 days free, full access, no credit card
          </p>
        </div>
      </div>
    </div>
  );
}
