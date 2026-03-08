"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radar, ArrowRight, ArrowUpRight, Lock } from "lucide-react";

// ── Grid background (matches homepage) ──
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
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 4px)",
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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials");
    } else {
      router.push("/dashboard");
    }
  }

  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-6";
  const visible = "opacity-100 translate-y-0";

  return (
    <main className="min-h-screen relative overflow-hidden bg-navy-950 flex flex-col">
      <GridBackground />

      {/* Ambient blurs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-cyan/[0.02] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-accent-rose/[0.015] rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-navy-800/30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Radar className="h-5 w-5 text-white" />
            <span className="text-sm font-semibold tracking-[0.15em] text-navy-200 font-mono">
              NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
            </span>
          </Link>
          <Link
            href="/register"
            className="group flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase text-navy-500 hover:text-navy-300 transition-colors"
          >
            Create Account
            <ArrowUpRight className="h-3 w-3 text-navy-600 group-hover:text-navy-400 transition-colors" />
          </Link>
        </div>
      </header>

      {/* Centered form */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div
            className={`text-center mb-10 ${base} ${mounted ? visible : hidden}`}
          >
            <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-4 block">
              Secure Access
            </span>
            <h1 className="text-[28px] font-light tracking-tight text-navy-100 font-sans leading-tight">
              Sign in to NEXUS
            </h1>
            <p className="text-[13px] text-navy-500 mt-3 font-sans">
              Access your intelligence dashboard and signal engine.
            </p>
          </div>

          {/* Card */}
          <div
            className={`rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-8 ${base} ${mounted ? visible : hidden}`}
            style={{ transitionDelay: "150ms" }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                    Username
                  </span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
                  autoFocus
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                    Password
                  </span>
                  <Lock className="w-3 h-3 text-navy-700" />
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
                  required
                  autoComplete="current-password"
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
                disabled={loading}
                className="group w-full flex items-center justify-center gap-2.5 px-5 py-3 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-navy-400/40 border-t-navy-200 rounded-full animate-spin" />
                    <span>Authenticating</span>
                  </>
                ) : (
                  <>
                    <span>Enter Platform</span>
                    <ArrowRight className="h-3 w-3 text-navy-500 group-hover:text-navy-300 group-hover:translate-x-0.5 transition-all" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Register link */}
          <div
            className={`mt-6 text-center ${base} ${mounted ? visible : hidden}`}
            style={{ transitionDelay: "300ms" }}
          >
            <p className="text-[11px] text-navy-600 font-sans">
              No account?{" "}
              <Link
                href="/register"
                className="text-navy-400 hover:text-navy-200 transition-colors font-mono uppercase tracking-wider text-[10px]"
              >
                Request access
              </Link>
            </p>
          </div>

          {/* System status */}
          <div
            className={`mt-8 flex items-center justify-center gap-4 ${base} ${mounted ? "opacity-100" : "opacity-0"}`}
            style={{ transitionDelay: "500ms" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="text-[10px] font-mono text-navy-600">System Online</span>
            </div>
            <span className="text-navy-800">|</span>
            <span className="text-[10px] font-mono text-navy-600">5 Signal Layers Active</span>
            <span className="text-navy-800">|</span>
            <span className="text-[10px] font-mono text-navy-600">Encrypted</span>
          </div>
        </div>
      </div>
    </main>
  );
}
