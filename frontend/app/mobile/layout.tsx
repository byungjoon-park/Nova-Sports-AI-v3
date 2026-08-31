import "./mobile.css";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <main className="nova-mobile-shell">{children}</main>;
}
