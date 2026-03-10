import { NextRequest, NextResponse } from "next/server";
import { getCoinbaseClient } from "@/lib/coinbase/get-client";
import { requireTier } from "@/lib/auth/require-tier";
import { safeError } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const client = await getCoinbaseClient(tierCheck.result.username);

    if (productId) {
      const product = await client.getProduct(productId);
      return NextResponse.json(product);
    }

    const products = await client.getProducts("SPOT");
    return NextResponse.json(products);
  } catch (error) {
    return safeError("Coinbase", error);
  }
}
