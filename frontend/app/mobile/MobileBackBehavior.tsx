"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MobileBackBehavior() {
  const pathname = usePathname();
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>(
        ".mobile-desktop-header-left > a, .mobile-desktop-header-left > button",
      );
      if (!control) return;

      event.preventDefault();
      event.stopPropagation();
      const fallback: Record<string, string> = {
        "/mobile/player-profile": "/mobile/players",
        "/mobile/team": "/mobile/players",
        "/mobile/medical": "/mobile/players",
        "/mobile/rehab": "/mobile/medical",
        "/mobile/report": "/mobile/analysis",
        "/mobile/measurements": "/mobile/growth-analysis",
        "/mobile/growth-analysis": "/mobile/analysis",
        "/mobile/inquiry": "/mobile/team",
      };
      const index = (window.history.state as { idx?: unknown } | null)?.idx;
      if (typeof index === "number" && index > 0) window.history.back();
      else window.location.assign(fallback[pathname] || "/mobile");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  return null;
}
