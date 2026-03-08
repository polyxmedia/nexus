import { Metadata } from "next";
import { Shield, Lock, Eye, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "Security",
  description: "NEXUS Intelligence security practices. AES-256 encryption, rate limiting, authentication controls, and responsible disclosure policy.",
  openGraph: { title: "Security — NEXUS Intelligence", description: "How NEXUS protects user data, API keys, and platform infrastructure." },
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
            Infrastructure
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-4">
          Security
        </h1>
        <p className="font-sans text-base text-navy-400 leading-relaxed max-w-2xl mb-12">
          How we protect your data and secure the platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            {
              icon: Lock,
              title: "Encryption",
              body: "All data encrypted at rest and in transit. TLS 1.3 for all connections. Passwords hashed with bcrypt. API keys stored with AES-256 encryption.",
            },
            {
              icon: Shield,
              title: "Authentication",
              body: "Secure session management with CSRF protection. Credential-based authentication with rate limiting on login attempts.",
            },
            {
              icon: Server,
              title: "Infrastructure",
              body: "Hosted on secured cloud infrastructure with automated backups. Database connections encrypted. Network-level isolation between services.",
            },
            {
              icon: Eye,
              title: "Data Access",
              body: "Principle of least privilege across all systems. No employee access to user trading credentials. Audit logging on sensitive operations.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className="w-4 h-4 text-navy-500" />
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200">
                    {item.title}
                  </h2>
                </div>
                <p className="font-sans text-sm text-navy-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-6">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-200 mb-3">
            Responsible Disclosure
          </h2>
          <p className="font-sans text-sm text-navy-400 leading-relaxed mb-3">
            If you discover a security vulnerability, please report it
            responsibly. Do not publicly disclose the issue until we have had
            an opportunity to address it.
          </p>
          <p className="font-sans text-sm text-navy-400 leading-relaxed">
            Report vulnerabilities to{" "}
            <a
              href="mailto:security@nexushq.xyz"
              className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              security@nexushq.xyz
            </a>
            . Include a detailed description of the vulnerability and steps
            to reproduce. We aim to acknowledge reports within 24 hours and
            provide resolution timelines within 72 hours.
          </p>
        </div>
      </div>
    </main>
  );
}
