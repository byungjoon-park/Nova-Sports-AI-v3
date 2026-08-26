"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./splash.css";

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    // Root is always the NOVA startup screen.
    // After the splash, continue to the login screen.
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem("nova-splash-seen", "1"); } catch {}
      router.replace("/login");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="nova-splash" aria-label="NOVA startup splash">
      <div className="nova-splash-grid" aria-hidden="true" />
      <div className="nova-splash-glow" aria-hidden="true" />

      <section className="nova-splash-content">
        <div className="nova-splash-logo">NOVA</div>
        <div className="nova-splash-kicker">AI SPORTS PERFORMANCE PLATFORM</div>

        <h1>AI Sports Performance Platform</h1>
        <p>Smarter Training. Better Performance.</p>

        <div className="nova-splash-loader" aria-hidden="true">
          <span />
        </div>
        <small>INITIALIZING NOVA V2</small>
      </section>
    </main>
  );
}
