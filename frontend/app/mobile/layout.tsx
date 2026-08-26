import type { ReactNode } from "react";
import "./mobile.css";

export default function MobileLayout({ children }: { children: ReactNode }) {
  return <div className="mobile-beta-shell">{children}</div>;
}
