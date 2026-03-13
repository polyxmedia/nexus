import { getConfig, setConfig } from "../lib/storage";
import { api } from "../lib/api";
import { $ } from "../lib/dom";

async function init() {
  const config = await getConfig();

  const apiKeyInput = $("#api-key") as HTMLInputElement;
  const baseUrlInput = $("#base-url") as HTMLInputElement;
  const pollSelect = $("#poll-interval") as HTMLSelectElement;
  const notifCheck = $("#notifications") as HTMLInputElement;
  const tickerCheck = $("#ticker-detection") as HTMLInputElement;

  // Populate
  apiKeyInput.value = config.apiKey;
  baseUrlInput.value = config.baseUrl;
  pollSelect.value = String(config.pollingInterval);
  notifCheck.checked = config.notifications;
  tickerCheck.checked = config.tickerDetection;

  // Toggle key visibility
  $("#toggle-key")?.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    ($("#toggle-key") as HTMLButtonElement).textContent = isPassword ? "hide" : "eye";
  });

  // Save
  $("#save-btn")?.addEventListener("click", async () => {
    await setConfig({
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim().replace(/\/$/, ""),
      pollingInterval: parseInt(pollSelect.value),
      notifications: notifCheck.checked,
      tickerDetection: tickerCheck.checked,
    });

    // Update alarm interval
    chrome.alarms.clear("nexus-poll");
    chrome.alarms.create("nexus-poll", { periodInMinutes: parseInt(pollSelect.value) });

    showStatus("Settings saved", "success");
  });

  // Test
  $("#test-btn")?.addEventListener("click", async () => {
    const btn = $("#test-btn") as HTMLButtonElement;
    btn.textContent = "Testing...";
    btn.disabled = true;

    // Temporarily apply unsaved values for the test
    await setConfig({
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim().replace(/\/$/, ""),
    });

    const result = await api.testConnection();
    btn.textContent = "Test Connection";
    btn.disabled = false;

    if (result.ok) {
      showStatus("Connected successfully", "success");
    } else {
      showStatus(result.error || "Connection failed", "error");
    }
  });
}

function showStatus(msg: string, type: "success" | "error") {
  const el = $("#status")!;
  el.textContent = msg;
  el.className = `status ${type}`;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4000);
}

init();
