import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOVA SPORTS AI",
    short_name: "NOVA SPORTS",
    description: "NOVA SPORTS AI 모바일 베타",
    start_url: "/mobile",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
