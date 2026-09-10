"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type NovaUser } from "../../../lib/nova-auth";
import "../mobile.css";

export default function MobileBillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<NovaUser | null>(null);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace("/mobile/login");
      return;
    }
    if (current.role !== "athlete" && current.role !== "parent") {
      router.replace("/mobile");
      return;
    }
    setUser(current);
  }, [router]);

  if (!user) return null;

  return (
    <main className="mobile-page theme-ivory">
      <header className="mobile-subheader">
        <div className="mobile-desktop-header">
          <div className="mobile-desktop-header-left">
            <button onClick={() => { if (window.history.length > 1) window.history.back(); else router.push("/mobile/dashboard"); }} aria-label="뒤로">←</button>
            <div className="mobile-desktop-brand">
              <strong>N O V A</strong>
              <span>AI SPORTS PERFORMANCE PLATFORM</span>
            </div>
          </div>
          <div className="mobile-ai-status"><i></i> AI 시스템 준비</div>
        </div>
        <div className="mobile-page-title">
          <span className="mobile-eyebrow">NOVA SPORTS AI · MOBILE</span>
          <h1>결제</h1>
          <p>개인 Premium은 선수 1회 결제로 운영됩니다.</p>
        </div>
      </header>

      <section className="mobile-content-card">
        <div className="mobile-card-heading">
          <span>PREMIUM</span>
          <strong>{user.role === "parent" ? "학부모 이용 권한" : "개인 Premium"}</strong>
        </div>

        {user.role === "parent" ? (
          <>
            <p>자녀가 Premium을 결제하면 학부모 계정은 자동 연결되며 별도 결제가 없습니다.</p>
            <button className="mobile-action-button" onClick={() => router.push("/mobile")}>대시보드</button>
          </>
        ) : (
          <>
            <p>선수 본인이 결제합니다. 결제 후 입력한 학부모 계정이 자동 등록·연결되며 학부모는 추가 결제를 하지 않습니다.</p>
            <button className="mobile-action-button" onClick={() => router.push("/billing")}>선수 Premium 결제하기 ›</button>
          </>
        )}
      </section>
    </main>
  );
}
