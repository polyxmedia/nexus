"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  DollarSign,
  User,
  CheckCircle2,
  XCircle,
  Send,
  FileText,
  Shield,
  Zap,
  AlertTriangle,
  Eye,
  Loader2,
} from "lucide-react";

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  expertise: string | null;
  priority: string;
  paymentAmount: number;
  paymentType: string;
  deadline: string | null;
  maxApplications: number;
  status: string;
  createdBy: string;
  assignedTo: string | null;
  sourceType: string | null;
  sourceId: string | null;
  deliverableFormat: string;
  knowledgeEntryId: number | null;
  completedAt: string | null;
  createdAt: string;
}

interface Application {
  id: number;
  jobId: number;
  analystId: number;
  userId: string;
  coverNote: string | null;
  proposedApproach: string | null;
  estimatedHours: number | null;
  status: string;
  deliverable: string | null;
  deliveredAt: string | null;
  reviewScore: number | null;
  reviewNotes: string | null;
  paymentStatus: string;
  createdAt: string;
}

interface Profile {
  id: number;
  userId: string;
  displayName: string;
  status: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const jobId = Number(params.id);

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Application form
  const [coverNote, setCoverNote] = useState("");
  const [proposedApproach, setProposedApproach] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);

  // Delivery form
  const [deliverable, setDeliverable] = useState("");
  const [showDeliverForm, setShowDeliverForm] = useState(false);

  // Admin review
  const [reviewScore, setReviewScore] = useState("0.8");
  const [reviewNotes, setReviewNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, appsRes, profileRes] = await Promise.all([
        fetch(`/api/analyst-jobs?id=${jobId}`),
        fetch(`/api/analyst-jobs/applications?jobId=${jobId}`),
        fetch("/api/analyst-jobs/profiles?mine=true"),
      ]);

      if (jobRes.ok) setJob(await jobRes.json());
      if (appsRes.ok) setApplications(await appsRes.json());
      if (profileRes.ok) {
        const data = await profileRes.json();
        setMyProfile(data);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApply = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/analyst-jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          jobId,
          coverNote: coverNote || undefined,
          proposedApproach: proposedApproach || undefined,
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        }),
      });
      if (res.ok) {
        setShowApplyForm(false);
        setCoverNote("");
        setProposedApproach("");
        setEstimatedHours("");
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (applicationId: number) => {
    const res = await fetch("/api/analyst-jobs/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", applicationId }),
    });
    if (res.ok) fetchData();
  };

  const handleDeliver = async (applicationId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/analyst-jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deliver", applicationId, deliverable }),
      });
      if (res.ok) {
        setShowDeliverForm(false);
        setDeliverable("");
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (applicationId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/analyst-jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          applicationId,
          reviewScore: Number(reviewScore),
          reviewNotes: reviewNotes || undefined,
        }),
      });
      if (res.ok) fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (applicationId: number) => {
    const res = await fetch("/api/analyst-jobs/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", applicationId }),
    });
    if (res.ok) fetchData();
  };

  const handleRevise = async (applicationId: number) => {
    const res = await fetch("/api/analyst-jobs/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revise", applicationId, reviewNotes }),
    });
    if (res.ok) fetchData();
  };

  if (loading) {
    return (
      <PageContainer title="Loading...">
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer title="Job Not Found">
        <p className="text-sm text-navy-400">This job does not exist.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Jobs
        </Button>
      </PageContainer>
    );
  }

  const expertise: string[] = job.expertise ? JSON.parse(job.expertise) : [];
  const myApplication = applications.find(a => myProfile && a.analystId === myProfile.id);
  const canApply = job.status === "open" && myProfile?.status === "approved" && !myApplication;
  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === "admin";
  const isOwner = job.createdBy === `user:${session?.user?.name}`;
  const canManage = isAdmin || isOwner;
  const daysLeft = job.deadline
    ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <PageContainer
      title={job.title}
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
      }
    >
      {/* Job Header */}
      <div className="mb-6 rounded border border-navy-800 bg-navy-900/50 p-5">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
          <span className={job.status === "open" ? "text-accent-emerald" : job.status === "in_progress" ? "text-accent-cyan" : "text-navy-400"}>
            {job.status.replace("_", " ")}
          </span>
          <span className="text-navy-700">|</span>
          <span className={job.priority === "critical" ? "text-accent-rose" : job.priority === "urgent" ? "text-accent-amber" : "text-navy-400"}>
            {job.priority === "critical" && <AlertTriangle className="mr-1 inline h-3 w-3" />}
            {job.priority === "urgent" && <Zap className="mr-1 inline h-3 w-3" />}
            {job.priority}
          </span>
          <span className="text-navy-700">|</span>
          <span className="text-navy-500">{job.category}</span>
          <span className="text-navy-700">|</span>
          <span className="text-navy-500">Format: {job.deliverableFormat}</span>
          {job.sourceType === "system" && (
            <>
              <span className="text-navy-700">|</span>
              <span className="text-accent-cyan">
                <Shield className="mr-1 inline h-3 w-3" />
                System Generated
              </span>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Payment</div>
            <div className="mt-1 flex items-center gap-1 text-lg font-bold text-accent-emerald">
              <DollarSign className="h-4 w-4" />
              {(job.paymentAmount / 100).toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Deadline</div>
            <div className={`mt-1 text-sm font-semibold ${
              daysLeft !== null && daysLeft <= 2 ? "text-accent-rose" : "text-navy-200"
            }`}>
              {job.deadline ? (
                <>
                  {new Date(job.deadline).toLocaleDateString()}
                  {daysLeft !== null && (
                    <span className="ml-1 text-xs text-navy-500">({daysLeft > 0 ? `${daysLeft}d` : "overdue"})</span>
                  )}
                </>
              ) : "No deadline"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Applications</div>
            <div className="mt-1 text-sm font-semibold text-navy-200">
              {applications.filter(a => a.status !== "rejected" && a.status !== "withdrawn").length} / {job.maxApplications}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Posted</div>
            <div className="mt-1 text-sm text-navy-300">
              {new Date(job.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {expertise.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1.5">Required Expertise</div>
            <div className="flex flex-wrap gap-1.5">
              {expertise.map(tag => (
                <span key={tag} className="rounded bg-navy-800 px-2 py-0.5 text-[11px] font-mono text-navy-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-navy-800 pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-2">Brief</div>
          <div className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed">
            {job.description}
          </div>
        </div>
      </div>

      {/* Apply Button / Form */}
      {canApply && !showApplyForm && (
        <Button className="mb-6" onClick={() => setShowApplyForm(true)}>
          <Send className="mr-1.5 h-3.5 w-3.5" /> Apply for this Job
        </Button>
      )}

      {showApplyForm && (
        <div className="mb-6 rounded border border-navy-800 bg-navy-900/50 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-100 mb-4">Apply</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Why you are qualified</label>
              <textarea
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
                className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
                rows={3}
                placeholder="Relevant experience, domain expertise, past work..."
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Proposed approach</label>
              <textarea
                value={proposedApproach}
                onChange={e => setProposedApproach(e.target.value)}
                className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
                rows={3}
                placeholder="How you would tackle this analysis..."
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Estimated hours</label>
              <input
                type="number"
                value={estimatedHours}
                onChange={e => setEstimatedHours(e.target.value)}
                className="mt-1 w-32 rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 focus:border-accent-cyan focus:outline-none"
                placeholder="8"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Submit Application
              </Button>
              <Button variant="outline" onClick={() => setShowApplyForm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* My Application Status */}
      {myApplication && (
        <div className="mb-6 rounded border border-navy-800 bg-navy-900/50 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-100 mb-3">Your Application</h3>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider mb-3">
            <span className={
              myApplication.status === "accepted" ? "text-accent-emerald" :
              myApplication.status === "delivered" ? "text-accent-cyan" :
              myApplication.status === "completed" ? "text-accent-emerald" :
              myApplication.status === "rejected" ? "text-accent-rose" :
              "text-accent-amber"
            }>
              {myApplication.status}
            </span>
            {myApplication.paymentStatus !== "unpaid" && (
              <>
                <span className="text-navy-700">|</span>
                <span className={myApplication.paymentStatus === "paid" ? "text-accent-emerald" : "text-accent-amber"}>
                  Payment: {myApplication.paymentStatus}
                </span>
              </>
            )}
          </div>

          {myApplication.reviewNotes && (
            <div className="mb-3 rounded bg-navy-800/50 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Review Notes</div>
              <p className="text-xs text-navy-300">{myApplication.reviewNotes}</p>
            </div>
          )}

          {/* Deliver button for accepted applications */}
          {myApplication.status === "accepted" && !showDeliverForm && (
            <Button onClick={() => setShowDeliverForm(true)}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Submit Deliverable
            </Button>
          )}

          {showDeliverForm && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Your Analysis</label>
                <textarea
                  value={deliverable}
                  onChange={e => setDeliverable(e.target.value)}
                  className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
                  rows={12}
                  placeholder="Write your full analysis here. This will be reviewed and, if approved, ingested into the NEXUS knowledge bank."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleDeliver(myApplication.id)} disabled={submitting || !deliverable.trim()}>
                  {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                  Submit
                </Button>
                <Button variant="outline" onClick={() => setShowDeliverForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {myApplication.reviewScore !== null && (
            <div className="mt-3 text-xs text-navy-400">
              Quality score: <span className="font-bold text-navy-200">{(myApplication.reviewScore * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Applications List (visible to job owner / admin) */}
      {canManage && applications.length > 0 && (
        <div className="rounded border border-navy-800 bg-navy-900/50 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-100 mb-4">
            Applications ({applications.length})
          </h3>
          <div className="space-y-3">
            {applications.map(app => (
              <div key={app.id} className="rounded border border-navy-800 bg-navy-900/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-navy-500" />
                    <span className="text-sm font-semibold text-navy-200">
                      {app.userId.replace("user:", "")}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${
                      app.status === "accepted" ? "text-accent-emerald" :
                      app.status === "delivered" ? "text-accent-cyan" :
                      app.status === "completed" ? "text-accent-emerald" :
                      app.status === "rejected" ? "text-accent-rose" :
                      "text-accent-amber"
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-navy-500">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {app.coverNote && (
                  <p className="mt-2 text-xs text-navy-400">{app.coverNote}</p>
                )}
                {app.proposedApproach && (
                  <div className="mt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-600">Approach: </span>
                    <span className="text-xs text-navy-400">{app.proposedApproach}</span>
                  </div>
                )}
                {app.estimatedHours && (
                  <div className="mt-1 text-[10px] text-navy-500">Est. {app.estimatedHours}h</div>
                )}

                {/* Delivered content */}
                {app.deliverable && (
                  <div className="mt-3 rounded bg-navy-800/50 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1">Deliverable</div>
                    <p className="text-xs text-navy-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {app.deliverable}
                    </p>
                  </div>
                )}

                {/* Admin actions */}
                {app.status === "pending" && job.status === "open" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(app.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                      <XCircle className="mr-1 h-3 w-3" /> Decline
                    </Button>
                  </div>
                )}

                {app.status === "delivered" && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Score (0-1)</label>
                      <input
                        type="number"
                        value={reviewScore}
                        onChange={e => setReviewScore(e.target.value)}
                        min="0"
                        max="1"
                        step="0.05"
                        className="w-20 rounded border border-navy-700 bg-navy-900 px-2 py-1 text-xs text-navy-200 focus:border-accent-cyan focus:outline-none"
                      />
                    </div>
                    <textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      className="w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-xs text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
                      rows={2}
                      placeholder="Review notes..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(app.id)} disabled={submitting}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approve & Pay
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRevise(app.id)}>
                        <XCircle className="mr-1 h-3 w-3" /> Request Revision
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
