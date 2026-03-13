"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-6 rounded-full border border-navy-700 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-navy-500" />
        </div>
        <h1 className="font-mono text-sm uppercase tracking-wider text-navy-300 mb-3">
          Offline
        </h1>
        <p className="font-sans text-[13px] text-navy-500 leading-relaxed mb-8">
          NEXUS requires a network connection to deliver real-time intelligence. Check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white px-6 py-2.5 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
