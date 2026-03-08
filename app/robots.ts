import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/contact",
          "/careers",
          "/research/",
          "/docs",
          "/privacy",
          "/terms",
          "/cookies",
          "/security",
          "/status",
        ],
        disallow: [
          "/api/",
          "/dashboard",
          "/chat",
          "/warroom",
          "/signals",
          "/predictions",
          "/trading",
          "/news",
          "/knowledge",
          "/timeline",
          "/calendar",
          "/alerts",
          "/thesis",
          "/graph",
          "/settings",
          "/admin",
          "/login",
          "/register",
          "/research/whitepapers",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
