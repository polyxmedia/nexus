import { NextResponse } from "next/server";
import {
  getActiveBranchSets,
  getAllBranchSets,
  generateAllBranches,
  identifyUpcomingCatalysts,
} from "@/lib/thesis/branching";
import { requireTier } from "@/lib/auth/require-tier";

// GET: Return all branch sets (pending catalysts with pre-computed responses)
export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const [activeSets, allSets, catalysts] = await Promise.all([
      getActiveBranchSets(),
      getAllBranchSets(),
      Promise.resolve(identifyUpcomingCatalysts()),
    ]);

    return NextResponse.json({
      upcomingCatalysts: catalysts,
      pendingBranches: activeSets,
      totalBranchSets: allSets.length,
      allSets,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Generate branches for upcoming catalysts
export async function POST() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const result = await generateAllBranches();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
