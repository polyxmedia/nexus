// ── Graph constants ──

export const NODE_COLORS: Record<string, string> = {
  signal: "#f59e0b",
  prediction: "#8b5cf6",
  trade: "#10b981",
  thesis: "#06b6d4",
  ticker: "#ec4899",
  sector: "#f97316",
  event: "#ef4444",
  actor: "#6366f1",
  location: "#14b8a6",
};

export const EDGE_COLORS: Record<string, string> = {
  affects: "#06b6d4",
  triggers: "#f59e0b",
  belongs_to: "#8b5cf6",
  correlated_with: "#6366f1",
  trades: "#10b981",
  opposes: "#ef4444",
  allies: "#14b8a6",
  monitors: "#64748b",
  predicts: "#8b5cf6",
  located_in: "#14b8a6",
};

export const RELATIONSHIP_LABELS: Record<string, { out: string; in: string }> = {
  affects: { out: "Affects", in: "Affected by" },
  triggers: { out: "Triggers", in: "Triggered by" },
  belongs_to: { out: "Belongs to", in: "Contains" },
  correlated_with: { out: "Correlated with", in: "Correlated with" },
  trades: { out: "Trades", in: "Traded by" },
  opposes: { out: "Opposes", in: "Opposed by" },
  allies: { out: "Allied with", in: "Allied with" },
  monitors: { out: "Monitors", in: "Monitored by" },
  predicts: { out: "Predicts", in: "Predicted by" },
  located_in: { out: "Located in", in: "Location of" },
};

export function weightLabel(w: number): string {
  if (w >= 0.7) return "Strong";
  if (w >= 0.4) return "Moderate";
  return "Weak";
}

export function weightColor(w: number): string {
  if (w >= 0.7) return "#10b981";
  if (w >= 0.4) return "#f59e0b";
  return "#64748b";
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  signal: "Signals",
  prediction: "Predictions",
  trade: "Trades",
  thesis: "Theses",
  ticker: "Tickers",
  sector: "Sectors",
  event: "Events",
  actor: "Actors",
  location: "Locations",
};
