import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { id } = await params;

  try {
    // Look up by UUID or numeric ID
    const isNumeric = /^\d+$/.test(id);
    const rows = isNumeric
      ? await db.select().from(schema.parallelAnalyses).where(eq(schema.parallelAnalyses.id, parseInt(id)))
      : await db.select().from(schema.parallelAnalyses).where(eq(schema.parallelAnalyses.uuid, id));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      uuid: row.uuid,
      query: row.query,
      synthesis: row.synthesis,
      probabilityOfRepetition: row.probabilityOfRepetition,
      regime: row.regime,
      confidenceInAnalysis: row.confidence,
      warning: row.warning,
      actionableInsights: JSON.parse(row.actionableInsights || "[]"),
      parallels: JSON.parse(row.parallels),
      createdAt: row.createdAt,
      createdBy: row.createdBy,
    }, {
      headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Parallel detail error:", error);
    return NextResponse.json({ error: "Failed to load analysis" }, { status: 500 });
  }
}
