"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Crosshair,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  TrendingUp,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "War Room", href: "/warroom", icon: Shield },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Thesis", href: "/thesis", icon: FileText },
  { name: "Signals", href: "/signals", icon: Activity },
  { name: "Trading", href: "/trading", icon: TrendingUp },
  { name: "Predictions", href: "/predictions", icon: Crosshair },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-navy-700 bg-navy-950">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-navy-700 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-navy-800 border border-navy-700">
              <BarChart3 className="h-4 w-4 text-navy-300" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest text-navy-100">
                NEXUS
              </span>
              <div className="text-[9px] tracking-wider text-navy-500 uppercase">
                Intelligence Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-navy-800 text-navy-100 border border-navy-600"
                    : "text-navy-400 hover:bg-navy-800 hover:text-navy-200 border border-transparent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Status bar */}
        <div className="border-t border-navy-700 p-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
            <span className="text-[10px] text-navy-500 uppercase tracking-wider">
              Engine Active
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
