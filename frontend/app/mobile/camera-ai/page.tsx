"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DesktopPage from "../../camera-ai/page";
import MobileGlobalNavigation from "../../../components/MobileGlobalNavigation";
import { getCurrentUser } from "../../../lib/nova-auth";

export default function MobileCameraAIPage() {
  const router = useRouter();
  const [parent, setParent] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/mobile/login"); return; }
    setParent(user.role === "parent");
  }, [router]);

  if (parent) {
    return <main className="mobile-page theme-ivory"><div className="mobile-page-title"><h1>카메라 AI</h1><p>학부모 계정은 자녀의 측정 및 분석 입력을 할 수 없습니다.</p></div><section className="mobile-content-card"><div className="mobile-empty-card">측정·분석 입력 권한이 없습니다.</div></section></main>;
  }

  return <><DesktopPage /><MobileGlobalNavigation /></>;
}
