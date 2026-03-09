import { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "NEXUS Intelligence API documentation. Integrate signal detection, convergence data, and intelligence outputs into your own systems.",
  openGraph: {
    title: "NEXUS Intelligence API Docs",
    description: "Integrate NEXUS signal detection and convergence data into your systems.",
  },
  alternates: { canonical: "/docs" },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
