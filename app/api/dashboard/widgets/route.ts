import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

const DEFAULT_WIDGETS = [
  // Row 1: Key metrics at a glance
  { widgetType: "metric", title: "Threat Level", config: JSON.stringify({ metric: "threat_level" }), position: 0, width: 1 },
  { widgetType: "metric", title: "Market Regime", config: JSON.stringify({ metric: "market_regime" }), position: 1, width: 1 },
  { widgetType: "metric", title: "VIX", config: JSON.stringify({ metric: "vix" }), position: 2, width: 1 },
  // Row 2: Intelligence core
  { widgetType: "daily_report", title: "Daily Briefing", config: JSON.stringify({}), position: 3, width: 3 },
  // Row 3: Signals + thesis
  { widgetType: "signals", title: "High Intensity Signals", config: JSON.stringify({ minIntensity: 4 }), position: 4, width: 1 },
  { widgetType: "thesis", title: "Active Thesis", config: JSON.stringify({}), position: 5, width: 2 },
  // Row 4: Markets + predictions
  { widgetType: "chart", title: "S&P 500", config: JSON.stringify({ symbol: "SPY", range: "3m" }), position: 6, width: 2 },
  { widgetType: "predictions", title: "Prediction Scorecard", config: JSON.stringify({}), position: 7, width: 1 },
  // Row 5: News + chat
  { widgetType: "news", title: "News Feed", config: JSON.stringify({ category: "all", maxItems: 15 }), position: 8, width: 2 },
  { widgetType: "quick_chat", title: "Quick Chat", config: JSON.stringify({}), position: 9, width: 1 },
];

export async function GET() {
  const tierCheck = await requireTier("free");
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

    return NextResponse.json(
      { widgets: widgets.sort((a, b) => a.position - b.position) },
      { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("free");
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
