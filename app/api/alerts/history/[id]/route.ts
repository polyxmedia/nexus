import { NextRequest, NextResponse } from "next/server";
import { getAlertHistoryItem, dismissAlertHistoryByUid } from "@/lib/alerts/engine";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { id: uid } = await params;
  if (!uid || uid.length < 10) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const item = await getAlertHistoryItem(uid);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify ownership
    const userId = tierCheck.result.username;
    if (item.alert.userId && item.alert.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ history: item.history, alert: item.alert });
  } catch (error) {
    console.error("Failed to fetch alert history item:", error);
    return NextResponse.json({ error: "Failed to fetch alert" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { id: uid } = await params;
  if (!uid || uid.length < 10) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  if (body.action === "dismiss") {
    await dismissAlertHistoryByUid(uid);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
