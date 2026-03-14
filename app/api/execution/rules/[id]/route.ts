import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { updateRule, deleteRule } from "@/lib/execution/rules";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const { id } = await params;
  const body = await request.json();
  const rule = await updateRule(parseInt(id), check.result.username, body);
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json(rule);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const { id } = await params;
  const deleted = await deleteRule(parseInt(id), check.result.username);
  if (!deleted) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
