"use client";

import "./mobile.css";
import "./mobile-navigation-brand-fix.css";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "../../lib/nova-auth";

export default function MobileLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) return;

    try {
      sessionStorage.setItem("nova-mobile-login-complete", "1");
      localStorage.setItem("nova-active-role", current.role);
      localStorage.setItem("nova-login-role", current.role);
      localStorage.setItem("nova-role", current.role);
    } catch {}

    if (pathname === "/mobile/login" || pathname === "/mobile/signup") {
      router.replace(current.role === "admin" ? "/admin" : "/mobile");
    }
  }, [pathname, router]);

  return <main className="nova-mobile-shell">{children}</main>;
}
