"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFeaturePage from "../_components/MobileFeaturePage";
import { getCurrentUser } from "../../../lib/nova-auth";

export default function MobileGpsTestPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/mobile/login"); return; }
    if (user.role !== "admin") { router.replace("/mobile"); return; }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return <main className="mobile-page theme-ivory"><div className="mobile-loading">접근 권한 확인 중...</div></main>;

  return <MobileFeaturePage section="gps-test" />;
}
