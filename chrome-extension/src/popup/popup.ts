import { getConfig } from "../lib/storage";
import { $ } from "../lib/dom";
import type { Signal, Prediction } from "../types/api";

async function init() {
  const config = await getConfig();
  const loading = $("#loading")!;
  const notConfigured = $("#not-configured")!;
  const cards = $("#cards")!;
  const actions = $("#actions")!;

  if (!config.apiKey) {
    loading.style.display = "none";
    notConfigured.style.display = "block";
    $("#open-options")?.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  try {
    const [signalRes, predRes] = await Promise.allSettled([
      chrome.runtime.sendMessage({ type: "getSignals", limit: 50 }),
      chrome.runtime.sendMessage({ type: "getPredictions", limit: 50 }),
    ]);

    loading.style.display = "none";
    cards.style.display = "flex";
    actions.style.display = "flex";

    // Signals
    if (signalRes.status === "fulfilled" && signalRes.value?.data) {
      const signals: Signal[] = signalRes.value.data;
      const high = signals.filter((s) => s.intensity >= 4).length;
      $("#signal-count")!.textContent = String(signals.length);
      const sub = $("#signal-sub")!;
      if (high > 0) {
        sub.innerHTML = `<span class="high">${high} high intensity</span>`;
      } else {
        sub.textContent = "all normal";
        sub.classList.add("green");
      }
    }

    // Predictions
    if (predRes.status === "fulfilled" && predRes.value?.data) {
      const predictions: Prediction[] = predRes.value.data;
      const pending = predictions.filter((p) => !p.outcome);
      const resolved = predictions.filter((p) => p.outcome);
      const confirmed = resolved.filter((p) => p.outcome === "confirmed").length;

      $("#prediction-count")!.textContent = String(pending.length);
      $("#prediction-sub")!.textContent = `${pending.length} active`;

      // Accuracy
      if (resolved.length > 0) {
        const pct = Math.round((confirmed / resolved.length) * 100);
        $("#accuracy-value")!.textContent = `${pct}%`;
        const accSub = $("#accuracy-sub")!;
        accSub.innerHTML = `<span class="${pct >= 60 ? "green" : "amber"}">${confirmed}/${resolved.length}</span>`;
      } else {
        $("#accuracy-value")!.textContent = "--";
        $("#accuracy-sub")!.textContent = "no data";
      }
    }
  } catch (err) {
    loading.textContent = "Connection failed";
    console.error("[NEXUS Popup]", err);
  }

  // Actions
  $("#open-platform")?.addEventListener("click", () => {
    chrome.tabs.create({ url: config.baseUrl + "/dashboard" });
  });

  $("#open-sidepanel")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  });

  // Click cards to navigate
  $("#signals-card")?.addEventListener("click", () => {
    chrome.tabs.create({ url: config.baseUrl + "/signals" });
  });
  $("#predictions-card")?.addEventListener("click", () => {
    chrome.tabs.create({ url: config.baseUrl + "/predictions" });
  });
}

init();
