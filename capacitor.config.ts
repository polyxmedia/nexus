import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.intel',
  appName: 'NEXUS',
  // Point at your running server instead of bundling static files.
  // Change this to your production URL when ready.
  server: {
    url: 'http://localhost:3000',
    cleartext: true, // allows HTTP for local dev
  },
  ios: {
    scheme: 'NEXUS',
    contentInset: 'automatic',
  },
};

export default config;
