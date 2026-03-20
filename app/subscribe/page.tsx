"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PaymentForm } from "@/components/stripe/payment-form";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  X,
  Activity,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";

interface Tier {
  id: number;
  name: string;
  price: number;
  interval: string;
  features: string[];
  highlighted: boolean;
}

const LIVE_STATS = [
  { icon: Activity, text: "47 signals detected in the last 24h", color: "text-accent-amber" },
  { icon: TrendingUp, text: "3 high-conviction theses generated today", color: "text-accent-emerald" },
  { icon: Shield, text: "2 escalation alerts triggered this session", color: "text-accent-rose" },
  { icon: Activity, text: "Hormuz corridor risk elevated to INT-5", color: "text-accent-rose" },
  { icon: TrendingUp, text: "73% prediction accuracy over 90 days", color: "text-accent-cyan" },
];

export default function SubscribePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<"payment" | "setup">("payment");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statIndex, setStatIndex] = useState(0);
  const [statVisible, setStatVisible] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  // Fetch tiers
  useEffect(() => {
    fetch("/api/subscription/tiers")
      .then((r) => r.json())
      .then((data) => {
        setTiers(data.tiers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  async function handleSelectTier(tier: Tier) {
    setSelectedTier(tier);
    setCheckoutError(null);
    setCheckoutLoading(true);
    setClientSecret(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setCheckoutError(data.error || "Failed to start checkout");
        setCheckoutLoading(false);
        return;
      }
      setClientSecret(data.clientSecret);
      setIntentType(data.type || "payment");
      setCheckoutLoading(false);

      // Scroll to payment form
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch {
      setCheckoutError("Failed to connect to payment service");
      setCheckoutLoading(false);
    }
  }

  async function handleSuccess() {
    setSuccess(true);
    // Poll until tier is activated, then redirect to dashboard
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 500 : 2000));
      try {
        const res = await fetch("/api/subscription");
        const data = await res.json();
        if (data.tier) {
          router.push("/dashboard");
          return;
        }
      } catch { /* retry */ }
    }
    // Fallback redirect after timeout
    router.push("/dashboard");
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-navy-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="h-10 w-10 text-accent-emerald mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy-100 font-mono mb-2">You're in.</h2>
          <p className="text-sm text-navy-400">Setting up your access. Redirecting to dashboard...</p>
          <Loader2 className="h-4 w-4 animate-spin text-navy-500 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  const stat = LIVE_STATS[statIndex];
  const StatIcon = stat.icon;
  const recommendedTier = tiers.find((t) => t.highlighted) || tiers[0];

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Live stat ticker */}
        <div className="mb-8 h-6 flex items-center justify-center">
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

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-navy-100 font-mono mb-3">
            Intelligence is running. Start watching.
          </h1>
          <p className="text-sm text-navy-400 max-w-lg mx-auto leading-relaxed">
            NEXUS analyses geopolitical events, market signals, and OSINT feeds in real-time.
            Pick a plan to unlock full access. Every plan starts with a 2-day free trial.
          </p>
        </div>

        {/* Trial callout */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="h-px w-12 bg-navy-700" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-cyan/70">
            2-day free trial on all plans. Cancel anytime.
          </span>
          <div className="h-px w-12 bg-navy-700" />
        </div>

        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-10">
          {tiers.map((tier) => {
            const isSelected = selectedTier?.id === tier.id;
            const isRecommended = tier.id === recommendedTier?.id;
            return (
              <div
                key={tier.id}
                className={`relative border rounded-lg p-6 transition-all duration-300 ${
                  isSelected
                    ? "border-accent-cyan/60 bg-accent-cyan/[0.04] shadow-[0_0_30px_rgba(6,182,212,0.06)]"
                    : isRecommended
                    ? "border-accent-cyan/30 bg-accent-cyan/[0.02]"
                    : "border-navy-700/60 hover:border-navy-600"
                }`}
              >
                {isRecommended && !isSelected && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-3 py-0.5 bg-navy-950 border border-accent-cyan/30 rounded-full font-mono text-[9px] uppercase tracking-wider text-accent-cyan shadow-[0_0_8px_rgba(6,182,212,0.1)]">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-sm font-bold text-navy-100 font-mono mb-1">
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-navy-100 font-mono">
                      {tier.price > 0 ? `$${(tier.price / 100).toFixed(0)}` : "Custom"}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-xs text-navy-500 font-mono">/{tier.interval}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-accent-emerald/60 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-navy-400 leading-snug">{f}</span>
                    </div>
                  ))}
                </div>

                {tier.price > 0 ? (
                  <button
                    onClick={() => handleSelectTier(tier)}
                    disabled={checkoutLoading}
                    className={`w-full py-2.5 px-4 rounded-lg font-mono text-[11px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan cursor-default"
                        : isRecommended
                        ? "bg-navy-100 text-navy-950 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                        : "border border-navy-600/60 text-navy-200 hover:border-navy-500 hover:text-white"
                    }`}
                  >
                    {checkoutLoading && selectedTier?.id === tier.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isSelected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Selected
                      </>
                    ) : (
                      <>
                        Start free trial
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href="mailto:intel@nexushq.xyz?subject=Institution%20plan%20inquiry"
                    className="w-full py-2.5 px-4 rounded-lg font-mono text-[11px] uppercase tracking-widest border border-navy-600/60 text-navy-200 hover:border-navy-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Contact us
                    <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment form */}
        {selectedTier && (
          <div ref={formRef} className="max-w-md mx-auto mb-16">
            <div className="border border-navy-700/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700/50 bg-navy-900/30">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-navy-400">
                    Subscribe to {selectedTier.name}
                  </span>
                  <span className="font-mono text-[10px] text-navy-600 ml-2">
                    ${(selectedTier.price / 100).toFixed(0)}/{selectedTier.interval} after trial
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedTier(null);
                    setClientSecret(null);
                    setCheckoutError(null);
                  }}
                  className="text-navy-500 hover:text-navy-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                {checkoutError && (
                  <p className="mb-4 font-mono text-[11px] text-accent-rose">{checkoutError}</p>
                )}
                {checkoutLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-navy-500" />
                    <span className="ml-2 text-[11px] text-navy-500 font-mono">Preparing checkout...</span>
                  </div>
                ) : clientSecret ? (
                  <PaymentForm
                    clientSecret={clientSecret}
                    intentType={intentType}
                    submitLabel={
                      intentType === "setup"
                        ? "Start free trial"
                        : `Pay $${(selectedTier.price / 100).toFixed(0)}/${selectedTier.interval}`
                    }
                    onSuccess={handleSuccess}
                    onError={(msg) => setCheckoutError(msg)}
                    returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/subscribe?status=success`}
                  />
                ) : null}
              </div>
            </div>
            <p className="mt-3 font-mono text-[9px] text-navy-600 tracking-wider text-center">
              {intentType === "setup"
                ? "Your card won't be charged today. Full access for 2 days, cancel anytime."
                : "Secured by Stripe. Cancel anytime from your account settings."
              }
            </p>
          </div>
        )}

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="font-mono text-[10px] text-navy-600 hover:text-navy-400 transition-colors tracking-wider"
          >
            Skip for now - continue on the free plan
          </button>
        </div>

        {/* Trust signals */}
        <div className="mt-16 flex items-center justify-center gap-8 opacity-40">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            <span className="font-mono text-[9px] text-navy-500 tracking-wider">Stripe secured</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            <span className="font-mono text-[9px] text-navy-500 tracking-wider">Cancel anytime</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3" />
            <span className="font-mono text-[9px] text-navy-500 tracking-wider">Real-time intelligence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
