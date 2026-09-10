"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type NovaUser } from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";

export default function TeamBillingPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [teamName, setTeamName] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace("/login");
      return;
    }
    if (current.role !== "director" && current.role !== "coach") {
      router.replace("/dashboard");
      return;
    }
    setUser(current);
  }, [router]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !teamName.trim()) {
      setMessage("팀명을 입력하세요.");
      return;
    }

    const inquiry = {
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
      const raw = localStorage.getItem("nova-inquiries");
      const rows = raw ? JSON.parse(raw) : [];
      localStorage.setItem("nova-inquiries", JSON.stringify([inquiry, ...(Array.isArray(rows) ? rows : [])]));
      setSent(true);
      setMessage("팀 전체 구독 문의가 접수되었습니다. 담당자가 요금과 계약 조건을 안내드립니다.");
    } catch {
      setMessage("문의 접수 정보를 저장하지 못했습니다. 다시 시도하세요.");
    }
  };

  if (!user) return null;

  return (
    <main className={`team-billing-page theme-${theme}`}>
      <div className="team-billing-shell">
        <header className="team-billing-header">
          <button className="team-billing-back" type="button" onClick={() => router.push("/dashboard")}>←</button>
          <div>
            <span>TEAM PREMIUM</span>
            <h1>팀 전체 구독</h1>
            <p>감독·코치 계정은 팀 전체를 대상으로 이용합니다.</p>
          </div>
        </header>

        <section className="team-billing-card">
          <div className="team-billing-top">
            <div>
              <span>DIRECTOR / COACH</span>
              <h2>팀 전체 이용</h2>
            </div>
            <strong>요금 문의</strong>
          </div>

          <div className="team-billing-grid">
            <div>
              <h3>팀 구독 안내</h3>
              <ul>
                <li>선수별 개별 결제가 아닌 팀 전체 구독</li>
                <li>감독·코치가 팀 선수와 훈련 현황을 관리</li>
                <li>팀 규모와 이용 범위 확인 후 맞춤 요금 안내</li>
              </ul>
            </div>

            {sent ? (
              <div className="team-billing-complete">
                <h3>문의가 접수되었습니다.</h3>
                <p>담당자가 팀 규모와 이용 범위를 확인한 후 요금 및 계약 조건을 안내드립니다.</p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label>
                  팀명
                  <input required value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="예: NOVA FC" />
                </label>
                <label>
                  팀 인원
                  <input value={memberCount} onChange={(e) => setMemberCount(e.target.value)} placeholder="예: 선수 25명 / 코치 3명" />
                </label>
                <button type="submit">팀 전체 이용 문의</button>
              </form>
            )}
          </div>

          {message && <p className="team-billing-message" role="status">{message}</p>}
        </section>
      </div>

      <style jsx global>{`
        .team-billing-page{min-height:100vh;background:#f7f4ec;color:#101827}
        .team-billing-shell{width:min(100% - 48px,1000px);margin:0 auto;padding:48px 0 80px}
        .team-billing-header{display:flex;gap:18px;align-items:center;margin-bottom:24px}
        .team-billing-back{width:42px;height:42px;border:1px solid #d7d1c6;border-radius:10px;background:#fffdf8;font-size:21px;cursor:pointer}
        .team-billing-header span,.team-billing-top span{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:800}
        .team-billing-header h1{margin:6px 0;font-size:32px}
        .team-billing-header p{margin:0;color:#64748b;font-size:13px}
        .team-billing-card{padding:30px;border:1px solid #dedbd2;border-radius:18px;background:#fffdf8;box-shadow:0 12px 35px rgba(15,23,42,.06)}
        .team-billing-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:22px;border-bottom:1px solid #e5e0d7}
        .team-billing-top h2{margin:7px 0 0;font-size:22px}
        .team-billing-top>strong{font-size:27px}
        .team-billing-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:32px;padding-top:24px}
        .team-billing-grid h3{margin:0 0 10px;font-size:15px}
        .team-billing-grid ul{margin:0;padding-left:18px;color:#64748b;font-size:13px;line-height:2}
        .team-billing-grid label{display:grid;gap:7px;margin-bottom:14px;font-size:12px;font-weight:700}
        .team-billing-grid input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font:inherit}
        .team-billing-grid form button{width:100%;min-height:46px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer}
        .team-billing-complete{padding:18px;border-radius:12px;background:#eaf8ef;color:#16824a}
        .team-billing-complete h3{font-size:15px}
        .team-billing-complete p{margin:0;font-size:13px;line-height:1.7}
        .team-billing-message{margin:18px 0 0;padding:12px;border-radius:9px;background:#f1f4f8;color:#475569;font-size:12px}
        @media(max-width:700px){
          .team-billing-shell{width:calc(100% - 28px);padding:20px 0 70px}
          .team-billing-card{padding:20px}.team-billing-top{display:block}
          .team-billing-top>strong{display:block;margin-top:12px;font-size:25px}
          .team-billing-grid{grid-template-columns:1fr;gap:18px}
        }
        .theme-dark.team-billing-page{background:#070b12;color:#f3f6fb}
        .theme-dark .team-billing-card,.theme-dark .team-billing-back{background:#0d1420;border-color:#243247;color:#f3f6fb}
        .theme-dark .team-billing-header p,.theme-dark .team-billing-grid ul{color:#94a3b8}
        .theme-dark .team-billing-grid input{background:#111a28;border-color:#334155;color:#f3f6fb}
      `}</style>
    </main>
  );
}
