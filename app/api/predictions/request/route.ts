import { NextRequest, NextResponse } from "next/server";
import { generatePredictions } from "@/lib/predictions/engine";
import { requireTier } from "@/lib/auth/require-tier";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  const username = session?.user?.name || "anonymous";

  // Rate limit: 5 requests per hour per user (each triggers 2 LLM calls)
  const rl = await rateLimit(`prediction-request:${username}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Prediction request limit reached (5/hour). Try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const { topic } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return NextResponse.json(
        { error: "Please provide a topic to predict (e.g., SPY, gold prices, Iran conflict)" },
        { status: 400 }
      );
    }

    if (topic.length > 500) {
      return NextResponse.json(
        { error: "Topic must be under 500 characters" },
        { status: 400 }
      );
    }

    const predictions = await generatePredictions({ topic: topic.trim() });
    return NextResponse.json({ predictions, count: predictions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
