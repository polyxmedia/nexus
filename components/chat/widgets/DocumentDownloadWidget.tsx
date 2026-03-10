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
  const accentColor = isPptx ? "accent-amber" : "accent-cyan";

  const handleDownload = async () => {
    setDownloading(true);
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
        throw new Error("Generation failed");
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
      console.error("[Document] Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`my-3 rounded-lg border border-${accentColor}/20 bg-navy-900/60 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-700/30">
        <div className={`flex items-center justify-center h-9 w-9 rounded-lg bg-${accentColor}/10 border border-${accentColor}/20`}>
          <Icon className={`h-4.5 w-4.5 text-${accentColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-navy-100 truncate">{data.title}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-mono uppercase tracking-wider text-${accentColor}`}>
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
            downloaded
              ? "bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald"
              : `bg-${accentColor}/10 border border-${accentColor}/30 text-${accentColor} hover:bg-${accentColor}/20`
          } disabled:opacity-50`}
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : downloaded ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {downloading ? "Generating..." : downloaded ? "Downloaded" : "Download"}
        </button>
      </div>

      {/* Section preview */}
      <div className="px-4 py-3 space-y-1.5">
        {data.sections.slice(0, 5).map((section, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-navy-600 w-5 text-right">{i + 1}</span>
            <span className="text-xs text-navy-400 truncate">{section.heading}</span>
            {section.bullets?.length ? (
              <span className="text-[9px] font-mono text-navy-600 ml-auto flex-shrink-0">
                {section.bullets.length} points
              </span>
            ) : null}
          </div>
        ))}
        {data.sections.length > 5 && (
          <div className="text-[10px] text-navy-600 font-mono pl-7">
            +{data.sections.length - 5} more sections
          </div>
        )}
      </div>
    </div>
  );
}
