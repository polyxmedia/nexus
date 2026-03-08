"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Radar, Activity, Globe, Shield, TrendingUp, Lock } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email: email || undefined, referralCode: referralCode || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setError("Account created. Please sign in.");
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] border-r border-navy-800/40 px-14 py-14 bg-navy-900/20 relative overflow-hidden">

        {/* Ambient grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top: Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <Radar className="h-5 w-5 text-white" />
            <span className="text-sm font-mono tracking-[0.15em] text-navy-200">
              NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
            </span>
          </div>

          <h2 className="text-4xl font-sans font-bold text-white leading-[1.1] mb-5 max-w-md">
            Intelligence before<br />
            <span className="text-navy-300">consensus catches up.</span>
          </h2>
          <p className="text-sm text-navy-400 font-sans leading-relaxed max-w-sm">
            Six independent signal layers. AI-driven convergence analysis. Real-time geopolitical-market intelligence for analysts, traders, and institutions.
          </p>
        </div>

        {/* Middle: Live indicators */}
        <div className="space-y-3 my-10">
          {[
            { icon: Activity, label: "Signal Engine", value: "6 active layers", status: "live" },
            { icon: Globe, label: "OSINT Coverage", value: "Global · 15min lag", status: "live" },
            { icon: Shield, label: "War Room", value: "Real-time map", status: "live" },
            { icon: TrendingUp, label: "AI Analyst", value: "20+ data tools", status: "live" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 py-3 border-b border-navy-800/30 last:border-0">
              <div className="w-8 h-8 rounded bg-navy-800/60 flex items-center justify-center shrink-0">
                <item.icon className="w-3.5 h-3.5 text-navy-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-navy-300">{item.label}</p>
                <p className="text-[10px] text-navy-500 font-sans">{item.value}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
                <span className="text-[9px] font-mono text-navy-500 uppercase">Online</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Tiers */}
        <div>
          <p className="text-[10px] font-mono text-navy-600 uppercase tracking-widest mb-3">Access Tiers</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "Analyst", price: "$299/mo" },
              { name: "Operator", price: "$999/mo" },
              { name: "Institution", price: "Custom" },
            ].map((tier) => (
              <div key={tier.name} className="border border-navy-700/30 rounded p-3 bg-navy-900/30">
                <p className="text-[10px] font-mono text-navy-300 mb-0.5">{tier.name}</p>
                <p className="text-[11px] font-mono text-navy-500">{tier.price}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-14">
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Radar className="h-5 w-5 text-white" />
            <span className="text-sm font-mono tracking-[0.15em] text-navy-200">
              NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
            </span>
          </div>

          <div className="mb-8">
            <p className="text-[10px] font-mono text-navy-500 uppercase tracking-widest mb-2">
              {referralCode ? "Invited Access" : "Request Access"}
            </p>
            <h1 className="text-2xl font-sans font-bold text-white">Create your account</h1>
          </div>

          {referralCode && (
            <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20 mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="text-[11px] text-accent-emerald font-mono">Referral active: {referralCode}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-navy-900/60 border border-navy-700/50 rounded-lg px-3.5 py-2.5 text-sm text-navy-100 font-sans placeholder:text-navy-600 focus:outline-none focus:border-navy-500 transition-colors"
                placeholder="you@domain.com"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-navy-900/60 border border-navy-700/50 rounded-lg px-3.5 py-2.5 text-sm text-navy-100 font-sans placeholder:text-navy-600 focus:outline-none focus:border-navy-500 transition-colors"
                placeholder="3-32 chars, letters and numbers"
                required
                minLength={3}
                maxLength={32}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy-900/60 border border-navy-700/50 rounded-lg px-3.5 py-2.5 text-sm text-navy-100 font-sans placeholder:text-navy-600 focus:outline-none focus:border-navy-500 transition-colors"
                placeholder="Min 10 characters"
                required
                minLength={10}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-navy-900/60 border border-navy-700/50 rounded-lg px-3.5 py-2.5 text-sm text-navy-100 font-sans placeholder:text-navy-600 focus:outline-none focus:border-navy-500 transition-colors"
                placeholder="Repeat password"
                required
                minLength={10}
              />
            </div>

            {error && (
              <div className="py-2.5 px-3 rounded-lg bg-accent-rose/10 border border-accent-rose/20">
                <p className="text-[11px] text-accent-rose font-sans">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-white text-navy-950 rounded-lg px-4 py-3 text-[12px] font-mono uppercase tracking-widest font-semibold hover:bg-navy-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-navy-800/40 space-y-3">
            <p className="text-[11px] text-navy-500 font-sans text-center">
              Already have access?{" "}
              <Link href="/login" className="text-navy-300 hover:text-white transition-colors">
                Sign in
              </Link>
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-navy-600" />
              <span className="text-[10px] font-mono text-navy-600">Secured · Encrypted · Private</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
