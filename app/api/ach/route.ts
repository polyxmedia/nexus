import { NextRequest, NextResponse } from "next/server";
import { listAnalyses, createAnalysis } from "@/lib/ach/engine";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const analyses = await listAnalyses();
    return NextResponse.json({ analyses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { title, question } = await request.json();
    if (!title || !question) {
      return NextResponse.json({ error: "title and question required" }, { status: 400 });
    }
    const result = await createAnalysis(title, question);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
