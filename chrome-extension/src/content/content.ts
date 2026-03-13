import { getConfig } from "../lib/storage";

const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT", "SELECT", "NOSCRIPT"]);

let tooltipHost: HTMLDivElement | null = null;
let tooltipShadow: ShadowRoot | null = null;
let activeTooltip: HTMLDivElement | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const quoteCache = new Map<string, { data: unknown; ts: number }>();

async function init() {
  const config = await getConfig();
  if (!config.tickerDetection || !config.apiKey) return;

  // Create shadow host for tooltips
  tooltipHost = document.createElement("div");
  tooltipHost.id = "nexus-ext-tooltip-host";
  document.body.appendChild(tooltipHost);
  tooltipShadow = tooltipHost.attachShadow({ mode: "closed" });

  // Inject tooltip styles into shadow DOM
  const style = document.createElement("style");
  style.textContent = TOOLTIP_CSS;
  tooltipShadow.appendChild(style);

  scanPage();
}

function scanPage() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest(".nexus-ticker")) return NodeFilter.FILTER_REJECT;
      if (!TICKER_REGEX.test(node.textContent || "")) return NodeFilter.FILTER_REJECT;
      TICKER_REGEX.lastIndex = 0;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    textNodes.push(current as Text);
  }

  for (const node of textNodes) {
    wrapTickers(node);
  }
}

function wrapTickers(textNode: Text) {
  const text = textNode.textContent || "";
  TICKER_REGEX.lastIndex = 0;
  const matches = [...text.matchAll(TICKER_REGEX)];
  if (matches.length === 0) return;

  const frag = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of matches) {
    const symbol = match[1];
    const start = match.index!;

    if (start > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    const span = document.createElement("span");
    span.className = "nexus-ticker";
    span.dataset.symbol = symbol;
    span.textContent = match[0];
    span.style.borderBottom = "1px dotted #06b6d4";
    span.style.cursor = "pointer";

    span.addEventListener("mouseenter", (e) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => showTooltip(symbol, e), 300);
    });

    span.addEventListener("mouseleave", () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(hideTooltip, 500);
    });

    frag.appendChild(span);
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode?.replaceChild(frag, textNode);
}

async function showTooltip(symbol: string, event: MouseEvent) {
  hideTooltip();
  if (!tooltipShadow) return;

  const tooltip = document.createElement("div");
  tooltip.className = "nexus-tooltip";
  tooltip.innerHTML = `<div class="tt-loading">Loading ${symbol}...</div>`;

  // Position near the element
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  tooltip.style.position = "fixed";
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 6}px`;
  tooltip.style.zIndex = "2147483647";

  tooltip.addEventListener("mouseenter", () => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });
  tooltip.addEventListener("mouseleave", () => {
    debounceTimer = setTimeout(hideTooltip, 300);
  });

  tooltipShadow.appendChild(tooltip);
  activeTooltip = tooltip;

  // Fetch quote
  try {
    const cached = quoteCache.get(symbol);
    let data: { data?: { price?: number; change?: number; changePercent?: number } };

    if (cached && Date.now() - cached.ts < 30_000) {
      data = cached.data as typeof data;
    } else {
      data = await chrome.runtime.sendMessage({ type: "getQuote", symbol });
      quoteCache.set(symbol, { data, ts: Date.now() });
    }

    if (!activeTooltip || activeTooltip !== tooltip) return;

    const q = data?.data;
    if (q?.price != null) {
      const isUp = (q.change || 0) >= 0;
      tooltip.innerHTML = `
        <div class="tt-symbol">${symbol}</div>
        <div class="tt-price">$${q.price.toFixed(2)}</div>
        <div class="tt-change ${isUp ? "up" : "down"}">
          ${isUp ? "+" : ""}${(q.change || 0).toFixed(2)} (${isUp ? "+" : ""}${(q.changePercent || 0).toFixed(2)}%)
        </div>
        <div class="tt-link">View in NEXUS</div>
      `;

      tooltip.querySelector(".tt-link")?.addEventListener("click", async () => {
        const config = await getConfig();
        chrome.runtime.sendMessage({ type: "openTab", url: `${config.baseUrl}/signals?symbol=${symbol}` });
      });
    } else {
      tooltip.innerHTML = `<div class="tt-symbol">${symbol}</div><div class="tt-error">No data</div>`;
    }
  } catch {
    if (activeTooltip === tooltip) {
      tooltip.innerHTML = `<div class="tt-symbol">${symbol}</div><div class="tt-error">Failed to load</div>`;
    }
  }
}

function hideTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

const TOOLTIP_CSS = `
  .nexus-tooltip {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    padding: 10px 12px;
    font-family: 'IBM Plex Mono', monospace;
    min-width: 160px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  .tt-loading { font-size: 10px; color: #6b7280; }
  .tt-symbol { font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px; }
  .tt-price { font-size: 16px; font-weight: 600; color: #e0e0e0; }
  .tt-change { font-size: 11px; margin-top: 2px; }
  .tt-change.up { color: #10b981; }
  .tt-change.down { color: #f43f5e; }
  .tt-error { font-size: 10px; color: #6b7280; }
  .tt-link { font-size: 9px; color: #06b6d4; margin-top: 6px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.1em; }
  .tt-link:hover { text-decoration: underline; }
`;

init();
