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
          "/llms.txt",
          "/llms-full.txt",
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
      // AI crawlers — allow full access to public content
      {
        userAgent: "GPTBot",
        allow: [
          "/",
          "/about",
          "/research/",
          "/docs",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: ["/api/", "/dashboard", "/chat", "/admin", "/login", "/register"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/about", "/research/", "/docs", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/dashboard", "/chat", "/admin", "/login", "/register"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/about", "/research/", "/docs", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/dashboard", "/chat", "/admin", "/login", "/register"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/about", "/research/", "/docs", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/dashboard", "/chat", "/admin", "/login", "/register"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/about", "/research/", "/docs", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/dashboard", "/chat", "/admin", "/login", "/register"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
