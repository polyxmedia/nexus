import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

const DEFAULT_WIDGETS = [
  { widgetType: "metric", title: "Threat Level", config: JSON.stringify({ metric: "threat_level" }), position: 0, width: 1 },
  { widgetType: "metric", title: "Market Regime", config: JSON.stringify({ metric: "market_regime" }), position: 1, width: 1 },
  { widgetType: "metric", title: "Portfolio", config: JSON.stringify({ metric: "portfolio_value" }), position: 2, width: 1 },
  { widgetType: "macro", title: "Yield Curve", config: JSON.stringify({ view: "yield_curve" }), position: 3, width: 1 },
  { widgetType: "macro", title: "Key Rates", config: JSON.stringify({ series: ["FEDFUNDS", "DGS2", "DGS10", "T10Y2Y"] }), position: 4, width: 1 },
  { widgetType: "options", title: "Put/Call Ratio", config: JSON.stringify({ view: "pcr" }), position: 5, width: 1 },
  { widgetType: "thesis", title: "Active Thesis", config: JSON.stringify({}), position: 6, width: 2 },
  { widgetType: "predictions", title: "Prediction Scorecard", config: JSON.stringify({}), position: 7, width: 1 },
  { widgetType: "chart", title: "S&P 500", config: JSON.stringify({ symbol: "SPY", range: "3m" }), position: 8, width: 2 },
  { widgetType: "risk", title: "Portfolio Risk", config: JSON.stringify({ view: "var" }), position: 9, width: 1 },
  { widgetType: "signals", title: "High Intensity Signals", config: JSON.stringify({ minIntensity: 4 }), position: 10, width: 1 },
  { widgetType: "calendar", title: "Calendar", config: JSON.stringify({}), position: 11, width: 1 },
  { widgetType: "macro", title: "Macro Dashboard", config: JSON.stringify({ series: ["UNRATE", "ICSA", "CPIAUCSL", "VIXCLS", "GOLDAMGBD228NLBM", "DCOILWTICO"] }), position: 12, width: 2 },
];

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    let widgets = await db.select().from(schema.dashboardWidgets)
      .where(eq(schema.dashboardWidgets.userId, "default"));

    // Seed defaults if empty
    if (widgets.length === 0) {
      widgets = await db.insert(schema.dashboardWidgets)
        .values(DEFAULT_WIDGETS.map((w) => ({ userId: "default", ...w })))
        .returning();
    }

    return NextResponse.json({
      widgets: widgets.sort((a, b) => a.position - b.position),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const { widgetType, title, config, width } = body;
      const existing = await db.select().from(schema.dashboardWidgets)
        .where(eq(schema.dashboardWidgets.userId, "default"));
      const maxPos = existing.reduce((max, w) => Math.max(max, w.position), -1);

      const [result] = await db.insert(schema.dashboardWidgets).values({
        userId: "default",
        widgetType,
        title,
        config: JSON.stringify(config || {}),
        position: maxPos + 1,
        width: width || 1,
      }).returning();

      return NextResponse.json({ id: result.id });
    }

    if (action === "remove") {
      const { id } = body;
      await db.delete(schema.dashboardWidgets)
        .where(eq(schema.dashboardWidgets.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === "reorder") {
      const { order } = body as { order: number[] };
      await Promise.all(
        order.map((id, i) =>
          db.update(schema.dashboardWidgets)
            .set({ position: i })
            .where(eq(schema.dashboardWidgets.id, id))
        )
      );
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      const { id, title, config, width, enabled } = body;
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (config !== undefined) updates.config = JSON.stringify(config);
      if (width !== undefined) updates.width = width;
      if (enabled !== undefined) updates.enabled = enabled;

      await db.update(schema.dashboardWidgets)
        .set(updates)
        .where(eq(schema.dashboardWidgets.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === "reset") {
      await db.delete(schema.dashboardWidgets)
        .where(eq(schema.dashboardWidgets.userId, "default"));
      await db.insert(schema.dashboardWidgets)
        .values(DEFAULT_WIDGETS.map((w) => ({ userId: "default", ...w })));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
