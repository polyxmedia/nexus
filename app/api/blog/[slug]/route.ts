/**
 * Single blog post API.
 * GET - get post by slug. Admins can view unpublished posts.
 */

import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog/writer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function checkAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return false;
  const rows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, `user:${session.user.name}`)
  );
  if (rows.length === 0) return false;
  try { return JSON.parse(rows[0].value).role === "admin"; } catch { return false; }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const admin = await checkAdmin();
    const post = await getPostBySlug(slug, admin);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (err) {
    console.error("[blog] Failed to get post:", err);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}
