import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { addEdge } from "./graph";

const anthropic = new Anthropic();

interface InferredEdge {
  from: string;
  to: string;
  type: "supplier" | "customer" | "competitor" | "input" | "logistics" | "regulatory";
  strength: number;
  evidence: string;
}

export async function inferRelationships(
  text: string,
  sourceUrl?: string,
): Promise<InferredEdge[]> {
  const truncated = text.slice(0, 6000);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract supply chain relationships from this text. Return ONLY a valid JSON array (no markdown). Each element: {"from": "COMPANY_A", "to": "COMPANY_B", "type": "supplier|customer|competitor|input|logistics|regulatory", "strength": 0.0-1.0, "evidence": "quote from text"}. Only include relationships explicitly stated or strongly implied. Use ticker symbols where possible.\n\nText:\n${truncated}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return [];

  try {
    let cleaned = content.text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(cleaned) as InferredEdge[];
  } catch {
    return [];
  }
}

export async function inferAndStore(text: string, sourceUrl?: string): Promise<number> {
  const edges = await inferRelationships(text, sourceUrl);
  let stored = 0;

  for (const edge of edges) {
    try {
      await addEdge({
        fromEntity: edge.from,
        toEntity: edge.to,
        relationshipType: edge.type,
        strength: edge.strength,
        source: "ai_inferred",
        confidence: Math.min(edge.strength, 0.7), // AI-inferred edges get capped confidence
        evidence: edge.evidence,
      });
      stored++;
    } catch {
      // Duplicate or error, skip
    }
  }

  return stored;
}
