"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./nova-top-bar.css";
import MobileGlobalNavigation from "./MobileGlobalNavigation";

type Props = {
  statusText?: string;
};

export default function NovaTopBar({ statusText = "AI 시스템 준비" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileReportOrigin, setMobileReportOrigin] = useState(false);

  useEffect(() => {
    try {
      const cameFromMobile = sessionStorage.getItem("nova-mobile-report-origin") === "1";
      setMobileReportOrigin(pathname === "/report" && cameFromMobile);
      if (pathname !== "/report" && cameFromMobile) {
        sessionStorage.removeItem("nova-mobile-report-origin");
      }
    } catch {
      setMobileReportOrigin(false);
    }
  }, [pathname]);

  const isMobileDashboard = pathname === "/mobile/dashboard" || pathname === "/mobile";
  const isMobilePage = (pathname?.startsWith("/mobile/") ?? false) || mobileReportOrigin;
  const isDesktopContent = !isMobilePage;

  const goBack = () => {
    if (mobileReportOrigin) {
      try {
        sessionStorage.removeItem("nova-mobile-report-origin");
      } catch {}
    }
    router.replace(isMobilePage ? "/mobile" : "/dashboard");
  };

  return (
    <header
      className={`nova-top-bar${isMobileDashboard ? " is-mobile-dashboard" : ""}${isMobilePage && !isMobileDashboard ? " is-mobile-content" : ""}${isDesktopContent ? " is-desktop-content" : ""}`}
    >
      {!isMobileDashboard && (
        <button className="nova-top-back" type="button" aria-label="뒤로가기" onClick={goBack}>
          ←
        </button>
      )}

      {isMobileDashboard && <MobileGlobalNavigation />}

      <button
        className="nova-top-brand"
        type="button"
        aria-label="NOVA 홈"
        onClick={() => router.push(isMobilePage ? "/mobile" : "/dashboard")}
      >
        <strong>NOVA</strong>
        <span>AI SPORTS PERFORMANCE PLATFORM</span>
      </button>

      <div className="nova-top-status">
        <span className="nova-top-status-dot" />
        <span>{statusText}</span>
      </div>
    </header>
  );
}


