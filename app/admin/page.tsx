"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import * as Tabs from "@radix-ui/react-tabs";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";

interface Tier {
  id: number;
  name: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  price: number;
  interval: string;
  features: string;
  limits: string;
  highlighted: number;
  position: number;
  active: number;
}

interface UserRecord {
  username: string;
  role: string;
  tier: string;
  createdAt: string;
  subscription: {
    status: string;
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
  } | null;
}

const ADMIN_TABS = [
  { id: "tiers", label: "Subscription Tiers", icon: CreditCard },
  { id: "users", label: "Users", icon: Users },
];

function TierEditor({
  tier,
  onSave,
  onDelete,
  onCancel,
}: {
  tier: Partial<Tier>;
  onSave: (tier: Partial<Tier>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: tier.name || "",
    price: tier.price !== undefined ? String(tier.price / 100) : "",
    interval: tier.interval || "month",
    stripePriceId: tier.stripePriceId || "",
    stripeProductId: tier.stripeProductId || "",
    features: tier.features
      ? JSON.parse(tier.features).join("\n")
      : "",
    limits: tier.limits || "{}",
    highlighted: tier.highlighted === 1,
    active: tier.active !== 0,
    position: tier.position ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      id: tier.id,
      name: form.name,
      price: Math.round(parseFloat(form.price || "0") * 100),
      interval: form.interval,
      stripePriceId: form.stripePriceId || null,
      stripeProductId: form.stripeProductId || null,
      features: form.features.split("\n").filter((f) => f.trim()),
      limits: typeof form.limits === "string" ? JSON.parse(form.limits) : form.limits,
      highlighted: form.highlighted ? 1 : 0,
      active: form.active ? 1 : 0,
      position: form.position,
    } as unknown as Partial<Tier>);
    setSaving(false);
  };

  return (
    <div className="border border-navy-700 rounded p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy-100 font-mono">
          {tier.id ? tier.name : "New Tier"}
        </h3>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-navy-500 hover:text-navy-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Tier Name
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Analyst"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Price (USD)
            </label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="49"
            />
          </div>
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
              Interval
            </label>
            <select
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
              className="w-full bg-navy-900/50 border border-navy-700/50 rounded px-3 py-2 text-sm text-navy-200 focus:outline-none"
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Stripe Price ID
          </label>
          <Input
            value={form.stripePriceId}
            onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
            placeholder="price_..."
          />
        </div>
        <div>
          <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
            Stripe Product ID
          </label>
          <Input
            value={form.stripeProductId}
            onChange={(e) => setForm({ ...form, stripeProductId: e.target.value })}
            placeholder="prod_..."
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">
          Features (one per line)
        </label>
        <textarea
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          className="w-full h-32 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[12px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500"
          placeholder="Signal detection engine&#10;AI chat analyst (100 msgs/day)&#10;..."
        />
      </div>

      <div>
        <button
          onClick={() => setShowLimits(!showLimits)}
          className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
        >
          {showLimits ? "Hide" : "Edit"} limits JSON
        </button>
        {showLimits && (
          <textarea
            value={typeof form.limits === "string" ? form.limits : JSON.stringify(form.limits, null, 2)}
            onChange={(e) => setForm({ ...form, limits: e.target.value })}
            className="mt-2 w-full h-28 bg-navy-900/50 border border-navy-700/50 rounded p-3 text-[11px] font-mono text-navy-200 resize-y focus:outline-none focus:border-navy-500"
          />
        )}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-navy-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.highlighted}
            onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
            className="rounded border-navy-600"
          />
          Highlighted (recommended)
        </label>
        <label className="flex items-center gap-2 text-xs text-navy-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="rounded border-navy-600"
          />
          Active
        </label>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-navy-500 uppercase tracking-wider">Position</label>
          <Input
            type="number"
            value={String(form.position)}
            onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
            className="w-16"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-navy-700/50">
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-accent-rose hover:text-accent-rose"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            }}
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
            Delete Tier
          </Button>
        ) : (
          <div />
        )}
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          {tier.id ? "Save Changes" : "Create Tier"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewTier, setShowNewTier] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    const res = await fetch("/api/admin/tiers");
    const data = await res.json();
    setTiers(Array.isArray(data) ? data : []);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    }
    setUsersLoading(false);
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
  }, [status, router, fetchTiers]);

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

  const updateRole = async (username: string, role: string) => {
    setRoleUpdating(username);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role }),
    });
    await fetchUsers();
    setRoleUpdating(null);
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
      <Tabs.Root defaultValue="tiers">
        <Tabs.List className="flex gap-0 border-b border-navy-700 mb-6">
          {ADMIN_TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-navy-500 border-b-2 border-transparent transition-colors data-[state=active]:text-navy-100 data-[state=active]:border-navy-100 hover:text-navy-300"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tiers Tab */}
        <Tabs.Content value="tiers">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-navy-400">
                Manage subscription tiers. Connect each tier to a Stripe Price ID for checkout.
              </p>
              <div className="flex items-center gap-2">
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
                  Click "Seed Default Tiers" to create the Analyst, Operator, and Institution tiers from the homepage.
                </p>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Users Tab */}
        <Tabs.Content value="users">
          <div className="max-w-3xl">
            <p className="text-[11px] text-navy-400 mb-4">
              Manage user roles and view subscription status.
            </p>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border border-navy-700 rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-navy-700/60">
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        User
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Role
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Subscription
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.username}
                        className="border-b border-navy-700/30 hover:bg-navy-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-navy-200">
                            {user.username}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                              user.role === "admin"
                                ? "bg-accent-amber/15 text-accent-amber"
                                : "bg-navy-700 text-navy-400"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-navy-400">
                            {user.subscription
                              ? user.tier || "active"
                              : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.subscription ? (
                            <span
                              className={`text-[10px] font-mono uppercase tracking-wider ${
                                user.subscription.status === "active"
                                  ? "text-accent-emerald"
                                  : user.subscription.status === "past_due"
                                  ? "text-accent-amber"
                                  : "text-navy-500"
                              }`}
                            >
                              {user.subscription.status}
                            </span>
                          ) : (
                            <span className="text-[10px] text-navy-600">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {user.role !== "admin" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px]"
                                disabled={roleUpdating === user.username}
                                onClick={() => updateRole(user.username, "admin")}
                              >
                                {roleUpdating === user.username ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Make Admin"
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px]"
                                disabled={
                                  roleUpdating === user.username ||
                                  user.username === session?.user?.name
                                }
                                onClick={() => updateRole(user.username, "user")}
                              >
                                {roleUpdating === user.username ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Remove Admin"
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
