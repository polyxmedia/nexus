/**
 * Public single blog post API.
 * GET - get post by slug
 */

import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog/writer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (err) {
    console.error("[blog] Failed to get post:", err);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}
