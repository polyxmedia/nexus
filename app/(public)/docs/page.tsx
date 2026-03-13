"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Highlight, themes } from "prism-react-renderer";
import type { PrismTheme } from "prism-react-renderer";
import { Check, Copy, ChevronRight, ExternalLink, Key, Zap, Shield, BookOpen } from "lucide-react";

/* ─── Types ─── */
type Param = {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
};

type Endpoint = {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  tier: "analyst" | "operator" | "institution";
  description: string;
  params: Param[];
  examples: { lang: string; label: string; code: string }[];
  response: string;
};

/* ─── Navigation Structure ─── */
const NAV_SECTIONS = [
  {
    title: "Getting Started",
    icon: BookOpen,
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "authentication", label: "Authentication" },
      { id: "base-url", label: "Base URL" },
      { id: "response-format", label: "Response Format" },
      { id: "rate-limits", label: "Rate Limits" },
      { id: "error-handling", label: "Error Handling" },
    ],
  },
  {
    title: "Intelligence",
    icon: Zap,
    items: [
      { id: "get-signals", label: "List Signals" },
      { id: "get-predictions", label: "List Predictions" },
      { id: "get-theses", label: "List Theses" },
    ],
  },
  {
    title: "Market Data",
    icon: Shield,
    items: [
      { id: "get-quote", label: "Market Quote" },
      { id: "get-news", label: "News Feed" },
    ],
  },
];

/* ─── Endpoints ─── */
const ENDPOINTS: Endpoint[] = [
  {
    id: "get-signals",
    method: "GET",
    path: "/v1/signals",
    title: "List Signals",
    tier: "analyst",
    description:
      "Retrieve detected geopolitical, market, OSINT, and systemic risk signals. Returns signals ordered by detection time, with full layer classification and market sector mapping.",
    params: [
      { name: "limit", type: "integer", default: "50", description: "Max results (1-200)" },
      { name: "offset", type: "integer", default: "0", description: "Pagination offset" },
      { name: "min_intensity", type: "integer", default: "1", description: "Minimum signal intensity (1-5)" },
      { name: "status", type: "string", description: 'Filter by status: upcoming, active, passed' },
      { name: "category", type: "string", description: 'Filter by category: geopolitical, market, osint, systemic' },
    ],
    examples: [
      {
        lang: "bash",
        label: "cURL",
        code: `curl -s "https://nexushq.xyz/api/v1/signals?limit=10&min_intensity=3" \\
  -H "Authorization: Bearer sk-nxs-your-key-here"`,
      },
      {
        lang: "javascript",
        label: "JavaScript",
        code: `const response = await fetch(
  "https://nexushq.xyz/api/v1/signals?limit=10&min_intensity=3",
  {
    headers: {
      Authorization: "Bearer sk-nxs-your-key-here",
    },
  }
);

const { data, meta } = await response.json();
console.log(data.signals);`,
      },
      {
        lang: "python",
        label: "Python",
        code: `import requests

response = requests.get(
    "https://nexushq.xyz/api/v1/signals",
    headers={"Authorization": "Bearer sk-nxs-your-key-here"},
    params={"limit": 10, "min_intensity": 3},
)

data = response.json()
print(data["data"]["signals"])`,
      },
    ],
    response: `{
  "data": {
    "signals": [
      {
        "id": 142,
        "title": "South China Sea naval buildup",
        "description": "Satellite imagery confirms increased PLA Navy...",
        "date": "2026-03-09",
        "intensity": 4,
        "category": "geopolitical",
        "layers": ["GEO", "OSI"],
        "marketSectors": ["defense", "shipping"],
        "status": "active",
        "createdAt": "2026-03-08T14:22:00Z"
      }
    ],
    "pagination": { "limit": 10, "offset": 0, "count": 1 }
  },
  "meta": {
    "timestamp": "2026-03-09T12:00:00Z",
    "tier": "analyst",
    "rateLimit": { "remaining": 29, "resetAt": "2026-03-09T12:01:00Z" }
  }
}`,
  },
  {
    id: "get-predictions",
    method: "GET",
    path: "/v1/predictions",
    title: "List Predictions",
    tier: "analyst",
    description:
      "Access prediction claims with Brier scoring, direction/level accuracy, and market regime tagging. Predictions are scored against real market outcomes for full transparency.",
    params: [
      { name: "limit", type: "integer", default: "50", description: "Max results (1-200)" },
      { name: "offset", type: "integer", default: "0", description: "Pagination offset" },
      { name: "outcome", type: "string", description: 'Filter: confirmed, denied, partial, expired' },
    ],
    examples: [
      {
        lang: "bash",
        label: "cURL",
        code: `curl -s "https://nexushq.xyz/api/v1/predictions?outcome=confirmed" \\
  -H "Authorization: Bearer sk-nxs-your-key-here"`,
      },
      {
        lang: "javascript",
        label: "JavaScript",
        code: `const response = await fetch(
  "https://nexushq.xyz/api/v1/predictions?outcome=confirmed",
  {
    headers: {
      Authorization: "Bearer sk-nxs-your-key-here",
    },
  }
);

const { data } = await response.json();
console.log(data.predictions);`,
      },
      {
        lang: "python",
        label: "Python",
        code: `import requests

response = requests.get(
    "https://nexushq.xyz/api/v1/predictions",
    headers={"Authorization": "Bearer sk-nxs-your-key-here"},
    params={"outcome": "confirmed"},
)

data = response.json()
print(data["data"]["predictions"])`,
      },
    ],
    response: `{
  "data": {
    "predictions": [
      {
        "id": 87,
        "claim": "Oil breaks $95 within 14 days",
        "confidence": 0.72,
        "category": "commodity",
        "direction": "up",
        "priceTarget": 95.0,
        "referenceSymbol": "CL=F",
        "outcome": "confirmed",
        "score": 0.92,
        "directionCorrect": true,
        "regimeAtCreation": "risk-off",
        "createdAt": "2026-02-20T10:00:00Z"
      }
    ],
    "pagination": { "limit": 50, "offset": 0, "count": 1 }
  }
}`,
  },
  {
    id: "get-theses",
    method: "GET",
    path: "/v1/theses",
    title: "List Theses",
    tier: "operator",
    description:
      "Retrieve AI-generated investment theses with convergence analysis, trading actions, and risk scenarios. Theses synthesize multiple signal layers into actionable intelligence.",
    params: [
      { name: "limit", type: "integer", default: "20", description: "Max results (1-50)" },
      { name: "offset", type: "integer", default: "0", description: "Pagination offset" },
      { name: "status", type: "string", default: "active", description: 'Filter: active, closed, invalidated' },
    ],
    examples: [
      {
        lang: "bash",
        label: "cURL",
        code: `curl -s "https://nexushq.xyz/api/v1/theses?status=active" \\
  -H "Authorization: Bearer sk-nxs-your-key-here"`,
      },
      {
        lang: "javascript",
        label: "JavaScript",
        code: `const response = await fetch(
  "https://nexushq.xyz/api/v1/theses?status=active",
  {
    headers: {
      Authorization: "Bearer sk-nxs-your-key-here",
    },
  }
);

const { data } = await response.json();
console.log(data.theses);`,
      },
      {
        lang: "python",
        label: "Python",
        code: `import requests

response = requests.get(
    "https://nexushq.xyz/api/v1/theses",
    headers={"Authorization": "Bearer sk-nxs-your-key-here"},
    params={"status": "active"},
)

data = response.json()
print(data["data"]["theses"])`,
      },
    ],
    response: `{
  "data": {
    "theses": [
      {
        "id": 15,
        "title": "Hormuz closure hedge via tanker equities",
        "status": "active",
        "marketRegime": "risk-off",
        "overallConfidence": 0.78,
        "executiveSummary": "Escalating tensions in the Strait of Hormuz...",
        "tradingActions": [
          { "symbol": "STNG", "action": "buy", "weight": 0.4 },
          { "symbol": "FRO", "action": "buy", "weight": 0.35 }
        ],
        "symbols": ["STNG", "FRO", "TNK"],
        "generatedAt": "2026-03-07T08:00:00Z"
      }
    ],
    "pagination": { "limit": 20, "offset": 0, "count": 1 }
  }
}`,
  },
  {
    id: "get-quote",
    method: "GET",
    path: "/v1/market/quote",
    title: "Market Quote",
    tier: "analyst",
    description:
      "Get a real-time market quote for any US equity, ETF, or cryptocurrency. Crypto symbols (BTC, ETH, XRP) are auto-detected and routed to the correct data feed.",
    params: [
      { name: "symbol", type: "string", required: true, description: "Ticker symbol, e.g. AAPL, SPY, BTC" },
    ],
    examples: [
      {
        lang: "bash",
        label: "cURL",
        code: `curl -s "https://nexushq.xyz/api/v1/market/quote?symbol=AAPL" \\
  -H "Authorization: Bearer sk-nxs-your-key-here"`,
      },
      {
        lang: "javascript",
        label: "JavaScript",
        code: `const response = await fetch(
  "https://nexushq.xyz/api/v1/market/quote?symbol=AAPL",
  {
    headers: {
      Authorization: "Bearer sk-nxs-your-key-here",
    },
  }
);

const { data } = await response.json();
console.log(\`\${data.symbol}: $\${data.quote.price}\`);`,
      },
      {
        lang: "python",
        label: "Python",
        code: `import requests

response = requests.get(
    "https://nexushq.xyz/api/v1/market/quote",
    headers={"Authorization": "Bearer sk-nxs-your-key-here"},
    params={"symbol": "AAPL"},
)

data = response.json()
quote = data["data"]["quote"]
print(f"{data['data']['symbol']}: \${quote['price']}")`,
      },
    ],
    response: `{
  "data": {
    "symbol": "AAPL",
    "quote": {
      "price": 187.42,
      "change": 2.15,
      "changePercent": "1.16%",
      "volume": 54823100,
      "latestTradingDay": "2026-03-07"
    }
  }
}`,
  },
  {
    id: "get-news",
    method: "GET",
    path: "/v1/news",
    title: "News Feed",
    tier: "analyst",
    description:
      "Retrieve the latest intelligence news feed with source bias classification. Aggregates multiple OSINT and financial news sources with automated categorization.",
    params: [
      { name: "limit", type: "integer", default: "30", description: "Max results (1-100)" },
    ],
    examples: [
      {
        lang: "bash",
        label: "cURL",
        code: `curl -s "https://nexushq.xyz/api/v1/news?limit=5" \\
  -H "Authorization: Bearer sk-nxs-your-key-here"`,
      },
      {
        lang: "javascript",
        label: "JavaScript",
        code: `const response = await fetch(
  "https://nexushq.xyz/api/v1/news?limit=5",
  {
    headers: {
      Authorization: "Bearer sk-nxs-your-key-here",
    },
  }
);

const { data } = await response.json();
data.articles.forEach((a) => console.log(a.title));`,
      },
      {
        lang: "python",
        label: "Python",
        code: `import requests

response = requests.get(
    "https://nexushq.xyz/api/v1/news",
    headers={"Authorization": "Bearer sk-nxs-your-key-here"},
    params={"limit": 5},
)

data = response.json()
for article in data["data"]["articles"]:
    print(article["title"])`,
      },
    ],
    response: `{
  "data": {
    "articles": [
      {
        "title": "Pentagon confirms carrier group deployment to Western Pacific",
        "url": "https://reuters.com/...",
        "source": "Reuters",
        "date": "2026-03-09T10:30:00Z",
        "category": "conflict",
        "bias": "center"
      }
    ],
    "pagination": { "limit": 5, "count": 1 }
  }
}`,
  },
];

const RATE_LIMITS = [
  { tier: "Observer", perMin: "30", perHour: "500", perDay: "5,000" },
  { tier: "Operator", perMin: "120", perHour: "2,000", perDay: "20,000" },
  { tier: "Institution", perMin: "600", perHour: "10,000", perDay: "100,000" },
];

const ERROR_CODES = [
  { status: "401", code: "unauthorized", desc: "Missing or invalid API key" },
  { status: "403", code: "insufficient_tier", desc: "Your subscription tier does not have access to this endpoint" },
  { status: "404", code: "not_found", desc: "The requested resource does not exist" },
  { status: "422", code: "validation_error", desc: "Invalid query parameters. Check the error message for details" },
  { status: "429", code: "rate_limited", desc: "Rate limit exceeded. Retry after the X-RateLimit-Reset timestamp" },
  { status: "500", code: "internal_error", desc: "An unexpected server error occurred. Contact support if persistent" },
];

/* ─── Charcoal code theme (nightOwl tokens, charcoal background) ─── */
const charcoalTheme: PrismTheme = {
  plain: {
    color: "#d6deeb",
    backgroundColor: "#1a1a1a",
  },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#637777", fontStyle: "italic" as const } },
    { types: ["punctuation"], style: { color: "#7c7c7c" } },
    { types: ["property", "tag", "boolean", "number", "constant", "symbol", "deleted"], style: { color: "#f78c6c" } },
    { types: ["selector", "attr-name", "string", "char", "builtin", "inserted"], style: { color: "#addb67" } },
    { types: ["operator", "entity", "url"], style: { color: "#89ddff" } },
    { types: ["atrule", "attr-value", "keyword"], style: { color: "#c792ea" } },
    { types: ["function", "class-name"], style: { color: "#82aaff" } },
    { types: ["regex", "important", "variable"], style: { color: "#ecc48d" } },
  ],
};

/* ─── Theme-aware code highlighting ─── */
function useCodeTheme(): { theme: PrismTheme; isDark: boolean } {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    function check() {
      const el = document.documentElement;
      setIsDark(!el.classList.contains("light") && !el.classList.contains("soft"));
    }
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return { theme: isDark ? charcoalTheme : themes.github, isDark };
}

const LANG_LABELS: Record<string, string> = {
  bash: "Shell",
  javascript: "JavaScript",
  python: "Python",
  json: "JSON",
};

/* ─── Code Block with Syntax Highlighting + Copy ─── */
function CodeBlock({ code, language = "json", className = "" }: { code: string; language?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = language === "bash" ? "bash" : language === "python" ? "python" : language === "javascript" ? "javascript" : "json";
  const { theme, isDark } = useCodeTheme();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className={`group relative rounded-lg overflow-hidden code-block ${isDark ? "code-block-dark" : "code-block-light"} ${className}`}>
      {/* Top bar with language label + copy */}
      <div className={`flex items-center justify-between px-4 py-2 ${isDark ? "bg-[#1a1a1a] border-b border-white/[0.06]" : "bg-[#f6f8fa] border-b border-black/[0.08]"}`}>
        <span className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-[#637777]" : "text-[#8b949e]"}`}>
          {LANG_LABELS[lang] || lang}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${
            isDark
              ? "text-[#637777] hover:text-[#d6deeb] hover:bg-white/[0.06]"
              : "text-[#8b949e] hover:text-[#24292f] hover:bg-black/[0.06]"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-accent-emerald" />
              <span className="text-accent-emerald">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <Highlight theme={theme} code={code.trim()} language={lang}>
        {({ tokens, getLineProps, getTokenProps, style }) => (
          <pre className="p-4 overflow-x-auto text-[12.5px] leading-[1.7] font-mono" style={{ ...style, margin: 0, borderRadius: 0 }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                <span className={`table-cell pr-4 text-right select-none text-[11px] w-8 ${isDark ? "text-[#505050]" : "text-[#bfc4c9]"}`}>
                  {i + 1}
                </span>
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

/* ─── Tabbed Code Examples ─── */
function TabbedCode({ examples }: { examples: Endpoint["examples"] }) {
  const [active, setActive] = useState(0);
  const { isDark } = useCodeTheme();

  return (
    <div className={`rounded-lg overflow-hidden ${isDark ? "code-block-dark" : "code-block-light"}`}>
      <div className={`flex ${isDark ? "bg-[#1a1a1a] border-b border-white/[0.06]" : "bg-[#f6f8fa] border-b border-black/[0.08]"}`}>
        {examples.map((ex, i) => (
          <button
            key={ex.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-[11px] font-mono tracking-wider transition-colors ${
              i === active
                ? "text-accent-cyan border-b-2 border-accent-cyan"
                : isDark
                  ? "text-[#637777] hover:text-[#d6deeb]"
                  : "text-[#8b949e] hover:text-[#24292f]"
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>
      <CodeBlock code={examples[active].code} language={examples[active].lang} className="rounded-none !border-0" />
    </div>
  );
}

/* ─── Method Badge ─── */
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20",
    POST: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20",
    PUT: "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
    DELETE: "text-accent-rose bg-accent-rose/10 border-accent-rose/20",
  };
  return (
    <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${colors[method] || ""}`}>
      {method}
    </span>
  );
}

/* ─── Tier Badge ─── */
function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    analyst: "text-accent-cyan bg-accent-cyan/8 border-accent-cyan/20",
    operator: "text-accent-amber bg-accent-amber/8 border-accent-amber/20",
    institution: "text-accent-rose bg-accent-rose/8 border-accent-rose/20",
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${colors[tier] || ""}`}>
      {tier}+
    </span>
  );
}

/* ─── Inline Code ─── */
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[12px] font-mono text-accent-cyan bg-navy-900 border border-navy-700/40 px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

/* ─── Section Heading with Anchor ─── */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="group text-xl font-semibold text-navy-100 mb-4 mt-16 first:mt-0 scroll-mt-24 flex items-center gap-2">
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-navy-600 hover:text-accent-cyan">
        #
      </a>
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="group text-base font-semibold text-navy-200 mb-3 mt-10 scroll-mt-24 flex items-center gap-2">
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-navy-600 hover:text-accent-cyan">
        #
      </a>
      {children}
    </h3>
  );
}

/* ─── Note/Warning Callout ─── */
function Note({ type = "info", children }: { type?: "info" | "warning"; children: React.ReactNode }) {
  const styles = {
    info: "border-accent-cyan/30 bg-accent-cyan/5 text-navy-300",
    warning: "border-accent-amber/30 bg-accent-amber/5 text-navy-300",
  };
  const label = type === "warning" ? "Warning" : "Note";
  const labelColor = type === "warning" ? "text-accent-amber" : "text-accent-cyan";
  return (
    <div className={`rounded-lg border-l-2 px-4 py-3 my-4 text-sm ${styles[type]}`}>
      <span className={`text-[10px] font-mono uppercase tracking-widest font-semibold ${labelColor}`}>{label}</span>
      <div className="mt-1.5 leading-relaxed">{children}</div>
    </div>
  );
}

/* ─── Endpoint Section ─── */
function EndpointSection({ ep }: { ep: Endpoint }) {
  return (
    <section id={ep.id} className="scroll-mt-24 mt-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <MethodBadge method={ep.method} />
        <code className="text-sm font-mono text-navy-200">{ep.path}</code>
        <TierBadge tier={ep.tier} />
      </div>
      <h3 className="text-lg font-semibold text-navy-100 mb-3">{ep.title}</h3>
      <p className="text-sm text-navy-400 leading-relaxed mb-6">{ep.description}</p>

      {/* Parameters */}
      {ep.params.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Parameters</div>
          <div className="border border-navy-700/40 rounded-lg overflow-hidden divide-y divide-navy-800/40">
            {ep.params.map((p) => (
              <div key={p.name} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <div className="flex items-center gap-2 shrink-0 sm:min-w-[140px]">
                  <code className="text-[12.5px] font-mono text-accent-cyan">{p.name}</code>
                  <span className="text-[10px] font-mono text-navy-600">{p.type}</span>
                  {p.required && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-accent-rose">required</span>
                  )}
                </div>
                <span className="text-xs text-navy-400 leading-relaxed">
                  {p.description}
                  {p.default && (
                    <span className="text-navy-600 ml-1">Default: <code className="text-navy-500 font-mono">{p.default}</code></span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Example */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Example Request</div>
        <TabbedCode examples={ep.examples} />
      </div>

      {/* Response */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Example Response</div>
        <CodeBlock code={ep.response} language="json" />
      </div>
    </section>
  );
}

/* ─── On This Page (Right Sidebar) ─── */
function OnThisPage({ activeId }: { activeId: string }) {
  const allItems = [
    { id: "introduction", label: "Introduction", depth: 0 },
    { id: "authentication", label: "Authentication", depth: 0 },
    { id: "base-url", label: "Base URL", depth: 0 },
    { id: "response-format", label: "Response Format", depth: 0 },
    { id: "rate-limits", label: "Rate Limits", depth: 0 },
    { id: "error-handling", label: "Error Handling", depth: 0 },
    { id: "get-signals", label: "List Signals", depth: 0 },
    { id: "get-predictions", label: "List Predictions", depth: 0 },
    { id: "get-theses", label: "List Theses", depth: 0 },
    { id: "get-quote", label: "Market Quote", depth: 0 },
    { id: "get-news", label: "News Feed", depth: 0 },
  ];

  return (
    <nav className="space-y-1">
      <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">On This Page</div>
      {allItems.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block text-[12px] py-0.5 transition-colors ${
            item.depth > 0 ? "pl-3" : ""
          } ${
            activeId === item.id
              ? "text-accent-cyan font-medium"
              : "text-navy-500 hover:text-navy-300"
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

/* ─── Left Sidebar Navigation ─── */
function SidebarNav({ activeId }: { activeId: string }) {
  return (
    <nav className="space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-2">
            <section.icon className="w-3.5 h-3.5 text-navy-500" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500 font-semibold">
              {section.title}
            </span>
          </div>
          <div className="space-y-0.5 ml-5">
            {section.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block text-[12.5px] py-1 transition-colors border-l ${
                  activeId === item.id
                    ? "text-accent-cyan border-accent-cyan pl-3 font-medium"
                    : "text-navy-400 border-transparent hover:text-navy-200 hover:border-navy-600 pl-3"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ─── Main Page ─── */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll spy
  useEffect(() => {
    const ids = [
      "introduction", "authentication", "base-url", "response-format",
      "rate-limits", "error-handling",
      ...ENDPOINTS.map((e) => e.id),
    ];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the one closest to top
          const sorted = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveSection(sorted[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <main className="min-h-screen pt-14">
      <div className="max-w-[1400px] mx-auto flex">
        {/* ── Left Sidebar ── */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-navy-700/30 px-5 py-8">
          <SidebarNav activeId={activeSection} />
          <div className="mt-8 pt-6 border-t border-navy-800/50">
            <Link
              href="/settings?tab=platform-api"
              className="flex items-center gap-2 text-[11px] font-mono text-navy-100 hover:text-accent-cyan transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              Generate API Key
            </Link>
          </div>
        </aside>

        {/* ── Mobile Nav Toggle ── */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 p-3 rounded-full bg-navy-800 border border-navy-700/50 text-navy-300 shadow-lg"
        >
          <BookOpen className="w-5 h-5" />
        </button>

        {/* ── Mobile Nav Overlay ── */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-navy-950/90 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
            <div
              className="absolute left-0 top-14 bottom-0 w-64 bg-navy-900 border-r border-navy-700/40 p-5 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarNav activeId={activeSection} />
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 px-6 lg:px-12 py-8 lg:py-12">
          <div className="max-w-3xl">
            {/* Introduction */}
            <section id="introduction" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
                  API Reference
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-4">
                NEXUS Intelligence API
              </h1>
              <p className="text-base text-navy-400 leading-relaxed mb-6 max-w-2xl">
                Integrate signal intelligence, prediction data, investment theses, and market quotes directly into your systems. The API follows RESTful conventions, returns JSON, and uses Bearer token authentication.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-lg border border-navy-700/40 bg-navy-900/30 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Protocol</div>
                  <div className="text-sm text-navy-200">HTTPS / REST</div>
                </div>
                <div className="rounded-lg border border-navy-700/40 bg-navy-900/30 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Format</div>
                  <div className="text-sm text-navy-200">JSON</div>
                </div>
                <div className="rounded-lg border border-navy-700/40 bg-navy-900/30 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Auth</div>
                  <div className="text-sm text-navy-200">Bearer Token</div>
                </div>
              </div>

              <Note type="info">
                API access requires an active subscription. Generate keys from your{" "}
                <Link href="/settings?tab=platform-api" className="text-accent-cyan hover:underline">
                  account settings
                </Link>. Keys use the <InlineCode>sk-nxs-</InlineCode> prefix.
              </Note>
            </section>

            {/* Authentication */}
            <SectionHeading id="authentication">Authentication</SectionHeading>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              All requests must include your API key in the <InlineCode>Authorization</InlineCode> header using the Bearer scheme. Keys are scoped to your subscription tier and respect the same access controls as the web interface.
            </p>
            <CodeBlock
              code={`curl -H "Authorization: Bearer sk-nxs-your-key-here" \\
  https://nexushq.xyz/api/v1/signals`}
              language="bash"
            />
            <Note type="warning">
              Never expose your API key in client-side code or public repositories. If a key is compromised, revoke it immediately from your settings page and generate a new one.
            </Note>

            {/* Base URL */}
            <SectionHeading id="base-url">Base URL</SectionHeading>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              All endpoints are prefixed with <InlineCode>/api/v1</InlineCode>. Use HTTPS for all requests.
            </p>
            <CodeBlock code="https://nexushq.xyz/api/v1" language="bash" />

            {/* Response Format */}
            <SectionHeading id="response-format">Response Format</SectionHeading>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              Every response wraps data in a consistent envelope. Successful responses include a <InlineCode>data</InlineCode> object and an optional <InlineCode>meta</InlineCode> object with rate limit info. Errors return a structured <InlineCode>error</InlineCode> object.
            </p>

            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Success Response</div>
                <CodeBlock
                  code={`{
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-09T12:00:00Z",
    "tier": "analyst",
    "rateLimit": {
      "remaining": 29,
      "resetAt": "2026-03-09T12:01:00Z"
    }
  }
}`}
                  language="json"
                />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-2">Error Response</div>
                <CodeBlock
                  code={`{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded",
    "retryAfter": "2026-03-09T12:01:00Z"
  }
}`}
                  language="json"
                />
              </div>
            </div>

            <SubHeading id="response-headers">Response Headers</SubHeading>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              Rate limit information is included in every response via headers:
            </p>
            <div className="border border-navy-700/40 rounded-lg overflow-hidden divide-y divide-navy-800/40 mb-4">
              {[
                { header: "X-RateLimit-Remaining", desc: "Number of requests remaining in the current window" },
                { header: "X-RateLimit-Reset", desc: "ISO 8601 timestamp when the rate limit window resets" },
                { header: "X-Request-Id", desc: "Unique request identifier for debugging and support" },
              ].map((h) => (
                <div key={h.header} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <code className="text-[12px] font-mono text-accent-cyan shrink-0 sm:min-w-[200px]">{h.header}</code>
                  <span className="text-xs text-navy-400">{h.desc}</span>
                </div>
              ))}
            </div>

            {/* Rate Limits */}
            <SectionHeading id="rate-limits">Rate Limits</SectionHeading>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              Rate limits are enforced per API key and vary by subscription tier. When you exceed a limit, the API returns <InlineCode>429</InlineCode> with a <InlineCode>retryAfter</InlineCode> timestamp.
            </p>
            <div className="border border-navy-700/40 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/40 bg-navy-900/50">
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Tier</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Per Minute</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Per Hour</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Per Day</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_LIMITS.map((r) => (
                    <tr key={r.tier} className="border-b border-navy-800/40 last:border-0">
                      <td className="px-4 py-3 text-navy-200 font-medium">{r.tier}</td>
                      <td className="px-4 py-3 font-mono text-navy-400">{r.perMin}</td>
                      <td className="px-4 py-3 font-mono text-navy-400">{r.perHour}</td>
                      <td className="px-4 py-3 font-mono text-navy-400">{r.perDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error Handling */}
            <SectionHeading id="error-handling">Error Handling</SectionHeading>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              The API uses standard HTTP status codes. All error responses include a machine-readable <InlineCode>code</InlineCode> and a human-readable <InlineCode>message</InlineCode>.
            </p>
            <div className="border border-navy-700/40 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/40 bg-navy-900/50">
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Code</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-navy-500">Description</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {ERROR_CODES.map((e) => (
                    <tr key={e.code} className="border-b border-navy-800/40 last:border-0">
                      <td className="px-4 py-3 font-mono text-accent-rose">{e.status}</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{e.code}</td>
                      <td className="px-4 py-3 text-navy-400">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-navy-500 mb-3">Error Response Example</div>
              <CodeBlock
                code={`{
  "error": {
    "code": "insufficient_tier",
    "message": "The /v1/theses endpoint requires an Operator tier subscription or higher"
  }
}`}
                language="json"
              />
            </div>

            {/* ── Endpoint Sections ── */}
            <div className="mt-16 mb-8 flex items-center gap-3">
              <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
                Endpoints
              </span>
              <div className="h-px flex-1 bg-navy-800/50" />
            </div>

            {ENDPOINTS.map((ep) => (
              <EndpointSection key={ep.id} ep={ep} />
            ))}

            {/* ── CTA ── */}
            <section className="mt-20 mb-8 border border-navy-700/40 rounded-lg bg-navy-900/30 p-8 text-center">
              <h3 className="text-lg font-semibold text-navy-100 mb-2">Ready to integrate?</h3>
              <p className="text-sm text-navy-400 mb-6">
                Generate your API key and start pulling intelligence data in minutes.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/settings?tab=platform-api"
                  className="inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-white bg-accent-cyan rounded-lg hover:bg-accent-cyan/90 transition-all font-semibold"
                >
                  <Key className="w-3.5 h-3.5" />
                  Generate API Key
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest text-navy-200 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
                >
                  Create Account
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </section>
          </div>
        </div>

        {/* ── Right Sidebar: On This Page ── */}
        <aside className="hidden xl:block w-48 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-8">
          <OnThisPage activeId={activeSection} />
        </aside>
      </div>
    </main>
  );
}
