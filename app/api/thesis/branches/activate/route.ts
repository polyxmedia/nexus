import { NextRequest, NextResponse } from "next/server";
import { activateBranch } from "@/lib/thesis/branching";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const body = await request.json();
    const { branchSetId, branchId } = body;

    if (!branchSetId || !branchId) {
      return NextResponse.json(
        { error: "branchSetId and branchId are required" },
        { status: 400 },
      );
    }

    const result = await activateBranch(branchSetId, branchId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, branchSetId, activatedBranchId: branchId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
