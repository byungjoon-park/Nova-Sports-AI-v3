"use client";

import "./mobile.css";
import "./mobile-navigation-brand-fix.css";
import MobileGlobalNavigation from "./MobileGlobalNavigation";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="nova-mobile-shell">
      <MobileGlobalNavigation />
      {children}
    </main>
  );
}
