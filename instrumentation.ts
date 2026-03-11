// Next.js instrumentation hook - runs once on server startup
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from "@sentry/nextjs";

function validateEnv() {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "ANTHROPIC_API_KEY",
    "STRIPE_SECRET_KEY",
  ];

  const recommended = [
    "STRIPE_WEBHOOK_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RESEND_API_KEY",
    "SETTINGS_ENCRYPTION_KEY",
    "CRON_SECRET",
    "VOYAGE_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Server cannot start safely.`
    );
  }

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Missing recommended environment variables: ${missingRecommended.join(", ")}. Some features will be degraded.`
    );
  }

  if (
    process.env.NEXTAUTH_SECRET === "nexus-dev-secret-change-in-production" &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error(
      "NEXTAUTH_SECRET is still set to the development default. Generate a secure secret for production."
    );
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateEnv();
    await import("./sentry.server.config");
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
