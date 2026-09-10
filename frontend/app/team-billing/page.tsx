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
  type: "팀 전체 구독 요금 문의" | "팀 전체 월 구독 취소신청";
  createdAt: string;
  status: "답변 대기" | "취소 신청";
};

const INQUIRY_KEY = "nova-inquiries";

export default function TeamBillingPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [teamName, setTeamName] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/login"); return; }
    if (current.role !== "director" && current.role !== "coach") { router.replace("/dashboard"); return; }
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
    <main className={`team-billing-page theme-${theme}`}>
      <div className="team-billing-shell">
      <header className="team-billing-header"><button className="team-billing-back" type="button" onClick={() => router.push("/dashboard")}>←</button><div><span>TEAM PREMIUM</span><h1>팀 전체 구독</h1><p>감독·코치 계정은 팀 전체를 대상으로 이용합니다.</p></div></header>
      <div className="team-billing-title">
        <span>TEAM PREMIUM</span><h2>팀 전체 구독</h2><p>감독·코치 계정은 팀 전체를 대상으로 이용합니다. 요금은 팀 규모와 운영 조건에 따라 문의해 주세요.</p></div>
      <section className="team-billing-card">
        <div className="team-billing-heading"><span>DIRECTOR / COACH</span><strong>팀 전체 이용</strong></div>
        <div className="team-billing-price"><strong>요금 문의</strong><span>팀 전체 기준</span></div>

        <ul className="team-billing-benefits">
          <li>선수별 개별 결제가 아닌 팀 전체 구독</li>
          <li>감독·코치가 팀 선수와 훈련 현황을 관리</li>
          <li>팀 규모와 이용 범위 확인 후 맞춤 요금 안내</li>
        </ul>

        {sent ? (
          <div className="team-billing-complete"><strong>문의가 접수되었습니다.</strong><p>담당자가 팀 규모와 이용 범위를 확인한 후 요금 및 계약 조건을 안내드립니다.</p></div>
        ) : (
          <form onSubmit={submit}>
            <label className="team-billing-field">팀명:<input required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="예: NOVA FC" /></label>
            <label className="team-billing-field">팀 인원:<input value={memberCount} onChange={(e) => setMemberCount(e.target.value)} placeholder="예: 선수 25명 / 코치 3명" /></label>
            <button className="team-billing-submit" type="submit">팀 전체 이용 문의</button>
          </form>
        )}

        {message && <p className="team-billing-message" role="status">{message}</p>}

        <div className="team-billing-cancel">
          <strong>월 구독 관리</strong>
          <p>팀 전체 월 구독을 해지하려면 취소신청을 남겨주세요. 현재 계약 기간은 유지하고 다음 결제일 이후 해지 처리합니다.</p>
          <button
            className="team-billing-cancel-button"
            type="button"
            onClick={requestCancellation}
            disabled={cancelRequested}
          >
            {cancelRequested ? "월 구독 취소신청 접수됨" : "월 구독 취소신청"}
          </button>
        </div>

        
      </section>

      <style jsx global>{`
        .team-billing-page{min-height:100vh;background:#f7f4ec;color:#101827}.team-billing-shell{width:min(100% - 48px,1000px);margin:0 auto;padding:48px 0 80px}.team-billing-header{display:flex;gap:18px;align-items:center;margin-bottom:24px}.team-billing-back{width:42px;height:42px;border:1px solid #d7d1c6;border-radius:10px;background:#fffdf8;font-size:21px;cursor:pointer}.team-billing-header span,.team-billing-title>span,.team-billing-heading span{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:800}.team-billing-header h1{margin:6px 0;font-size:32px}.team-billing-header p,.team-billing-title p{margin:0;color:#64748b;font-size:13px}.team-billing-title{margin-bottom:18px}.team-billing-title h2{margin:6px 0;font-size:28px}.team-billing-card{padding:30px;border:1px solid #dedbd2;border-radius:18px;background:#fffdf8;box-shadow:0 12px 35px rgba(15,23,42,.06)}.team-billing-heading{display:flex;justify-content:space-between;gap:20px;align-items:center;padding-bottom:18px;border-bottom:1px solid #e5e0d7}.team-billing-heading strong{font-size:22px}.team-billing-price{display:flex;align-items:baseline;gap:8px;margin:20px 0}.team-billing-price strong{font-size:30px}.team-billing-price span{color:#64748b;font-size:12px}.team-billing-benefits{margin:0 0 20px;padding-left:20px;line-height:2;color:#475569;font-size:13px}.team-billing-field{display:grid;gap:7px;margin-bottom:14px;font-size:12px;font-weight:700}.team-billing-field input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font:inherit}.team-billing-submit{width:100%;min-height:46px;border:0;border-radius:9px;background:#111827;color:#fff;font-weight:800;cursor:pointer}.team-billing-complete{padding:15px;border-radius:12px;background:#eaf8ef;color:#16824a}.team-billing-complete p{margin:7px 0 0;font-size:12px;line-height:1.6}.team-billing-message{margin:18px 0 0;padding:12px;border-radius:9px;background:#f1f4f8;color:#475569;font-size:12px}.team-billing-cancel{margin-top:20px;padding-top:18px;border-top:1px solid #e5e0d7}.team-billing-cancel p{margin:7px 0 12px;color:#64748b;font-size:12px;line-height:1.6}.team-billing-cancel-button{min-height:44px;padding:0 18px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font-weight:800;cursor:pointer}.team-billing-cancel-button:disabled{opacity:.55;cursor:default}
        @media(max-width:700px){.team-billing-shell{width:calc(100% - 28px);padding:20px 0 70px}.team-billing-card{padding:20px}.team-billing-heading{display:block}.team-billing-heading strong{display:block;margin-top:8px}}
      `}</style>
    </div></main>
  );
}
