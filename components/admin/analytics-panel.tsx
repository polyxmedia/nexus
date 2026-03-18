"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
const TrafficMap = dynamic(() => import("@/components/admin/traffic-map"), { ssr: false });
import { Monitor, Smartphone, Tablet, Globe, MapPin, LogIn, LogOut, Zap, MousePointer, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, Timer, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsData } from "./types";
import { formatDuration, DEVICE_ICONS } from "./types";

export function AnalyticsPanel({
  analytics,
  loading,
  days,
  onChangeDays,
  onLoad,
}: {
  analytics: AnalyticsData | null;
  loading: boolean;
  days: number;
  onChangeDays: (d: number) => void;
  onLoad: () => void;
}) {
  useEffect(() => {
    onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="border border-navy-700/50 border-dashed rounded p-8 text-center">
        <BarChart3 className="h-8 w-8 text-navy-600 mx-auto mb-3" />
        <p className="text-sm text-navy-400">No analytics data yet</p>
        <p className="text-[10px] text-navy-500 mt-1">
          Page views will appear here as users navigate the platform.
        </p>
      </div>
    );
  }

  const maxDailyViews = Math.max(...analytics.dailyViews.map((d) => d.views), 1);
  const maxHourly = Math.max(...analytics.hourly.map((h) => h.count), 1);
  const totalDevices = analytics.devices.reduce((sum, d) => sum + d.count, 0) || 1;
  const totalBrowsers = analytics.browsers.reduce((sum, b) => sum + b.count, 0) || 1;
  const totalOS = analytics.operatingSystems.reduce((sum, o) => sum + o.count, 0) || 1;
  const topCountryCount = analytics.countries.length > 0 ? analytics.countries[0].count : 1;

  return (
    <div className="space-y-6">
      {/* Header: period selector + live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-navy-400">
            Anonymous, cookieless analytics. No PII collected.
          </p>
          {analytics.live.activeVisitors > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-emerald/10 border border-accent-emerald/20">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[10px] font-mono text-accent-emerald tabular-nums">
                {analytics.live.activeVisitors} live now
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => onChangeDays(d)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors ${
                days === d
                  ? "bg-navy-700 text-navy-100"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Pageviews", value: analytics.totalViews.toLocaleString(), icon: MousePointer, color: "text-accent-cyan" },
          { label: "Visitors", value: (analytics.uniqueVisitors || analytics.uniqueSessions).toLocaleString(), icon: Users, color: "text-accent-emerald" },
          { label: "Pages/Visit", value: String(analytics.avgViewsPerSession), icon: BarChart3, color: "text-navy-300" },
          { label: "Bounce Rate", value: `${analytics.bounceRate}%`, icon: LogOut, color: analytics.bounceRate > 60 ? "text-accent-rose" : "text-accent-emerald" },
          { label: "Avg Duration", value: formatDuration(analytics.avgDuration), icon: Timer, color: "text-accent-amber" },
          { label: "New Visitors", value: analytics.uniqueVisitors > 0 ? `${Math.round((analytics.newVisitors / (analytics.uniqueVisitors || 1)) * 100)}%` : "0%", icon: Zap, color: "text-accent-cyan" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-navy-700/40 rounded-lg bg-navy-900/30 px-3 py-3"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <stat.icon className={`h-3 w-3 ${stat.color} opacity-60`} />
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-500">
                {stat.label}
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-navy-100 tabular-nums">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily views chart */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Daily Traffic
        </div>
        <div className="flex items-end gap-[2px] h-36">
          {analytics.dailyViews.map((day) => (
            <div key={day.date} className="flex-1 h-full group relative flex items-end">
              <div
                className="w-full bg-accent-cyan/30 hover:bg-accent-cyan/50 transition-colors rounded-t-sm"
                style={{ height: `${(day.views / maxDailyViews) * 100}%`, minHeight: day.views > 0 ? 2 : 0 }}
              />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap shadow-lg">
                  <div>{day.date}</div>
                  <div>{day.views} views / {day.unique} sessions / {day.visitors || day.unique} visitors</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {analytics.dailyViews.length > 0 && (
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-mono text-navy-600">{analytics.dailyViews[0]?.date}</span>
            <span className="text-[9px] font-mono text-navy-600">{analytics.dailyViews[analytics.dailyViews.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Traffic Map */}
      {(analytics.cities.length > 0 || analytics.countries.length > 0) && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <Globe className="h-3.5 w-3.5 text-accent-cyan opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Visitor Map</span>
            <span className="text-[9px] font-mono text-navy-600 ml-auto">
              {analytics.countries.length} countries · {analytics.cities.length} cities
            </span>
          </div>
          <div className="h-[320px]">
            <TrafficMap cities={analytics.cities} countries={analytics.countries} />
          </div>
        </div>
      )}

      {/* Geography: Countries + Cities */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-accent-cyan opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Countries</span>
          </div>
          {analytics.countries.length > 0 ? (
            <div className="space-y-1.5">
              {analytics.countries.slice(0, 15).map((c) => {
                const pct = Math.round((c.count / topCountryCount) * 100);
                return (
                  <div key={c.country} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-navy-200 w-8 shrink-0">{c.country || "??"}</span>
                    <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-cyan/40 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-navy-400 tabular-nums w-10 text-right">{c.count}</span>
                    <span className="text-[9px] font-mono text-navy-600 tabular-nums w-10 text-right">{c.uniqueVisitors} uv</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-navy-600">No geo data yet. Country headers are populated by Vercel in production.</p>
          )}
        </div>

        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-3.5 w-3.5 text-accent-amber opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Top Cities</span>
          </div>
          {analytics.cities.length > 0 ? (
            <div className="space-y-1.5">
              {analytics.cities.map((c) => (
                <div key={`${c.city}-${c.country}`} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-navy-300 truncate flex-1">
                    {c.city || "Unknown"}
                  </span>
                  <span className="text-[9px] font-mono text-navy-600 shrink-0">{c.country}</span>
                  <span className="text-[10px] font-mono text-navy-200 tabular-nums w-10 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-navy-600">No city data yet. Available on Vercel production.</p>
          )}
        </div>
      </div>

      {/* Top Pages with duration */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Top Pages
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-mono text-navy-600 uppercase tracking-wider pb-1 border-b border-navy-700/30">
            <span className="flex-1">Path</span>
            <span className="w-14 text-right">Visitors</span>
            <span className="w-14 text-right">Views</span>
            <span className="w-14 text-right">Avg Time</span>
          </div>
          {analytics.topPages.slice(0, 15).map((page) => (
            <div key={page.path} className="flex items-center gap-2 py-0.5">
              <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{page.path}</span>
              <span className="text-[10px] font-mono text-navy-500 tabular-nums w-14 text-right">{page.uniqueVisitors}</span>
              <span className="text-[10px] font-mono text-navy-200 tabular-nums w-14 text-right">{page.views}</span>
              <span className="text-[10px] font-mono text-navy-500 tabular-nums w-14 text-right">{formatDuration(Math.round(page.avgDuration))}</span>
            </div>
          ))}
          {analytics.topPages.length === 0 && (
            <p className="text-[10px] text-navy-600 py-2">No page data yet</p>
          )}
        </div>
      </div>

      {/* Entry / Exit Pages */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <LogIn className="h-3.5 w-3.5 text-accent-emerald opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Entry Pages</span>
          </div>
          <div className="space-y-1.5">
            {analytics.entryPages.slice(0, 8).map((p) => (
              <div key={p.path} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{p.path}</span>
                <span className="text-[10px] font-mono text-navy-200 tabular-nums">{p.count}</span>
              </div>
            ))}
            {analytics.entryPages.length === 0 && <p className="text-[10px] text-navy-600">No data</p>}
          </div>
        </div>
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <LogOut className="h-3.5 w-3.5 text-accent-rose opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Exit Pages</span>
          </div>
          <div className="space-y-1.5">
            {analytics.exitPages.slice(0, 8).map((p) => (
              <div key={p.path} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{p.path}</span>
                <span className="text-[10px] font-mono text-navy-200 tabular-nums">{p.count}</span>
              </div>
            ))}
            {analytics.exitPages.length === 0 && <p className="text-[10px] text-navy-600">No data</p>}
          </div>
        </div>
      </div>

      {/* Referrers */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Traffic Sources
        </div>
        {analytics.referrers.length > 0 ? (
          <div className="space-y-1.5">
            {analytics.referrers.slice(0, 10).map((r) => (
              <div key={r.referrer} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-navy-300 truncate flex-1">{r.referrer || "Direct"}</span>
                <span className="text-[10px] font-mono text-navy-500 tabular-nums w-12 text-right">{r.uniqueVisitors} uv</span>
                <span className="text-[10px] font-mono text-navy-200 tabular-nums w-12 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-navy-600">No referrer data</p>
        )}
      </div>

      {/* Tech breakdown: Devices, Browsers, OS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Devices */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Devices</div>
          <div className="space-y-2">
            {analytics.devices.map((d) => {
              const pct = Math.round((d.count / totalDevices) * 100);
              const DevIcon = DEVICE_ICONS[d.deviceType || "desktop"] || Monitor;
              return (
                <div key={d.deviceType || "unknown"}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <DevIcon className="h-3 w-3 text-navy-500" />
                      <span className="text-[11px] font-mono text-navy-300 capitalize">{d.deviceType || "unknown"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-navy-500 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-cyan/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browsers */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Browsers</div>
          <div className="space-y-2">
            {analytics.browsers.slice(0, 6).map((b) => {
              const pct = Math.round((b.count / totalBrowsers) * 100);
              return (
                <div key={b.browser || "unknown"}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-mono text-navy-300">{b.browser || "unknown"}</span>
                    <span className="text-[10px] font-mono text-navy-500 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-amber/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OS */}
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Operating Systems</div>
          <div className="space-y-2">
            {analytics.operatingSystems.slice(0, 6).map((o) => {
              const pct = Math.round((o.count / totalOS) * 100);
              return (
                <div key={o.os || "unknown"}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-mono text-navy-300">{o.os || "unknown"}</span>
                    <span className="text-[10px] font-mono text-navy-500 tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-emerald/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Screen Resolutions */}
      {analytics.screens.length > 0 && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Screen Resolutions</div>
          <div className="flex flex-wrap gap-2">
            {analytics.screens.map((s) => (
              <div
                key={`${s.width}x${s.height}`}
                className="px-2.5 py-1.5 rounded border border-navy-700/30 bg-navy-800/30"
              >
                <span className="text-[11px] font-mono text-navy-300">{s.width}x{s.height}</span>
                <span className="text-[9px] font-mono text-navy-600 ml-2">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly distribution */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">
          Hourly Distribution (UTC)
        </div>
        <div className="flex items-end gap-[3px] h-20">
          {Array.from({ length: 24 }, (_, i) => {
            const hour = String(i).padStart(2, "0");
            const entry = analytics.hourly.find((h) => h.hour === hour);
            const count = entry?.count || 0;
            return (
              <div key={hour} className="flex-1 group relative">
                <div
                  className="w-full bg-accent-amber/25 hover:bg-accent-amber/45 transition-colors rounded-t-sm"
                  style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
                />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap shadow-lg">
                    {hour}:00 UTC - {count} views
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-mono text-navy-600">00:00</span>
          <span className="text-[9px] font-mono text-navy-600">06:00</span>
          <span className="text-[9px] font-mono text-navy-600">12:00</span>
          <span className="text-[9px] font-mono text-navy-600">18:00</span>
          <span className="text-[9px] font-mono text-navy-600">23:00</span>
        </div>
      </div>

      {/* New vs Returning */}
      {(analytics.newVisitors > 0 || analytics.returningVisitors > 0) && (
        <div className="border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">New vs Returning Visitors</div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-navy-800 overflow-hidden flex">
                <div
                  className="h-full bg-accent-cyan/60 rounded-l-full"
                  style={{ width: `${analytics.uniqueVisitors > 0 ? (analytics.newVisitors / analytics.uniqueVisitors) * 100 : 50}%` }}
                />
                <div className="h-full bg-accent-amber/60 rounded-r-full flex-1" />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-accent-cyan/60" />
                <span className="text-[10px] font-mono text-navy-300">New {analytics.newVisitors}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-accent-amber/60" />
                <span className="text-[10px] font-mono text-navy-300">Returning {analytics.returningVisitors}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

