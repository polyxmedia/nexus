import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import {
  getAnalystProfile,
  createAnalystProfile,
  updateAnalystProfile,
  listAnalystProfiles,
} from "@/lib/analyst-jobs";
import { validateOrigin } from "@/lib/security/csrf";

// GET /api/analyst-jobs/profiles - List profiles or get own profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine");
    const status = searchParams.get("status");

    if (mine === "true") {
      if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const profile = await getAnalystProfile(`user:${session.user.name}`);
      return NextResponse.json(profile || null);
    }

    const isAdmin = session && (session.user as Record<string, unknown>)?.role === "admin";

    // Admin can list all profiles; public only sees approved
    const effectiveStatus = isAdmin ? (status || undefined) : (status || "approved");
    const profiles = await listAnalystProfiles(effectiveStatus);

    // Admin gets full data; public gets stripped fields
    if (isAdmin) {
      return NextResponse.json(profiles);
    }

    const publicProfiles = profiles.map(p => ({
      id: p.id,
      displayName: p.displayName,
      bio: p.bio,
      expertise: p.expertise,
      totalJobs: p.totalJobs,
      avgAccuracy: p.avgAccuracy,
      scoredDeliverables: p.scoredDeliverables,
      status: p.status,
      createdAt: p.createdAt,
    }));
    return NextResponse.json(publicProfiles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/analyst-jobs/profiles - Create analyst profile
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile already exists
    const existing = await getAnalystProfile(`user:${session.user.name}`);
    if (existing) {
      return NextResponse.json({ error: "Profile already exists", profile: existing }, { status: 400 });
    }

    const body = await req.json();
    const { displayName, bio, expertise, credentials } = body;

    if (!displayName) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }

    const profile = await createAnalystProfile({
      userId: `user:${session.user.name}`,
      displayName,
      bio,
      expertise,
      credentials,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/analyst-jobs/profiles - Update own profile or admin approve/suspend
export async function PUT(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const isAdmin = (session.user as Record<string, unknown>).role === "admin";

    // Admin action: approve/suspend a profile by ID
    if (body.profileId && isAdmin) {
      const { profileId, status: newStatus } = body;
      if (!newStatus || !["approved", "suspended", "pending"].includes(newStatus)) {
        return NextResponse.json({ error: "status must be approved, suspended, or pending" }, { status: 400 });
      }
      const updated = await updateAnalystProfile(profileId, { status: newStatus });
      return NextResponse.json(updated);
    }

    // Self-update
    const profile = await getAnalystProfile(`user:${session.user.name}`);
    if (!profile) {
      return NextResponse.json({ error: "No profile found. Create one first." }, { status: 404 });
    }

    const allowedFields = ["displayName", "bio", "expertise", "credentials", "stripeConnectId"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const updated = await updateAnalystProfile(profile.id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
