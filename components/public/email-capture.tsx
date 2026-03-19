"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Check } from "lucide-react";

export function EmailCapture({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "already">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
        return;
      }
      if (data.already) {
        setStatus("already");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Failed to subscribe");
    }
  };

  if (status === "success" || status === "already") {
    return (
      <div className={className}>
        <div className="border border-accent-emerald/30 rounded-lg bg-accent-emerald/[0.04] px-4 py-3 flex items-center gap-3">
          <Check className="h-4 w-4 text-accent-emerald shrink-0" />
          <div>
            <p className="text-[11px] text-accent-emerald font-medium">
              {status === "already" ? "You're already subscribed." : "You're in. First brief arrives Monday."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">
        Weekly Intelligence Brief
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
          placeholder="you@example.com"
          className="flex-1 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-2.5 text-sm font-mono text-navy-200 placeholder:text-navy-700 focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/20 transition-colors"
        />
        <button
          type="submit"
          disabled={!isValidEmail || status === "loading"}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 text-[10px] font-mono uppercase tracking-widest text-accent-cyan hover:bg-accent-cyan/20 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
        >
          {status === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              Subscribe
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </button>
      </form>
      {status === "error" && (
        <p className="text-[10px] text-accent-rose mt-1.5">{errorMsg}</p>
      )}
      <p className="text-[9px] text-navy-700 mt-2">Free geopolitical-market analysis. No spam. Unsubscribe anytime.</p>
    </div>
  );
}
