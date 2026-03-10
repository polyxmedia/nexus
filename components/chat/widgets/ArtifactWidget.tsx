"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, FileText, Table2, BarChart3, Code2, Map } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ArtifactData {
  type: "chart" | "table" | "document" | "code" | "briefing";
  title: string;
  content: unknown;
  language?: string;
}

function isArtifactData(data: unknown): data is ArtifactData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.type === "string" && typeof d.title === "string" && d.content !== undefined;
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  chart: BarChart3,
  table: Table2,
  document: FileText,
  code: Code2,
  briefing: FileText,
  map: Map,
};

const TYPE_COLORS: Record<string, string> = {
  chart: "text-accent-cyan",
  table: "text-accent-amber",
  document: "text-navy-300",
  code: "text-accent-emerald",
  briefing: "text-accent-cyan",
  map: "text-accent-emerald",
};

function ChartArtifact({ content }: { content: unknown }) {
  const data = content as { labels?: string[]; datasets?: Array<{ label: string; data: number[]; color?: string }> };
  if (!data?.datasets?.length) return <p className="text-navy-500 text-xs">No chart data</p>;

  const allValues = data.datasets.flatMap((d) => d.data);
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 0;

  return (
    <div className="space-y-3">
      {data.datasets.map((dataset, di) => (
        <div key={di}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-1.5">{dataset.label}</div>
          <div className="flex items-end gap-1 h-32">
            {dataset.data.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`,
                    backgroundColor: dataset.color || "#06b6d4",
                    minHeight: val > 0 ? "2px" : "0",
                  }}
                />
                {data.labels?.[i] && (
                  <span className="text-[9px] font-mono text-navy-600 truncate w-full text-center">
                    {data.labels[i]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableArtifact({ content }: { content: unknown }) {
  const data = content as { headers?: string[]; rows?: string[][] };
  if (!data?.headers || !data?.rows) return <p className="text-navy-500 text-xs">No table data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-navy-700">
            {data.headers.map((h, i) => (
              <th key={i} className="px-3 py-1.5 text-left font-semibold text-navy-300 text-[10px] font-mono uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-navy-800/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-navy-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeArtifact({ content, language }: { content: unknown; language?: string }) {
  const [copied, setCopied] = useState(false);
  const code = typeof content === "string" ? content : JSON.stringify(content, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        {language && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-600">{language}</span>
        )}
        <button onClick={handleCopy} className="text-navy-600 hover:text-navy-300 transition-colors">
          {copied ? <Check className="w-3 h-3 text-accent-emerald" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="bg-navy-950 border border-navy-700 rounded p-3 overflow-x-auto">
        <code className="text-xs font-mono text-accent-cyan whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function DocumentArtifact({ content }: { content: unknown }) {
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);

  return (
    <div className="prose-artifact text-sm text-navy-200 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="text-base font-bold text-navy-100 mt-4 mb-1.5">{children}</h2>,
          h2: ({ children }) => <h3 className="text-sm font-semibold text-navy-100 mt-3 mb-1">{children}</h3>,
          h3: ({ children }) => <h4 className="text-xs font-semibold text-navy-100 mt-2.5 mb-1">{children}</h4>,
          p: ({ children }) => <p className="text-navy-300 text-xs mb-2">{children}</p>,
          strong: ({ children }) => <strong className="text-navy-100 font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-navy-300 italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside text-navy-300 text-xs space-y-0.5 mb-2 ml-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-navy-300 text-xs space-y-0.5 mb-2 ml-1">{children}</ol>,
          li: ({ children }) => <li className="text-navy-300">{children}</li>,
          hr: () => <hr className="border-navy-700/50 my-3" />,
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-navy-950 border border-navy-700 rounded p-2.5 overflow-x-auto my-2">
                  <code className="text-[11px] font-mono text-accent-cyan whitespace-pre">{children}</code>
                </pre>
              );
            }
            return <code className="text-[11px] font-mono text-accent-cyan bg-navy-800/50 px-1 py-0.5 rounded">{children}</code>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-navy-700">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold text-navy-300 text-[10px] font-mono uppercase tracking-wider">{children}</th>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-navy-800/50">{children}</tr>,
          td: ({ children }) => <td className="px-3 py-1.5 text-navy-300 text-xs">{children}</td>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-accent-cyan/30 pl-3 my-2 text-navy-400 text-xs italic">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">{children}</a>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function ArtifactWidget({ result }: { result: unknown }) {
  const [expanded, setExpanded] = useState(true);

  if (!isArtifactData(result)) {
    return <p className="text-navy-500 text-xs font-mono">Invalid artifact data</p>;
  }

  const Icon = TYPE_ICONS[result.type] || FileText;
  const colorClass = TYPE_COLORS[result.type] || "text-navy-400";

  return (
    <div className="border border-navy-700/50 rounded-lg bg-navy-900/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-navy-800/30 transition-colors"
      >
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 flex-1 text-left">
          {result.title}
        </span>
        <span className="text-[9px] font-mono text-navy-600 uppercase">{result.type}</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />}
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-navy-800/50">
          <div className="pt-2">
            {result.type === "chart" && <ChartArtifact content={result.content} />}
            {result.type === "table" && <TableArtifact content={result.content} />}
            {result.type === "code" && <CodeArtifact content={result.content} language={result.language} />}
            {(result.type === "document" || result.type === "briefing") && <DocumentArtifact content={result.content} />}
          </div>
        </div>
      )}
    </div>
  );
}
