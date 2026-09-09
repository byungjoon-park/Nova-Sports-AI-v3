/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activatePersonalSubscription,
  findUserByEmail,
  getAthleteSubscription,
  getAuthStore,
  getCurrentUser,
} from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";
import "../dashboard/dashboard.css";

type PendingBilling = {
  athleteUserId: string;
  parentEmail: string;
  parentName: string;
};

const PENDING_KEY = "nova-pending-parent-billing-v1";

export default function BillingPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [childNames, setChildNames] = useState<string[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || (user.role !== "athlete" && user.role !== "parent")) {
      router.replace("/dashboard");
      return;
    }

    if (user.role === "parent") {
      setIsParent(true);
      const store = getAuthStore();
      const childIds = new Set(
        store.guardianLinks
          .filter((link) => link.guardianUserId === user.id && link.status === "active")
          .map((link) => link.athleteUserId),
      );
      setChildNames(
        store.users
          .filter((item) => item.role === "athlete" && childIds.has(item.id))
          .map((item) => item.name),
      );
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const billingResult = query.get("billing");

    if (billingResult === "success") {
      try {
        const pendingRaw = localStorage.getItem(PENDING_KEY);
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw) as PendingBilling;
          if (pending.athleteUserId === user.id && pending.parentEmail) {
            const activated = activatePersonalSubscription({
              athleteUserId: pending.athleteUserId,
              parentEmail: pending.parentEmail,
              parentName: pending.parentName,
            });
            if (activated) {
              setMessage(`결제가 완료되었습니다. ${pending.parentEmail} 학부모 계정이 추가 결제 없이 자동 등록·연결되었습니다.`);
              localStorage.removeItem(PENDING_KEY);
            }
          }
        }
      } catch {}

      setActive(Boolean(getAthleteSubscription(user.id)));
      return;
    }

    setActive(Boolean(getAthleteSubscription(user.id)));
  }, [router]);

  const startCheckout = async (event: FormEvent) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user || user.role !== "athlete") return;

    if (!parentEmail.trim()) {
      setMessage("학부모 이메일을 입력하세요. 결제 완료 후 추가 결제 없이 학부모 계정이 자동 등록·연결됩니다.");
      return;
    }

    const normalizedParentEmail = parentEmail.trim().toLowerCase();
    if (normalizedParentEmail === user.email) {
      setMessage("선수 본인 이메일과 다른 학부모 이메일을 입력하세요.");
      return;
    }

    const existingParent = findUserByEmail(normalizedParentEmail);
    if (existingParent && existingParent.role !== "parent") {
      setMessage("입력한 이메일은 이미 다른 역할의 계정으로 사용 중입니다. 다른 학부모 이메일을 입력하세요.");
      return;
    }

    try {
      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          athleteUserId: user.id,
          parentEmail: normalizedParentEmail,
          parentName: parentName.trim(),
        } satisfies PendingBilling),
      );
    } catch {}

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro",
          athleteId: user.id,
          parentEmail: normalizedParentEmail,
          parentName: parentName.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "결제 페이지를 만들 수 없습니다.");
      window.location.href = result.url;
    } catch (error) {
      try { localStorage.removeItem(PENDING_KEY); } catch {}
      setMessage(error instanceof Error ? error.message : "결제를 시작할 수 없습니다.");
      setLoading(false);
    }
  };

  return (
    <main className={`nova-dashboard theme-${theme}`} data-theme={theme}>
      <section className="dashboard-main" style={{ marginLeft: 0, width: "100%", padding: "48px" }}>
        <header className="dashboard-header">
          <div>
            <span>NOVA SPORTS AI</span>
            <h1>개인 구독</h1>
            <p>선수 개인 구독 1건에 학부모 이용 권한이 포함됩니다.</p>
          </div>
          <button type="button" onClick={() => router.push("/dashboard")}>대시보드</button>
        </header>

        <section className="dashboard-card" style={{ maxWidth: 720, marginTop: 24 }}>
          {isParent ? (
            <>
              <h2>학부모 이용 권한</h2>
              <p>학부모 계정은 자녀의 개인 Premium에 포함되어 추가 결제가 필요하지 않습니다.</p>
              {childNames.length > 0 && <p>연결된 자녀: {childNames.join(", ")}</p>}
              <button type="button" onClick={() => router.push("/dashboard")}>대시보드로 이동</button>
            </>
          ) : active ? (
            <>
              <h2>Premium 이용 중</h2>
              <p>선수 본인 결제 1건만 청구되며, 연결된 학부모는 추가 결제 없이 이용합니다.</p>
              <button type="button" onClick={() => router.push("/dashboard")}>돌아가기</button>
              {message && <p role="status" style={{ marginTop: 16 }}>{message}</p>}
            </>
          ) : (
            <form onSubmit={startCheckout}>
              <h2>개인 Premium</h2>
              <p>선수 1명 기준 월 구독입니다. 결제 완료 후 입력한 학부모 계정이 자동 생성·연결되며 학부모는 별도 결제를 하지 않습니다.</p>
              <label style={{ display: "grid", gap: 8, marginTop: 20 }}>
                학부모 이름
                <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="홍길동 보호자" />
              </label>
              <label style={{ display: "grid", gap: 8, marginTop: 16 }}>
                학부모 이메일
                <input
                  type="email"
                  required
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                />
              </label>
              <button type="submit" disabled={loading} style={{ marginTop: 20 }}>
                {loading ? "결제 페이지 준비 중…" : "개인 Premium 결제"}
              </button>
              {message && <p role="alert" style={{ marginTop: 16 }}>{message}</p>}
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
