"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type NovaUser } from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";

type TeamBillingRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  teamName: string;
  memberCount: string;
  type: "팀 전체 일시 결제" | "팀 전체 월 구독 취소신청";
  createdAt: string;
  status: "결제 대기" | "취소 신청";
};

const INQUIRY_KEY = "nova-inquiries";
const DEFAULT_TEAM_PRICE = 129000;

export default function TeamBillingPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [teamName, setTeamName] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [teamPrice, setTeamPrice] = useState(DEFAULT_TEAM_PRICE);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/login"); return; }
    if (current.role !== "director" && current.role !== "coach") { router.replace("/dashboard"); return; }
    setUser(current);

    fetch("/api/billing/prices", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (Number.isInteger(data?.team) && data.team > 0) setTeamPrice(data.team); })
      .catch(() => {});

    try {
      const rows = JSON.parse(localStorage.getItem(INQUIRY_KEY) || "[]") as TeamBillingRequest[];
      setCancelRequested(Array.isArray(rows) && rows.some((row) => row.userId === current.id && row.type === "팀 전체 월 구독 취소신청" && row.status === "취소 신청"));
    } catch {}
  }, [router]);

  const startTeamCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!teamName.trim()) { setMessage("팀명을 입력하세요."); return; }
    if (!memberCount.trim()) { setMessage("팀 인원을 입력하세요."); return; }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "team",
          billingMode: "payment",
          teamName: teamName.trim(),
          memberCount: memberCount.trim(),
          returnPath: "/team-billing",
          email: user.email,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || "결제 페이지를 만들 수 없습니다.");
      window.location.href = result.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "팀 결제를 시작할 수 없습니다.");
      setLoading(false);
    }
  };

  const requestCancellation = () => {
    if (!user || !teamName.trim()) { setMessage("해지신청 전에 팀명을 입력하세요."); return; }
    if (cancelRequested) { setMessage("이미 월 구독 취소신청이 접수되어 있습니다."); return; }
    if (!window.confirm("팀 결제를 취소신청하시겠습니까?\n현재 계약 기간은 유지하고 다음 계약 결제일 이후 해지하는 방식으로 처리됩니다.")) return;

    const request: TeamBillingRequest = {
      id: `TEAM-BILLING-CANCEL-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      teamName: teamName.trim(),
      memberCount: memberCount.trim(),
      type: "팀 전체 월 구독 취소신청",
      createdAt: new Date().toISOString(),
      status: "취소 신청",
    };
    try {
      const raw = localStorage.getItem(INQUIRY_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      localStorage.setItem(INQUIRY_KEY, JSON.stringify([request, ...(Array.isArray(rows) ? rows : [])]));
      setCancelRequested(true);
      setMessage("해지신청이 접수되었습니다. 현재 계약 기간은 유지되며 다음 결제일부터 해지 처리됩니다.");
    } catch {
      setMessage("해지신청 정보를 저장하지 못했습니다. 다시 시도하세요.");
    }
  };

  if (!user) return null;

  return (
    <main className={`team-billing-page theme-${theme}`}>
      <div className="team-billing-shell">
        <header className="team-billing-header">
          <button className="team-billing-back" type="button" onClick={() => router.push("/dashboard")}>←</button>
          <div><span>TEAM PREMIUM</span><h1>팀 전체 결제</h1><p>감독·코치 계정은 팀 전체를 대상으로 이용합니다.</p></div>
        </header>
        <div className="team-billing-title">
          <span>TEAM PREMIUM</span><h2>팀 단체결제</h2>
          <p>카드만 결제할 수 있으며 일시 결제로 처리됩니다. Stripe Checkout에서 카드 할부 선택이 가능한 경우 할부를 선택할 수 있습니다.</p>
        </div>
        <section className="team-billing-card">
          <div className="team-billing-heading"><span>DIRECTOR / COACH</span><strong>팀 전체 이용</strong></div>
          <div className="team-billing-price"><strong>{teamPrice.toLocaleString("ko-KR")}원</strong><span>팀 전체 / 일시 결제</span></div>
          <ul className="team-billing-benefits">
            <li>선수별 개별 결제가 아닌 팀 전체 단체결제</li>
            <li>카드 결제만 허용</li>
            <li>일시 결제이며 Checkout에서 카드 할부 선택 가능</li>
            <li>팀명과 팀 인원을 결제 정보에 함께 전달</li>
          </ul>

          <form onSubmit={startTeamCheckout}>
            <label className="team-billing-field">팀명:<input required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="예: NOVA FC" /></label>
            <label className="team-billing-field">팀 인원:<input required value={memberCount} onChange={(e) => setMemberCount(e.target.value)} placeholder="예: 선수 25명 / 코치 3명" /></label>
            <button className="team-billing-submit" type="submit" disabled={loading}>{loading ? "결제 페이지 준비 중…" : `${teamPrice.toLocaleString("ko-KR")}원 팀 단체결제`}</button>
          </form>

          {message && <p className="team-billing-message" role="status">{message}</p>}

          <div className="team-billing-cancel">
            <strong>팀 계약 해지</strong>
            <p>현재 계약기간은 유지하고 다음 결제일부터 해지합니다. 일시 결제 상품의 실제 환불 여부는 계약 조건에 따라 별도로 처리됩니다.</p>
            <button className="team-billing-cancel-button" type="button" onClick={requestCancellation} disabled={cancelRequested}>
              {cancelRequested ? "해지신청 접수됨" : "팀 계약 해지신청"}
            </button>
          </div>
        </section>
      </div>
      <style jsx global>{`
        .team-billing-page{min-height:100vh;background:#f7f4ec;color:#101827}.team-billing-shell{width:min(100% - 48px,1000px);margin:0 auto;padding:48px 0 80px}.team-billing-header{display:flex;gap:18px;align-items:center;margin-bottom:24px}.team-billing-back{width:42px;height:42px;border:1px solid #d7d1c6;border-radius:10px;background:#fffdf8;font-size:21px;cursor:pointer}.team-billing-header span,.team-billing-title>span,.team-billing-heading span{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:800}.team-billing-header h1{margin:6px 0;font-size:32px}.team-billing-header p,.team-billing-title p{margin:0;color:#64748b;font-size:13px}.team-billing-title{margin-bottom:18px}.team-billing-title h2{margin:6px 0;font-size:28px}.team-billing-card{padding:30px;border:1px solid #dedbd2;border-radius:18px;background:#fffdf8;box-shadow:0 12px 35px rgba(15,23,42,.06)}.team-billing-heading{display:flex;justify-content:space-between;gap:20px;align-items:center;padding-bottom:18px;border-bottom:1px solid #e5e0d7}.team-billing-heading strong{font-size:22px}.team-billing-price{display:flex;align-items:baseline;gap:8px;margin:20px 0}.team-billing-price strong{font-size:30px}.team-billing-price span{color:#64748b;font-size:12px}.team-billing-benefits{margin:0 0 20px;padding-left:20px;line-height:2;color:#475569;font-size:13px}.team-billing-field{display:grid;gap:7px;margin-bottom:14px;font-size:12px;font-weight:700}.team-billing-field input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font:inherit}.team-billing-submit{width:100%;min-height:46px;border:0;border-radius:9px;background:#111827;color:#fff;font-weight:800;cursor:pointer}.team-billing-submit:disabled{opacity:.55;cursor:default}.team-billing-message{margin:18px 0 0;padding:12px;border-radius:9px;background:#f1f4f8;color:#475569;font-size:12px}.team-billing-cancel{margin-top:20px;padding-top:18px;border-top:1px solid #e5e0d7}.team-billing-cancel p{margin:7px 0 12px;color:#64748b;font-size:12px;line-height:1.6}.team-billing-cancel-button{min-height:44px;padding:0 18px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font-weight:800;cursor:pointer}.team-billing-cancel-button:disabled{opacity:.55;cursor:default}@media(max-width:700px){.team-billing-shell{width:calc(100% - 28px);padding:20px 0 70px}.team-billing-card{padding:20px}.team-billing-heading{display:block}.team-billing-heading strong{display:block;margin-top:8px}}
      `}</style>
    </main>
  );
}
