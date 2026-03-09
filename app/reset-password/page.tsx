"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Radar, ArrowLeft, Check, ShieldCheck } from "lucide-react";

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

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-accent-rose" };
  if (score <= 2) return { score, label: "Fair", color: "bg-accent-amber" };
  if (score <= 3) return { score, label: "Good", color: "bg-accent-cyan" };
  return { score, label: "Strong", color: "bg-accent-emerald" };
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setValid(data.valid);
        if (data.username) setUsername(data.username);
      })
      .catch(() => setValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong");
    }

    setLoading(false);
  }

  const strength = getPasswordStrength(password);
  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-6";
  const visible = "opacity-100 translate-y-0";

  if (validating) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-navy-600 border-t-navy-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="w-full max-w-sm">
        <div className={`text-center mb-10 ${base} ${mounted ? visible : hidden}`}>
          <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-4 block">
            Invalid Link
          </span>
          <h1 className="text-[28px] font-light tracking-tight text-navy-100 font-sans leading-tight">
            Link Expired
          </h1>
          <p className="text-[13px] text-navy-500 mt-3 font-sans">
            This reset link is invalid or has expired. Request a new one.
          </p>
        </div>

        <div
          className={`auth-card rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-8 text-center ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "150ms" }}
        >
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-navy-400 hover:text-navy-200 transition-colors"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div className={`text-center mb-10 ${base} ${mounted ? visible : hidden}`}>
          <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-4 block">
            Password Updated
          </span>
          <h1 className="text-[28px] font-light tracking-tight text-navy-100 font-sans leading-tight">
            You're All Set
          </h1>
        </div>

        <div
          className={`auth-card rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-8 text-center space-y-4 ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "150ms" }}
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-accent-emerald" />
          </div>
          <p className="text-[13px] text-navy-300 font-sans">
            Your password has been reset successfully.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-2 px-5 py-3 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className={`text-center mb-10 ${base} ${mounted ? visible : hidden}`}>
        <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-4 block">
          Account Recovery
        </span>
        <h1 className="text-[28px] font-light tracking-tight text-navy-100 font-sans leading-tight">
          Set New Password
        </h1>
        {username && (
          <p className="text-[13px] text-navy-500 mt-3 font-sans">
            Resetting password for <span className="text-navy-300 font-mono">{username}</span>
          </p>
        )}
      </div>

      <div
        className={`auth-card rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-8 ${base} ${mounted ? visible : hidden}`}
        style={{ transitionDelay: "150ms" }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                New Password
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 10 characters"
              className="w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
              autoFocus
              required
              minLength={10}
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= strength.score ? strength.color : "bg-navy-800"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-navy-500">
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                Confirm Password
              </span>
              {confirm.length > 0 && password === confirm && (
                <Check className="w-3 h-3 text-accent-emerald" />
              )}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent-rose/[0.06] border border-accent-rose/10">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-rose animate-pulse" />
              <p className="text-[11px] text-accent-rose font-mono">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirm}
            className="group w-full flex items-center justify-center gap-2.5 px-5 py-3 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border border-navy-400/40 border-t-navy-200 rounded-full animate-spin" />
                <span>Resetting</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Sign In
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-navy-600 border-t-navy-300 rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
