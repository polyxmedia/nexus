export default function CookiesPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
            Legal
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-2">
          Cookie Policy
        </h1>
        <p className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-10">
          Last updated: March 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              What Cookies We Use
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-4">
              NEXUS uses a minimal set of cookies strictly necessary for
              platform operation. We do not use advertising or tracking
              cookies.
            </p>

            <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 overflow-hidden">
              {[
                {
                  name: "next-auth.session-token",
                  purpose: "Authentication session management",
                  type: "Essential",
                  duration: "Session",
                },
                {
                  name: "next-auth.csrf-token",
                  purpose: "Cross-site request forgery protection",
                  type: "Essential",
                  duration: "Session",
                },
                {
                  name: "next-auth.callback-url",
                  purpose: "Redirect after authentication",
                  type: "Essential",
                  duration: "Session",
                },
                {
                  name: "__stripe_mid",
                  purpose: "Stripe payment fraud prevention",
                  type: "Essential",
                  duration: "1 year",
                },
              ].map((cookie, i, arr) => (
                <div
                  key={cookie.name}
                  className={`grid grid-cols-12 gap-4 px-5 py-3.5 ${
                    i < arr.length - 1 ? "border-b border-navy-700/20" : ""
                  }`}
                >
                  <div className="col-span-4">
                    <code className="font-mono text-[11px] text-navy-200">
                      {cookie.name}
                    </code>
                  </div>
                  <div className="col-span-4 font-sans text-[11px] text-navy-400">
                    {cookie.purpose}
                  </div>
                  <div className="col-span-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent-emerald">
                      {cookie.type}
                    </span>
                  </div>
                  <div className="col-span-2 font-mono text-[10px] text-navy-500">
                    {cookie.duration}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              No Third-Party Tracking
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              We do not use Google Analytics, Facebook Pixel, or any other
              third-party tracking service. We do not serve ads. We do not
              sell cookie data. Your browsing activity on NEXUS stays on
              NEXUS.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              Managing Cookies
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              You can configure your browser to reject cookies, but this may
              prevent you from using the platform as authentication requires
              session cookies. All cookies used by NEXUS are strictly
              necessary for platform operation.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
