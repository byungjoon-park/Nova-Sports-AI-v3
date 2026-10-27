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
      window.location.assign(pathname.startsWith("/mobile") ? "/mobile" : "/dashboard");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  return null;
}
