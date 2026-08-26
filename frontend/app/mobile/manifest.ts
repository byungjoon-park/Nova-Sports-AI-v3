import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOVA Sports AI Mobile Beta",
    short_name: "NOVA Sports",
    description: "NOVA Sports AI 모바일 베타",
    start_url: "/mobile",
    display: "standalone",
    background_color: "#f4efe3",
    theme_color: "#f4efe3",
    icons: [],
  };
}
