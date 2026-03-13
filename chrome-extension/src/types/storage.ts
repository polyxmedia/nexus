export interface NexusConfig {
  apiKey: string;
  baseUrl: string;
  pollingInterval: number; // minutes
  notifications: boolean;
  tickerDetection: boolean;
}

export const DEFAULT_CONFIG: NexusConfig = {
  apiKey: "",
  baseUrl: "https://nexushq.xyz",
  pollingInterval: 5,
  notifications: true,
  tickerDetection: false,
};
