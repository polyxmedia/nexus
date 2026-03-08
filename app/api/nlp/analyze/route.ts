import { NextRequest, NextResponse } from "next/server";
import { analyzeCentralBankText, compareStatements } from "@/lib/nlp/central-bank";
import { analyzeEarningsCall } from "@/lib/nlp/filings";
import { requireTier } from "@/lib/auth/require-tier";

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const body = await request.json();
    const { text, type, institution, company, previousText } = body;

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (type === "central-bank") {
      if (previousText) {
        const comparison = compareStatements(text, previousText, institution || "Unknown");
        return NextResponse.json(comparison);
      }
      const analysis = analyzeCentralBankText(text, institution || "Unknown");
      return NextResponse.json(analysis);
    }

    if (type === "earnings") {
      const analysis = analyzeEarningsCall(text, company || "Unknown");
      return NextResponse.json(analysis);
    }

    return NextResponse.json({ error: "type must be 'central-bank' or 'earnings'" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
