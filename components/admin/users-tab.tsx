"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown, ChevronRight, Clock, CreditCard, Gift, Hash, Loader2,
  MoreVertical, Plus, Shield, Trash2, User, X, XCircle, BarChart3,
  Coins, Eye, LogIn, RefreshCw, Save, Zap,
} from "lucide-react";
import type { ConfirmModalState, Tier, UserRecord, UserStats, UserThrottle, TransactionsData } from "./types";
import { CONFIRM_INITIAL } from "./types";
import { ConfirmModal } from "./confirm-modal";

interface UsersTabProps {
  users: UserRecord[];
  usersLoading: boolean;
  fetchUsers: () => Promise<void>;
  activity: { summary: { totalUsers: number; activeToday: number; active7d: number; totalMessages7d: number; totalPredictions7d: number }; users: Array<{ username: string; lastLogin: string | null; chatSessions7d: number; chatMessages7d: number; predictions7d: number; lastChatAt: string | null; tier: string; role: string }> } | null;
  tiers: Tier[];
}

export function UsersTab({ users, usersLoading, fetchUsers, activity, tiers }: UsersTabProps) {
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

  const [granting, setGranting] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<string | null>(null);
  const [grantForm, setGrantForm] = useState({
    tier: "observer",
    duration: "30", // days, "" = permanent
    note: "",
  });

  const grantAccess = async (username: string) => {
    setGranting(username);
    const expiresAt = grantForm.duration
      ? new Date(Date.now() + parseInt(grantForm.duration) * 86400000).toISOString()
      : null;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        action: "grant_access",
        tier: grantForm.tier,
        expiresAt,
        note: grantForm.note || null,
      }),
    });
    await fetchUsers();
    setGranting(null);
    setGrantModal(null);
    setGrantForm({ tier: "observer", duration: "30", note: "" });
  };

  const revokeAccess = async (username: string) => {
    setGranting(username);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, action: "revoke_access" }),
    });
    await fetchUsers();
    setGranting(null);
  };

  // Create user modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", email: "", role: "user", tier: "free" });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const saveCreateUser = async () => {
    setCreateError(null);
    if (!createForm.username || !createForm.password) {
      setCreateError("Username and password are required");
      return;
    }
    if (createForm.password.length < 10) {
      setCreateError("Password must be at least 10 characters");
      return;
    }
    setCreateSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: createForm.username,
        action: "create_user",
        password: createForm.password,
        email: createForm.email,
        newRole: createForm.role,
        newTier: createForm.tier,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error || "Failed to create user");
      setCreateSaving(false);
      return;
    }
    await fetchUsers();
    setCreateSaving(false);
    setCreateModal(false);
    setCreateForm({ username: "", password: "", email: "", role: "user", tier: "free" });
  };

  // Throttle modal
  const [throttleModal, setThrottleModal] = useState<string | null>(null);
  const [throttleForm, setThrottleForm] = useState<UserThrottle>({ chatMessagesPerDay: null, predictionsPerHour: null, apiCallsPerMinute: null });
  const [throttleSaving, setThrottleSaving] = useState(false);

  const openThrottleModal = (user: UserRecord) => {
    setThrottleModal(user.username);
    setThrottleForm(user.throttle || { chatMessagesPerDay: null, predictionsPerHour: null, apiCallsPerMinute: null });
  };

  const saveThrottle = async () => {
    if (!throttleModal) return;
    setThrottleSaving(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: throttleModal,
        action: "set_throttle",
        throttle: throttleForm,
      }),
    });
    await fetchUsers();
    setThrottleSaving(false);
    setThrottleModal(null);
  };

  const clearThrottle = async () => {
    if (!throttleModal) return;
    setThrottleSaving(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: throttleModal,
        action: "set_throttle",
        throttle: null,
      }),
    });
    await fetchUsers();
    setThrottleSaving(false);
    setThrottleModal(null);
  };

  // Edit user modal
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", role: "user", tier: "free" });
  const [editSaving, setEditSaving] = useState(false);

  const openEditModal = (user: UserRecord) => {
    setEditModal(user.username);
    setEditForm({
      email: user.email || "",
      role: user.role,
      tier: user.tier || "free",
    });
  };

  const saveEditUser = async () => {
    if (!editModal) return;
    setEditSaving(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: editModal,
        action: "edit_user",
        email: editForm.email,
        newRole: editForm.role,
        newTier: editForm.tier,
      }),
    });
    await fetchUsers();
    setEditSaving(false);
    setEditModal(null);
  };

  // User stats modal
  const [statsModal, setStatsModal] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const openStatsModal = async (username: string) => {
    setStatsModal(username);
    setStatsData(null);
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/stats`);
      if (res.ok) {
        setStatsData(await res.json());
      }
    } catch {
      // ignore
    }
    setStatsLoading(false);
  };

  // Transactions modal
  const [txModal, setTxModal] = useState<string | null>(null);
  const [txData, setTxData] = useState<TransactionsData | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [refundConfirm, setRefundConfirm] = useState<{ txId: string; chargeId: string | null; paymentIntentId: string | null; amount: number; description: string } | null>(null);
  const [refundReason, setRefundReason] = useState("requested_by_customer");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);

  const openTxModal = async (username: string) => {
    setTxModal(username);
    setTxData(null);
    setTxLoading(true);
    setRefundConfirm(null);
    setRefundError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/transactions`);
      if (res.ok) {
        setTxData(await res.json());
      }
    } catch {
      // ignore
    }
    setTxLoading(false);
  };

  const issueRefund = async () => {
    if (!refundConfirm || !txModal) return;
    if (refundAmount && (isNaN(Number(refundAmount)) || Number(refundAmount) <= 0)) {
      setRefundError("Enter a valid positive amount");
      return;
    }
    setRefunding(refundConfirm.txId);
    setRefundError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(txModal)}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId: refundConfirm.chargeId,
          paymentIntentId: refundConfirm.paymentIntentId,
          amount: refundAmount ? Math.round(Number(refundAmount) * 100) : undefined,
          reason: refundReason,
        }),
      });
      if (res.ok) {
        setRefundConfirm(null);
        setRefundAmount("");
        // Refresh transactions
        await openTxModal(txModal);
      } else {
        const data = await res.json();
        setRefundError(data.error || "Refund failed");
      }
    } catch {
      setRefundError("Network error");
    }
    setRefunding(null);
  };

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_INITIAL);
  const closeConfirm = () => setConfirmModal(CONFIRM_INITIAL);

  // Block/unblock
  const [blocking, setBlocking] = useState<string | null>(null);

  const blockUser = (username: string) => {
    setConfirmModal({
      open: true,
      title: `Block ${username}`,
      description: `This user will lose access to the platform immediately. They will see a blocked message on login. You can unblock them later.`,
      confirmLabel: "Block User",
      variant: "warning",
      onConfirm: async () => {
        setBlocking(username);
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, action: "block_user" }),
        });
        await fetchUsers();
        setBlocking(null);
      },
    });
  };

  const unblockUser = async (username: string) => {
    setBlocking(username);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, action: "unblock_user" }),
    });
    await fetchUsers();
    setBlocking(null);
  };

  // Delete user
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteUser = (username: string) => {
    setConfirmModal({
      open: true,
      title: `Delete ${username}`,
      description: `This permanently removes the user and all their data including predictions, theses, chat history, and settings. This action cannot be undone.`,
      confirmLabel: "Delete Permanently",
      variant: "danger",
      onConfirm: async () => {
        setDeleting(username);
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, action: "delete_user" }),
        });
        await fetchUsers();
        setDeleting(null);
      },
    });
  };

  // Impersonate user
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const impersonateUser = (username: string) => {
    setConfirmModal({
      open: true,
      title: `Impersonate ${username}`,
      description: `You will see the platform as this user for up to 1 hour. All actions are logged. Your admin session will resume after the impersonation expires or you end it manually.`,
      confirmLabel: "Start Impersonation",
      variant: "info",
      onConfirm: async () => {
        setImpersonating(username);
        setImpersonateError(null);
        try {
          const res = await fetch("/api/admin/impersonate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          if (res.ok) {
            window.location.href = "/dashboard";
          } else {
            const data = await res.json();
            setImpersonateError(data.error || "Failed to impersonate");
          }
        } catch {
          setImpersonateError("Failed to impersonate");
        }
        setImpersonating(null);
      },
    });
  };

  return (
    <>
          <div className="max-w-5xl">
            {/* Activity Digest */}
            {activity && (
              <div className="mb-6 border border-navy-700/40 rounded bg-navy-900/40 p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">7-Day Activity Digest</div>
                {/* Summary cards */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {[
                    { label: "Active Today", value: activity.summary.activeToday, total: activity.summary.totalUsers, color: "text-accent-emerald" },
                    { label: "Active 7d", value: activity.summary.active7d, total: activity.summary.totalUsers, color: "text-accent-cyan" },
                    { label: "Messages 7d", value: activity.summary.totalMessages7d, color: "text-navy-200" },
                    { label: "Predictions 7d", value: activity.summary.totalPredictions7d, color: "text-navy-200" },
                    { label: "Total Users", value: activity.summary.totalUsers, color: "text-navy-200" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className={`text-lg font-mono font-bold tabular-nums ${stat.color}`}>
                        {stat.value}
                        {stat.total !== undefined && stat.total !== stat.value && (
                          <span className="text-[10px] text-navy-600 font-normal">/{stat.total}</span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {/* Active users list */}
                {activity.users.filter((u) => u.chatMessages7d > 0 || u.predictions7d > 0).length > 0 && (
                  <div className="space-y-1.5">
                    {activity.users.filter((u) => u.chatMessages7d > 0 || u.predictions7d > 0).map((u) => {
                      const lastTime = u.lastChatAt || u.lastLogin;
                      const timeAgo = lastTime ? (() => { const diff = Date.now() - new Date(lastTime).getTime(); const mins = Math.floor(diff / 60000); if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; })() : "never";
                      return (
                        <div key={u.username} className="flex items-center gap-3 text-[11px] py-1 px-2 rounded hover:bg-navy-800/30">
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 86400000) ? "bg-accent-emerald" :
                            u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 3 * 86400000) ? "bg-accent-amber" : "bg-navy-700"
                          }`} />
                          <span className="font-mono text-navy-300 w-44 truncate">{u.username}</span>
                          <span className="text-[9px] font-mono text-navy-600 uppercase w-16">{u.tier}</span>
                          <div className="flex items-center gap-3 flex-1">
                            {u.chatMessages7d > 0 && (
                              <span className="text-[10px] font-mono text-accent-cyan">
                                {u.chatMessages7d} msg{u.chatMessages7d !== 1 ? "s" : ""} / {u.chatSessions7d} chat{u.chatSessions7d !== 1 ? "s" : ""}
                              </span>
                            )}
                            {u.predictions7d > 0 && (
                              <span className="text-[10px] font-mono text-accent-amber">
                                {u.predictions7d} prediction{u.predictions7d !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-navy-600 tabular-nums">{timeAgo}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activity.users.filter((u) => u.chatMessages7d > 0 || u.predictions7d > 0).length === 0 && (
                  <p className="text-[11px] text-navy-600 font-mono text-center py-2">No active users in the last 7 days</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-navy-400">
                  Manage user roles and view subscription status.
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-navy-300">
                  {users.length} {users.length === 1 ? "user" : "users"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCreateModal(true); setCreateError(null); setCreateForm({ username: "", password: "", email: "", role: "user", tier: "free" }); }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add User
              </Button>
            </div>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border border-navy-700 rounded overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
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
                        Joined
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-navy-500 min-w-[280px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.username}
                        className={`border-b border-navy-700/30 hover:bg-navy-800/30 transition-colors ${user.blocked ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono ${user.blocked ? "text-navy-500 line-through" : "text-navy-200"}`}>
                              {user.username}
                            </span>
                            {user.blocked && (
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-rose/15 text-accent-rose uppercase tracking-wider">
                                Blocked
                              </span>
                            )}
                            {user.throttle && (
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber uppercase tracking-wider">
                                Throttled
                              </span>
                            )}
                          </div>
                          {user.email && (
                            <span className="text-[10px] text-navy-600 font-mono block mt-0.5">{user.email}</span>
                          )}
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
                          <span className="text-xs text-navy-400 capitalize">
                            {user.subscription
                              ? (user.tier === "station" ? "institution" : user.tier === "analyst" ? "observer" : user.tier) || "active"
                              : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.subscription ? (
                            <div className="flex items-center gap-1.5">
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
                              {user.subscription.stripeSubscriptionId?.startsWith("comped_") && (
                                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent-amber/15 text-accent-amber uppercase tracking-wider">
                                  Beta
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-navy-600">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono text-navy-500">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                              : "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Quick actions */}
                            <button
                              onClick={() => openEditModal(user)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-navy-200 hover:bg-navy-800/50 transition-colors"
                              title="Edit user"
                            >
                              <Eye className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => openStatsModal(user.username)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                              title="View stats"
                            >
                              <Activity className="h-3 w-3" />
                              Stats
                            </button>
                            {user.subscription?.stripeCustomerId && (
                              <button
                                onClick={() => openTxModal(user.username)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-navy-400 hover:text-accent-amber hover:bg-accent-amber/10 transition-colors"
                                title="View transactions"
                              >
                                <CreditCard className="h-3 w-3" />
                                Billing
                              </button>
                            )}

                            {/* Subscription badge */}
                            {user.compedGrant?.expiresAt && user.compedGrant.expiresAt !== "2099-12-31T23:59:59.000Z" &&
                              user.subscription?.stripeSubscriptionId?.startsWith("comped_") && (
                              <span className={`text-[9px] font-mono tabular-nums ${
                                new Date(user.compedGrant.expiresAt) < new Date() ? "text-accent-rose" : "text-accent-amber"
                              }`}>
                                {new Date(user.compedGrant.expiresAt) < new Date()
                                  ? "expired"
                                  : `exp ${new Date(user.compedGrant.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                }
                              </span>
                            )}

                            {/* 3-dot menu */}
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button className="p-1 rounded text-navy-500 hover:text-navy-200 hover:bg-navy-800/50 transition-colors">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  className="min-w-[160px] bg-navy-900 border border-navy-700 rounded-lg shadow-xl p-1 z-50"
                                  sideOffset={4}
                                  align="end"
                                >
                                  {/* Impersonate - always show for other users, disabled for admins/blocked */}
                                  {user.username !== session?.user?.name && (() => {
                                    const canImpersonate = user.role !== "admin" && !user.blocked;
                                    const reason = user.role === "admin" ? "Cannot impersonate admins" : user.blocked ? "Cannot impersonate blocked users" : "";
                                    return (
                                      <DropdownMenu.Item
                                        className={`flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono outline-none transition-colors ${
                                          canImpersonate
                                            ? "text-accent-cyan cursor-pointer hover:bg-accent-cyan/10"
                                            : "text-navy-700 cursor-not-allowed line-through"
                                        }`}
                                        onSelect={canImpersonate ? () => impersonateUser(user.username) : undefined}
                                        disabled={!canImpersonate || impersonating === user.username}
                                        title={reason}
                                      >
                                        <UserCheck className="h-3 w-3" />
                                        {impersonating === user.username ? "Impersonating..." : "Impersonate"}
                                      </DropdownMenu.Item>
                                    );
                                  })()}

                                  {/* Role toggle */}
                                  {user.role !== "admin" ? (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-amber/10 hover:text-accent-amber transition-colors"
                                      onSelect={() => updateRole(user.username, "admin")}
                                      disabled={roleUpdating === user.username}
                                    >
                                      <Shield className="h-3 w-3" />
                                      {roleUpdating === user.username ? "Updating..." : "Promote to Admin"}
                                    </DropdownMenu.Item>
                                  ) : user.username !== session?.user?.name ? (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-amber cursor-pointer outline-none hover:bg-navy-800/50 transition-colors"
                                      onSelect={() => updateRole(user.username, "user")}
                                      disabled={roleUpdating === user.username}
                                    >
                                      <Shield className="h-3 w-3" />
                                      {roleUpdating === user.username ? "Updating..." : "Demote to User"}
                                    </DropdownMenu.Item>
                                  ) : null}

                                  {/* Grant / Revoke Access */}
                                  {granting === user.username ? (
                                    <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-500 cursor-default outline-none" disabled>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Updating...
                                    </DropdownMenu.Item>
                                  ) : user.subscription?.status === "active" &&
                                    user.subscription?.stripeSubscriptionId?.startsWith("comped_") ? (
                                    <>
                                      <DropdownMenu.Item
                                        className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-cyan/10 hover:text-accent-cyan transition-colors"
                                        onSelect={() => {
                                          setGrantModal(user.username);
                                          const rawTier = user.compedGrant?.tier || user.tier || "observer";
                                          setGrantForm({
                                            tier: rawTier === "station" ? "institution" : rawTier === "analyst" ? "observer" : rawTier,
                                            duration: "",
                                            note: user.compedGrant?.note || "",
                                          });
                                        }}
                                      >
                                        <Gift className="h-3 w-3" />
                                        Update Grant
                                      </DropdownMenu.Item>
                                      <DropdownMenu.Item
                                        className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-rose/70 cursor-pointer outline-none hover:bg-accent-rose/10 hover:text-accent-rose transition-colors"
                                        onSelect={() => revokeAccess(user.username)}
                                      >
                                        <X className="h-3 w-3" />
                                        Revoke Access
                                      </DropdownMenu.Item>
                                    </>
                                  ) : !user.subscription || user.subscription.status !== "active" ? (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-cyan/10 hover:text-accent-cyan transition-colors"
                                      onSelect={() => {
                                        setGrantModal(user.username);
                                        setGrantForm({ tier: "observer", duration: "30", note: "" });
                                      }}
                                    >
                                      <Gift className="h-3 w-3" />
                                      Grant Access
                                    </DropdownMenu.Item>
                                  ) : null}

                                  {/* Throttle */}
                                  {user.username !== session?.user?.name && (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-300 cursor-pointer outline-none hover:bg-accent-amber/10 hover:text-accent-amber transition-colors"
                                      onSelect={() => openThrottleModal(user)}
                                    >
                                      <Timer className="h-3 w-3" />
                                      {user.throttle ? "Edit Throttle" : "Set Throttle"}
                                    </DropdownMenu.Item>
                                  )}

                                  {user.username !== session?.user?.name && (
                                    <>
                                      <DropdownMenu.Separator className="h-px bg-navy-700/40 my-1" />

                                      {/* Block / Unblock */}
                                      {user.blocked ? (
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-emerald/70 cursor-pointer outline-none hover:bg-accent-emerald/10 hover:text-accent-emerald transition-colors"
                                          onSelect={() => unblockUser(user.username)}
                                          disabled={blocking === user.username}
                                        >
                                          <Shield className="h-3 w-3" />
                                          {blocking === user.username ? "Updating..." : "Unblock"}
                                        </DropdownMenu.Item>
                                      ) : (
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-navy-500 cursor-pointer outline-none hover:bg-accent-rose/10 hover:text-accent-rose transition-colors"
                                          onSelect={() => blockUser(user.username)}
                                          disabled={blocking === user.username}
                                        >
                                          <Shield className="h-3 w-3" />
                                          {blocking === user.username ? "Updating..." : "Block"}
                                        </DropdownMenu.Item>
                                      )}

                                      {/* Delete */}
                                      <DropdownMenu.Item
                                        className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono text-accent-rose/60 cursor-pointer outline-none hover:bg-accent-rose/10 hover:text-accent-rose transition-colors"
                                        onSelect={() => deleteUser(user.username)}
                                        disabled={deleting === user.username}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        {deleting === user.username ? "Deleting..." : "Delete User"}
                                      </DropdownMenu.Item>
                                    </>
                                  )}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grant Access Modal */}
          {grantModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setGrantModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <Gift className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Grant Access</span>
                  </div>
                  <button onClick={() => setGrantModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
                    <User className="h-3 w-3 text-navy-500" />
                    <span className="text-sm font-mono text-navy-200">{grantModal}</span>
                  </div>

                  {/* Tier Selection */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Tier</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["observer", "operator", "institution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setGrantForm({ ...grantForm, tier: t })}
                          className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider transition-all ${
                            grantForm.tier === t
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">
                      <Clock className="h-2.5 w-2.5 inline mr-1" />
                      Duration
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "7 days", value: "7" },
                        { label: "14 days", value: "14" },
                        { label: "30 days", value: "30" },
                        { label: "90 days", value: "90" },
                        { label: "Permanent", value: "" },
                      ].map((d) => (
                        <button
                          key={d.value}
                          onClick={() => setGrantForm({ ...grantForm, duration: d.value })}
                          className={`px-2 py-1.5 rounded border text-[10px] font-mono transition-all ${
                            grantForm.duration === d.value
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {grantForm.duration && (
                      <p className="text-[9px] font-mono text-navy-500 mt-1.5">
                        Expires {new Date(Date.now() + parseInt(grantForm.duration) * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Note (optional)</label>
                    <input
                      value={grantForm.note}
                      onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })}
                      placeholder="e.g. Beta tester, advisor, press review..."
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-navy-800/30 rounded p-3 border border-navy-700/20 space-y-1">
                    <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Summary</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">Tier</span>
                      <span className="text-[10px] font-mono text-navy-200 capitalize">{grantForm.tier}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">Duration</span>
                      <span className="text-[10px] font-mono text-navy-200">
                        {grantForm.duration ? `${grantForm.duration} days` : "Permanent"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-navy-400">Cost</span>
                      <span className="text-[10px] font-mono text-accent-emerald">Free (comped)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700">
                  <Button variant="ghost" size="sm" onClick={() => setGrantModal(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => grantAccess(grantModal)} disabled={granting === grantModal}>
                    {granting === grantModal ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Gift className="h-3 w-3 mr-1" />
                    )}
                    Grant {grantForm.tier}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Throttle Modal */}
          {throttleModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setThrottleModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <Timer className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Throttle User</span>
                  </div>
                  <button onClick={() => setThrottleModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
                    <User className="h-3 w-3 text-navy-500" />
                    <span className="text-sm font-mono text-navy-200">{throttleModal}</span>
                  </div>

                  <p className="text-[10px] font-mono text-navy-500">
                    Set custom rate limits for this user. Leave blank to use tier defaults.
                  </p>

                  {/* Chat messages per day */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Chat messages / day</label>
                    <input
                      type="number"
                      min="0"
                      value={throttleForm.chatMessagesPerDay ?? ""}
                      onChange={(e) => setThrottleForm({ ...throttleForm, chatMessagesPerDay: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Tier default"
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  {/* Predictions per hour */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Prediction requests / hour</label>
                    <input
                      type="number"
                      min="0"
                      value={throttleForm.predictionsPerHour ?? ""}
                      onChange={(e) => setThrottleForm({ ...throttleForm, predictionsPerHour: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Default (5)"
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>

                  {/* API calls per minute */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">API calls / minute</label>
                    <input
                      type="number"
                      min="0"
                      value={throttleForm.apiCallsPerMinute ?? ""}
                      onChange={(e) => setThrottleForm({ ...throttleForm, apiCallsPerMinute: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Default (60)"
                      className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700">
                  <button
                    onClick={clearThrottle}
                    disabled={throttleSaving}
                    className="text-[10px] font-mono text-navy-500 hover:text-accent-rose transition-colors"
                  >
                    Remove throttle
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setThrottleModal(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveThrottle} disabled={throttleSaving}>
                      {throttleSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Edit User</span>
                  </div>
                  <button onClick={() => setEditModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
                    <User className="h-3 w-3 text-navy-500" />
                    <span className="text-sm font-mono text-navy-200">{editModal}</span>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["user", "admin"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setEditForm({ ...editForm, role: r })}
                          className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider transition-all ${
                            editForm.role === r
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Tier</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["free", "observer", "operator", "institution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setEditForm({ ...editForm, tier: t })}
                          className={`px-2 py-2 rounded border text-[10px] font-mono uppercase tracking-wider transition-all ${
                            editForm.tier === t
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700">
                  <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditUser} disabled={editSaving}>
                    {editSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* User Stats Modal */}
          {statsModal && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setStatsModal(null)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">User Stats</span>
                    <span className="text-[11px] font-mono text-accent-cyan">{statsModal}</span>
                  </div>
                  <button onClick={() => setStatsModal(null)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                  {statsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : statsData ? (
                    <>
                      {/* Account Info */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Account Created</div>
                          <div className="text-[12px] font-mono text-navy-200">
                            {statsData.accountCreated
                              ? new Date(statsData.accountCreated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Unknown"}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Last Login</div>
                          <div className="text-[12px] font-mono text-navy-200">
                            {statsData.lastLogin
                              ? new Date(statsData.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                              : "N/A"}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Chat Sessions</div>
                          <div className="text-[12px] font-mono text-navy-200">{statsData.chatStats.totalSessions}</div>
                          <div className="text-[9px] font-mono text-navy-600">{statsData.chatStats.totalMessages} messages</div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Trades</div>
                          <div className="text-[12px] font-mono text-navy-200">{statsData.tradeStats.total}</div>
                          <div className="text-[9px] font-mono text-navy-600">{statsData.tradeStats.filled} filled</div>
                        </div>
                      </div>

                      {/* Credit Balance */}
                      {statsData.creditBalance && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Coins className="h-3.5 w-3.5 text-accent-amber" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Credit Balance</span>
                            <span className="text-[9px] font-mono text-navy-600 ml-auto">Period: {statsData.creditBalance.period}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-[9px] font-mono text-navy-500 uppercase mb-0.5">Granted</div>
                              <div className="text-lg font-mono text-navy-200 tabular-nums">
                                {statsData.creditBalance.creditsGranted === -1 ? "Unlimited" : statsData.creditBalance.creditsGranted.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-mono text-navy-500 uppercase mb-0.5">Used</div>
                              <div className="text-lg font-mono text-accent-amber tabular-nums">{statsData.creditBalance.creditsUsed.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-mono text-navy-500 uppercase mb-0.5">Remaining</div>
                              <div className={`text-lg font-mono tabular-nums ${
                                statsData.creditBalance.creditsRemaining < statsData.creditBalance.creditsGranted * 0.2
                                  ? "text-accent-rose"
                                  : "text-accent-emerald"
                              }`}>
                                {statsData.creditBalance.creditsGranted === -1 ? "Unlimited" : statsData.creditBalance.creditsRemaining.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {/* Usage bar */}
                          {statsData.creditBalance.creditsGranted > 0 && (
                            <div className="mt-3">
                              <div className="h-2 rounded-full bg-navy-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted > 0.8
                                      ? "bg-accent-rose"
                                      : statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted > 0.5
                                      ? "bg-accent-amber"
                                      : "bg-accent-cyan"
                                  }`}
                                  style={{ width: `${Math.min(100, (statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted) * 100)}%` }}
                                />
                              </div>
                              <div className="text-[9px] font-mono text-navy-600 mt-1">
                                {((statsData.creditBalance.creditsUsed / statsData.creditBalance.creditsGranted) * 100).toFixed(1)}% used
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Daily Usage Chart (simple bar) */}
                      {statsData.dailyUsage.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-3.5 w-3.5 text-accent-cyan" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Daily Usage (14 days)</span>
                          </div>
                          <div className="flex items-end gap-1 h-24">
                            {statsData.dailyUsage.map((day) => {
                              const maxCredits = Math.max(...statsData.dailyUsage.map((d) => d.credits));
                              const height = maxCredits > 0 ? (day.credits / maxCredits) * 100 : 0;
                              return (
                                <div key={day.day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-navy-800 border border-navy-700 rounded px-2 py-1 text-[9px] font-mono text-navy-200 whitespace-nowrap z-10">
                                    {day.credits.toLocaleString()} credits / {day.calls} calls
                                  </div>
                                  <div
                                    className="w-full rounded-t bg-accent-cyan/60 hover:bg-accent-cyan transition-all cursor-default min-h-[2px]"
                                    style={{ height: `${Math.max(2, height)}%` }}
                                  />
                                  <span className="text-[7px] font-mono text-navy-600 rotate-0">{day.day.slice(8)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Model Usage Breakdown */}
                      {statsData.modelUsage.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Hash className="h-3.5 w-3.5 text-accent-emerald" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Model Usage</span>
                          </div>
                          <div className="space-y-2">
                            {statsData.modelUsage.map((m) => (
                              <div key={m.model || "unknown"} className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-navy-300 w-40 truncate">
                                  {(m.model || "unknown").replace("claude-", "").replace(/-\d{8}$/, "")}
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-accent-emerald/60"
                                    style={{
                                      width: `${Math.min(100, (m.totalCredits / Math.max(...statsData.modelUsage.map((x) => x.totalCredits))) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-navy-400 tabular-nums w-20 text-right">{m.totalCredits.toLocaleString()}</span>
                                <span className="text-[9px] font-mono text-navy-600 tabular-nums w-16 text-right">{m.callCount} calls</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Usage by Period */}
                      {statsData.usageByPeriod.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Monthly History</span>
                          <div className="mt-3 space-y-1.5">
                            {statsData.usageByPeriod.map((p) => (
                              <div key={p.period} className="flex items-center gap-3 text-[10px] font-mono">
                                <span className="text-navy-400 w-16">{p.period}</span>
                                <span className="text-accent-amber tabular-nums w-20 text-right">{p.totalCredits.toLocaleString()} cr</span>
                                <span className="text-navy-500 tabular-nums w-24 text-right">{(p.totalInputTokens || 0).toLocaleString()} in</span>
                                <span className="text-navy-500 tabular-nums w-24 text-right">{(p.totalOutputTokens || 0).toLocaleString()} out</span>
                                <span className="text-navy-600 tabular-nums">{p.callCount} calls</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Chat Sessions */}
                      {statsData.recentSessions.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="h-3.5 w-3.5 text-accent-cyan" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Recent Chat Sessions</span>
                          </div>
                          <div className="space-y-1">
                            {statsData.recentSessions.map((s) => (
                              <div key={s.id} className="flex items-center gap-3 text-[10px] font-mono py-1">
                                <span className="text-navy-300 flex-1 truncate">{s.title}</span>
                                <span className="text-navy-600 tabular-nums shrink-0">
                                  {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Trades */}
                      {statsData.recentTrades.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-3.5 w-3.5 text-accent-emerald" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Recent Trades</span>
                          </div>
                          <div className="space-y-1">
                            {statsData.recentTrades.map((t) => (
                              <div key={t.id} className="flex items-center gap-3 text-[10px] font-mono py-1">
                                <span className={`w-8 uppercase ${t.direction === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
                                  {t.direction === "BUY" ? (
                                    <span className="flex items-center gap-0.5"><ArrowUpRight className="h-2.5 w-2.5" />Buy</span>
                                  ) : (
                                    <span className="flex items-center gap-0.5"><ArrowDownRight className="h-2.5 w-2.5" />Sell</span>
                                  )}
                                </span>
                                <span className="text-navy-200 w-16">{t.ticker}</span>
                                <span className="text-navy-500 tabular-nums">{t.quantity}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  t.status === "filled" ? "bg-accent-emerald/15 text-accent-emerald" :
                                  t.status === "rejected" ? "bg-accent-rose/15 text-accent-rose" :
                                  "bg-navy-700 text-navy-400"
                                }`}>{t.status}</span>
                                <span className="text-[9px] px-1 py-0.5 rounded bg-navy-800 text-navy-500 uppercase">{t.environment}</span>
                                <span className="text-navy-600 tabular-nums ml-auto shrink-0">
                                  {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Support Tickets */}
                      {statsData.supportTickets.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="h-3.5 w-3.5 text-accent-amber" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Support Tickets</span>
                          </div>
                          <div className="space-y-1">
                            {statsData.supportTickets.map((t) => (
                              <div key={t.id} className="flex items-center gap-3 text-[10px] font-mono py-1">
                                <span className="text-navy-300 flex-1 truncate">{t.title}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  t.status === "open" ? "bg-accent-amber/15 text-accent-amber" :
                                  t.status === "resolved" ? "bg-accent-emerald/15 text-accent-emerald" :
                                  "bg-navy-700 text-navy-400"
                                }`}>{t.status}</span>
                                <span className="text-navy-600 tabular-nums shrink-0">
                                  {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Credit Ledger */}
                      {statsData.recentLedger.length > 0 && (
                        <div className="border border-navy-700/40 rounded-lg p-4 bg-navy-800/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-3.5 w-3.5 text-navy-500" />
                            <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Recent Activity Log</span>
                          </div>
                          <div className="space-y-0.5 max-h-48 overflow-y-auto">
                            {statsData.recentLedger.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-2 text-[9px] font-mono py-0.5">
                                <span className="text-accent-rose tabular-nums w-14 text-right">{entry.amount}</span>
                                <span className="text-navy-500 w-20 truncate">{entry.reason}</span>
                                <span className="text-navy-600 truncate flex-1">
                                  {(entry.model || "").replace("claude-", "").replace(/-\d{8}$/, "")}
                                </span>
                                <span className="text-navy-600 tabular-nums shrink-0">
                                  {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!statsData.creditBalance && statsData.recentSessions.length === 0 && statsData.recentTrades.length === 0 && (
                        <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                          <Activity className="h-6 w-6 text-navy-600 mx-auto mb-2 opacity-40" />
                          <p className="text-[11px] text-navy-500">No activity recorded for this user</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                      <XCircle className="h-6 w-6 text-accent-rose/40 mx-auto mb-2" />
                      <p className="text-[11px] text-navy-500">Failed to load stats</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Modal */}
          {txModal && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setTxModal(null); setRefundConfirm(null); }}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Transactions</span>
                    <span className="text-[11px] font-mono text-accent-cyan">{txModal}</span>
                  </div>
                  <button onClick={() => { setTxModal(null); setRefundConfirm(null); }} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                  {txLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : txData ? (
                    <>
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Total Paid</div>
                          <div className="text-lg font-mono text-accent-emerald tabular-nums">
                            {(txData.totalPaid / 100).toLocaleString("en-US", { style: "currency", currency: "usd" })}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Total Refunded</div>
                          <div className="text-lg font-mono text-accent-rose tabular-nums">
                            {(txData.totalRefunded / 100).toLocaleString("en-US", { style: "currency", currency: "usd" })}
                          </div>
                        </div>
                        <div className="border border-navy-700/40 rounded-lg p-3 bg-navy-800/20">
                          <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-1">Transactions</div>
                          <div className="text-lg font-mono text-navy-200 tabular-nums">{txData.transactions.length}</div>
                        </div>
                      </div>

                      {/* Refund Confirmation */}
                      {refundConfirm && (
                        <div className="border border-accent-rose/30 rounded-lg p-4 bg-accent-rose/[0.03] space-y-3">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="h-3.5 w-3.5 text-accent-rose" />
                            <span className="text-[11px] font-mono text-accent-rose uppercase tracking-wider">Confirm Refund</span>
                          </div>
                          <p className="text-[11px] text-navy-300">
                            Refunding: {refundConfirm.description} ({(refundConfirm.amount / 100).toLocaleString("en-US", { style: "currency", currency: "usd" })})
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Amount (leave blank for full)</label>
                              <input
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                placeholder={`${(refundConfirm.amount / 100).toFixed(2)} (full)`}
                                className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Reason</label>
                              <select
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                className="w-full h-8 px-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 focus:outline-none focus:border-navy-600"
                              >
                                <option value="requested_by_customer">Requested by customer</option>
                                <option value="duplicate">Duplicate charge</option>
                                <option value="fraudulent">Fraudulent</option>
                              </select>
                            </div>
                          </div>

                          {refundError && (
                            <div className="text-[11px] font-mono text-accent-rose bg-accent-rose/10 px-3 py-2 rounded border border-accent-rose/20">
                              {refundError}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setRefundConfirm(null); setRefundAmount(""); setRefundError(null); }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={issueRefund}
                              disabled={refunding === refundConfirm.txId}
                              className="bg-accent-rose/15 text-accent-rose border-accent-rose/25 hover:bg-accent-rose/25"
                            >
                              {refunding === refundConfirm.txId ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <RotateCcw className="h-3 w-3 mr-1" />
                              )}
                              Process Refund
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Transaction List */}
                      {txData.transactions.length > 0 ? (
                        <div className="border border-navy-700/40 rounded-lg overflow-hidden">
                          <table className="w-full text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-navy-700/40 bg-navy-800/30">
                                <th className="text-left px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Date</th>
                                <th className="text-left px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Description</th>
                                <th className="text-right px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Amount</th>
                                <th className="text-center px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Status</th>
                                <th className="text-right px-3 py-2 text-[9px] text-navy-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txData.transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-navy-700/20 hover:bg-navy-800/20">
                                  <td className="px-3 py-2.5 text-navy-400 tabular-nums whitespace-nowrap">
                                    {new Date(tx.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </td>
                                  <td className="px-3 py-2.5 text-navy-300 truncate max-w-[250px]">
                                    {tx.description}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                                    <span className={tx.amount > 0 ? "text-accent-emerald" : "text-navy-500"}>
                                      {(tx.amount / 100).toLocaleString("en-US", { style: "currency", currency: tx.currency })}
                                    </span>
                                    {tx.refundedAmount > 0 && (
                                      <span className="text-accent-rose ml-1.5 text-[9px]">
                                        -{(tx.refundedAmount / 100).toLocaleString("en-US", { style: "currency", currency: tx.currency })}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      tx.status === "paid" || tx.status === "succeeded" ? "bg-accent-emerald/15 text-accent-emerald" :
                                      tx.status === "open" || tx.status === "draft" ? "bg-accent-amber/15 text-accent-amber" :
                                      tx.status === "void" || tx.status === "uncollectible" ? "bg-accent-rose/15 text-accent-rose" :
                                      "bg-navy-700 text-navy-400"
                                    }`}>
                                      {tx.status}
                                    </span>
                                    {tx.refunded && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose ml-1 uppercase">
                                        {tx.refunded === "full" ? "refunded" : "partial refund"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {tx.invoiceUrl && (
                                        <a
                                          href={tx.invoiceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-navy-500 hover:text-accent-cyan transition-colors p-1"
                                          title="View invoice"
                                        >
                                          <FileText className="h-3 w-3" />
                                        </a>
                                      )}
                                      {(tx.status === "paid" || tx.status === "succeeded") && tx.refunded !== "full" && (tx.chargeId || tx.paymentIntentId) && (
                                        <button
                                          onClick={() => {
                                            setRefundConfirm({
                                              txId: tx.id,
                                              chargeId: tx.chargeId,
                                              paymentIntentId: tx.paymentIntentId,
                                              amount: tx.amount - tx.refundedAmount,
                                              description: tx.description,
                                            });
                                            setRefundAmount("");
                                            setRefundError(null);
                                          }}
                                          className="text-navy-500 hover:text-accent-rose transition-colors p-1"
                                          title="Refund"
                                        >
                                          <RotateCcw className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                          <CreditCard className="h-6 w-6 text-navy-600 mx-auto mb-2 opacity-40" />
                          <p className="text-[11px] text-navy-500">No transactions found for this user</p>
                        </div>
                      )}

                      {/* Stripe Customer Link */}
                      {txData.stripeCustomerId && (
                        <div className="text-[9px] font-mono text-navy-600 text-right">
                          Stripe Customer: {txData.stripeCustomerId}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-navy-700/30 border-dashed rounded-lg p-8 text-center">
                      <XCircle className="h-6 w-6 text-accent-rose/40 mx-auto mb-2" />
                      <p className="text-[11px] text-navy-500">Failed to load transactions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal */}
          {createModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCreateModal(false)}>
              <div
                className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-accent-cyan" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-navy-200">Create User</span>
                  </div>
                  <button onClick={() => setCreateModal(false)} className="text-navy-500 hover:text-navy-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {createError && (
                    <div className="px-3 py-2 rounded bg-accent-rose/10 border border-accent-rose/20 text-[11px] font-mono text-accent-rose">
                      {createError}
                    </div>
                  )}

                  {/* Username */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        value={createForm.username}
                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                        placeholder="3-32 chars, letters/numbers/underscores"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Password</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Minimum 10 characters"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-1">Email (optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
                      <input
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/50 border border-navy-700/50 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["user", "admin"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setCreateForm({ ...createForm, role: r })}
                          className={`px-3 py-2 rounded border text-[11px] font-mono uppercase tracking-wider transition-all ${
                            createForm.role === r
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier */}
                  <div>
                    <label className="text-[10px] font-mono text-navy-500 uppercase tracking-wider block mb-2">Tier</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["free", "observer", "operator", "institution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setCreateForm({ ...createForm, tier: t })}
                          className={`px-2 py-2 rounded border text-[10px] font-mono uppercase tracking-wider transition-all ${
                            createForm.tier === t
                              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                              : "border-navy-700/40 text-navy-500 hover:text-navy-300 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700">
                  <Button variant="ghost" size="sm" onClick={() => setCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveCreateUser} disabled={createSaving}>
                    {createSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    Create User
                  </Button>
                </div>
              </div>
            </div>
          )}

      {/* Confirm Modal */}
      <ConfirmModal state={confirmModal} onClose={closeConfirm} />

      {/* Impersonate Error Toast */}
      {impersonateError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-accent-rose/30 bg-navy-900/95 backdrop-blur-md px-4 py-3 shadow-2xl">
          <XCircle className="h-4 w-4 text-accent-rose flex-shrink-0" />
          <span className="text-xs text-accent-rose">{impersonateError}</span>
          <button
            onClick={() => setImpersonateError(null)}
            className="text-navy-500 hover:text-navy-300 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </>
  );
}
