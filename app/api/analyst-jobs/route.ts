import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import {
  createJob,
  getJob,
  listJobs,
  updateJob,
  cancelJob,
} from "@/lib/analyst-jobs";
import { validateOrigin } from "@/lib/security/csrf";
import { errorResponse, generateRequestId } from "@/lib/request-id";

// GET /api/analyst-jobs - List jobs (public browse, no auth required for open jobs)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    if (id) {
      const job = await getJob(Number(id));
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      return NextResponse.json(job);
    }

    const jobs = await listJobs({
      status: status || undefined,
      category: category || undefined,
    });
    return NextResponse.json(jobs);
  } catch (error) {
    const reqId = generateRequestId();
    console.error(`[analyst-jobs:GET] ${reqId}`, error);
    return errorResponse("Something went wrong", 500, reqId);
  }
}

// POST /api/analyst-jobs - Create a new job (operator+ only)
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tier gate: operator and above
    const { getUserTier } = await import("@/lib/auth/require-tier");
    const { tier, isAdmin } = await getUserTier();
    if (!isAdmin && tier !== "operator" && tier !== "institution") {
      return NextResponse.json({ error: "Operator tier or above required to post jobs" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, category, expertise, priority, paymentAmount, deadline, deliverableFormat, maxApplications } = body;

    if (!title || !description || !category || !paymentAmount) {
      return NextResponse.json({ error: "title, description, category, and paymentAmount are required" }, { status: 400 });
    }

    if (paymentAmount < 100) {
      return NextResponse.json({ error: "Minimum payment is $1.00 (100 cents)" }, { status: 400 });
    }

    const job = await createJob({
      title,
      description,
      category,
      expertise: expertise || [],
      priority: priority || "standard",
      paymentAmount,
      deadline: deadline || null,
      createdBy: `user:${session.user.name}`,
      deliverableFormat: deliverableFormat || "analysis",
      maxApplications: maxApplications || 5,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const reqId = generateRequestId();
    console.error(`[analyst-jobs:POST] ${reqId}`, error);
    return errorResponse("Something went wrong", 500, reqId);
  }
}

// PUT /api/analyst-jobs - Update a job (owner or admin only)
export async function PUT(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const job = await getJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const isAdmin = (session.user as Record<string, unknown>).role === "admin";
    if (!isAdmin && job.createdBy !== `user:${session.user.name}`) {
      return NextResponse.json({ error: "Not authorized to edit this job" }, { status: 403 });
    }

    const updated = await updateJob(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    const reqId = generateRequestId();
    console.error(`[analyst-jobs:PUT] ${reqId}`, error);
    return errorResponse("Something went wrong", 500, reqId);
  }
}

// DELETE /api/analyst-jobs?id=N - Cancel a job (owner or admin only)
export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const job = await getJob(Number(id));
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const isAdmin = (session.user as Record<string, unknown>).role === "admin";
    if (!isAdmin && job.createdBy !== `user:${session.user.name}`) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (job.status === "in_progress") {
      return NextResponse.json({ error: "Cannot cancel a job that is in progress" }, { status: 400 });
    }

    const cancelled = await cancelJob(Number(id));
    return NextResponse.json(cancelled);
  } catch (error) {
    const reqId = generateRequestId();
    console.error(`[analyst-jobs:DELETE] ${reqId}`, error);
    return errorResponse("Something went wrong", 500, reqId);
  }
}
