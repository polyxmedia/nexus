const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

/** Organization schema — injected in root layout */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NEXUS Intelligence",
    url: SITE_URL,
    logo: `${SITE_URL}/nexuslogo.png`,
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
    sameAs: ["https://polyxmedia.com"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** SoftwareApplication schema — for the platform itself */
export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NEXUS Intelligence Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Five-layer geopolitical signal detection platform with AI-driven convergence analysis, intelligence synthesis, and real-time market monitoring for analysts and institutional traders.",
    offers: [
      {
        "@type": "Offer",
        name: "Analyst",
        price: "49",
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          billingIncrement: 1,
          unitCode: "MON",
        },
      },
      {
        "@type": "Offer",
        name: "Operator",
        price: "149",
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          billingIncrement: 1,
          unitCode: "MON",
        },
      },
    ],
    creator: {
      "@type": "Organization",
      name: "Polyxmedia",
      url: "https://polyxmedia.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** WebSite schema with SearchAction — enables sitelinks search box in Google */
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** BreadcrumbList schema — use on research/about pages */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
