"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUser } from "../../lib/nova-auth";
import { isBetaCodeValid } from "../../lib/nova-beta";
import { betaConfig } from "../../lib/beta-config";
import "./mobile.css";

export default function MobileBetaPage() {
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    const code = params.get("beta") || sessionStorage.getItem("nova-beta-code") || "";
    const valid = betaConfig.enabled && isBetaCodeValid(code);
    if (valid) sessionStorage.setItem("nova-beta-code", code);
    setRole(user?.role ?? null);
    setAllowed(valid || user?.role === "admin");
    setReady(true);
  }, [params]);

  if (!ready) return <main className="mobile-beta-page"><p>베타 확인 중...</p></main>;
  if (!allowed) return <main className="mobile-beta-page"><section><span>NOVA MOBILE BETA</span><h1>베타 접근 권한이 없습니다.</h1><p>관리자에게 받은 베타 초대 링크로 접속하세요.</p></section></main>;

  return <main className="mobile-beta-page"><section><span>NOVA MOBILE BETA · v{betaConfig.version}</span><h1>모바일 베타</h1><p>{role === "admin" ? "관리자 베타 미리보기" : "베타 테스트에 참여하고 있습니다."}</p><div className="mobile-beta-links"><a href="/dashboard">기존 대시보드</a><a href="/coach-dashboard">감독·코치</a></div></section></main>;
}
