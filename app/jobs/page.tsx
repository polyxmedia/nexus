"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  Filter,
  PlusCircle,
  Users,
  ChevronRight,
  AlertTriangle,
  Zap,
  Shield,
  Globe,
  BarChart3,
  Eye,
  User,
} from "lucide-react";

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  expertise: string | null;
  priority: string;
  paymentAmount: number;
  deadline: string | null;
  maxApplications: number;
  status: string;
  createdBy: string;
  assignedTo: string | null;
  sourceType: string | null;
  deliverableFormat: string;
  completedAt: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "geopolitical", label: "Geopolitical" },
  { id: "market", label: "Market" },
  { id: "actor", label: "Actor Profile" },
  { id: "event", label: "Event Analysis" },
  { id: "technical", label: "Technical" },
  { id: "osint", label: "OSINT" },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  standard: { label: "Standard", color: "text-navy-400", icon: Clock },
  urgent: { label: "Urgent", color: "text-accent-amber", icon: Zap },
  critical: { label: "Critical", color: "text-accent-rose", icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-accent-emerald" },
  in_progress: { label: "In Progress", color: "text-accent-cyan" },
  completed: { label: "Completed", color: "text-navy-400" },
  cancelled: { label: "Cancelled", color: "text-navy-500" },
};

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [profile, setProfile] = useState<{ id: number; status: string } | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/analyst-jobs?${params}`);
      if (res.ok) setJobs(await res.json());
    } catch {
      // graceful fallback
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/analyst-jobs/profiles?mine=true");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // no profile
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchProfile();
  }, [fetchJobs, fetchProfile]);

  const openCount = jobs.filter(j => j.status === "open").length;
  const inProgressCount = jobs.filter(j => j.status === "in_progress").length;

  return (
    <PageContainer
      title="Intelligence Jobs"
      subtitle="Commission expert analysis for intelligence gaps"
      actions={
        <div className="flex items-center gap-2">
          {!profile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/jobs/profile")}
            >
              <User className="mr-1.5 h-3.5 w-3.5" />
              Become an Analyst
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => router.push("/jobs/create")}
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            Post Job
          </Button>
        </div>
      }
    >
      {/* Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-navy-800 bg-navy-900/50 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Open Jobs</div>
          <div className="mt-1 text-xl font-bold text-navy-100">{openCount}</div>
        </div>
        <div className="rounded border border-navy-800 bg-navy-900/50 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">In Progress</div>
          <div className="mt-1 text-xl font-bold text-accent-cyan">{inProgressCount}</div>
        </div>
        <div className="rounded border border-navy-800 bg-navy-900/50 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Total Posted</div>
          <div className="mt-1 text-xl font-bold text-navy-100">{jobs.length}</div>
        </div>
        <div className="rounded border border-navy-800 bg-navy-900/50 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Your Profile</div>
          <div className="mt-1 text-sm font-bold text-navy-100">
            {profile ? (
              <span className={profile.status === "approved" ? "text-accent-emerald" : "text-accent-amber"}>
                {profile.status.toUpperCase()}
              </span>
            ) : (
              <span className="text-navy-500">Not Created</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <Filter className="h-3.5 w-3.5 text-navy-500" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Status</span>
        </div>
        {["all", "open", "in_progress", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors ${
              statusFilter === s
                ? "bg-navy-700 text-navy-100"
                : "text-navy-500 hover:text-navy-300"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}

        <div className="mx-2 h-4 w-px bg-navy-800" />

        <div className="flex items-center gap-1 mr-2">
          <Globe className="h-3.5 w-3.5 text-navy-500" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Category</span>
        </div>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={`rounded px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors ${
              categoryFilter === c.id
                ? "bg-navy-700 text-navy-100"
                : "text-navy-500 hover:text-navy-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Job Listings */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded border border-navy-800" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded border border-navy-800 bg-navy-900/30 py-16">
          <Briefcase className="mb-3 h-10 w-10 text-navy-600" />
          <p className="text-sm text-navy-400">No jobs match your filters</p>
          <p className="mt-1 text-xs text-navy-500">
            {statusFilter === "open" ? "Check back soon or post a new job" : "Try changing your filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => {
            const priority = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.standard;
            const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
            const PriorityIcon = priority.icon;
            const expertise: string[] = job.expertise ? JSON.parse(job.expertise) : [];
            const daysLeft = job.deadline
              ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <button
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="group w-full rounded border border-navy-800 bg-navy-900/50 p-4 text-left transition-colors hover:border-navy-700 hover:bg-navy-900/80"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-navy-700">|</span>
                      <span className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider ${priority.color}`}>
                        <PriorityIcon className="h-3 w-3" />
                        {priority.label}
                      </span>
                      <span className="text-navy-700">|</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                        {job.category}
                      </span>
                      {job.sourceType === "system" && (
                        <>
                          <span className="text-navy-700">|</span>
                          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-accent-cyan">
                            <Shield className="h-3 w-3" />
                            System Generated
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-navy-100 group-hover:text-white">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-xs text-navy-400 line-clamp-2">
                      {job.description.slice(0, 200)}{job.description.length > 200 ? "..." : ""}
                    </p>
                    {expertise.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {expertise.map(tag => (
                          <span key={tag} className="rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-mono text-navy-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1.5 shrink-0">
                    <span className="flex items-center gap-1 text-sm font-bold text-accent-emerald">
                      <DollarSign className="h-3.5 w-3.5" />
                      {(job.paymentAmount / 100).toFixed(0)}
                    </span>
                    {daysLeft !== null && (
                      <span className={`flex items-center gap-1 text-[10px] font-mono ${
                        daysLeft <= 2 ? "text-accent-rose" : daysLeft <= 5 ? "text-accent-amber" : "text-navy-500"
                      }`}>
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                      </span>
                    )}
                    <ChevronRight className="mt-1 h-4 w-4 text-navy-600 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-400" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
