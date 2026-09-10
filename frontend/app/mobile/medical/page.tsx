"use client";

import DesktopPage from "../../medical/page";

export default function MobileMedicalPage() {
  return (
    <div className="mobile-medical-route">
      <style jsx global>{`
        @media (max-width: 600px) {
          .mobile-medical-route .medical-page {
            padding-top: 0 !important;
          }
        }
      `}</style>
      <DesktopPage />
    </div>
  );
}
