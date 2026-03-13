import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXUS Intelligence",
    short_name: "NEXUS",
    description:
      "Geopolitical-market convergence intelligence platform. Multi-layer signal detection, AI-driven synthesis, and outcome-tracked predictions.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#06b6d4",
    orientation: "any",
    categories: ["finance", "news", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
