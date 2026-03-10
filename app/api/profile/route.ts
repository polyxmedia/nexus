import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET: Fetch current user's profile data
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${session.user.name}`));

    if (!rows[0]) {
      return NextResponse.json({ profileImage: null });
    }

    const data = JSON.parse(rows[0].value);
    return NextResponse.json({
      profileImage: data.profileImage || null,
    });
  } catch {
    return NextResponse.json({ profileImage: null });
  }
}

// PATCH: Update profile image
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { profileImage } = body;

    // Validate: must be a data URL or null (to remove)
    if (profileImage !== null && typeof profileImage !== "string") {
      return NextResponse.json({ error: "Invalid profileImage" }, { status: 400 });
    }

    // Limit base64 size to ~200KB
    if (profileImage && profileImage.length > 300_000) {
      return NextResponse.json({ error: "Image too large. Max 200KB." }, { status: 400 });
    }

    const key = `user:${session.user.name}`;
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));

    if (!rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(rows[0].value);
    if (profileImage) {
      userData.profileImage = profileImage;
    } else {
      delete userData.profileImage;
    }

    await db
      .update(schema.settings)
      .set({ value: JSON.stringify(userData), updatedAt: new Date().toISOString() })
      .where(eq(schema.settings.key, key));

    return NextResponse.json({ success: true, profileImage: userData.profileImage || null });
  } catch (err) {
    console.error("[Profile] Error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
