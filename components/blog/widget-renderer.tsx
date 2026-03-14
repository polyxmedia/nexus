"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart3,
} from "lucide-react";

// ── Widget: Live Quote ──

function QuoteWidget({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ price: number; change: number; changePercent: number; name: string } | null>(null);

  useEffect(() => {
    fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.price) setData(d);
      })
      .catch(() => {});
  }, [symbol]);

  if (!data) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-navy-700/40 bg-navy-900/40 font-mono text-xs">
        <BarChart3 className="w-3 h-3 text-navy-500" />
        <span className="text-navy-300">{symbol}</span>
        <span className="text-navy-500">Loading...</span>
      </div>
    );
  }

  const positive = data.change >= 0;
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg border border-navy-700/40 bg-navy-900/30 my-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400">{symbol}</div>
      <div className="text-sm font-mono text-navy-100 font-semibold">${data.price.toFixed(2)}</div>
      <div className={`flex items-center gap-1 text-xs font-mono ${positive ? "text-accent-emerald" : "text-accent-rose"}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {positive ? "+" : ""}{data.changePercent.toFixed(2)}%
      </div>
    </div>
  );
}

// ── Widget: Prediction Card ──

function PredictionWidget({ id }: { id: number }) {
  const [pred, setPred] = useState<{
    claim: string;
    confidence: number;
    deadline: string;
    direction: string | null;
    outcome: string | null;
    category: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/predictions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.claim || d.prediction) setPred(d.prediction || d);
      })
      .catch(() => {});
  }, [id]);

  if (!pred) {
    return (
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/20 p-4 my-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Prediction #{id}</div>
        <div className="text-xs text-navy-400 mt-1">Loading...</div>
      </div>
    );
  }

  const outcomeIcon = pred.outcome === "confirmed"
    ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
    : pred.outcome === "denied"
    ? <XCircle className="w-3.5 h-3.5 text-accent-rose" />
    : pred.outcome === "partial"
    ? <MinusCircle className="w-3.5 h-3.5 text-accent-amber" />
    : <Clock className="w-3.5 h-3.5 text-accent-cyan" />;

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-900/20 p-4 my-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-3.5 h-3.5 text-navy-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">
          NEXUS Prediction #{id}
        </span>
        {outcomeIcon}
      </div>
      <p className="text-sm text-navy-200 leading-relaxed">{pred.claim}</p>
      <div className="flex items-center gap-4 mt-3">
        <span className="text-[10px] font-mono text-accent-cyan">{(pred.confidence * 100).toFixed(0)}% confidence</span>
        <span className="text-[10px] font-mono text-navy-500">Deadline: {pred.deadline}</span>
        {pred.direction && (
          <span className={`text-[10px] font-mono ${pred.direction === "up" ? "text-accent-emerald" : "text-accent-rose"}`}>
            {pred.direction === "up" ? "BULLISH" : "BEARISH"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Widget: Chart ──

interface ChartBar {
  d: string;
  c: number;
  h: number;
  l: number;
  v: number;
}

function ChartWidget({ symbol, period }: { symbol: string; period: string }) {
  const [bars, setBars] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/chart?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.bars?.length) setBars(d.bars);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  if (loading) {
    return (
      <div className="my-4 h-52 rounded bg-navy-900/30 animate-pulse flex items-center justify-center">
        <span className="text-[10px] font-mono text-navy-600">Loading {symbol}...</span>
      </div>
    );
  }

  if (error || bars.length < 2) {
    return (
      <div className="my-4 h-24 rounded bg-navy-900/20 flex items-center justify-center">
        <span className="text-[10px] font-mono text-navy-600">Chart unavailable for {symbol}</span>
      </div>
    );
  }

  const closes = bars.map((b) => b.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const first = closes[0];
  const last = closes[closes.length - 1];
  const positive = last >= first;
  const change = ((last - first) / first * 100).toFixed(2);

  const W = 600;
  const H = 160;
  const padT = 8;
  const padB = 8;
  const chartH = H - padT - padB;

  const points = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * W;
    const y = padT + chartH - ((c - min) / range) * chartH;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const strokeColor = positive ? "#10b981" : "#f43f5e";
  const fillId = `grad-${symbol}-${period}`;

  return (
    <div className="my-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{symbol}</span>
          <span className="text-[10px] font-mono text-navy-600">{period}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-navy-200">${last.toFixed(2)}</span>
          <span className={`text-[10px] font-mono ${positive ? "text-accent-emerald" : "text-accent-rose"}`}>
            {positive ? "+" : ""}{change}%
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${fillId})`} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Widget: Metric Badge ──

function MetricWidget({ label, value, change }: { label: string; value: string; change?: string }) {
  const positive = change?.startsWith("+");
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-navy-700/40 bg-navy-900/30 my-1 mr-2">
      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">{label}</span>
      <span className="text-xs font-mono font-semibold text-navy-100">{value}</span>
      {change && (
        <span className={`text-[10px] font-mono ${positive ? "text-accent-emerald" : "text-accent-rose"}`}>
          {change}
        </span>
      )}
    </div>
  );
}

// ── Widget: Callout ──

function CalloutWidget({ type, children }: { type: string; children: React.ReactNode }) {
  // Insight gets an inverted card treatment
  if (type === "insight") {
    return (
      <div className="my-8 bg-navy-100 rounded-sm px-6 py-5">
        <div className="text-sm text-navy-900 leading-relaxed [&_p]:text-navy-900 [&_p]:mb-0 [&_strong]:text-navy-950">{children}</div>
      </div>
    );
  }

  // Everything else: left-rule with subtle label
  const accents: Record<string, string> = {
    warning: "bg-accent-amber",
    risk: "bg-accent-rose",
    bullish: "bg-accent-emerald",
    bearish: "bg-accent-rose",
  };

  return (
    <div className="my-6 pl-4 relative">
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${accents[type] || "bg-navy-500"} rounded-full`} />
      <div className="text-sm text-navy-300 leading-relaxed">{children}</div>
    </div>
  );
}

// ── Signal Widget ──

function SignalWidget({ category }: { category: string }) {
  const [signals, setSignals] = useState<{ title: string; intensity: number }[]>([]);

  useEffect(() => {
    fetch(`/api/signals?category=${encodeURIComponent(category)}&limit=3`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.signals)) setSignals(d.signals.slice(0, 3));
        else if (Array.isArray(d)) setSignals(d.slice(0, 3));
      })
      .catch(() => {});
  }, [category]);

  return (
    <div className="border border-navy-700/40 rounded-lg bg-navy-900/20 p-4 my-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-3">
        Active {category} signals
      </div>
      {signals.length === 0 ? (
        <div className="text-xs text-navy-500 font-mono">No active signals</div>
      ) : (
        <div className="space-y-2">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-navy-200">{s.title}</span>
              <span className="text-[10px] font-mono text-navy-400">
                {"//".repeat(s.intensity)}{" "}
                <span className="text-navy-600">{"//".repeat(5 - s.intensity)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Widget: Scenario Matrix ──

interface ScenarioEntry {
  name: string;
  probability: string;
  description: string;
  indicators: string[];
  positioning: string;
  color: string;
}

const SCENARIO_COLORS: Record<string, { border: string; bg: string; text: string; badge: string; indicator: string }> = {
  amber:   { border: "border-accent-amber/30", bg: "bg-accent-amber/5",   text: "text-accent-amber",   badge: "bg-accent-amber/15 text-accent-amber",   indicator: "bg-accent-amber/20" },
  emerald: { border: "border-accent-emerald/30", bg: "bg-accent-emerald/5", text: "text-accent-emerald", badge: "bg-accent-emerald/15 text-accent-emerald", indicator: "bg-accent-emerald/20" },
  rose:    { border: "border-accent-rose/30", bg: "bg-accent-rose/5",    text: "text-accent-rose",    badge: "bg-accent-rose/15 text-accent-rose",    indicator: "bg-accent-rose/20" },
  cyan:    { border: "border-accent-cyan/30", bg: "bg-accent-cyan/5",    text: "text-accent-cyan",    badge: "bg-accent-cyan/15 text-accent-cyan",    indicator: "bg-accent-cyan/20" },
};

function ScenarioMatrixWidget({ scenarios }: { scenarios: ScenarioEntry[] }) {
  if (!scenarios.length) return null;

  return (
    <div className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-navy-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Scenario Matrix</span>
      </div>
      <div className="grid gap-3">
        {scenarios.map((s, i) => {
          const c = SCENARIO_COLORS[s.color] || SCENARIO_COLORS.cyan;
          const prob = parseInt(s.probability) || 0;
          return (
            <div key={i} className={`border ${c.border} rounded-lg ${c.bg} overflow-hidden`}>
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700/20">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${c.text}`}>{s.name}</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>{s.probability}</span>
              </div>
              {/* Probability bar */}
              <div className="px-5 pt-3">
                <div className="h-1 rounded-full bg-navy-800/40 overflow-hidden">
                  <div className={`h-full rounded-full ${c.text.replace("text-", "bg-")} transition-all`} style={{ width: `${prob}%` }} />
                </div>
              </div>
              {/* Body */}
              <div className="px-5 py-3 space-y-3">
                <p className="text-sm text-navy-200 leading-relaxed">{s.description}</p>
                {/* Indicators */}
                {s.indicators.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1.5">Key Indicators</span>
                    <div className="flex flex-wrap gap-1.5">
                      {s.indicators.map((ind, j) => (
                        <span key={j} className={`text-[10px] font-mono px-2 py-0.5 rounded ${c.indicator} text-navy-200`}>{ind}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Positioning */}
                {s.positioning && (
                  <div className="border-t border-navy-700/20 pt-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 block mb-1">Positioning</span>
                    <p className="text-xs text-navy-300 leading-relaxed">{s.positioning}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Renderer ──

/**
 * Parse markdown body with embedded widget directives and render as React.
 * Widget syntax: {{type|key=value|key=value}}
 * Callout syntax: {{callout|type=TYPE}} content {{/callout}}
 */
export function BlogBody({ body }: { body: string }) {
  // Split into segments: text and widget directives
  const segments: React.ReactNode[] = [];
  let remaining = body;
  let key = 0;

  // Process scenario-matrix blocks (multi-line)
  remaining = remaining.replace(
    /\{\{scenario-matrix\}\}\s*([\s\S]*?)\s*\{\{\/scenario-matrix\}\}/g,
    (_, json) => `__SCENARIO_MATRIX_${btoa(encodeURIComponent(json.trim()))}__`
  );

  // Process callouts (multi-line)
  remaining = remaining.replace(
    /\{\{callout\|type=(\w+)\}\}([\s\S]*?)\{\{\/callout\}\}/g,
    (_, type, content) => `__CALLOUT_${type}_${btoa(encodeURIComponent(content))}__`
  );

  const lines = remaining.split("\n");
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push(
        <div key={key++} className="blog-prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(textBuffer.join("\n")) }} />
      );
      textBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Scenario matrix placeholder
    const scenarioMatch = trimmed.match(/^__SCENARIO_MATRIX_(.+)__$/);
    if (scenarioMatch) {
      flushText();
      try {
        const json = decodeURIComponent(atob(scenarioMatch[1]));
        const scenarios: ScenarioEntry[] = JSON.parse(json);
        segments.push(<ScenarioMatrixWidget key={key++} scenarios={scenarios} />);
      } catch {
        // Malformed JSON, render as text
        textBuffer.push(line);
      }
      continue;
    }

    // Callout placeholder
    const calloutMatch = trimmed.match(/^__CALLOUT_(\w+)_(.+)__$/);
    if (calloutMatch) {
      flushText();
      const type = calloutMatch[1];
      const content = decodeURIComponent(atob(calloutMatch[2]));
      segments.push(
        <CalloutWidget key={key++} type={type}>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
        </CalloutWidget>
      );
      continue;
    }

    // Widget directive
    const widgetMatch = trimmed.match(/^\{\{(\w+)\|(.+)\}\}$/);
    if (widgetMatch) {
      flushText();
      const type = widgetMatch[1];
      const params: Record<string, string> = {};
      widgetMatch[2].split("|").forEach((p) => {
        const [k, v] = p.split("=");
        if (k && v) params[k] = v;
      });

      switch (type) {
        case "quote":
          segments.push(<QuoteWidget key={key++} symbol={params.symbol || "SPY"} />);
          break;
        case "chart":
          segments.push(<ChartWidget key={key++} symbol={params.symbol || "SPY"} period={params.period || "3M"} />);
          break;
        case "prediction":
          segments.push(<PredictionWidget key={key++} id={parseInt(params.id || "0")} />);
          break;
        case "metric":
          segments.push(<MetricWidget key={key++} label={params.label || ""} value={params.value || ""} change={params.change} />);
          break;
        case "signal":
          segments.push(<SignalWidget key={key++} category={params.category || "market"} />);
          break;
        default:
          textBuffer.push(line);
      }
      continue;
    }

    textBuffer.push(line);
  }

  flushText();

  return <div className="space-y-0">{segments}</div>;
}

/**
 * Minimal markdown to HTML converter for blog content.
 * Handles headers, bold, italic, links, lists, paragraphs, code, blockquotes.
 */
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-navy-950 border border-navy-800/40 rounded-lg p-4 my-3 overflow-x-auto"><code class="text-xs font-mono text-navy-200">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-navy-800/40 px-1.5 py-0.5 rounded text-xs font-mono text-accent-cyan">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-navy-100 mt-8 mb-3 font-mono tracking-wide">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-navy-100 mt-10 mb-4 font-mono tracking-wide">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-navy-50 mt-12 mb-5 font-mono tracking-wide">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-semibold text-navy-100"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-navy-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-navy-200">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent-cyan hover:text-accent-cyan/80 underline underline-offset-2 transition-colors" target="_blank" rel="noopener">$1</a>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-navy-600 pl-4 py-1 my-3 text-navy-300 italic">$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="text-navy-200 ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="text-navy-200 ml-4 list-decimal">$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-navy-700/30 my-6" />')
    // Paragraphs (lines that aren't already wrapped in HTML)
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return `<p class="text-sm text-navy-200 leading-relaxed mb-4">${match}</p>`;
    });

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="my-3 space-y-1">$1</ul>');

  return html;
}
