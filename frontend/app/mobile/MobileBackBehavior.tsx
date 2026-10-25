"use client";

import { useEffect } from "react";

export default function MobileBackBehavior() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>(
        ".mobile-desktop-header-left > a, .mobile-desktop-header-left > button",
      );
      if (!control) return;

      event.preventDefault();
      event.stopPropagation();
      if (window.history.length > 1) window.history.back();
      else window.location.assign("/mobile/dashboard");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
