import { Monitor, Smartphone, Tablet } from "lucide-react";

export interface ConfirmModalState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "danger" | "warning" | "info";
  onConfirm: () => void;
}

export const CONFIRM_INITIAL: ConfirmModalState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  variant: "info",
  onConfirm: () => {},
};

export interface Tier {
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

export interface UserThrottle {
  chatMessagesPerDay: number | null;
  predictionsPerHour: number | null;
  apiCallsPerMinute: number | null;
}

export interface UserRecord {
  username: string;
  role: string;
  tier: string;
  createdAt: string;
  email: string | null;
  blocked: boolean;
  blockedAt: string | null;
  throttle: UserThrottle | null;
  compedGrant: {
    tier: string;
    grantedAt: string;
    expiresAt: string | null;
    note: string | null;
  } | null;
  subscription: {
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null;
  } | null;
}

export interface SchedulerJob {
  name: string;
  intervalMs: number;
  defaultIntervalMs: number;
  lastRun: string | null;
  running: boolean;
  errors: number;
  ai: boolean;
  enabled: boolean;
}

export interface UserStats {
  creditBalance: {
    period: string;
    creditsGranted: number;
    creditsUsed: number;
    creditsRemaining: number;
  } | null;
  recentLedger: {
    id: number;
    amount: number;
    reason: string;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    sessionId: string | null;
    createdAt: string;
  }[];
  usageByPeriod: {
    period: string;
    totalCredits: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    callCount: number;
  }[];
  modelUsage: {
    model: string | null;
    totalCredits: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    callCount: number;
  }[];
  recentSessions: {
    id: number;
    uuid: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }[];
  chatStats: {
    totalSessions: number;
    totalMessages: number;
  };
  recentTrades: {
    id: number;
    ticker: string;
    direction: string;
    quantity: number;
    status: string;
    environment: string;
    createdAt: string;
  }[];
  tradeStats: {
    total: number;
    filled: number;
  };
  supportTickets: {
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];
  accountCreated: string | null;
  lastLogin: string | null;
  dailyUsage: {
    day: string;
    credits: number;
    calls: number;
  }[];
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string | null;
  description: string;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  chargeId: string | null;
  paymentIntentId: string | null;
  refunded: string | null;
  refundedAmount: number;
}

export interface TransactionsData {
  transactions: Transaction[];
  stripeCustomerId: string;
  totalPaid: number;
  totalRefunded: number;
}

export interface AnalyticsData {
  period: { days: number; since: string };
  totalViews: number;
  uniqueSessions: number;
  uniqueVisitors: number;
  avgViewsPerSession: number;
  bounceRate: number;
  avgDuration: number;
  newVisitors: number;
  returningVisitors: number;
  live: { activeVisitors: number; pageviews: number };
  topPages: { path: string; views: number; uniqueVisitors: number; avgDuration: number }[];
  dailyViews: { date: string; views: number; unique: number; visitors: number }[];
  devices: { deviceType: string | null; count: number }[];
  browsers: { browser: string | null; count: number }[];
  operatingSystems: { os: string | null; count: number }[];
  referrers: { referrer: string | null; count: number; uniqueVisitors: number }[];
  hourly: { hour: string; count: number }[];
  countries: { country: string | null; count: number; uniqueVisitors: number }[];
  cities: { city: string | null; country: string | null; count: number }[];
  screens: { width: number | null; height: number | null; count: number }[];
  entryPages: { path: string; count: number }[];
  exitPages: { path: string; count: number }[];
}

export interface GrowthData {
  overview: {
    totalUsers: number;
    activeSubscribers: number;
    compedSubscribers: number;
    paidSubscribers: number;
    cancelledSubscribers: number;
    pastDueSubscribers: number;
    mrr: number;
    arr: number;
    churnRate: number;
    conversionRate: number;
  };
  tierBreakdown: {
    id: number;
    name: string;
    price: number;
    subscribers: number;
    revenue: number;
  }[];
  growthTimeline: {
    date: string;
    newUsers: number;
    totalUsers: number;
  }[];
  subscriptionTimeline: {
    date: string;
    newSubscribers: number;
    totalSubscribers: number;
  }[];
  referrals: {
    total: number;
    converted: number;
    conversionRate: number;
    totalCommissions: number;
    pendingCommissions: number;
    paidCommissions: number;
  };
  engagement: {
    totalChatSessions: number;
    totalPredictions: number;
    resolvedPredictions: number;
    predictionAccuracy: number;
  };
  recentSubscriptions: {
    userId: string;
    tier: string;
    status: string;
    createdAt: string;
    cancelAtPeriodEnd: boolean;
  }[];
}

export interface PromptEntry {
  key: string;
  label: string;
  description: string;
  category: string;
  value: string;
  isOverridden: boolean;
  defaultValue: string;
}

export const PROMPT_CATEGORIES = [
  { id: "chat", label: "Chat" },
  { id: "operator", label: "Operator Context" },
  { id: "analysis", label: "Analysis" },
  { id: "predictions", label: "Predictions" },
];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export const ADMIN_TABS = [
  { id: "growth", label: "Growth", icon: "TrendingUp" },
  { id: "tiers", label: "Tiers", icon: "CreditCard" },
  { id: "users", label: "Users", icon: "Users" },
  { id: "prompts", label: "Prompts", icon: "FileText" },
  { id: "emails", label: "Emails", icon: "Mail" },
  { id: "support", label: "Support", icon: "MessageSquare" },
  { id: "analytics", label: "Analytics", icon: "BarChart3" },
  { id: "scheduler", label: "Automation", icon: "Timer" },
  { id: "analysts", label: "Analysts", icon: "UserCheck" },
  { id: "calibration", label: "Calibration", icon: "FlaskConical" },
  { id: "base-rates", label: "Base Rates", icon: "Activity" },
