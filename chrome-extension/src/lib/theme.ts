export const COLORS = {
  navy950: "#000000",
  navy900: "#0a0a0a",
  navy800: "#1a1a1a",
  navy700: "#2a2a2a",
  navy600: "#3a3a3a",
  navy500: "#6b7280",
  navy400: "#9ca3af",
  navy100: "#e0e0e0",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
} as const;

export const INTENSITY_COLORS: Record<number, string> = {
  1: COLORS.navy500,
  2: COLORS.navy400,
  3: COLORS.amber,
  4: COLORS.rose,
  5: "#dc2626",
};
