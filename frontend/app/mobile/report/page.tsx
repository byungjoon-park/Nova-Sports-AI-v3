"use client";

import DesktopPage from "../../report/page";

export default function MobileReportPage() {
  return (
    <>
      <style>{`.dashboard-link { display: none !important; }`}</style>
      <DesktopPage />
    </>
  );
}
