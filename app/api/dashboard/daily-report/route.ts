import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireTier } from "@/lib/auth/require-tier";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── Data aggregation helpers ──

async function getSignalsSummary() {
  try {
    const rows = await db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.status, "active"))
      .orderBy(desc(schema.signals.intensity))
      .limit(15);
    return rows.map((s) => ({
      title: s.title,
      intensity: s.intensity,
      category: s.category,
      layers: s.layers,
      date: s.date,
    }));
  } catch {
    return [];
  }
}

async function getThesisSummary() {
  try {
    const rows = await db
      .select()
      .from(schema.theses)
      .where(eq(schema.theses.status, "active"))
      .orderBy(desc(schema.theses.generatedAt))
      .limit(1);
    if (rows.length === 0) return null;
    const t = rows[0];
    return {
      title: t.title,
      regime: t.marketRegime,
      volatility: t.volatilityOutlook,
      convergence: t.convergenceDensity,
      confidence: t.overallConfidence,
      summary: t.executiveSummary,
      risks: t.riskScenarios,
      actions: t.tradingActions,
    };
  } catch {
    return null;
  }
}

async function getPredictionsSummary() {
  try {
    const rows = await db.select().from(schema.predictions).orderBy(desc(schema.predictions.createdAt)).limit(50);
    const pending = rows.filter((p) => !p.outcome);
    const resolved = rows.filter((p) => p.outcome);
    const confirmed = resolved.filter((p) => p.outcome === "confirmed").length;
    const denied = resolved.filter((p) => p.outcome === "denied").length;
    const partial = resolved.filter((p) => p.outcome === "partial").length;
    const scores = resolved.filter((p) => p.score != null).map((p) => p.score!);
    const avgBrier = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const upcoming = pending
      .filter((p) => p.deadline)
      .sort((a, b) => (a.deadline < b.deadline ? -1 : 1))
      .slice(0, 5)
      .map((p) => ({ claim: p.claim, deadline: p.deadline, confidence: p.confidence }));
    return { total: rows.length, pending: pending.length, confirmed, denied, partial, avgBrier, upcoming };
  } catch {
    return null;
  }
}

async function getRecentAlerts() {
  try {
    const rows = await db
      .select()
      .from(schema.alertHistory)
      .orderBy(desc(schema.alertHistory.triggeredAt))
      .limit(10);
    return rows.map((a) => ({ title: a.title, message: a.message, severity: a.severity, at: a.triggeredAt }));
  } catch {
    return [];
  }
}

async function getPortfolioSnapshot() {
  try {
    const rows = await db
      .select()
      .from(schema.portfolioSnapshots)
      .orderBy(desc(schema.portfolioSnapshots.createdAt))
      .limit(1);
    if (rows.length === 0) return null;
    const s = rows[0];
    return { totalValue: s.totalValue, cash: s.cash, invested: s.invested, pnl: s.pnl, pnlPercent: s.pnlPercent };
  } catch {
    return null;
  }
}

async function getRecentTrades() {
  try {
    const rows = await db
      .select()
      .from(schema.trades)
      .orderBy(desc(schema.trades.createdAt))
      .limit(10);
    return rows.map((t) => ({
      ticker: t.ticker,
      direction: t.direction,
      quantity: t.quantity,
      status: t.status,
      filledPrice: t.filledPrice,
      at: t.createdAt,
    }));
  } catch {
    return [];
  }
}

// ── Route ──

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  const { username } = tierCheck.result;

  const today = todayKey();

  // Check for cached report
  try {
    const cached = await db
      .select()
      .from(schema.dailyReports)
      .where(and(eq(schema.dailyReports.userId, username), eq(schema.dailyReports.reportDate, today)));

    if (cached.length > 0) {
      return NextResponse.json({
        report: {
          date: cached[0].reportDate,
          sections: JSON.parse(cached[0].sections),
          generatedAt: cached[0].generatedAt,
          cached: true,
        },
      });
    }
  } catch {
    // proceed to generate
  }

  // Aggregate platform data
  const [signals, thesis, predictions, alerts, portfolio, trades] = await Promise.all([
    getSignalsSummary(),
    getThesisSummary(),
    getPredictionsSummary(),
    getRecentAlerts(),
    getPortfolioSnapshot(),
    getRecentTrades(),
  ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ report: null, error: "No API key configured" });

  const dataContext = JSON.stringify({ signals, thesis, predictions, alerts, portfolio, trades }, null, 2);

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a senior intelligence analyst producing a daily briefing for ${today}. Based on the platform data below, generate a comprehensive daily intelligence report.

PLATFORM DATA:
${dataContext}

Generate the report as a JSON array of sections. Each section has:
- "id": short kebab-case identifier
- "title": section heading
- "icon": one of "shield" | "chart" | "target" | "alert" | "briefcase" | "radar"
- "severity": 1-5 (1=calm, 5=critical) - this colors the section header
- "summary": 1-2 sentence summary for the collapsed view
- "content": full markdown content for the expanded view (3-8 paragraphs, use bullet points, bold for emphasis)

Required sections (in order):
1. "executive-summary" - Overall situational assessment. What matters most today.
2. "market-regime" - Current regime classification, volatility outlook, key market dynamics. Include relevant tickers.
3. "signals-convergence" - Active signals, convergence patterns, what layers are firing together.
4. "prediction-scorecard" - Prediction performance, upcoming deadlines, calibration assessment.
5. "risk-catalysts" - Key risks, upcoming catalysts, what could change the picture today.
6. "trading-considerations" - Actionable positioning considerations (not financial advice, intelligence framing).

If data is missing for a section, note the gap and provide whatever assessment you can.

Rules:
- Be direct and analytical
- No filler language
- Reference specific data points (signal intensities, Brier scores, regime labels, P&L figures)
- Use intelligence language: "assess", "high confidence", "key indicator", "watch for"
- Do not use emdash characters
- Do not use antithesis constructions

Output ONLY the JSON array, no other text.`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    if (!text) return NextResponse.json({ report: null });

    // Parse sections - handle potential markdown code block wrapper
    let sections;
    try {
      const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
      sections = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ report: null, error: "Failed to parse report" });
    }

    const now = new Date().toISOString();

    // Cache in DB
    try {
      await db.insert(schema.dailyReports).values({
        userId: username,
        reportDate: today,
        sections: JSON.stringify(sections),
        generatedAt: now,
      });
    } catch {
      // unique constraint violation = race condition, fetch the cached one
      const cached = await db
        .select()
        .from(schema.dailyReports)
        .where(and(eq(schema.dailyReports.userId, username), eq(schema.dailyReports.reportDate, today)));
      if (cached.length > 0) {
        return NextResponse.json({
          report: {
            date: cached[0].reportDate,
            sections: JSON.parse(cached[0].sections),
            generatedAt: cached[0].generatedAt,
            cached: true,
          },
        });
      }
    }

    return NextResponse.json({
      report: {
        date: today,
        sections,
        generatedAt: now,
        cached: false,
      },
    });
  } catch (err) {
    console.error("Daily report generation failed:", err);
    return NextResponse.json({ report: null, error: "Generation failed" });
  }
}

// Force regenerate (POST)
export async function POST() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;
  const { username } = tierCheck.result;

  const today = todayKey();

  // Delete today's cached report
  try {
    await db
      .delete(schema.dailyReports)
      .where(and(eq(schema.dailyReports.userId, username), eq(schema.dailyReports.reportDate, today)));
  } catch {
    // ignore
  }

  // Re-fetch via GET logic (redirect)
  // For simplicity, we delete and let the next GET regenerate
  return NextResponse.json({ deleted: true });
}
