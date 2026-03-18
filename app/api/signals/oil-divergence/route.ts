import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/auth/session";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { computeOilSpxDivergence, getLatestOilSpxDivergence } from "@/lib/signals/oil-spx-divergence";

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const cached = await getLatestOilSpxDivergence();
    if (cached) return NextResponse.json(cached);

    // No cached data, compute fresh
    const signal = await computeOilSpxDivergence();
    return NextResponse.json(signal);
  } catch (err) {
    console.error("Oil-SPX divergence GET error:", err);
    return NextResponse.json({ error: "Failed to fetch oil-SPX divergence data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const rl = await rateLimit(`oil-spx:${auth.username}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const signal = await computeOilSpxDivergence();
    return NextResponse.json(signal);
  } catch (err) {
    console.error("Oil-SPX divergence POST error:", err);
    return NextResponse.json({ error: "Failed to compute oil-SPX divergence" }, { status: 500 });
  }
}
