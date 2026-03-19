"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PartnershipsTab } from "@/components/admin/partnerships-tab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Activity,
  Coins,
  CreditCard,
  Eye,
  FileText,
  FlaskConical,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Shield,
  Timer,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";

import type { Tier, AnalyticsData, GrowthData, PromptEntry } from "@/components/admin/types";
import { PROMPT_CATEGORIES } from "@/components/admin/types";
import { PromptEditor } from "@/components/admin/prompt-editor";
import { TierEditor } from "@/components/admin/tier-editor";
import { EmailPanel } from "@/components/admin/email-panel";
import { SupportPanel } from "@/components/admin/support-panel";
import { GrowthPanel } from "@/components/admin/growth-panel";
import { CalibrationPanel } from "@/components/admin/calibration-panel";
import { AnalystProfilesPanel } from "@/components/admin/analyst-profiles-panel";
import { OGTesterPanel } from "@/components/admin/og-tester-panel";
import { BaseRatesPanel } from "@/components/admin/base-rates-panel";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { SchedulerPanel } from "@/components/admin/scheduler-panel";
import { BlogWriterPanel } from "@/components/admin/blog-writer-panel";
import { CostMonitorPanel } from "@/components/admin/cost-monitor-panel";
import { OutreachPanel } from "@/components/admin/outreach-panel";
import { IntegrationsPanel } from "@/components/admin/integrations-panel";
import { TwitterEngagePanel } from "@/components/admin/twitter-engage-panel";
import { ToolAuditPanel } from "@/components/admin/tool-audit-panel";
import { UsersTab } from "@/components/admin/users-tab";

const ADMIN_TABS = [
  { id: "growth", label: "Growth", icon: TrendingUp },
  { id: "tiers", label: "Tiers", icon: CreditCard },
  { id: "users", label: "Users", icon: Users },
  { id: "prompts", label: "Prompts", icon: FileText },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "scheduler", label: "Automation", icon: Timer },
  { id: "analysts", label: "Analysts", icon: UserCheck },
  { id: "calibration", label: "Calibration", icon: FlaskConical },
  { id: "base-rates", label: "Base Rates", icon: Activity },
  { id: "og-tester", label: "OG Image", icon: Eye },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "blog", label: "Blog Writer", icon: FileText },
  { id: "costs", label: "Costs", icon: Coins },
  { id: "outreach", label: "Outreach", icon: Target },
  { id: "x-engage", label: "X Engage", icon: X },
  { id: "tool-audit", label: "Tool Audit", icon: Activity },
  { id: "partnerships", label: "Partnerships", icon: Briefcase },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Persist active tab in URL hash
  const validTabs = ADMIN_TABS.map((t) => t.id);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (validTabs.includes(hash)) return hash;
    }
    return "growth";
  });
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [users, setUsers] = useState<import("@/components/admin/types").UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activity, setActivity] = useState<{ summary: { totalUsers: number; activeToday: number; active7d: number; totalMessages7d: number; totalPredictions7d: number }; users: Array<{ username: string; lastLogin: string | null; chatSessions7d: number; chatMessages7d: number; predictions7d: number; lastChatAt: string | null; tier: string; role: string }> } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewTier, setShowNewTier] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [excludedIPs, setExcludedIPs] = useState<string[]>([]);
  const [excludedIPsLoaded, setExcludedIPsLoaded] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [ipSaving, setIPSaving] = useState(false);

  const fetchExcludedIPs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? data.find((s: { key: string }) => s.key === "analytics:excluded_ips") : null;
        if (entry?.value) {
          setExcludedIPs(JSON.parse(entry.value));
        }
      }
    } catch {
      // silent
    }
    setExcludedIPsLoaded(true);
  }, []);

  const saveExcludedIPs = useCallback(async (ips: string[]) => {
    setIPSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "analytics:excluded_ips", value: JSON.stringify(ips) }),
      });
      setExcludedIPs(ips);
    } catch {
      // silent
    }
    setIPSaving(false);
  }, []);

  const addExcludedIP = useCallback(() => {
    const ip = newIP.trim();
    if (!ip || excludedIPs.includes(ip)) return;
    const updated = [...excludedIPs, ip];
    saveExcludedIPs(updated);
    setNewIP("");
  }, [newIP, excludedIPs, saveExcludedIPs]);

  const removeExcludedIP = useCallback((ip: string) => {
    saveExcludedIPs(excludedIPs.filter((i) => i !== ip));
  }, [excludedIPs, saveExcludedIPs]);

  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);

  const fetchTiers = useCallback(async () => {
    const res = await fetch("/api/admin/tiers");
    const data = await res.json();
    setTiers(Array.isArray(data) ? data : []);
  }, []);

  const fetchAnalytics = useCallback(async (days: number) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // silent
    }
    setAnalyticsLoading(false);
  }, []);

  const fetchGrowth = useCallback(async () => {
    setGrowthLoading(true);
    try {
      const res = await fetch("/api/admin/growth");
      if (res.ok) {
        const data = await res.json();
        setGrowth(data);
      }
    } catch {
      // silent
    }
    setGrowthLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    }
    setUsersLoading(false);
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity");
      if (res.ok) setActivity(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    // Check admin status
    fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 403) {
          router.push("/dashboard");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setIsAdmin(true);
          setUsers(Array.isArray(data) ? data : []);
          setUsersLoading(false);
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/dashboard");
      });

    fetchTiers();
    fetchActivity();

    // Fetch prompts
    fetch("/api/settings/prompts")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setPrompts(Array.isArray(data) ? data : []);
        setPromptsLoading(false);
      })
      .catch(() => setPromptsLoading(false));
  }, [status, router, fetchTiers, fetchActivity]);

  const savePrompt = useCallback(async (key: string, value: string) => {
    await fetch("/api/settings/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setPrompts((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, value, isOverridden: true } : p
      )
    );
  }, []);

  const resetPrompt = useCallback(async (key: string) => {
    await fetch("/api/settings/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setPrompts((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, value: p.defaultValue, isOverridden: false } : p
      )
    );
  }, []);

  const saveTier = async (tierData: Partial<Tier>) => {
    await fetch("/api/admin/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tierData),
    });
    await fetchTiers();
    setShowNewTier(false);
  };

  const deleteTier = async (id: number) => {
    await fetch("/api/admin/tiers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchTiers();
  };

  const seedTiers = async () => {
    setSeeding(true);
    await fetch("/api/admin/tiers/seed", { method: "POST" });
    await fetchTiers();
    setSeeding(false);
  };

  if (loading || status === "loading") {
    return (
      <PageContainer title="Admin" subtitle="Platform administration">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) return null;

  return (
    <PageContainer title="Admin" subtitle="Platform administration">
      {/* Backtest link */}
      <Link
        href="/admin/backtest"
        className="group flex items-center justify-between mb-6 border border-accent-cyan/20 rounded-lg bg-accent-cyan/[0.03] px-5 py-4 hover:bg-accent-cyan/[0.06] hover:border-accent-cyan/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <FlaskConical className="w-4 h-4 text-accent-cyan" />
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              Signal Convergence Backtesting
            </span>
            <p className="font-sans text-[11px] text-navy-400 mt-0.5">
              Validate prediction methodology against 10+ years of historical data with statistical significance testing
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* OG Image Designer link */}
      <Link
        href="/admin/og-designer"
        className="group flex items-center justify-between mb-6 border border-accent-amber/20 rounded-lg bg-accent-amber/[0.03] px-5 py-4 hover:bg-accent-amber/[0.06] hover:border-accent-amber/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-accent-amber" />
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              OG Image Designer
            </span>
            <p className="font-sans text-[11px] text-navy-400 mt-0.5">
              Design social share images with AI. Control how NEXUS appears on Twitter, LinkedIn, and Slack.
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-accent-amber group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Whitepaper link */}
      <Link
        href="/research/whitepapers"
        className="group flex items-center justify-between mb-6 border border-navy-700/40 rounded-lg bg-navy-900/20 px-5 py-4 hover:bg-navy-900/40 hover:border-navy-600/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-navy-300" />
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              Technical White Paper
            </span>
            <p className="font-sans text-[11px] text-navy-400 mt-0.5">
              Full methodology documentation (not publicly linked)
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-navy-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <div className="relative mb-6">
          <Tabs.List className="flex flex-wrap gap-0 border-b border-navy-700">
            {ADMIN_TABS.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-navy-500 border-b-2 border-transparent transition-colors data-[state=active]:text-navy-100 data-[state=active]:border-navy-100 hover:text-navy-300 whitespace-nowrap"
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        {/* Tiers Tab */}
        <Tabs.Content value="tiers">
          <div className="space-y-4 max-w-3xl">
            <p className="text-[11px] text-navy-400">
              Manage subscription tiers. Connect each tier to a Stripe Price ID for checkout.
            </p>
            <div className="flex items-center gap-2">
              {syncAllResult && (
                <span className={`text-[10px] font-mono ${syncAllResult.includes("Failed") ? "text-accent-rose" : "text-accent-emerald"}`}>
                  {syncAllResult}
                </span>
              )}
              {tiers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncingAll}
                  onClick={async () => {
                    setSyncingAll(true);
                    setSyncAllResult(null);
                    let ok = 0;
                    let fail = 0;
                    for (const t of tiers) {
                      try {
                        const res = await fetch("/api/admin/tiers/stripe-sync", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tierId: t.id }),
                        });
                        if (res.ok) ok++;
                        else fail++;
                      } catch { fail++; }
                    }
                    setSyncAllResult(fail > 0 ? `${ok} synced, ${fail} failed` : `${ok} tiers synced`);
                    setSyncingAll(false);
                    // Refresh tiers to get updated Stripe IDs
                    fetch("/api/admin/tiers").then(r => r.json()).then(data => { if (Array.isArray(data)) setTiers(data); });
                    setTimeout(() => setSyncAllResult(null), 5000);
                  }}
                >
                  {syncingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
                  Sync All to Stripe
                </Button>
              )}
              {tiers.length === 0 && (
                <Button variant="outline" size="sm" onClick={seedTiers} disabled={seeding}>
                  {seeding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                  Seed Default Tiers
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTier(true)}
                disabled={showNewTier}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tier
              </Button>
            </div>

            {showNewTier && (
              <TierEditor
                tier={{}}
                onSave={saveTier}
                onCancel={() => setShowNewTier(false)}
              />
            )}

            {tiers.map((tier) => (
              <TierEditor
                key={tier.id}
                tier={tier}
                onSave={saveTier}
                onDelete={() => deleteTier(tier.id)}
              />
            ))}

            {tiers.length === 0 && !showNewTier && (
              <div className="border border-navy-700/50 border-dashed rounded p-8 text-center">
                <CreditCard className="h-8 w-8 text-navy-600 mx-auto mb-3" />
                <p className="text-sm text-navy-400 mb-1">No subscription tiers configured</p>
                <p className="text-[10px] text-navy-500 mb-4">
                  Click &quot;Seed Default Tiers&quot; to create the Observer, Operator, and Institution tiers from the homepage.
                </p>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Users Tab */}
        <Tabs.Content value="users">
          <UsersTab
            users={users}
            usersLoading={usersLoading}
            fetchUsers={fetchUsers}
            activity={activity}
            tiers={tiers}
            session={session}
          />
        </Tabs.Content>

        {/* Growth Tab */}
        <Tabs.Content value="growth">
          <GrowthPanel
            data={growth}
            loading={growthLoading}
            onLoad={() => {
              if (!growth && !growthLoading) fetchGrowth();
            }}
          />
        </Tabs.Content>

        {/* Prompts Tab */}
        <Tabs.Content value="prompts">
          <div className="max-w-4xl">
            <div className="border border-accent-rose/20 rounded-lg bg-accent-rose/[0.03] p-4 mb-6">
              <div className="flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-accent-rose mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-accent-rose uppercase tracking-wider">Proprietary</span>
                  <p className="text-[11px] text-navy-400 mt-1 leading-relaxed">
                    These are the core soul documents that define how NEXUS thinks, analyzes, and generates intelligence.
                    Changes take effect immediately on next use. Admin access only.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-widest">
                {prompts.length} registered prompts
              </span>
              {prompts.filter((p) => p.isOverridden).length > 0 && (
                <span className="text-[10px] font-mono text-accent-amber">
                  {prompts.filter((p) => p.isOverridden).length} modified from defaults
                </span>
              )}
            </div>

            {promptsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {PROMPT_CATEGORIES.map((cat) => {
                  const categoryPrompts = prompts.filter(
                    (p) => p.category === cat.id
                  );
                  if (categoryPrompts.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
                        {cat.label}
                      </h3>
                      <div className="space-y-1">
                        {categoryPrompts.map((p) => (
                          <PromptEditor
                            key={p.key}
                            prompt={p}
                            onSave={savePrompt}
                            onReset={resetPrompt}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="emails">
          <EmailPanel />
        </Tabs.Content>

        <Tabs.Content value="support">
          <SupportPanel />
        </Tabs.Content>

        <Tabs.Content value="analytics">
          <AnalyticsPanel
            analytics={analytics}
            loading={analyticsLoading}
            days={analyticsDays}
            onChangeDays={(d) => {
              setAnalyticsDays(d);
              fetchAnalytics(d);
            }}
            onLoad={() => {
              if (!analytics && !analyticsLoading) fetchAnalytics(analyticsDays);
              if (!excludedIPsLoaded) fetchExcludedIPs();
            }}
          />

          {/* IP Exclusion Manager */}
          <div className="mt-6 border border-navy-700/40 rounded-lg bg-navy-900/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3.5 w-3.5 text-accent-rose opacity-60" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Excluded IPs</span>
            </div>
            <p className="text-[10px] text-navy-600 mb-3">
              Traffic from these IPs will not be tracked. Supports exact IPs, wildcards (192.168.1.*), and CIDR notation (/24, /16).
            </p>

            <div className="flex items-center gap-2 mb-3">
              <input
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addExcludedIP(); }}
                placeholder="e.g. 203.0.113.45 or 192.168.1.0/24"
                className="flex-1 h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
              />
              <Button size="sm" onClick={addExcludedIP} disabled={ipSaving || !newIP.trim()}>
                {ipSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Add
              </Button>
            </div>

            {excludedIPs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {excludedIPs.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-navy-700/40 bg-navy-800/40"
                  >
                    <span className="text-[11px] font-mono text-navy-300">{ip}</span>
                    <button
                      onClick={() => removeExcludedIP(ip)}
                      className="text-navy-600 hover:text-accent-rose transition-colors"
                      disabled={ipSaving}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-navy-600 font-mono">No IPs excluded. All traffic is being tracked.</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="scheduler">
          <SchedulerPanel />
        </Tabs.Content>

        <Tabs.Content value="analysts">
          <AnalystProfilesPanel />
        </Tabs.Content>

        <Tabs.Content value="calibration">
          <CalibrationPanel />
        </Tabs.Content>

        <Tabs.Content value="base-rates">
          <BaseRatesPanel />
        </Tabs.Content>

        <Tabs.Content value="og-tester">
          <OGTesterPanel />
        </Tabs.Content>

        <Tabs.Content value="integrations">
          <IntegrationsPanel />
        </Tabs.Content>

        <Tabs.Content value="blog">
          <BlogWriterPanel />
        </Tabs.Content>

        <Tabs.Content value="costs">
          <CostMonitorPanel />
        </Tabs.Content>

        <Tabs.Content value="outreach">
          <OutreachPanel />
        </Tabs.Content>

        <Tabs.Content value="x-engage">
          <TwitterEngagePanel />
        </Tabs.Content>

        <Tabs.Content value="tool-audit">
          <ToolAuditPanel />
        </Tabs.Content>

        <Tabs.Content value="partnerships">
          <PartnershipsTab />
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
