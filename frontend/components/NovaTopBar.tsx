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
      const fallback: Record<string, string> = {
        "/mobile/player-profile": "/mobile/players",
        "/mobile/players": "/mobile",
        "/mobile/analysis": "/mobile",
        "/mobile/growth-analysis": "/mobile/analysis",
        "/mobile/measurements": "/mobile/growth-analysis",
        "/mobile/medical": "/mobile/players",
        "/mobile/report": "/mobile/analysis",
        "/mobile/team": "/mobile/players",
        "/mobile/inquiry": "/mobile/team",
        "/mobile/feedback": "/mobile",
        "/mobile/rehab": "/mobile/medical",
        "/mobile/training": "/mobile/team",
      };
      const index = (window.history.state as { idx?: unknown } | null)?.idx;
      if (typeof index === "number" && index > 0) router.back();
      else router.replace(fallback[pathname] || "/mobile");
      return;
    }
    const index = (window.history.state as { idx?: unknown } | null)?.idx;
    if (typeof index === "number" && index > 0) router.back();
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
