/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser, type NovaUserRole } from "../../../lib/nova-auth";
import { useNovaSettings } from "../../settings-context";
import "../mobile.css";

const roles: Array<{ value: Exclude<NovaUserRole, "admin">; label: string; description: string }> = [
  { value: "director", label: "감독", description: "팀·선수·훈련 전체 관리" },
  { value: "coach", label: "코치", description: "담당 선수·훈련 관리" },
  { value: "athlete", label: "선수", description: "개인 퍼포먼스·재활" },
  { value: "parent", label: "학부모", description: "선수 상태·일정 확인" },
];

export default function MobileSignupPage() {
  const router = useRouter();
  const { theme, setRole } = useNovaSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setSignupRole] = useState<Exclude<NovaUserRole, "admin">>("athlete");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const queryRole = new URLSearchParams(window.location.search).get("role") as Exclude<NovaUserRole, "admin"> | null;
    if (queryRole && roles.some((item) => item.value === queryRole)) setSignupRole(queryRole);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!terms || !privacy) {
      setMessage("이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setMessage("이름과 이메일을 입력하세요.");
      return;
    }

    const user = registerUser({ name, email, role });
    setRole(role);
    try {
      localStorage.setItem("nova-active-role", user.role);
      localStorage.setItem("nova-login-role", user.role);
      localStorage.setItem("nova-mobile-signup", "1");
    } catch {}
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/mobile";
  };

  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";

  return (
    <main className={`mobile-login-page theme-${activeTheme}`}>
      <section className="mobile-login-card">
        <button type="button" className="mobile-login-link" onClick={() => router.push("/mobile/login")}>← 로그인으로 돌아가기</button>
        <span className="mobile-eyebrow">NOVA AI SPORTS PLATFORM</span>
        <h1>회원가입</h1>
        <p className="mobile-login-subtitle">데스크톱과 동일한 NOVA 회원계정을 만듭니다.</p>

        <form onSubmit={submit} className="mobile-login-form">
          <label>이름<input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" autoComplete="name" required /></label>
          <label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" autoComplete="email" required /></label>

          <div className="mobile-login-roles" aria-label="사용자 유형">
            {roles.map((item) => (
              <button key={item.value} type="button" className={`mobile-login-role ${role === item.value ? "selected" : ""}`} onClick={() => setSignupRole(item.value)}>
                <strong>{item.label}</strong><small>{item.description}</small>
              </button>
            ))}
          </div>

          <div className="mobile-login-message">
            <label className="mobile-signup-check"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /><span><a href="/terms" target="_blank" rel="noreferrer">이용약관</a>에 동의합니다. (필수)</span></label>
            <label className="mobile-signup-check"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span><a href="/terms#privacy" target="_blank" rel="noreferrer">개인정보처리방침</a>에 동의합니다. (필수)</span></label>
          </div>

          <button type="submit" className="mobile-login-primary">회원가입</button>
        </form>

        {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
        <button type="button" className="mobile-login-secondary" onClick={() => { window.location.href = "/api/auth/kakao?mode=signup"; }}>카카오로 회원가입</button>
        <button type="button" className="mobile-login-link" onClick={() => router.push("/mobile/login")}>이미 계정이 있습니다. 로그인</button>
        {message && <div className="mobile-login-message" role="alert">{message}</div>}
      </section>
    </main>
  );
}
