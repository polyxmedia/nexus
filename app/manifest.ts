import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXUS Intelligence",
    short_name: "NEXUS",
    description:
      "Geopolitical-market convergence intelligence platform. Multi-layer signal detection, AI-driven synthesis, and outcome-tracked predictions.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#06b6d4",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/nexuslogo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
