"use client";

import { useState } from "react";
import { FileText, Presentation, Download, Loader2, CheckCircle2 } from "lucide-react";

interface Section {
  heading: string;
  content: string;
  bullets?: string[];
}

interface DocumentData {
  format: "pdf" | "pptx";
  title: string;
  sections: Section[];
  slideCount: number;
  generatedAt: string;
  error?: string;
}

export function DocumentDownloadWidget({ data }: { data: DocumentData }) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/20 rounded-lg bg-accent-rose/5 p-3 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const isPptx = data.format === "pptx";
  const Icon = isPptx ? Presentation : FileText;
  const formatLabel = isPptx ? "PowerPoint" : "PDF";
  const formatExt = isPptx ? ".pptx" : ".pdf";

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: data.format,
          title: data.title,
          sections: data.sections,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        throw new Error(errData.error || "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_").substring(0, 50)}${formatExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setError(msg);
      console.error("[Document] Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-navy-700/40 bg-navy-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className="h-4 w-4 text-navy-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-navy-100 truncate">{data.title}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
              {formatLabel}
            </span>
            <span className="text-[10px] text-navy-600">
              {data.slideCount} {isPptx ? "slides" : "pages"}
            </span>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono tracking-wider transition-all disabled:opacity-50 ${
            downloaded
              ? "text-accent-emerald"
              : "text-accent-cyan hover:text-accent-cyan/80"
          }`}
        >
          {downloading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : downloaded ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          {downloading ? "Generating" : downloaded ? "Done" : "Download"}
        </button>
      </div>

      {/* Section preview */}
      <div className="px-4 pb-3 space-y-1">
        {data.sections.slice(0, 5).map((section, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-navy-600 w-4 text-right">{i + 1}</span>
            <span className="text-xs text-navy-400 truncate">{section.heading}</span>
            {section.bullets?.length ? (
              <span className="text-[9px] font-mono text-navy-600 ml-auto flex-shrink-0">
                {section.bullets.length} points
              </span>
            ) : null}
          </div>
        ))}
        {data.sections.length > 5 && (
          <div className="text-[10px] text-navy-600 font-mono pl-6">
            +{data.sections.length - 5} more sections
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-accent-rose font-mono">{error}</p>
        </div>
      )}
    </div>
  );
}
