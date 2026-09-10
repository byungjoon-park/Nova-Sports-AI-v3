import "./mobile.css";
import "./mobile-navigation-brand-fix.css";
import "./mobile-back-unified.css";
import MobileBackBehavior from "./MobileBackBehavior";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <div className="nova-mobile-shell"><MobileBackBehavior />{children}</div>;
}
