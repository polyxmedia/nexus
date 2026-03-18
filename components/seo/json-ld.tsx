import { db, schema } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

/** Organization schema -- injected in root layout */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NEXUS Intelligence",
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon`,
    description:
      "Geopolitical-market convergence intelligence platform. Multi-layer signal detection, AI-driven synthesis, and outcome-tracked predictions for analysts, traders, and institutions.",
    foundingDate: "2025",
    founder: {
      "@type": "Person",
      name: "Andre Figueira",
      jobTitle: "Senior Software Architect",
      url: "https://polyxmedia.com",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "86-90 Paul Street",
      addressLocality: "London",
      postalCode: "EC2A 4NE",
      addressCountry: "GB",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@polyxmedia.com",
      contactType: "customer support",
    },
    sameAs: ["https://polyxmedia.com", "https://nexushq.xyz"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** SoftwareApplication schema -- pulls pricing from DB instead of hardcoding */
export async function SoftwareApplicationJsonLd() {
  let offers: Array<Record<string, unknown>> = [];

  try {
    const tiers = await db
      .select({
        name: schema.subscriptionTiers.name,
        price: schema.subscriptionTiers.price,
      })
      .from(schema.subscriptionTiers)
      .orderBy(schema.subscriptionTiers.position);

    offers = tiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      ...(t.price > 0 ? { price: String(t.price), priceCurrency: "USD" } : {}),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        billingIncrement: 1,
        unitCode: "MON",
      },
      ...(t.price === 0 ? { description: "Custom pricing" } : {}),
    }));
  } catch {
    // Fallback: no offers in schema rather than wrong prices
  }

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NEXUS Intelligence Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Five-layer geopolitical signal detection platform with AI-driven convergence analysis, intelligence synthesis, and real-time market monitoring for analysts and institutional traders.",
    ...(offers.length > 0 ? { offers } : {}),
    creator: {
      "@type": "Organization",
      name: "Polyxmedia",
      url: "https://polyxmedia.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

/** WebSite schema with SearchAction -- enables sitelinks search box in Google */
export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NEXUS Intelligence",
    url: SITE_URL,
    description:
      "Integrated geopolitical-market intelligence platform. Four primary signal layers plus narrative overlay, AI-driven synthesis, and outcome-tracked intelligence for analysts and traders.",
    publisher: {
      "@type": "Organization",
      name: "NEXUS Intelligence",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/research/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** Article schema -- use on research pages */
export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    image: `${SITE_URL}/opengraph-image`,
    datePublished: datePublished || new Date().toISOString().split("T")[0],
    dateModified: dateModified || new Date().toISOString().split("T")[0],
    author: {
      "@type": "Organization",
      name: "NEXUS Intelligence",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "NEXUS Intelligence",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/apple-icon`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url.startsWith("http") ? url : `${SITE_URL}${url}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

/** BreadcrumbList schema -- use on research/about pages */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
