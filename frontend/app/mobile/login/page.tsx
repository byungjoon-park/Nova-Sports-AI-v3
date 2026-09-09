"use client";

import "../mobile.css";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { NOVA_TEST_ACCOUNTS, signInDemoUser, signInUser, type NovaUserRole } from "../../../lib/nova-auth";
import { useNovaSettings } from "../../settings-context";


export default function MobileLoginPage() {
  const router = useRouter();
  const { theme, setRole } = useNovaSettings();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const finishLogin = (userRole: NovaUserRole, name: string) => {
    try {
      localStorage.setItem("nova-role", userRole);
      localStorage.setItem("nova-active-role", userRole);
      localStorage.setItem("nova-login-role", userRole);
      window.dispatchEvent(new CustomEvent("nova-settings-change", { detail: { role: userRole, activeRole: userRole } }));
    } catch {}

    setRole(userRole);
    try {
      sessionStorage.setItem("nova-mobile-login-complete", "1");
    } catch {}
    setMessage(`${name} · ${userRole === "director" ? "감독" : userRole === "coach" ? "코치" : userRole === "athlete" ? "선수" : userRole === "parent" ? "학부모" : "관리자"} 로그인 완료`);
    window.location.href = userRole === "admin" ? "/admin" : "/mobile";
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    const demo = NOVA_TEST_ACCOUNTS.find((account) => account.email === normalized);
    if (demo) {
      const user = signInDemoUser(demo);
      finishLogin(user.role, user.name);
      return;
    }

    const user = signInUser(normalized);
    if (!user) {
      setMessage("등록된 계정이 없습니다. 회원가입에서 사용자 유형을 선택하세요.");
      return;
    }
    finishLogin(user.role, user.name);
  };

  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";

  return (
    <main className={`mobile-login-page theme-${activeTheme}`}>
      <section className="mobile-login-card">
        <span className="mobile-eyebrow">NOVA AI SPORTS PLATFORM</span>
        <h1>로그인</h1>
        <p className="mobile-login-subtitle">이메일로 로그인하면 가입된 계정의 역할로 자동 접속합니다.</p>

        <form onSubmit={submit} className="mobile-login-form">
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@nova.ai"
              autoComplete="email"
              required
            />
          </label>
          <button type="submit" className="mobile-login-primary">이메일 로그인</button>
        </form>

        <div className="mobile-login-divider"><span>또는</span></div>

        {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
        <button type="button" className="mobile-login-kakao" onClick={() => { window.location.href = "/api/auth/kakao?mode=signup"; }}>
          <span>K</span> 카카오로 회원가입
        </button>

        <button
          type="button"
          className="mobile-login-secondary"
          onClick={() => router.push("/signup?from=mobile")}
        >
          이메일로 회원가입
        </button>

        <button type="button" className="mobile-login-link" onClick={() => router.push("/")}>기존 서비스로 이동</button>

        {message && <div className="mobile-login-message" role="status">{message}</div>}
      </section>
    </main>
  );
}
