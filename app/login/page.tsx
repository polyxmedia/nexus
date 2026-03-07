"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radar } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 pt-14">
      <div className="w-full max-w-sm">
        <div className="border border-navy-700/40 rounded-lg p-8 bg-navy-900/50">
          <div className="flex items-center gap-2.5 mb-1">
            <Radar className="h-5 w-5 text-white" />
            <h1 className="text-sm font-semibold tracking-[0.15em] text-navy-200 font-mono">
              NEXUS <span className="text-navy-400 font-normal">Intelligence</span>
            </h1>
          </div>
          <p className="text-xs text-navy-500 mb-6 font-sans">Sign in to the platform</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-navy-950/50 border border-navy-700/40 rounded px-3 py-2 text-sm text-navy-100 font-sans focus:outline-none focus:border-navy-500/60 transition-colors"
                autoFocus
                required
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
                className="w-full bg-navy-950/50 border border-navy-700/40 rounded px-3 py-2 text-sm text-navy-100 font-sans focus:outline-none focus:border-navy-500/60 transition-colors"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-accent-rose font-sans">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] rounded-lg px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest text-navy-100 transition-all disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <p className="text-[11px] text-navy-500 mt-6 text-center font-sans">
            No account?{" "}
            <Link href="/register" className="text-navy-300 hover:text-navy-100 transition-colors">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
