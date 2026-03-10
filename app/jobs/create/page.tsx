"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, PlusCircle, Loader2 } from "lucide-react";

const CATEGORIES = ["geopolitical", "market", "actor", "event", "technical", "osint"];
const PRIORITIES = ["standard", "urgent", "critical"];
const FORMATS = ["analysis", "assessment", "profile", "briefing"];

export default function CreateJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("geopolitical");
  const [priority, setPriority] = useState("standard");
  const [paymentAmount, setPaymentAmount] = useState("50");
  const [deadline, setDeadline] = useState("");
  const [deliverableFormat, setDeliverableFormat] = useState("analysis");
  const [expertiseTags, setExpertiseTags] = useState("");
  const [maxApplications, setMaxApplications] = useState("5");

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }
    const amount = Math.round(Number(paymentAmount) * 100);
    if (amount < 100) {
      setError("Minimum payment is $1.00");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/analyst-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          paymentAmount: amount,
          deadline: deadline || undefined,
          deliverableFormat,
          expertise: expertiseTags.split(",").map(t => t.trim()).filter(Boolean),
          maxApplications: Number(maxApplications) || 5,
        }),
      });

      if (res.ok) {
        const job = await res.json();
        router.push(`/jobs/${job.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create job");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Post Intelligence Job"
      subtitle="Commission expert analysis for an intelligence gap"
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
      }
    >
      <div className="max-w-2xl space-y-5">
        {error && (
          <div className="rounded border border-accent-rose/30 bg-accent-rose/10 px-4 py-2 text-xs text-accent-rose">
            {error}
          </div>
        )}

        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Job Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Assess Iranian proxy network response capacity"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
            Full Brief
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 placeholder:text-navy-600 focus:border-accent-cyan focus:outline-none"
            rows={8}
            placeholder="Describe what you need analyzed. Include context, scope, specific questions to answer, and what format the deliverable should take."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 focus:border-accent-cyan focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 focus:border-accent-cyan focus:outline-none"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Payment (USD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2 text-sm text-navy-500">$</span>
              <Input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="pl-7"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Deadline</label>
            <Input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Deliverable Format</label>
            <select
              value={deliverableFormat}
              onChange={e => setDeliverableFormat(e.target.value)}
              className="mt-1 w-full rounded border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-navy-200 focus:border-accent-cyan focus:outline-none"
            >
              {FORMATS.map(f => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Max Applications</label>
            <Input
              type="number"
              value={maxApplications}
              onChange={e => setMaxApplications(e.target.value)}
              className="mt-1"
              min="1"
              max="20"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
            Required Expertise Tags (comma-separated)
          </label>
          <Input
            value={expertiseTags}
            onChange={e => setExpertiseTags(e.target.value)}
            placeholder="e.g. iran, proxy-warfare, middle-east, energy"
            className="mt-1"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="mr-1.5 h-3.5 w-3.5" />}
            Post Job
          </Button>
          <Button variant="outline" onClick={() => router.push("/jobs")}>Cancel</Button>
        </div>
      </div>
    </PageContainer>
  );
}
