/**
 * Public blog API.
 * GET - list published posts
 */

import { NextResponse } from "next/server";
import { listPublishedPosts } from "@/lib/blog/writer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const posts = await listPublishedPosts(limit, offset);
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("[blog] Failed to list posts:", err);
    return NextResponse.json({ posts: [] });
  }
}
