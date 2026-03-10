"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  Shield,
  Pencil,
  Save,
  X,
  MapPin,
  Globe,
  Award,
  BarChart3,
  Briefcase,
  Target,
  TrendingUp,
  FileText,
  ExternalLink,
  Star,
  AlertTriangle,
  Link2,
} from "lucide-react";

interface Profile {
  id: number;
  userId: string;
  displayName: string;
  bio: string | null;
  expertise: string | null;
  credentials: string | null;
  stripeConnectId: string | null;
  payoutsEnabled: number;
  totalJobs: number;
  totalEarnings: number;
  avgAccuracy: number | null;
  scoredDeliverables: number;
  status: string;
  createdAt: string;
}

interface Application {
  id: number;
  jobId: number;
  status: string;
  reviewScore: number | null;
  paymentStatus: string;
  deliveredAt: string | null;
  createdAt: string;
}

function StatRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-navy-800" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke="currentColor" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className={color}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-navy-100">{value > 0 ? `${value}%` : "--"}</span>
        </div>
      </div>
      <span className="mt-2 text-[10px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color = "text-navy-100" }: {
  icon: typeof Briefcase;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-navy-800 bg-navy-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-navy-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtext && <div className="mt-0.5 text-[10px] text-navy-600">{subtext}</div>}
    </div>
  );
}

export default function AnalystProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [credentials, setCredentials] = useState("");
  const [expertiseTags, setExpertiseTags] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, appsRes] = await Promise.all([
        fetch("/api/analyst-jobs/profiles?mine=true"),
        fetch("/api/analyst-jobs/applications?mine=true"),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data) {
          setProfile(data);
          setDisplayName(data.displayName);
          setBio(data.bio || "");
          setCredentials(data.credentials || "");
          const tags: string[] = data.expertise ? JSON.parse(data.expertise) : [];
          setExpertiseTags(tags.join(", "));
        }
      }
      if (appsRes.ok) {
        setApplications(await appsRes.json());
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const expertise = expertiseTags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/analyst-jobs/profiles", {
        method: profile ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim() || undefined,
          credentials: credentials.trim() || undefined,
          expertise,
        }),
      });

      if (res.ok) {
        setSuccess(profile ? "Profile updated" : "Profile created. Pending admin approval.");
        setEditing(false);
        fetchProfile();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save profile");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Analyst Profile">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-navy-500" />
        </div>
      </PageContainer>
    );
  }

  const username = session?.user?.name || "analyst";
  const expertise: string[] = profile?.expertise ? JSON.parse(profile.expertise) : [];
  const memberSince = profile ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;
  const completedApps = applications.filter(a => a.status === "completed");
  const activeApps = applications.filter(a => a.status === "accepted" || a.status === "delivered");
  const pendingApps = applications.filter(a => a.status === "pending");

  // If no profile, show creation form
  if (!profile) {
    return (
      <PageContainer
        title="Become an Analyst"
        subtitle="Create your profile to apply for intelligence jobs on NEXUS"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Jobs
          </Button>
        }
      >
        <div className="mx-auto max-w-2xl">
          {/* Intro */}
          <div className="mb-8 rounded-lg border border-navy-800 bg-navy-900/30 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-accent-cyan/10 p-3">
                <Shield className="h-6 w-6 text-accent-cyan" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-navy-100">Intelligence Analyst Programme</h2>
                <p className="mt-1.5 text-xs text-navy-400 leading-relaxed">
                  NEXUS commissions expert analysis for intelligence gaps that automated systems cannot fill.
                  Approved analysts receive paid assignments, and their work feeds directly into the platform's
                  knowledge bank and prediction engine. Your track record is scored over time using the same
                  Brier methodology we apply to our own predictions.
                </p>
                <div className="mt-3 flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-navy-500">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-accent-emerald" /> Paid assignments</span>
                  <span className="flex items-center gap-1"><Target className="h-3 w-3 text-accent-cyan" /> Accuracy tracked</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-accent-amber" /> Stripe payouts</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded border border-accent-rose/30 bg-accent-rose/10 px-4 py-2 text-xs text-accent-rose">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Identity */}
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
                <User className="h-3.5 w-3.5" /> Identity
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="How you want to appear on the platform"
                    className="mt-1"
                  />
                  <p className="mt-1 text-[10px] text-navy-600">This is public. Use your real name or a professional alias.</p>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Professional Summary</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="mt-1 w-full rounded-md border border-navy-700 bg-navy-900 px-3 py-2.5 text-sm text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan/20"
                    rows={4}
                    placeholder="Senior geopolitical analyst with 12 years covering Middle East security dynamics. Former RUSI research fellow. Specialize in Iranian proxy networks and Gulf state strategic competition."
                  />
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
                <Award className="h-3.5 w-3.5" /> Credentials & Experience
              </h3>
              <textarea
                value={credentials}
                onChange={e => setCredentials(e.target.value)}
                className="w-full rounded-md border border-navy-700 bg-navy-900 px-3 py-2.5 text-sm text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan/20"
                rows={5}
                placeholder={"List relevant experience, one per line:\n- 8 years as defense intelligence analyst (DIA)\n- Published in Foreign Affairs, War on the Rocks\n- MA International Security, King's College London\n- Fluent Arabic, Farsi"}
              />
              <p className="mt-1.5 text-[10px] text-navy-600">
                Clearances, affiliations, publications, languages. This is reviewed during approval.
              </p>
            </div>

            {/* Expertise */}
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
                <Globe className="h-3.5 w-3.5" /> Domains of Expertise
              </h3>
              <Input
                value={expertiseTags}
                onChange={e => setExpertiseTags(e.target.value)}
                placeholder="iran, proxy-warfare, energy-markets, osint, nuclear-proliferation"
              />
              <p className="mt-1.5 text-[10px] text-navy-600">
                Comma-separated. These are matched against job requirements when recommending you for roles.
              </p>
              {expertiseTags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {expertiseTags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="rounded-full bg-navy-800 px-2.5 py-1 text-[10px] font-mono text-navy-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} className="px-6">
                {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
                Submit for Review
              </Button>
              <Button variant="outline" onClick={() => router.push("/jobs")}>Cancel</Button>
            </div>

            <p className="text-[10px] text-navy-600">
              Profiles are reviewed by NEXUS administrators before approval. You will be notified when your profile is activated.
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Existing Profile View ──
  return (
    <PageContainer
      title="Analyst Profile"
      actions={
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Jobs Board
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded border border-accent-rose/30 bg-accent-rose/10 px-4 py-2 text-xs text-accent-rose">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded border border-accent-emerald/30 bg-accent-emerald/10 px-4 py-2 text-xs text-accent-emerald">{success}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Header Card */}
          <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-800 ring-2 ring-navy-700">
                  <span className="text-2xl font-bold text-navy-300">
                    {profile.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                {/* Status badge */}
                <div className={`absolute -bottom-1 -right-1 rounded-full p-1 ${
                  profile.status === "approved" ? "bg-accent-emerald" :
                  profile.status === "suspended" ? "bg-accent-rose" :
                  "bg-accent-amber"
                }`}>
                  {profile.status === "approved" ? <CheckCircle2 className="h-3 w-3 text-white" /> :
                   profile.status === "pending" ? <Clock className="h-3 w-3 text-white" /> :
                   <AlertTriangle className="h-3 w-3 text-white" />}
                </div>
              </div>

              {editing ? (
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="mt-4 text-center"
                />
              ) : (
                <h2 className="mt-4 text-lg font-bold text-navy-100">{profile.displayName}</h2>
              )}

              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500">
                <span className={
                  profile.status === "approved" ? "text-accent-emerald" :
                  profile.status === "suspended" ? "text-accent-rose" :
                  "text-accent-amber"
                }>
                  {profile.status}
                </span>
                <span className="text-navy-700">|</span>
                <span>@{username}</span>
              </div>

              {memberSince && (
                <div className="mt-2 text-[10px] text-navy-600">
                  Member since {memberSince}
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="mt-5 border-t border-navy-800 pt-4">
              {editing ? (
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full rounded-md border border-navy-700 bg-navy-900 px-3 py-2.5 text-xs text-navy-300 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
                  rows={4}
                  placeholder="Professional summary..."
                />
              ) : (
                <p className="text-xs text-navy-400 leading-relaxed">
                  {profile.bio || "No bio provided"}
                </p>
              )}
            </div>

            {/* Expertise Tags */}
            <div className="mt-4 border-t border-navy-800 pt-4">
              <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-navy-500">Expertise</div>
              {editing ? (
                <>
                  <Input
                    value={expertiseTags}
                    onChange={e => setExpertiseTags(e.target.value)}
                    placeholder="comma-separated tags"
                    className="text-xs"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {expertiseTags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="rounded-full bg-accent-cyan/10 px-2.5 py-1 text-[10px] font-mono text-accent-cyan">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              ) : expertise.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {expertise.map(tag => (
                    <span key={tag} className="rounded-full bg-accent-cyan/10 px-2.5 py-1 text-[10px] font-mono text-accent-cyan">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-navy-600">No expertise tags set</p>
              )}
            </div>

            {/* Payout Status */}
            <div className="mt-4 border-t border-navy-800 pt-4">
              <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-navy-500">Payout Method</div>
              {profile.stripeConnectId && profile.payoutsEnabled ? (
                <div className="flex items-center gap-2 text-xs text-accent-emerald">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Stripe Connect active
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-navy-500">
                  <Link2 className="h-3.5 w-3.5" />
                  Not connected
                </div>
              )}
            </div>

            {/* Edit Actions */}
            {editing && (
              <div className="mt-4 flex gap-2 border-t border-navy-800 pt-4">
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); fetchProfile(); }}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Credentials Card */}
          <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
              <Award className="h-3.5 w-3.5" /> Credentials
            </h3>
            {editing ? (
              <textarea
                value={credentials}
                onChange={e => setCredentials(e.target.value)}
                className="w-full rounded-md border border-navy-700 bg-navy-900 px-3 py-2.5 text-xs text-navy-300 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
                rows={6}
                placeholder="Experience, clearances, publications..."
              />
            ) : (
              <div className="text-xs text-navy-400 leading-relaxed whitespace-pre-wrap">
                {profile.credentials || "No credentials provided"}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Performance Overview */}
          <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-6">
            <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
              <BarChart3 className="h-3.5 w-3.5" /> Performance
            </h3>

            <div className="flex items-center justify-around mb-6">
              <StatRing
                value={profile.avgAccuracy !== null ? Math.round(profile.avgAccuracy * 100) : 0}
                label="Accuracy"
                color="text-accent-emerald"
              />
              <StatRing
                value={profile.totalJobs > 0 ? Math.round((completedApps.length / Math.max(applications.length, 1)) * 100) : 0}
                label="Completion"
                color="text-accent-cyan"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                icon={Briefcase}
                label="Jobs Done"
                value={profile.totalJobs}
                subtext={activeApps.length > 0 ? `${activeApps.length} active` : undefined}
              />
              <MetricCard
                icon={Target}
                label="Scored"
                value={profile.scoredDeliverables}
                subtext="deliverables reviewed"
              />
              <MetricCard
                icon={DollarSign}
                label="Earned"
                value={`$${(profile.totalEarnings / 100).toLocaleString()}`}
                color="text-accent-emerald"
              />
              <MetricCard
                icon={Star}
                label="Avg Score"
                value={profile.avgAccuracy !== null ? `${(profile.avgAccuracy * 100).toFixed(0)}%` : "--"}
                subtext={profile.scoredDeliverables > 0 ? `from ${profile.scoredDeliverables} reviews` : "no reviews yet"}
              />
            </div>
          </div>

          {/* Active Assignments */}
          {activeApps.length > 0 && (
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
                <TrendingUp className="h-3.5 w-3.5" /> Active Assignments
              </h3>
              <div className="space-y-2">
                {activeApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => router.push(`/jobs/${app.jobId}`)}
                    className="group flex w-full items-center justify-between rounded-md border border-navy-800 bg-navy-900/30 p-3 text-left transition-colors hover:border-navy-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-1.5 ${
                        app.status === "delivered" ? "bg-accent-cyan/10" : "bg-accent-amber/10"
                      }`}>
                        {app.status === "delivered" ?
                          <FileText className="h-3.5 w-3.5 text-accent-cyan" /> :
                          <Briefcase className="h-3.5 w-3.5 text-accent-amber" />
                        }
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-navy-200">Job #{app.jobId}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                          {app.status === "delivered" ? "Awaiting review" : "In progress"}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-navy-600 group-hover:text-navy-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending Applications */}
          {pendingApps.length > 0 && (
            <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
                <Clock className="h-3.5 w-3.5" /> Pending Applications ({pendingApps.length})
              </h3>
              <div className="space-y-2">
                {pendingApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => router.push(`/jobs/${app.jobId}`)}
                    className="group flex w-full items-center justify-between rounded-md border border-navy-800 bg-navy-900/30 p-3 text-left transition-colors hover:border-navy-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-accent-amber/10 p-1.5">
                        <Clock className="h-3.5 w-3.5 text-accent-amber" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-navy-200">Job #{app.jobId}</div>
                        <div className="text-[10px] text-navy-600">
                          Applied {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-navy-600 group-hover:text-navy-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Completed Work History */}
          <div className="rounded-lg border border-navy-800 bg-navy-900/50 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Work History
            </h3>
            {completedApps.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Briefcase className="mb-2 h-8 w-8 text-navy-700" />
                <p className="text-xs text-navy-500">No completed assignments yet</p>
                <p className="mt-1 text-[10px] text-navy-600">
                  {profile.status === "approved"
                    ? "Browse open jobs and submit your first application"
                    : "Your profile is pending approval"}
                </p>
                {profile.status === "approved" && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push("/jobs")}>
                    Browse Jobs
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {completedApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => router.push(`/jobs/${app.jobId}`)}
                    className="group flex w-full items-center justify-between rounded-md border border-navy-800 bg-navy-900/30 p-3 text-left transition-colors hover:border-navy-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-accent-emerald/10 p-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-navy-200">Job #{app.jobId}</div>
                        <div className="flex items-center gap-2 text-[10px] text-navy-600">
                          {app.deliveredAt && <span>Delivered {new Date(app.deliveredAt).toLocaleDateString()}</span>}
                          {app.reviewScore !== null && (
                            <>
                              <span className="text-navy-700">|</span>
                              <span className="font-mono text-accent-emerald">{(app.reviewScore * 100).toFixed(0)}% score</span>
                            </>
                          )}
                          {app.paymentStatus === "paid" && (
                            <>
                              <span className="text-navy-700">|</span>
                              <span className="text-accent-emerald">Paid</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-navy-600 group-hover:text-navy-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
