import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getKillSwitchStatus, activateKillSwitch, deactivateKillSwitch } from "@/lib/execution/kill-switch";

export async function GET() {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;
  const status = await getKillSwitchStatus(check.result.username);
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const { active, reason } = await request.json();

  if (active) {
    await activateKillSwitch(check.result.username, reason || "Manual activation", check.result.username);
  } else {
    await deactivateKillSwitch(check.result.username);
  }

  const status = await getKillSwitchStatus(check.result.username);
  return NextResponse.json(status);
}
