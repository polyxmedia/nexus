"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Radar, ArrowLeft, Mail } from "lucide-react";

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, transparent 0%, var(--color-navy-950) 70%)",
        }}
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
    } catch {
      // Silently handle — always show success
    }

    setLoading(false);
    setSent(true);
  }

  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-6";
  const visible = "opacity-100 translate-y-0";

  return (
    <main className="min-h-screen relative overflow-hidden bg-navy-950 flex flex-col">
      <GridBackground />

      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-cyan/[0.02] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-accent-rose/[0.015] rounded-full blur-[100px] pointer-events-none" />

      <header className="relative z-10 border-b border-navy-800/30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Radar className="h-5 w-5 text-white" />
            <span className="text-sm font-semibold tracking-[0.15em] text-navy-200 font-mono">
              NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="group flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors"
          >
            <ArrowLeft className="h-3 w-3 text-navy-600 group-hover:text-navy-400 transition-colors" />
            Back to Sign In
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div
            className={`text-center mb-10 ${base} ${mounted ? visible : hidden}`}
          >
            <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-4 block">
              Account Recovery
            </span>
            <h1 className="text-[28px] font-light tracking-tight text-navy-100 font-sans leading-tight">
              Reset Password
            </h1>
            <p className="text-[13px] text-navy-500 mt-3 font-sans">
              Enter your username or email to receive a reset link.
            </p>
          </div>

          <div
            className={`auth-card rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-8 ${base} ${mounted ? visible : hidden}`}
            style={{ transitionDelay: "150ms" }}
          >
            {sent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-accent-emerald" />
                </div>
                <div>
                  <p className="text-[14px] text-navy-200 font-sans mb-2">Check your email</p>
                  <p className="text-[12px] text-navy-500 font-sans leading-relaxed">
                    If an account exists with that username or email, we've sent password reset instructions. The link expires in 1 hour.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 mt-4 text-[11px] font-mono tracking-widest uppercase text-navy-400 hover:text-navy-200 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                      Username or Email
                    </span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter username or email"
                    className="w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
                    autoFocus
                    required
                    autoComplete="username"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="group w-full flex items-center justify-center gap-2.5 px-5 py-3 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-navy-400/40 border-t-navy-200 rounded-full animate-spin" />
                      <span>Sending</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div
            className={`mt-8 flex items-center justify-center gap-4 ${base} ${mounted ? "opacity-100" : "opacity-0"}`}
            style={{ transitionDelay: "500ms" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="text-[10px] font-mono text-navy-600">System Online</span>
            </div>
            <span className="text-navy-800">|</span>
            <span className="text-[10px] font-mono text-navy-600">Encrypted</span>
          </div>
        </div>
      </div>
    </main>
  );
}
