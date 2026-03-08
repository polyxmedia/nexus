import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-12 bg-accent-cyan/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/70">
            Company
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-navy-100 mb-4">
          Contact
        </h1>
        <p className="font-sans text-base text-navy-400 leading-relaxed max-w-2xl mb-12">
          Get in touch with the NEXUS team.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-4 h-4 text-navy-500" />
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400">
                General Enquiries
              </h2>
            </div>
            <p className="font-sans text-sm text-navy-300 leading-relaxed mb-4">
              For questions about the platform, partnership opportunities, or
              general enquiries.
            </p>
            <a
              href="mailto:contact@nexushq.xyz"
              className="font-mono text-sm text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              contact@nexushq.xyz
            </a>
          </div>

          <div className="border border-navy-700/40 rounded-lg bg-navy-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-4 h-4 text-navy-500" />
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400">
                Enterprise and Institutional
              </h2>
            </div>
            <p className="font-sans text-sm text-navy-300 leading-relaxed mb-4">
              For institutional access, custom integrations, and enterprise
              pricing discussions.
            </p>
            <a
              href="mailto:enterprise@nexushq.xyz"
              className="font-mono text-sm text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              enterprise@nexushq.xyz
            </a>
          </div>
        </div>

        <div className="mt-8 border border-navy-700/40 rounded-lg bg-navy-900/40 p-6">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy-400 mb-3">
            Response Times
          </h2>
          <p className="font-sans text-sm text-navy-400 leading-relaxed">
            We aim to respond to all enquiries within 48 hours. For urgent
            security-related matters, please include "URGENT" in the subject
            line.
          </p>
        </div>
      </div>
    </main>
  );
}
