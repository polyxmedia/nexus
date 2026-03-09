import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "NEXUS Intelligence privacy policy. How we collect, use, and protect your data.",
  robots: { index: true, follow: false },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-10">
          Last updated: March 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              1. Information We Collect
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed mb-3">
              We collect information you provide directly when creating an
              account: username, email address, and encrypted password. We do
              not collect unnecessary personal information.
            </p>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              We automatically collect usage data including pages visited,
              features used, and interaction patterns. This data is used solely
              to improve the Service and is not shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              2. How We Use Your Information
            </h2>
            <ul className="space-y-2">
              {[
                "Providing and maintaining the Service",
                "Processing subscription payments through Stripe",
                "Sending critical service notifications",
                "Improving platform functionality and user experience",
                "Detecting and preventing fraudulent activity",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 font-sans text-sm text-navy-400"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy-600" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              3. Data Storage and Security
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              Your data is stored on secured servers with encryption at rest
              and in transit. Passwords are hashed using industry-standard
              algorithms. We do not store payment card details; all payment
              processing is handled by Stripe.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              4. Third-Party Services
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              We use the following third-party services that may process your
              data: Stripe for payment processing, and Anthropic for AI
              analysis features. Each service operates under its own privacy
              policy. We do not sell your personal data to any third party.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              5. Trading Data
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              If you connect trading accounts (Trading 212, Coinbase), your
              API keys are stored encrypted. We access only the permissions
              you grant. Trading activity data is processed locally within
              the platform and is not shared externally.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              6. Data Retention
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              We retain your account data for as long as your account is
              active. Upon account deletion, personal data is removed within
              30 days. Anonymised usage analytics may be retained
              indefinitely for service improvement.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              7. Your Rights
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              You have the right to access, correct, or delete your personal
              data at any time. You may request a full export of your data or
              request account deletion by contacting us at
              hello@nexushq.xyz.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
              8. Changes to This Policy
            </h2>
            <p className="font-sans text-sm text-navy-400 leading-relaxed">
              We will notify you of significant changes to this policy via
              email or platform notification. Continued use of the Service
              after changes constitutes acceptance.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
