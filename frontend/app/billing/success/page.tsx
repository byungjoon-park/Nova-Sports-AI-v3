/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { activatePersonalSubscription, getCurrentUser } from "../../../lib/nova-auth";
import { useNovaSettings } from "../../settings-context";
import "../../dashboard/dashboard.css";

function BillingSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme } = useNovaSettings();
  const [message, setMessage] = useState("결제 확인 중입니다…");

  useEffect(() => {
    const sessionId = params.get("session_id");
    const user = getCurrentUser();
    if (!sessionId || !user || user.role !== "athlete") {
      setMessage("결제 확인 정보가 없습니다.");
      return;
    }

    fetch(`/api/billing/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.paid) throw new Error(result.error || "결제가 확인되지 않았습니다.");
        if (result.athleteId !== user.id) throw new Error("현재 선수 계정과 결제 정보가 일치하지 않습니다.");
        const activated = activatePersonalSubscription({
          athleteUserId: user.id,
          parentEmail: result.parentEmail,
          parentName: result.parentName,
          stripeCustomerId: result.stripeCustomerId,
          stripeSubscriptionId: result.stripeSubscriptionId,
        });
        if (!activated) throw new Error("구독 권한을 연결하지 못했습니다.");
        setMessage("결제가 완료되었습니다. 학부모 계정이 추가 결제 없이 자동 연결되었습니다.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "결제 확인에 실패했습니다."));
  }, [params]);

  return (
    <main className={`nova-dashboard theme-${theme}`} data-theme={theme}>
      <section className="dashboard-main" style={{ marginLeft: 0, width: "100%", padding: "48px" }}>
        <section className="dashboard-card" style={{ maxWidth: 720 }}>
          <h1>결제 결과</h1>
          <p>{message}</p>
          <button type="button" onClick={() => router.push("/dashboard")}>대시보드로 이동</button>
        </section>
      </section>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BillingSuccessContent />
    </Suspense>
  );
}
