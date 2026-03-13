import { getConfig } from "../lib/storage";
import { el, $ } from "../lib/dom";
import { INTENSITY_COLORS } from "../lib/theme";
import type { Signal, Prediction } from "../types/api";

let baseUrl = "";

async function init() {
  const config = await getConfig();
  baseUrl = config.baseUrl;

  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      const target = (tab as HTMLElement).dataset.tab;
      $(`#tab-${target}`)?.classList.add("active");
    });
  });

  if (!config.apiKey) {
    $("#empty")!.style.display = "flex";
    return;
  }

  await loadData();
}

async function loadData() {
  const [signalRes, predRes] = await Promise.allSettled([
    chrome.runtime.sendMessage({ type: "getSignals", limit: 30 }),
    chrome.runtime.sendMessage({ type: "getPredictions", limit: 30 }),
  ]);

  if (signalRes.status === "fulfilled" && signalRes.value?.data) {
    renderSignals(signalRes.value.data);
  }

  if (predRes.status === "fulfilled" && predRes.value?.data) {
    renderPredictions(predRes.value.data);
  }
}

function renderSignals(signals: Signal[]) {
  const list = $("#signal-list")!;
  list.innerHTML = "";

  if (signals.length === 0) {
    list.appendChild(el("div", { className: "empty" }, el("p", {}, "No active signals")));
    return;
  }

  for (const s of signals) {
    const item = el("div", { className: "list-item" },
      el("div", { className: "list-item-header" },
        (() => {
          const dot = el("span", { className: "intensity-dot" });
          dot.style.backgroundColor = INTENSITY_COLORS[s.intensity] || "#6b7280";
          return dot;
        })(),
        el("span", { className: "category-badge" }, s.category),
      ),
      el("div", { className: "list-item-title" }, s.title),
      el("div", { className: "list-item-meta" },
        `${s.intensity}/5 intensity · ${new Date(s.createdAt).toLocaleDateString()}`
      ),
    );

    item.addEventListener("click", () => {
      chrome.tabs.create({ url: `${baseUrl}/signals/${s.id}` });
    });

    list.appendChild(item);
  }
}

function renderPredictions(predictions: Prediction[]) {
  const list = $("#prediction-list")!;
  list.innerHTML = "";

  const pending = predictions.filter((p) => !p.outcome);
  const display = pending.length > 0 ? pending : predictions.slice(0, 10);

  if (display.length === 0) {
    list.appendChild(el("div", { className: "empty" }, el("p", {}, "No predictions")));
    return;
  }

  for (const p of display) {
    const confBar = el("span", { className: "confidence-bar" },
      (() => {
        const fill = el("span", { className: "confidence-fill" });
        fill.style.width = `${Math.round(p.confidence * 100)}%`;
        return fill;
      })(),
    );

    const meta = el("div", { className: "list-item-meta" },
      `${Math.round(p.confidence * 100)}%`,
      confBar,
    );

    if (p.direction) {
      const dir = p.direction.toLowerCase();
      const badge = el("span", {
        className: `direction-badge ${dir === "bullish" ? "bullish" : dir === "bearish" ? "bearish" : ""}`,
      }, dir);
      meta.prepend(badge, document.createTextNode(" · "));
    }

    if (p.deadline) {
      meta.append(document.createTextNode(` · ${new Date(p.deadline).toLocaleDateString()}`));
    }

    const item = el("div", { className: "list-item" },
      el("div", { className: "list-item-title" }, p.title),
      meta,
    );

    item.addEventListener("click", () => {
      chrome.tabs.create({ url: `${baseUrl}/predictions/${p.uuid}` });
    });

    list.appendChild(item);
  }
}

init();
