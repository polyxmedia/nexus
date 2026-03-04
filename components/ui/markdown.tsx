import React from "react";

interface MarkdownProps {
  children: string;
  className?: string;
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      nodes.push(
        <strong key={match.index} className="text-navy-100 font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      nodes.push(
        <em key={match.index} className="italic">
          {match[3]}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function Markdown({ children, className }: MarkdownProps) {
  if (!children) return null;

  const lines = children.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: React.ReactNode[] = [];
  let keyCounter = 0;

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="list-disc list-inside space-y-0.5 ml-1">
          {bulletBuffer}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      flushBullets();
      elements.push(
        <h4 key={`h4-${keyCounter++}`} className="text-xs font-semibold text-navy-300 mt-3 mb-1 uppercase tracking-wider">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushBullets();
      elements.push(
        <h3 key={`h3-${keyCounter++}`} className="text-sm font-semibold text-navy-200 mt-3 mb-1">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushBullets();
      elements.push(
        <h2 key={`h2-${keyCounter++}`} className="text-base font-bold text-navy-100 mt-3 mb-1">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bulletBuffer.push(
        <li key={`li-${keyCounter++}`} className="text-sm text-navy-200">
          {parseInline(trimmed.slice(2))}
        </li>
      );
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${keyCounter++}`} className="text-sm text-navy-200 leading-relaxed">
          {parseInline(trimmed)}
        </p>
      );
    }
  }

  flushBullets();

  return <div className={className}>{elements}</div>;
}
