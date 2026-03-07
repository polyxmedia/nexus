import { NextResponse } from "next/server";
import { embedAllKnowledge } from "@/lib/knowledge/embeddings";

export async function POST() {
  try {
    const result = await embedAllKnowledge();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
