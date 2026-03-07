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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Seed on first access if empty
  const stats = await getKnowledgeStats();
  if (stats.total === 0) {
    await seedKnowledge();
  }

  // Get by ID
  const idParam = searchParams.get("id");
  if (idParam) {
    const id = parseInt(idParam, 10);
    const entry = await getKnowledgeById(id);
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  return NextResponse.json({ entries, stats: currentStats });
}

export async function POST(request: NextRequest) {
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
