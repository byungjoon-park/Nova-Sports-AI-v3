"use client";

import { useEffect } from "react";

export default function MobileReportPage() {
  useEffect(() => {
    try {
      sessionStorage.setItem("nova-mobile-report-origin", "1");
    } catch {}
    window.location.replace("/report");
  }, []);

  return (
    <main className="mobile-page" role="status" aria-live="polite">
      리포트를 여는 중입니다.
    </main>
  );
}
