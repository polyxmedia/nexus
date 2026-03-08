"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Clock,
  Crosshair,
  Dice5,
  FileText,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Monitor,
  Newspaper,
  Network,
  Radar,
  Scale,
  Settings,
  Share2,
  Shield,
  Swords,
  TrendingUp,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/notification-bell";

const mainNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Ops Center", href: "/dashboard/operator", icon: Monitor },
  { name: "Chat", href: "/chat", icon: MessageSquare },
];

const intelligenceNav = [
  { name: "War Room", href: "/warroom", icon: Shield },
  { name: "News", href: "/news", icon: Newspaper },
  { name: "Signals", href: "/signals", icon: Activity },
  { name: "Predictions", href: "/predictions", icon: Crosshair },
  { name: "Pred. Markets", href: "/prediction-markets", icon: Scale },
  { name: "Congress", href: "/congressional-trading", icon: Landmark },
  { name: "AI Progression", href: "/ai-progression", icon: Bot },
  { name: "Game Theory", href: "/game-theory", icon: Swords },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
];

const marketsNav = [
  { name: "Markets", href: "/markets", icon: BarChart3 },
  { name: "Watchlists", href: "/watchlists", icon: Activity },
  { name: "Trading", href: "/trading", icon: TrendingUp },
  { name: "Thesis", href: "/thesis", icon: FileText },
];

const toolsNav = [
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Graph", href: "/graph", icon: Network },
  { name: "Simulation", href: "/simulation", icon: Dice5 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Alerts", href: "/alerts", icon: Bell },
];

function NavSection({ label, items, pathname }: { label: string; items: typeof mainNav; pathname: string }) {
  return (
    <div className="mb-1">
      <div className="px-3 pb-1 pt-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-navy-500">
          {label}
        </span>
      </div>
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

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

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const publicPages = ["/", "/landing", "/register", "/login", "/about", "/careers", "/contact", "/docs", "/status", "/terms", "/privacy", "/cookies", "/security"];
  if (publicPages.includes(pathname) || pathname.startsWith("/research")) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-48 border-r border-navy-700/50 bg-navy-950">
      <div className="flex h-full flex-col">
        {/* Logo + Notifications */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Radar className="h-5 w-5 text-white" />
            <span className="text-[11px] font-semibold tracking-[0.12em] text-navy-100 font-mono">
              NEXUS <span className="text-navy-400 font-normal">Intel</span>
            </span>
          </Link>
          <NotificationBell />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1">
          <NavSection label="" items={mainNav} pathname={pathname} />
          <NavSection label="Intelligence" items={intelligenceNav} pathname={pathname} />
          <NavSection label="Markets" items={marketsNav} pathname={pathname} />
          <NavSection label="Tools" items={toolsNav} pathname={pathname} />
        </nav>

        {/* Footer */}
        <div className="border-t border-navy-700/50 p-2">
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
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mx-0 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-navy-400 hover:bg-navy-800/50 hover:text-navy-200 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0 opacity-70" />
              Sign Out
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
            <span className="text-[10px] text-navy-500 truncate">
              {session?.user?.name || "Online"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
