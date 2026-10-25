"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFeaturePage from "../_components/MobileFeaturePage";
import { getCurrentUser } from "../../../lib/nova-auth";

export default function MobileGpsTestPage() {
  const router = useRouter();
  const [parent, setParent] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/mobile/login"); return; }
    setParent(user.role === "parent");
  }, [router]);

  if (parent) {
    return <main className="mobile-page theme-ivory"><div className="mobile-page-title"><h1>GPS</h1><p>학부모 계정은 GPS 측정 및 연결을 할 수 없습니다.</p></div><section className="mobile-content-card"><div className="mobile-empty-card">측정·연결 권한이 없습니다.</div></section></main>;
  }

  return <MobileFeaturePage section="gps-test" />;
}
