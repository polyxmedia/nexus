import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";

const INTENSITY_LABELS: Record<number, string> = {
  1: "LOW",
  2: "GUARDED",
  3: "ELEVATED",
  4: "HIGH",
  5: "CRITICAL",
};

const INTENSITY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#06b6d420", text: "#06b6d4" },
  2: { bg: "#10b98120", text: "#10b981" },
  3: { bg: "#f59e0b20", text: "#f59e0b" },
  4: { bg: "#f9731620", text: "#f97316" },
  5: { bg: "#ef444420", text: "#ef4444" },
};

export async function LiveSignalFeed() {
  let signals: Array<{ title: string; date: string; intensity: number }> = [];

  try {
    const rows = await db
      .select({
        title: schema.signals.title,
        date: schema.signals.date,
        intensity: schema.signals.intensity,
      })
      .from(schema.signals)
      .orderBy(desc(schema.signals.intensity), desc(schema.signals.id))
      .limit(5);

    signals = rows.map((s) => ({
      title: s.title,
      date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      intensity: s.intensity,
    }));
  } catch {
    // Fallback: show nothing rather than fake data
  }

  if (signals.length === 0) {
    return (
      <div className="text-[10px] font-mono text-navy-600 py-4 text-center">
        Signal engine initializing...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map((item, i) => {
        const colors = INTENSITY_COLORS[item.intensity] || INTENSITY_COLORS[3];
        const label = INTENSITY_LABELS[item.intensity] || "ELEVATED";
        return (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-navy-800/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-3 h-3 text-accent-amber shrink-0" />
              <span className="text-[11px] text-navy-300 font-sans">{item.title}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-mono text-navy-600">{item.date}</span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: colors.bg, color: colors.text }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] font-mono text-navy-600 pt-1">Live signals from the NEXUS detection engine.</p>
    </div>
  );
}
