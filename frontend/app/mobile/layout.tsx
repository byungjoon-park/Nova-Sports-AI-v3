import "./mobile.css";
import "./mobile-navigation-brand-fix.css";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <div className="nova-mobile-shell">{children}</div>;
}
