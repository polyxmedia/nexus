"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  Activity,
  BarChart3,
  Globe,
  MessageSquare,
  ArrowRight,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface WelcomeModalProps {
  open: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to NEXUS",
    subtitle: "Intelligence platform for geopolitical-market convergence",
    content: [
      { icon: Activity, label: "GEO Layer", desc: "Geopolitical event detection and actor-belief modeling" },
      { icon: BarChart3, label: "MKT Layer", desc: "Market technicals, GEX, short interest, options flow" },
      { icon: Globe, label: "OSI Layer", desc: "OSINT events, shipping intelligence, conflict data" },
      { icon: Zap, label: "Risk Layer", desc: "Systemic risk, regime detection, change-point analysis" },
    ],
  },
  {
    title: "Get Started",
    subtitle: "Key areas to explore",
    actions: [
      { href: "/signals", label: "Signals", desc: "View active signal convergences across all layers" },
      { href: "/predictions", label: "Predictions", desc: "Track forecasts with Brier score calibration" },
      { href: "/warroom", label: "War Room", desc: "Geopolitical map with aircraft and OSINT overlays" },
      { href: "/chat/new", label: "Chat Analyst", desc: "AI analyst with 60+ intelligence tools" },
    ],
  },
  {
    title: "Connect Your Data",
    subtitle: "Optional integrations for full capability",
    links: [
      { href: "/settings?tab=ai", label: "API Keys", desc: "Configure market data and AI providers" },
      { href: "/settings?tab=trading", label: "Trading", desc: "Connect Trading 212 or Coinbase" },
      { href: "/settings?tab=notifications", label: "Notifications", desc: "Set up email and alert preferences" },
    ],
  },
];

export function WelcomeModal({ open, onComplete }: WelcomeModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleComplete = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "onboarding_completed", value: "true" }),
      });
    } catch { /* silent */ }
    onComplete();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleComplete()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md shadow-2xl overflow-hidden">
          {/* Progress */}
          <div className="flex gap-1 px-6 pt-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-accent-cyan" : "bg-navy-700"
                }`}
              />
            ))}
          </div>

          <div className="p-6">
            {/* Header */}
            <Dialog.Title className="text-lg font-semibold text-navy-100 font-mono">
              {current.title}
            </Dialog.Title>
            <Dialog.Description className="text-xs text-navy-400 mt-1">
              {current.subtitle}
            </Dialog.Description>

            {/* Step content */}
            <div className="mt-5 space-y-2.5">
              {/* Step 1: Signal layers */}
              {"content" in current && current.content?.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-navy-700/30 bg-navy-950/60 p-3"
                >
                  <div className="rounded bg-accent-cyan/10 border border-accent-cyan/20 p-2">
                    <item.icon className="h-3.5 w-3.5 text-accent-cyan" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-300">
                      {item.label}
                    </span>
                    <p className="text-[11px] text-navy-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}

              {/* Step 2: Actions */}
              {"actions" in current && current.actions?.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={handleComplete}
                  className="flex items-center gap-3 rounded-lg border border-navy-700/30 bg-navy-950/60 p-3 hover:bg-navy-800/40 hover:border-navy-600/40 transition-colors group"
                >
                  <div className="flex-1">
                    <span className="text-xs font-medium text-navy-200">
                      {action.label}
                    </span>
                    <p className="text-[11px] text-navy-500 mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-navy-600 group-hover:text-navy-400 transition-colors" />
                </Link>
              ))}

              {/* Step 3: Settings links */}
              {"links" in current && current.links?.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleComplete}
                  className="flex items-center gap-3 rounded-lg border border-navy-700/30 bg-navy-950/60 p-3 hover:bg-navy-800/40 hover:border-navy-600/40 transition-colors group"
                >
                  <div className="rounded bg-navy-800/60 border border-navy-700/30 p-2">
                    <Settings className="h-3.5 w-3.5 text-navy-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-navy-200">
                      {link.label}
                    </span>
                    <p className="text-[11px] text-navy-500 mt-0.5">{link.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-navy-600 group-hover:text-navy-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-5">
            <button
              onClick={handleComplete}
              className="text-[10px] font-mono text-navy-600 hover:text-navy-400 transition-colors uppercase tracking-wider"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                  className="text-navy-400"
                >
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => (isLast ? handleComplete() : setStep(step + 1))}
              >
                {isLast ? "Start Exploring" : "Next"}
                {!isLast && <ArrowRight className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
