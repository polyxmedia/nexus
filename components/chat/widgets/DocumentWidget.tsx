"use client";

import { FileText, Database, Check } from "lucide-react";

interface DocumentResult {
  saved?: boolean;
  documentId?: number;
  knowledgeId?: number;
  name?: string;
  size?: number;
  extractedLength?: number;
  message?: string;
}

function isDocumentResult(data: unknown): data is DocumentResult {
  return data !== null && typeof data === "object";
}

export function DocumentWidget({ result }: { result: unknown }) {
  if (!isDocumentResult(result)) return null;

  return (
    <div className="flex items-center gap-2 py-1">
      {result.knowledgeId ? (
        <>
          <Database className="w-3 h-3 text-accent-emerald" />
          <span className="text-[11px] font-mono text-navy-400">
            <span className="text-navy-200">{result.name}</span> saved to knowledge bank
            {result.extractedLength && (
              <span className="text-navy-600 ml-1">({Math.round(result.extractedLength / 1000)}K chars extracted)</span>
            )}
          </span>
        </>
      ) : result.saved ? (
        <>
          <Check className="w-3 h-3 text-accent-emerald" />
          <span className="text-[11px] font-mono text-navy-400">
            Document <span className="text-navy-200">{result.name}</span> recorded
          </span>
        </>
      ) : (
        <>
          <FileText className="w-3 h-3 text-navy-500" />
          <span className="text-[11px] font-mono text-navy-400">{result.message || "Document processed"}</span>
        </>
      )}
    </div>
  );
}
