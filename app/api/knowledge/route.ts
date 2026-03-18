import { NextRequest, NextResponse } from "next/server";
import {
  addKnowledge,
  updateKnowledge,
  archiveKnowledge,
  getKnowledgeById,
  listKnowledge,
  getKnowledgeStats,
} from "@/lib/knowledge/engine";
import { seedKnowledge } from "@/lib/knowledge/seed";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Seed on first access if empty
  const stats = await getKnowledgeStats();
  if (stats.total === 0) {
    await seedKnowledge();
  }

  // Get by ID (optionally with graph connections)
  const idParam = searchParams.get("id");
  if (idParam) {
    const id = parseInt(idParam, 10);
    const entry = await getKnowledgeById(id);
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Optionally include graph connections
    if (searchParams.get("connections") === "true") {
      try {
        const { exploreEntityNeighborhood } = await import("@/lib/knowledge/graph-rag");
        const neighborhood = await exploreEntityNeighborhood(entry.title);
        return NextResponse.json({ entry, connections: neighborhood });
      } catch {
        return NextResponse.json({ entry, connections: null });
      }
    }

    return NextResponse.json({ entry });
  }

  // Stats request
  if (searchParams.get("view") === "stats") {
    return NextResponse.json({ stats: await getKnowledgeStats() });
  }

  // List/search
  const category = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const tagsParam = searchParams.get("tags");
  const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : undefined;

  const entries = await listKnowledge({ category, status, search, tags });
  const currentStats = await getKnowledgeStats();

  return NextResponse.json({ entries, stats: currentStats }, { headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" } });
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(request.url);

  // Seed action
  if (searchParams.get("action") === "seed") {
    const result = await seedKnowledge();
    return NextResponse.json(result);
  }

  const body = await request.json();

  if (!body.title || !body.content || !body.category) {
    return NextResponse.json(
      { error: "title, content, and category are required" },
      { status: 400 }
    );
  }

  // Input validation: max lengths
  if (typeof body.title === "string" && body.title.length > 500) {
    return NextResponse.json({ error: "Title too long. Maximum 500 characters." }, { status: 400 });
  }
  if (typeof body.content === "string" && body.content.length > 100_000) {
    return NextResponse.json({ error: "Content too long. Maximum 100,000 characters." }, { status: 400 });
  }

  const entry = await addKnowledge({
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags ? (typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags)) : undefined,
    source: body.source || undefined,
    confidence: body.confidence ?? 0.8,
    status: body.status || "active",
    validFrom: body.validFrom || undefined,
    validUntil: body.validUntil || undefined,
    metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
  });

  return NextResponse.json({ entry });
}

export async function PUT(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.category !== undefined) updates.category = body.category;
  if (body.tags !== undefined) {
    updates.tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags);
  }
  if (body.source !== undefined) updates.source = body.source;
  if (body.confidence !== undefined) updates.confidence = body.confidence;
  if (body.status !== undefined) updates.status = body.status;
  if (body.validFrom !== undefined) updates.validFrom = body.validFrom;
  if (body.validUntil !== undefined) updates.validUntil = body.validUntil;
  if (body.metadata !== undefined) {
    updates.metadata = typeof body.metadata === "string" ? body.metadata : JSON.stringify(body.metadata);
  }

  const entry = await updateKnowledge(body.id, updates);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function DELETE(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const id = parseInt(idParam, 10);
  const entry = await archiveKnowledge(id);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}
