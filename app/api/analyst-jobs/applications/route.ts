import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import {
  createApplication,
  getApplication,
  getApplicationsForJob,
  getApplicationsForAnalyst,
  getAnalystProfile,
  getJob,
  acceptApplication,
  rejectApplication,
  submitDeliverable,
  approveDelivery,
  requestRevision,
} from "@/lib/analyst-jobs";

// GET /api/analyst-jobs/applications?jobId=N or ?analystId=N or ?id=N
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const jobId = searchParams.get("jobId");
    const mine = searchParams.get("mine");

    if (id) {
      const app = await getApplication(Number(id));
      if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(app);
    }

    if (jobId) {
      const job = await getJob(Number(jobId));
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      const isAdmin = (session.user as Record<string, unknown>).role === "admin";
      const isOwner = job.createdBy === `user:${session.user.name}`;
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Only the job owner or admin can view applications" }, { status: 403 });
      }
      const apps = await getApplicationsForJob(Number(jobId));
      return NextResponse.json(apps);
    }

    if (mine === "true") {
      const profile = await getAnalystProfile(`user:${session.user.name}`);
      if (!profile) return NextResponse.json([]);
      const apps = await getApplicationsForAnalyst(profile.id);
      return NextResponse.json(apps);
    }

    return NextResponse.json({ error: "Provide id, jobId, or mine=true" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/analyst-jobs/applications - Apply to a job or perform lifecycle actions
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const isAdmin = (session.user as Record<string, unknown>).role === "admin";
    const userId = `user:${session.user.name}`;

    // Check if user owns the job associated with an application
    async function canManageApplication(applicationId: number): Promise<boolean> {
      if (isAdmin) return true;
      const app = await getApplication(applicationId);
      if (!app) return false;
      const job = await getJob(app.jobId);
      return job?.createdBy === userId;
    }

    switch (action) {
      // ── Analyst applies to a job ──
      case "apply": {
        const { coverNote, proposedApproach, estimatedHours } = body;
        const jobId = Number(body.jobId);
        if (!jobId || isNaN(jobId)) return NextResponse.json({ error: "jobId required (number)" }, { status: 400 });

        const job = await getJob(jobId);
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        if (job.status !== "open") return NextResponse.json({ error: "Job is not open for applications" }, { status: 400 });

        const profile = await getAnalystProfile(`user:${session.user.name}`);
        if (!profile) return NextResponse.json({ error: "Create an analyst profile first" }, { status: 400 });
        if (profile.status !== "approved") return NextResponse.json({ error: "Analyst profile not yet approved" }, { status: 403 });

        // Check max applications
        const existing = await getApplicationsForJob(jobId);
        const pendingOrAccepted = existing.filter(a => a.status === "pending" || a.status === "accepted");
        if (pendingOrAccepted.length >= job.maxApplications) {
          return NextResponse.json({ error: "Maximum applications reached for this job" }, { status: 400 });
        }

        // Check analyst hasn't already applied
        const alreadyApplied = existing.find(a => a.userId === `user:${session.user!.name}`);
        if (alreadyApplied) return NextResponse.json({ error: "Already applied to this job" }, { status: 400 });

        const app = await createApplication({
          jobId,
          analystId: profile.id,
          userId: `user:${session.user.name}`,
          coverNote,
          proposedApproach,
          estimatedHours,
        });

        return NextResponse.json(app, { status: 201 });
      }

      // ── Owner/admin accepts an application ──
      case "accept": {
        const { applicationId } = body;
        if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
        if (!(await canManageApplication(applicationId))) {
          return NextResponse.json({ error: "Only the job owner or admin can accept applications" }, { status: 403 });
        }
        const result = await acceptApplication(applicationId);
        return NextResponse.json(result);
      }

      // ── Analyst submits deliverable ──
      case "deliver": {
        const { applicationId, deliverable } = body;
        if (!applicationId || !deliverable) {
          return NextResponse.json({ error: "applicationId and deliverable required" }, { status: 400 });
        }

        const app = await getApplication(applicationId);
        if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
        if (app.userId !== `user:${session.user.name}`) {
          return NextResponse.json({ error: "Not your application" }, { status: 403 });
        }
        if (app.status !== "accepted") {
          return NextResponse.json({ error: "Application must be accepted before delivering" }, { status: 400 });
        }

        const updated = await submitDeliverable(applicationId, deliverable);
        return NextResponse.json(updated);
      }

      // ── Owner/admin approves delivery ──
      case "approve": {
        const { applicationId: appId, reviewScore, reviewNotes } = body;
        if (!appId || reviewScore === undefined) {
          return NextResponse.json({ error: "applicationId and reviewScore required" }, { status: 400 });
        }
        if (reviewScore < 0 || reviewScore > 1) {
          return NextResponse.json({ error: "reviewScore must be 0-1" }, { status: 400 });
        }
        if (!(await canManageApplication(appId))) {
          return NextResponse.json({ error: "Only the job owner or admin can approve deliveries" }, { status: 403 });
        }
        const result = await approveDelivery(appId, reviewScore, reviewNotes);
        return NextResponse.json(result);
      }

      // ── Owner/admin rejects/declines an application ──
      case "reject": {
        const { applicationId: rejectId } = body;
        if (!rejectId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
        if (!(await canManageApplication(rejectId))) {
          return NextResponse.json({ error: "Only the job owner or admin can reject applications" }, { status: 403 });
        }
        const rejected = await rejectApplication(rejectId);
        return NextResponse.json(rejected);
      }

      // ── Owner/admin requests revision ──
      case "revise": {
        const { applicationId: revAppId, reviewNotes: revNotes } = body;
        if (!revAppId || !revNotes) {
          return NextResponse.json({ error: "applicationId and reviewNotes required" }, { status: 400 });
        }
        if (!(await canManageApplication(revAppId))) {
          return NextResponse.json({ error: "Only the job owner or admin can request revisions" }, { status: 403 });
        }
        const revised = await requestRevision(revAppId, revNotes);
        return NextResponse.json(revised);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Use: apply, accept, reject, deliver, approve, revise` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
