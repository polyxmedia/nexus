"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <button
        onClick={() => {
          Sentry.startSpan({ name: "Example Frontend Span", op: "test" }, () => {
            throw new Error("Sentry Frontend Test Error");
          });
        }}
        className="px-6 py-3 rounded bg-accent-rose/20 border border-accent-rose/40 text-accent-rose font-mono text-sm hover:bg-accent-rose/30 transition-colors"
      >
        Throw test error
      </button>
    </div>
  );
}
