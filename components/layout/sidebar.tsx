"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  Anchor,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Clock,
  Crosshair,
  Dice5,
  FileText,
  Globe,
  History,
  Landmark,
  LayoutDashboard,
  Link2,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Newspaper,
  Network,
  Radar,
  Scale,
  Trophy,
  Settings,
  Share2,
  Shield,
  Sigma,
  Skull,
  Swords,
  Target,
  TrendingUp,
  Users,
  Bug,
  Briefcase,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useSubscription } from "@/lib/hooks/useSubscription";

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };

// ── Analyst tier: core intelligence ──
const mainNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Ops Center", href: "/dashboard/operator", icon: Monitor },
  { name: "Chat", href: "/chat", icon: MessageSquare },
];

const intelligenceNav: NavItem[] = [
  { name: "War Room", href: "/warroom", icon: Shield },
  { name: "News", href: "/news", icon: Newspaper },
  { name: "Signals", href: "/signals", icon: Activity },
  { name: "Predictions", href: "/predictions", icon: Crosshair },
  { name: "Game Theory", href: "/game-theory", icon: Swords },
  { name: "Narratives", href: "/narrative", icon: Globe },
  { name: "Parallels", href: "/parallels", icon: History },
  { name: "Actors", href: "/actors", icon: Users },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Longevity", href: "/longevity", icon: Skull },
];

const toolsNav: NavItem[] = [
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Graph", href: "/graph", icon: Network },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Support", href: "/support", icon: LifeBuoy },
];

// ── Operator tier: advanced analytics + trading ──
const marketsNav: NavItem[] = [
  { name: "Markets", href: "/markets", icon: BarChart3 },
  { name: "Watchlists", href: "/watchlists", icon: Activity },
  { name: "Trading", href: "/trading", icon: TrendingUp },
  { name: "Trade Lab", href: "/trade-lab", icon: Dice5 },
  { name: "Thesis", href: "/thesis", icon: FileText },
  { name: "On-Chain", href: "/on-chain", icon: Link2 },
  { name: "Short Interest", href: "/short-interest", icon: Target },
  { name: "GEX", href: "/gex", icon: Sigma },
];

const analyticsNav: NavItem[] = [
  { name: "Pred. Markets", href: "/prediction-markets", icon: Scale },
  { name: "Congress", href: "/congressional-trading", icon: Landmark },
  { name: "AI Progression", href: "/ai-progression", icon: Bot },
  { name: "GPR Index", href: "/gpr", icon: Radar },
  { name: "Change-Points", href: "/bocpd", icon: Activity },
  { name: "Shipping", href: "/shipping", icon: Anchor },
  { name: "Simulation", href: "/simulation", icon: Dice5 },
];

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      {label && (
        <div className="px-3 pb-1 pt-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-navy-500">
            {label}
          </span>
        </div>
      )}
      {items.map((item) => {
        const bestMatch = items.reduce((best, it) =>
          (pathname === it.href || pathname.startsWith(it.href + "/")) && it.href.length > best.length ? it.href : best, "");
        const isActive = item.href === bestMatch;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
              isActive
                ? "bg-navy-800/80 text-navy-100"
                : "text-navy-400 hover:bg-navy-800/50 hover:text-navy-200"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-70" />
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}

function CreditMeter() {
  const [data, setData] = useState<{ creditsUsed: number; creditsGranted: number; unlimited: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch((err) => console.error("[Sidebar] credits fetch failed:", err));

    // Refresh every 5min, pause when tab hidden
    let interval: ReturnType<typeof setInterval> | null = null;
    const refreshCredits = () => {
      fetch("/api/credits")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setData(d))
        .catch((err) => console.error("[Sidebar] credits refresh failed:", err));
    };
    const startPolling = () => {
      if (interval) clearInterval(interval);
      if (document.visibilityState === "visible") {
        interval = setInterval(refreshCredits, 300_000);
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", startPolling);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", startPolling);
    };
  }, []);

  if (!data || data.unlimited) return null;

  const pct = data.creditsGranted > 0 ? Math.min(100, (data.creditsUsed / data.creditsGranted) * 100) : 0;
  const remaining = Math.max(0, data.creditsGranted - data.creditsUsed);
  const isLow = pct > 80;

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">Credits</span>
        <span className={`text-[9px] font-mono ${isLow ? "text-accent-amber" : "text-navy-500"}`}>
          {remaining.toLocaleString()} left
        </span>
      </div>
      <div className="h-1 rounded-full bg-navy-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-accent-amber" : "bg-accent-cyan/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { meetsMinTier, isAdmin } = useSubscription();
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicPages = ["/", "/landing", "/register", "/login", "/forgot-password", "/reset-password", "/about", "/careers", "/contact", "/docs", "/status", "/terms", "/privacy", "/cookies", "/security", "/demo", "/investors", "/media"];
  if (publicPages.includes(pathname) || pathname.startsWith("/research")) return null;

  const isOperator = meetsMinTier("operator");

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo + Notifications */}
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <Radar className="h-5 w-5 text-white" />
          <span className="text-[11px] font-semibold tracking-[0.12em] text-navy-100 font-mono">
            NEXUS <span className="text-navy-400 font-normal">Intel</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-navy-400 hover:text-navy-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1" onClick={() => setMobileOpen(false)}>
        <NavSection label="" items={mainNav} pathname={pathname} />
        <NavSection label="Intelligence" items={intelligenceNav} pathname={pathname} />
        <NavSection label="Tools" items={toolsNav} pathname={pathname} />
        {isOperator && (
          <>
            <NavSection label="Markets" items={marketsNav} pathname={pathname} />
            <NavSection label="Analytics" items={analyticsNav} pathname={pathname} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-navy-700/50 p-2" onClick={() => setMobileOpen(false)}>
        <Link
          href="/referrals"
          className={cn(
            "mx-0 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
            pathname.startsWith("/referrals")
              ? "bg-navy-800/80 text-navy-100"
              : "text-navy-400 hover:bg-navy-800/50 hover:text-navy-200"
          )}
        >
          <Share2 className="h-4 w-4 shrink-0 opacity-70" />
          Referrals
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "mx-0 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-navy-800/80 text-navy-100"
                : "text-navy-400 hover:bg-navy-800/50 hover:text-navy-200"
            )}
          >
            <Lock className="h-4 w-4 shrink-0 opacity-70" />
            Admin
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "mx-0 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
            pathname === "/settings"
              ? "bg-navy-800/80 text-navy-100"
              : "text-navy-400 hover:bg-navy-800/50 hover:text-navy-200"
          )}
        >
          <Settings className="h-4 w-4 shrink-0 opacity-70" />
          Settings
        </Link>
        <a
          href="mailto:support@nexushq.xyz?subject=Bug Report&body=Describe the issue:%0A%0ASteps to reproduce:%0A%0AExpected behavior:%0A%0A"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-0 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-navy-500 hover:bg-navy-800/50 hover:text-navy-200 transition-colors"
        >
          <Bug className="h-4 w-4 shrink-0 opacity-70" />
          Report a Bug
        </a>
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mx-0 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-navy-400 hover:bg-navy-800/50 hover:text-navy-200 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0 opacity-70" />
            Sign Out
          </button>
        )}
        <CreditMeter />
        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
            <span className="text-[10px] text-navy-500 truncate">
              {session?.user?.name || "Online"}
            </span>
          </div>
          <ThemeToggle className="p-1 text-navy-500 hover:text-navy-300 transition-colors" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 z-50 md:hidden p-2 rounded-md bg-navy-900/90 border border-navy-700/50 text-navy-300 hover:text-navy-100"
        style={{ top: "calc(0.75rem + var(--impersonation-banner-h, 0px))" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 z-50 w-48 border-r border-navy-700/50 bg-navy-950 transition-transform duration-200",
          "md:translate-x-0 md:z-40",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          top: "var(--impersonation-banner-h, 0px)",
          height: "calc(100vh - var(--impersonation-banner-h, 0px))",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
