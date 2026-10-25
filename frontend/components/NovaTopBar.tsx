"use client";

import { usePathname, useRouter } from "next/navigation";
import "./nova-top-bar.css";
import MobileGlobalNavigation from "./MobileGlobalNavigation";

type Props = {
  statusText?: string;
};

export default function NovaTopBar({ statusText = "AI 시스템 준비" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobileDashboard = pathname === "/mobile/dashboard";
  const isMobilePage = pathname?.startsWith("/mobile/") ?? false;
  const isDesktopContent = !isMobilePage;

  const goBack = () => {
    if (isMobilePage) {
      window.location.replace("/mobile");
      return;
    }
    if (window.history.length > 1) window.history.back();
    else router.push("/dashboard");
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
        onClick={() => router.push(isMobilePage ? "/mobile/dashboard" : "/dashboard")}
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
