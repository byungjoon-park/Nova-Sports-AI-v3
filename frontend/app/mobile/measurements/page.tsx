"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFeaturePage from "../_components/MobileFeaturePage";
import { getCurrentUser } from "../../../lib/nova-auth";

export default function MobileMeasurementsPage() {
  const router = useRouter();
  const [parent, setParent] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/mobile/login"); return; }
    setParent(user.role === "parent");
  }, [router]);

  if (parent) {
    return <main className="mobile-page theme-ivory"><div className="mobile-page-title"><h1>측정 기록</h1><p>학부모 계정은 자녀의 측정값을 조회만 할 수 있습니다.</p></div><section className="mobile-content-card"><div className="mobile-empty-card">측정값 입력 및 수정 권한이 없습니다.</div></section></main>;
  }

  return <MobileFeaturePage section="measurements" />;
}
