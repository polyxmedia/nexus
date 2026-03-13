import { NexusConfig, DEFAULT_CONFIG } from "../types/storage";

export async function getConfig(): Promise<NexusConfig> {
  const result = await chrome.storage.sync.get("nexusConfig");
  return { ...DEFAULT_CONFIG, ...result.nexusConfig };
}

export async function setConfig(config: Partial<NexusConfig>): Promise<void> {
  const current = await getConfig();
  await chrome.storage.sync.set({ nexusConfig: { ...current, ...config } });
}

export async function getCached<T>(key: string): Promise<{ data: T; fetchedAt: number } | null> {
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

export async function setCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
  await chrome.storage.local.set({
    [key]: { data, fetchedAt: Date.now(), expiresAt: Date.now() + ttlMs },
  });
}
