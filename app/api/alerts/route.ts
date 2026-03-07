import { NextRequest, NextResponse } from "next/server";
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  getAlertHistory,
  dismissAlertHistory,
  getUndismissedAlerts,
  evaluateAlerts,
} from "@/lib/alerts/engine";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  if (view === "history") {
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const history = await getAlertHistory(limit);
    return NextResponse.json({ history });
  }

  if (view === "undismissed") {
    const alerts = await getUndismissedAlerts();
    return NextResponse.json({ alerts });
  }

  const alerts = await getAlerts();
  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "evaluate") {
    const triggered = await evaluateAlerts();
    return NextResponse.json({ success: true, triggered });
  }

  if (action === "dismiss") {
    const body = await request.json();
    await dismissAlertHistory(body.id);
    return NextResponse.json({ success: true });
  }

  const body = await request.json();
  const alert = await createAlert(body);
  return NextResponse.json({ alert });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  const alert = await updateAlert(id, updates);
  return NextResponse.json({ alert });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0", 10);
  if (id) await deleteAlert(id);
  return NextResponse.json({ success: true });
}
