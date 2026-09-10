 "use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NovaTopBar from "../../../components/NovaTopBar";
import { getCurrentUser, type NovaUser } from "../../../lib/nova-auth";
import "../mobile.css";

type TeamBillingRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  teamName: string;
  memberCount: string;
  type: "팀 전체 구독 요금 문의" | "팀 전체 월 구독 취소신청";
  createdAt: string;
  status: "답변 대기" | "취소 신청";
};

const INQUIRY_KEY = "nova-inquiries";

export default function MobileTeamBillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [teamName, setTeamName] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/mobile/login"); return; }
    if (current.role !== "director" && current.role !== "coach") { router.replace("/mobile"); return; }
    setUser(current);

    try {
      const rows = JSON.parse(localStorage.getItem(INQUIRY_KEY) || "[]") as TeamBillingRequest[];
      setCancelRequested(
        Array.isArray(rows) &&
        rows.some((row) => row.userId === current.id && row.type === "팀 전체 월 구독 취소신청" && row.status === "취소 신청"),
      );
    } catch {}
  }, [router]);

  const saveRequest = (request: TeamBillingRequest) => {
    const raw = localStorage.getItem(INQUIRY_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    localStorage.setItem(INQUIRY_KEY, JSON.stringify([request, ...(Array.isArray(rows) ? rows : [])]));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !teamName.trim()) { setMessage("팀명을 입력하세요."); return; }

    const inquiry: TeamBillingRequest = {
      id: `TEAM-BILLING-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      teamName: teamName.trim(),
      memberCount: memberCount.trim(),
      type: "팀 전체 구독 요금 문의",
      createdAt: new Date().toISOString(),
      status: "답변 대기",
    };

    try {
      saveRequest(inquiry);
      setSent(true);
      setMessage("팀 전체 구독 문의가 접수되었습니다. 담당자가 요금과 계약 조건을 안내드립니다.");
    } catch {
      setMessage("문의 접수 정보를 저장하지 못했습니다. 다시 시도하세요.");
    }
  };

  const requestCancellation = () => {
    if (!user || !teamName.trim()) {
      setMessage("해지신청 전에 팀명을 입력하세요.");
      return;
    }
    if (cancelRequested) {
      setMessage("이미 월 구독 취소신청이 접수되어 있습니다.");
      return;
    }
    if (!window.confirm("월 구독을 취소신청하시겠습니까?\n현재 계약 기간은 유지하고 다음 결제일 이후 자동 결제를 중단하는 방식으로 처리됩니다.")) return;

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
      saveRequest(request);
      setCancelRequested(true);
      setMessage("월 구독 취소신청이 접수되었습니다. 현재 계약 기간은 유지되며 다음 결제일 이후 해지 처리됩니다.");
    } catch {
      setMessage("취소신청 정보를 저장하지 못했습니다. 다시 시도하세요.");
    }
  };

  if (!user) return null;

  return (
    <main className="mobile-page theme-ivory mobile-team-billing-page">
      <NovaTopBar statusText="AI 시스템 준비" />
      <div className="mobile-page-title">
        <span className="mobile-team-billing-eyebrow">TEAM PREMIUM</span>
        <h1>팀 전체 구독</h1>
        <p>감독·코치 계정은 팀 전체를 대상으로 이용합니다. 요금은 팀 규모와 운영 조건에 따라 문의해 주세요.</p>
      </div>

      <section className="mobile-content-card mobile-team-billing-card">
        <div className="mobile-card-heading"><span>DIRECTOR / COACH</span><strong>팀 전체 이용</strong></div>
        <div className="mobile-team-billing-price"><strong>요금 문의</strong><span>팀 전체 기준</span></div>

        <ul className="mobile-billing-benefits">
          <li>선수별 개별 결제가 아닌 팀 전체 구독</li>
          <li>감독·코치가 팀 선수와 훈련 현황을 관리</li>
          <li>팀 규모와 이용 범위 확인 후 맞춤 요금 안내</li>
        </ul>

        {sent ? (
          <div className="mobile-team-billing-complete"><strong>문의가 접수되었습니다.</strong><p>담당자가 팀 규모와 이용 범위를 확인한 후 요금 및 계약 조건을 안내드립니다.</p></div>
        ) : (
          <form onSubmit={submit}>
            <label className="mobile-billing-field">팀명:<input required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="예: NOVA FC" /></label>
            <label className="mobile-billing-field">팀 인원:<input value={memberCount} onChange={(e) => setMemberCount(e.target.value)} placeholder="예: 선수 25명 / 코치 3명" /></label>
            <button className="mobile-action-button" type="submit">팀 전체 이용 문의</button>
          </form>
        )}

        {message && <p className="mobile-billing-message" role="status">{message}</p>}

        <div className="mobile-team-billing-cancel">
          <strong>월 구독 관리</strong>
          <p>팀 전체 월 구독을 해지하려면 취소신청을 남겨주세요. 현재 계약 기간은 유지하고 다음 결제일 이후 해지 처리합니다.</p>
          <button
            className="mobile-cancel-subscription-button"
            type="button"
            onClick={requestCancellation}
            disabled={cancelRequested}
          >
            {cancelRequested ? "월 구독 취소신청 접수됨" : "월 구독 취소신청"}
          </button>
        </div>

        <button className="mobile-billing-back" type="button" onClick={() => router.push("/mobile")}>← 대시보드</button>
      </section>

      <style jsx global>{`
        .mobile-team-billing-page{padding-top:0!important}
        .mobile-team-billing-page .mobile-page-title{max-width:720px;margin:0 auto 16px;padding:18px 2px 0}
        .mobile-team-billing-eyebrow{font-size:9px;letter-spacing:.14em;color:#2563eb;font-weight:800}
        .mobile-team-billing-page .mobile-page-title h1{margin:6px 0;font-size:28px}
        .mobile-team-billing-page .mobile-page-title p{margin:0;color:#64748b;font-size:12px;line-height:1.6}
        .mobile-team-billing-card{margin-bottom:90px}
        .mobile-team-billing-price{display:flex;align-items:baseline;gap:8px;margin:18px 0 12px}
        .mobile-team-billing-price strong{font-size:30px;color:#101827}
        .mobile-team-billing-price span{font-size:11px;color:#64748b}
        .mobile-team-billing-complete{padding:15px;border-radius:12px;background:#eaf8ef;color:#16824a}
        .mobile-team-billing-complete strong{font-size:13px}
        .mobile-team-billing-complete p{margin:7px 0 0;font-size:11px;line-height:1.6}
        .mobile-team-billing-cancel{margin-top:18px;padding:16px;border-top:1px solid #e5e0d7}
        .mobile-team-billing-cancel strong{font-size:13px}
        .mobile-team-billing-cancel p{margin:6px 0 12px;color:#64748b;font-size:11px;line-height:1.6}
        .mobile-cancel-subscription-button{width:100%;min-height:44px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font-weight:800;cursor:pointer}
        .mobile-cancel-subscription-button:disabled{opacity:.55;cursor:default}
      `}</style>
    </main>
  );
}
