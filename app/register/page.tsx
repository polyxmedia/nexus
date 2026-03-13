"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Radar, ArrowRight, ArrowUpRight, Lock, Check } from "lucide-react";
import createGlobe from "cobe";
import { useTheme } from "@/lib/hooks/useTheme";

// ── 3D Globe ──
function IntelGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerOut = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let width = 0;

    let globe: ReturnType<typeof createGlobe> | null = null;
    try {
      globe = createGlobe(canvasRef.current, {
        devicePixelRatio: 2,
        width: 1200 * 2,
        height: 1200 * 2,
        phi: 0,
        theta: 0.25,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 40000,
        mapBrightness: 4,
        baseColor: [0.05, 0.08, 0.15],
        markerColor: [0.024, 0.714, 0.831],
        glowColor: [0.02, 0.06, 0.12],
        markers: [
          { location: [40.7128, -74.006], size: 0.06 },
          { location: [51.5074, -0.1278], size: 0.06 },
          { location: [35.6762, 139.6503], size: 0.05 },
          { location: [22.3193, 114.1694], size: 0.05 },
          { location: [1.3521, 103.8198], size: 0.04 },
          { location: [25.2048, 55.2708], size: 0.04 },
          { location: [48.8566, 2.3522], size: 0.04 },
          { location: [55.7558, 37.6173], size: 0.03 },
          { location: [39.9042, 116.4074], size: 0.05 },
          { location: [19.076, 72.8777], size: 0.04 },
          { location: [-33.8688, 151.2093], size: 0.03 },
          { location: [50.4501, 30.5234], size: 0.03 },
          { location: [31.7683, 35.2137], size: 0.03 },
        ],
        onRender: (state) => {
          if (pointerInteracting.current === null) {
            phiRef.current += 0.003;
          }
          state.phi = phiRef.current + pointerInteractionMovement.current / 200;
          state.width = width * 2;
          state.height = width * 2;
        },
      });
    } catch {
      return;
    }

    const handleResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      globe?.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab"
      style={{ contain: "layout paint size" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerOut}
      onPointerMove={onPointerMove}
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

// ── Password strength calculator ──
function getPasswordStrength(pw: string): { score: number; label: string; checks: { label: string; met: boolean }[] } {
  const checks = [
    { label: "10+ characters", met: pw.length >= 10 },
    { label: "Uppercase letter", met: /[A-Z]/.test(pw) },
    { label: "Lowercase letter", met: /[a-z]/.test(pw) },
    { label: "Number", met: /[0-9]/.test(pw) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.met).length;
  const label = score <= 1 ? "Weak" : score <= 2 ? "Fair" : score <= 3 ? "Good" : score <= 4 ? "Strong" : "Excellent";
  return { score, label, checks };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, checks } = getPasswordStrength(password);

  const colors = [
    "bg-accent-rose",
    "bg-accent-rose",
    "bg-accent-amber",
    "bg-accent-amber",
    "bg-accent-emerald",
    "bg-accent-emerald",
  ];
  const textColors = [
    "text-accent-rose",
    "text-accent-rose",
    "text-accent-amber",
    "text-accent-amber",
    "text-accent-emerald",
    "text-accent-emerald",
  ];

  return (
    <div className="mt-2.5 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score] : "bg-navy-800/60"
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[9px] tracking-[0.15em] uppercase ${textColors[score]}`}>
          {label}
        </span>
        <span className="font-mono text-[8px] text-navy-600">{score}/5</span>
      </div>
      {/* Criteria */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`w-1 h-1 rounded-full transition-colors duration-300 ${c.met ? "bg-accent-emerald" : "bg-navy-700"}`} />
            <span className={`font-mono text-[8px] transition-colors duration-300 ${c.met ? "text-navy-400" : "text-navy-700"}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  useEffect(() => {
    setMounted(true);
  }, []);

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
        body: JSON.stringify({ username, password, email, referralCode: referralCode || undefined }),
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
        window.location.href = "/login";
      } else {
        // Send new users to choose a subscription plan (free trial)
        // Full navigation ensures the session cookie is sent with the request
        window.location.href = "/settings?tab=subscription";
      }
    } catch {
      setError("Registration failed");
      setLoading(false);
    }
  }

  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-6";
  const visible = "opacity-100 translate-y-0";

  return (
    <main className="min-h-screen bg-navy-950">
      {/* Header */}
      <header className="relative z-20 border-b border-navy-800/30">
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
            Sign In
            <ArrowUpRight className="h-3 w-3 text-navy-600 group-hover:text-navy-400 transition-colors" />
          </Link>
        </div>
      </header>

      {/* ── Globe: fixed background behind everything (dark theme only) ── */}
      {isDark && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute left-1/2 -translate-x-1/2 light-globe-container"
            style={{ top: "5vh", width: "140vh", height: "140vh" }}
          >
            {/* Atmospheric glow */}
            <div className="absolute inset-[15%] rounded-full bg-accent-cyan/[0.04] blur-[100px]" />
            <div className="absolute inset-[25%] rounded-full bg-accent-cyan/[0.025] blur-[60px]" />

            {/* Globe */}
            <div
              className={`absolute inset-0 pointer-events-auto ${base} ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
              style={{ transitionDelay: "200ms", transitionDuration: "1500ms" }}
            >
              <IntelGlobe />
            </div>
          </div>

          {/* Curved shadow cutting off the bottom of the globe */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{
            top: "55vh",
            width: "200vw",
            height: "120vh",
            borderRadius: "50% 50% 0 0",
            background: "var(--color-navy-950)",
            boxShadow: "0 -40px 80px 20px var(--color-navy-950)",
          }} />
        </div>
      )}

      {/* ── Form section ── */}
      <section className="relative z-10 px-6 pb-16 pt-12">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <div
            className={`text-center mb-8 ${base} ${mounted ? visible : hidden}`}
            style={{ transitionDelay: "100ms" }}
          >
            <span className="text-[10px] text-navy-500 tracking-[0.3em] uppercase font-mono mb-3 block">
              {referralCode ? "Invited Access" : "Request Access"}
            </span>
            <h1 className="text-[28px] font-light tracking-tight text-navy-100 font-sans leading-tight">
              Create your account
            </h1>
            <p className="text-[13px] text-navy-500 mt-3 font-sans">
              Free access to Dashboard, Signals, News, and War Room. Upgrade anytime for AI analyst, predictions, and full platform.
            </p>
          </div>

          {referralCode && (
            <div
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-accent-emerald/[0.06] border border-accent-emerald/15 mb-5 ${base} ${mounted ? visible : hidden}`}
              style={{ transitionDelay: "150ms" }}
            >
              <Check className="h-3 w-3 text-accent-emerald" />
              <span className="text-[11px] text-accent-emerald font-mono">Referral active: {referralCode}</span>
            </div>
          )}

          {/* Card */}
          <div
            className={`auth-card rounded-2xl border border-navy-700/40 bg-navy-900/60 backdrop-blur-sm p-8 ${base} ${mounted ? visible : hidden}`}
            style={{ transitionDelay: "200ms" }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                    Email Address
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="auth-input w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
                  required
                  autoComplete="email"
                />
              </div>

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
                  placeholder="3-32 characters"
                  className="auth-input w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
                  required
                  minLength={3}
                  maxLength={32}
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
                  placeholder="Min 10 characters"
                  className="auth-input w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
                <PasswordStrengthMeter password={password} />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-navy-500">
                    Confirm Password
                  </span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="auth-input w-full bg-navy-950/60 border border-navy-700/30 rounded-lg px-4 py-3 text-[13px] text-navy-100 font-mono placeholder:text-navy-700 focus:outline-none focus:border-navy-500/50 focus:bg-navy-950/80 transition-all"
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
                disabled={loading}
                className="auth-btn group w-full flex items-center justify-center gap-2.5 px-5 py-3 text-[11px] font-mono tracking-widest uppercase text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-navy-400/40 border-t-navy-200 rounded-full animate-spin" />
                    <span>Creating Account</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-3 w-3 text-navy-500 group-hover:text-navy-300 group-hover:translate-x-0.5 transition-all" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sign in link */}
          <div
            className={`mt-6 text-center ${base} ${mounted ? visible : hidden}`}
            style={{ transitionDelay: "350ms" }}
          >
            <p className="text-[11px] text-navy-400 font-sans">
              Already have access?{" "}
              <Link
                href="/login"
                className="text-navy-300 hover:text-navy-100 transition-colors font-mono uppercase tracking-wider text-[10px]"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Status bar */}
          <div
            className={`mt-8 flex items-center justify-center gap-4 flex-wrap ${base} ${mounted ? "opacity-100" : "opacity-0"}`}
            style={{ transitionDelay: "500ms" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="text-[10px] font-mono text-navy-400">System Online</span>
            </div>
            <span className="text-navy-600">|</span>
            <span className="text-[10px] font-mono text-navy-400">2-Day Free Trial</span>
            <span className="text-navy-600">|</span>
            <span className="text-[10px] font-mono text-navy-400">Encrypted</span>
          </div>
        </div>
      </section>
    </main>
  );
}
