import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getExecutionLog } from "@/lib/execution/engine";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const log = await getExecutionLog(check.result.username, limit);
  return NextResponse.json(log);
}
