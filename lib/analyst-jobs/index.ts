// ── Analyst Jobs Marketplace Engine ──
// Manages the full lifecycle: job creation, applications, delivery, scoring, payment.

import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { addKnowledge } from "@/lib/knowledge/engine";

// ── Profiles ──

export async function getAnalystProfile(userId: string) {
  const rows = await db.select().from(schema.analystProfiles)
    .where(eq(schema.analystProfiles.userId, userId));
  return rows[0] || null;
}

export async function getAnalystProfileById(id: number) {
  const rows = await db.select().from(schema.analystProfiles)
    .where(eq(schema.analystProfiles.id, id));
  return rows[0] || null;
}

export async function createAnalystProfile(data: {
  userId: string;
  displayName: string;
  bio?: string;
  expertise?: string[];
  credentials?: string;
}) {
  const rows = await db.insert(schema.analystProfiles).values({
    userId: data.userId,
    displayName: data.displayName,
    bio: data.bio || null,
    expertise: data.expertise ? JSON.stringify(data.expertise) : null,
    credentials: data.credentials || null,
  }).returning();
  return rows[0];
}

export async function updateAnalystProfile(id: number, updates: Record<string, unknown>) {
  const set: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
  if (set.expertise && Array.isArray(set.expertise)) {
    set.expertise = JSON.stringify(set.expertise);
  }
  await db.update(schema.analystProfiles).set(set).where(eq(schema.analystProfiles.id, id));
  return getAnalystProfileById(id);
}

export async function listAnalystProfiles(status?: string) {
  if (status) {
    return db.select().from(schema.analystProfiles)
      .where(eq(schema.analystProfiles.status, status))
      .orderBy(desc(schema.analystProfiles.id));
  }
  return db.select().from(schema.analystProfiles)
    .orderBy(desc(schema.analystProfiles.id));
}

// ── Jobs ──

export async function createJob(data: {
  title: string;
  description: string;
  category: string;
  expertise?: string[];
  priority?: string;
  paymentAmount: number;
  deadline?: string;
  createdBy: string;
  sourceType?: string;
  sourceId?: string;
  deliverableFormat?: string;
  maxApplications?: number;
}) {
  const rows = await db.insert(schema.analystJobs).values({
    title: data.title,
    description: data.description,
    category: data.category,
    expertise: data.expertise ? JSON.stringify(data.expertise) : null,
    priority: data.priority || "standard",
    paymentAmount: data.paymentAmount,
    deadline: data.deadline || null,
    createdBy: data.createdBy,
    sourceType: data.sourceType || "manual",
    sourceId: data.sourceId || null,
    deliverableFormat: data.deliverableFormat || "analysis",
    maxApplications: data.maxApplications || 5,
  }).returning();
  return rows[0];
}

export async function getJob(id: number) {
  const rows = await db.select().from(schema.analystJobs)
    .where(eq(schema.analystJobs.id, id));
  return rows[0] || null;
}

export async function listJobs(filters?: { status?: string; category?: string }) {
  if (filters?.status && filters?.category) {
    return db.select().from(schema.analystJobs)
      .where(and(eq(schema.analystJobs.status, filters.status), eq(schema.analystJobs.category, filters.category)))
      .orderBy(desc(schema.analystJobs.id));
  }
  if (filters?.status) {
    return db.select().from(schema.analystJobs)
      .where(eq(schema.analystJobs.status, filters.status))
      .orderBy(desc(schema.analystJobs.id));
  }
  if (filters?.category) {
    return db.select().from(schema.analystJobs)
      .where(eq(schema.analystJobs.category, filters.category))
      .orderBy(desc(schema.analystJobs.id));
  }
  return db.select().from(schema.analystJobs)
    .orderBy(desc(schema.analystJobs.id));
}

export async function updateJob(id: number, updates: Record<string, unknown>) {
  const set: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
  if (set.expertise && Array.isArray(set.expertise)) {
    set.expertise = JSON.stringify(set.expertise);
  }
  await db.update(schema.analystJobs).set(set).where(eq(schema.analystJobs.id, id));
  return getJob(id);
}

export async function cancelJob(id: number) {
  return updateJob(id, { status: "cancelled" });
}

// ── Applications ──

export async function createApplication(data: {
  jobId: number;
  analystId: number;
  userId: string;
  coverNote?: string;
  proposedApproach?: string;
  estimatedHours?: number;
}) {
  const rows = await db.insert(schema.analystApplications).values({
    jobId: data.jobId,
    analystId: data.analystId,
    userId: data.userId,
    coverNote: data.coverNote || null,
    proposedApproach: data.proposedApproach || null,
    estimatedHours: data.estimatedHours || null,
  }).returning();
  return rows[0];
}

export async function getApplication(id: number) {
  const rows = await db.select().from(schema.analystApplications)
    .where(eq(schema.analystApplications.id, id));
  return rows[0] || null;
}

export async function getApplicationsForJob(jobId: number) {
  return db.select().from(schema.analystApplications)
    .where(eq(schema.analystApplications.jobId, jobId))
    .orderBy(desc(schema.analystApplications.id));
}

export async function getApplicationsForAnalyst(analystId: number) {
  return db.select().from(schema.analystApplications)
    .where(eq(schema.analystApplications.analystId, analystId))
    .orderBy(desc(schema.analystApplications.id));
}

export async function updateApplication(id: number, updates: Record<string, unknown>) {
  const set: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
  await db.update(schema.analystApplications).set(set).where(eq(schema.analystApplications.id, id));
  return getApplication(id);
}

// ── Lifecycle Actions ──

/**
 * Accept an application: marks it accepted, assigns the analyst to the job,
 * sets job status to in_progress, rejects other pending applications.
 */
export async function acceptApplication(applicationId: number) {
  const app = await getApplication(applicationId);
  if (!app) throw new Error("Application not found");

  const job = await getJob(app.jobId);
  if (!job) throw new Error("Job not found");
  if (job.status !== "open") throw new Error("Job is not open");

  // Accept this application
  await updateApplication(applicationId, { status: "accepted" });

  // Assign analyst to job
  await updateJob(job.id, { status: "in_progress", assignedTo: app.userId });

  // Reject other pending applications for this job
  const others = await getApplicationsForJob(job.id);
  for (const other of others) {
    if (other.id !== applicationId && other.status === "pending") {
      await updateApplication(other.id, { status: "rejected" });
    }
  }

  return { application: await getApplication(applicationId), job: await getJob(job.id) };
}

/**
 * Submit deliverable: analyst uploads their analysis.
 */
export async function submitDeliverable(applicationId: number, deliverable: string) {
  return updateApplication(applicationId, {
    deliverable,
    deliveredAt: new Date().toISOString(),
    status: "delivered",
  });
}

/**
 * Approve delivery: admin reviews, scores, triggers payment, creates knowledge entry.
 */
export async function approveDelivery(
  applicationId: number,
  reviewScore: number,
  reviewNotes?: string
) {
  const app = await getApplication(applicationId);
  if (!app) throw new Error("Application not found");
  if (!app.deliverable) throw new Error("No deliverable submitted");

  const job = await getJob(app.jobId);
  if (!job) throw new Error("Job not found");

  // Score the application
  await updateApplication(applicationId, {
    reviewScore,
    reviewNotes: reviewNotes || null,
    status: "completed",
  });

  // Create knowledge bank entry from deliverable
  const knowledgeEntry = await addKnowledge({
    title: `Analyst Report: ${job.title}`,
    content: app.deliverable,
    category: job.category === "actor" ? "actor" : job.category === "market" ? "market" : "geopolitical",
    tags: JSON.stringify([
      "analyst-job",
      `job-${job.id}`,
      job.category,
      ...(JSON.parse(job.expertise || "[]") as string[]),
    ]),
    source: `analyst:${app.userId}`,
    confidence: reviewScore,
    status: "active",
  });

  // Update job with knowledge entry reference and mark complete
  await updateJob(job.id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    knowledgeEntryId: knowledgeEntry.id,
  });

  // Update analyst profile stats
  const profile = await getAnalystProfileById(app.analystId);
  if (profile) {
    const newScoredCount = profile.scoredDeliverables + 1;
    const newAvg = profile.avgAccuracy
      ? (profile.avgAccuracy * profile.scoredDeliverables + reviewScore) / newScoredCount
      : reviewScore;

    await updateAnalystProfile(profile.id, {
      totalJobs: profile.totalJobs + 1,
      scoredDeliverables: newScoredCount,
      avgAccuracy: newAvg,
    });
  }

  // Trigger payment
  const paymentResult = await processPayment(app, job);

  return {
    application: await getApplication(applicationId),
    job: await getJob(job.id),
    knowledgeEntry,
    payment: paymentResult,
  };
}

/**
 * Reject/decline an application.
 */
export async function rejectApplication(applicationId: number) {
  const app = await getApplication(applicationId);
  if (!app) throw new Error("Application not found");
  if (app.status !== "pending") throw new Error("Can only reject pending applications");
  return updateApplication(applicationId, { status: "rejected" });
}

/**
 * Request revision: send back for more work.
 */
export async function requestRevision(applicationId: number, notes: string) {
  return updateApplication(applicationId, {
    status: "accepted", // back to accepted (not delivered)
    reviewNotes: notes,
    deliverable: null,
    deliveredAt: null,
  });
}

// ── Payment ──

async function processPayment(
  app: NonNullable<Awaited<ReturnType<typeof getApplication>>>,
  job: NonNullable<Awaited<ReturnType<typeof getJob>>>
): Promise<{ method: string; status: string; reference?: string }> {
  const profile = await getAnalystProfileById(app.analystId);
  if (!profile) return { method: "none", status: "failed" };

  // Try Stripe Connect payout first
  if (profile.stripeConnectId && profile.payoutsEnabled) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = getStripe();
      const transfer = await stripe.transfers.create({
        amount: job.paymentAmount,
        currency: "usd",
        destination: profile.stripeConnectId,
        metadata: {
          jobId: String(job.id),
          applicationId: String(app.id),
          analystUserId: app.userId,
        },
      });

      await updateApplication(app.id, {
        paymentStatus: "paid",
        paymentReference: transfer.id,
        paidAt: new Date().toISOString(),
      });

      // Update earnings
      await updateAnalystProfile(profile.id, {
        totalEarnings: profile.totalEarnings + job.paymentAmount,
      });

      return { method: "stripe_connect", status: "paid", reference: transfer.id };
    } catch (err) {
      console.error("[analyst-jobs] Stripe transfer failed:", err);
      await updateApplication(app.id, { paymentStatus: "failed" });
      return { method: "stripe_connect", status: "failed" };
    }
  }

  // Fallback: mark as pending manual payment
  await updateApplication(app.id, { paymentStatus: "pending_manual" });
  return { method: "manual", status: "pending_manual" };
}

// ── System Job Generation ──

/**
 * Auto-generate a job from a low-confidence prediction or intelligence gap.
 */
export async function createSystemJob(data: {
  title: string;
  description: string;
  category: string;
  expertise: string[];
  paymentAmount: number;
  deadline?: string;
  sourceType: string;
  sourceId: string;
  priority?: string;
}) {
  return createJob({
    ...data,
    createdBy: "system",
    priority: data.priority || "standard",
  });
}
