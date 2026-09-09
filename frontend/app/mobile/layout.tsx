import "./mobile.css";
import "./mobile-navigation-brand-fix.css";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <main className="nova-mobile-shell">{children}</main>;
}
