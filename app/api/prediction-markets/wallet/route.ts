import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { validateOrigin } from "@/lib/security/csrf";
import {
  getPolymarketAddress,
  setPolymarketAddress,
  clearPolymarketAddress,
} from "@/lib/prediction-markets/polymarket-trading";

// GET: check connected wallet address
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const address = await getPolymarketAddress(session.user.name);
  return NextResponse.json({ address });
}

// POST: save wallet address after WalletConnect
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { address } = await req.json();

  if (!address || typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
  }

  await setPolymarketAddress(session.user.name, address.toLowerCase());
  return NextResponse.json({ success: true, address: address.toLowerCase() });
}

// DELETE: disconnect wallet
export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await clearPolymarketAddress(session.user.name);
  return NextResponse.json({ success: true });
}
