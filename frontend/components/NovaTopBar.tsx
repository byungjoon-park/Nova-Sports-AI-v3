"use client";

import { useRouter } from "next/navigation";
import "./nova-top-bar.css";
import MobileGlobalNavigation from "./MobileGlobalNavigation";

type Props = {
  statusText?: string;
};

export default function NovaTopBar({ statusText = "AI 시스템 준비" }: Props) {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };

  return (
    <>
      <header className="nova-top-bar">
        <button className="nova-top-back" type="button" aria-label="뒤로가기" onClick={goBack}>
          ←
        </button>
        <button className="nova-top-brand" type="button" aria-label="NOVA 홈" onClick={() => router.push("/dashboard")}>
          <strong>NOVA</strong>
          <span>AI SPORTS PERFORMANCE PLATFORM</span>
        </button>
        <div className="nova-top-status">
          <span className="nova-top-status-dot" />
          <span>{statusText}</span>
        </div>
      </header>
      <MobileGlobalNavigation />
    </>
  );
}
