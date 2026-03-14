import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getRules, createRule } from "@/lib/execution/rules";

export async function GET() {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const rules = await getRules(check.result.username);
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required and must be a string" }, { status: 400 });
    }
    if (!body.conditions || typeof body.conditions !== "object") {
      return NextResponse.json({ error: "conditions object is required" }, { status: 400 });
    }
    if (typeof body.conditions.minConvergence !== "number") {
      return NextResponse.json({ error: "conditions.minConvergence must be a number" }, { status: 400 });
    }
    const rule = await createRule(check.result.username, body);
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Invalid rule data" }, { status: 400 });
  }
}
