import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getRules, createRule, updateRule, deleteRule, evaluateRules } from "@/lib/automation/engine";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const rules = await getRules();
    return NextResponse.json({ rules }, {
      headers: { "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  const body = await req.json();

  try {
    // Evaluate all rules (triggered by scheduler or manual)
    if (body.action === "evaluate") {
      const result = await evaluateRules();
      return NextResponse.json(result);
    }

    // Create new rule
    if (body.action === "create") {
      if (!body.name || !body.triggerType || !body.actions) {
        return NextResponse.json({ error: "name, triggerType, and actions are required" }, { status: 400 });
      }
      const rule = await createRule({
        name: body.name,
        description: body.description || undefined,
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig || {},
        actions: body.actions,
        cooldownMinutes: body.cooldownMinutes || 30,
        createdBy: session?.user?.name || null,
      });
      return NextResponse.json({ rule });
    }

    // Update rule
    if (body.action === "update" && body.id) {
      const rule = await updateRule(body.id, body.updates);
      if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      return NextResponse.json({ rule });
    }

    // Delete rule
    if (body.action === "delete" && body.id) {
      const deleted = await deleteRule(body.id);
      if (!deleted) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      return NextResponse.json({ deleted: true });
    }

    // Toggle enable/disable
    if (body.action === "toggle" && body.id) {
      const rules = await getRules();
      const rule = rules.find((r) => r.id === body.id);
      if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      const updated = await updateRule(body.id, { enabled: !rule.enabled });
      return NextResponse.json({ rule: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
