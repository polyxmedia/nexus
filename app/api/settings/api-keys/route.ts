import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { generateApiKey, MAX_KEYS_PER_USER } from "@/lib/api/keys";
import { validateOrigin } from "@/lib/security/csrf";

// GET /api/settings/api-keys — list user's API keys (never exposes raw key)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db
    .select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      prefix: schema.apiKeys.keyPrefix,
      scopes: schema.apiKeys.scopes,
      createdAt: schema.apiKeys.createdAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, session.user.name));

  return NextResponse.json({ keys });
}

// POST /api/settings/api-keys — create a new API key
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = (body.name as string)?.trim() || "Default";
  const scopes = body.scopes as string[] | undefined;

  // Validate name length
  if (name.length > 64) {
    return NextResponse.json({ error: "Key name too long (max 64 chars)" }, { status: 400 });
  }

  // Check active key count
  const activeKeys = await db
    .select({ id: schema.apiKeys.id })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.userId, session.user.name), isNull(schema.apiKeys.revokedAt)));

  if (activeKeys.length >= MAX_KEYS_PER_USER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_KEYS_PER_USER} active API keys allowed` },
      { status: 400 },
    );
  }

  const { raw, hash, prefix } = generateApiKey();

  const [key] = await db
    .insert(schema.apiKeys)
    .values({
      keyHash: hash,
      keyPrefix: prefix,
      userId: session.user.name,
      name,
      scopes: scopes ? JSON.stringify(scopes) : null,
    })
    .returning({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      prefix: schema.apiKeys.keyPrefix,
      createdAt: schema.apiKeys.createdAt,
    });

  // raw key is returned ONLY at creation time
  return NextResponse.json({ key: { ...key, raw } }, { status: 201 });
}

// PUT /api/settings/api-keys — rotate a key (generate new secret, same metadata)
export async function PUT(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = typeof body.id === "number" ? body.id : parseInt(body.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  // Verify ownership
  const existing = await db
    .select({
      id: schema.apiKeys.id,
      userId: schema.apiKeys.userId,
      name: schema.apiKeys.name,
      scopes: schema.apiKeys.scopes,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.id, id));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  if (existing[0].userId !== session.user.name) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing[0].revokedAt) {
    return NextResponse.json({ error: "Cannot rotate a revoked key" }, { status: 400 });
  }

  // Generate new key material and replace the hash
  const { raw, hash, prefix } = generateApiKey();

  await db
    .update(schema.apiKeys)
    .set({
      keyHash: hash,
      keyPrefix: prefix,
      lastUsedAt: null,
    })
    .where(eq(schema.apiKeys.id, id));

  // Return the new raw key (shown only once, same as creation)
  return NextResponse.json({
    key: {
      id: existing[0].id,
      name: existing[0].name,
      prefix,
      raw,
    },
  });
}

// DELETE /api/settings/api-keys — revoke a key (soft delete)
export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  if (!idParam) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400 });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid key id" }, { status: 400 });
  }

  // Verify ownership before revoking
  const keys = await db
    .select({ id: schema.apiKeys.id, userId: schema.apiKeys.userId })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.id, id), isNull(schema.apiKeys.revokedAt)));

  if (keys.length === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  if (keys[0].userId !== session.user.name) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(schema.apiKeys.id, id));

  return NextResponse.json({ success: true });
}
