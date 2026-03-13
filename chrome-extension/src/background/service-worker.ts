import { api } from "../lib/api";
import { getConfig } from "../lib/storage";

const ALARM_NAME = "nexus-poll";

chrome.runtime.onInstalled.addListener(async () => {
  const config = await getConfig();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: config.pollingInterval });
  await refreshBadge();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await refreshBadge();
  }
});

// Listen for manual refresh requests from popup/sidepanel
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "refresh") {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  if (msg.type === "getSignals") {
    api.init().then(() => api.getSignals(msg.limit || 20)).then((data) => sendResponse(data)).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === "getPredictions") {
    api.init().then(() => api.getPredictions(msg.limit || 20)).then((data) => sendResponse(data)).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === "getQuote") {
    api.init().then(() => api.getQuote(msg.symbol)).then((data) => sendResponse(data)).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function refreshBadge() {
  try {
    const ready = await api.init();
    if (!ready) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }

    const result = await api.getSignals(50);
    const signals = result?.data || [];
    const highIntensity = signals.filter((s) => s.intensity >= 4).length;

    if (highIntensity > 0) {
      chrome.action.setBadgeText({ text: String(highIntensity) });
      chrome.action.setBadgeBackgroundColor({ color: "#f43f5e" });
    } else if (signals.length > 0) {
      chrome.action.setBadgeText({ text: String(signals.length) });
      chrome.action.setBadgeBackgroundColor({ color: "#06b6d4" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }

    // Notify on new high-intensity signals
    const config = await getConfig();
    if (config.notifications && highIntensity > 0) {
      const latest = signals.filter((s) => s.intensity >= 4)[0];
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (latest && new Date(latest.createdAt).getTime() > fiveMinAgo) {
        chrome.notifications.create(`signal-${latest.id}`, {
          type: "basic",
          iconUrl: "icons/icon-128.png",
          title: `NEXUS Signal: ${latest.category}`,
          message: latest.title,
          priority: 2,
        });
      }
    }
  } catch (err) {
    console.error("[NEXUS] Badge refresh failed:", err);
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
  }
}
