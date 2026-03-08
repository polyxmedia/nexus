import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "About — NEXUS Intelligence",
  description:
    "NEXUS Intelligence is a geopolitical-market convergence platform built by Polyxmedia. Four primary signal layers, AI-driven synthesis, and outcome-tracked predictions for analysts, traders, and institutions.",
  keywords: [
    "NEXUS Intelligence",
    "geopolitical intelligence platform",
    "Polyxmedia",
    "Andre Figueira",
    "market intelligence",
    "signal convergence platform",
  ],
  openGraph: {
    title: "About — NEXUS Intelligence",
    description:
      "Geopolitical-market convergence intelligence platform. Four signal layers, AI synthesis, outcome-tracked predictions. Built by Polyxmedia.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About — NEXUS Intelligence",
    description:
      "Geopolitical-market convergence intelligence platform. Built by Polyxmedia.",
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "About", url: "/about" },
      ]} />
      {children}
    </>
  );
}
