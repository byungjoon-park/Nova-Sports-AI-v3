/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-location-assign-relative-destination */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NOVA_TEST_ACCOUNTS, signInDemoUser, signInUser, NovaUserRole } from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";
import "./login.css";
import "../splash.css";

const demoAccounts = NOVA_TEST_ACCOUNTS;

const roleLabel: Record<NovaUserRole, string> = {
  admin: "관리자",
  director: "감독",
  coach: "코치",
  athlete: "선수",
  parent: "학부모",
};

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useNovaSettings();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("nova-splash-seen") === "1"; } catch {}
    if (seen) {
      setShowSplash(false);
      return;
    }

    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem("nova-splash-seen", "1"); } catch {}
      setShowSplash(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, []);

  const goAfterLogin = (role: NovaUserRole) => {
    try {
      localStorage.setItem("nova-role", role);
      localStorage.setItem("nova-active-role", role);
      localStorage.setItem("nova-login-role", role);
      window.dispatchEvent(new CustomEvent("nova-settings-change", { detail: { role, activeRole: role } }));
    } catch {}
    setRole(role);
    window.location.href = role === "admin" ? "/admin" : "/dashboard";
  };

  const finish = (emailValue: string) => {
    const normalized = emailValue.trim().toLowerCase();
    const demo = demoAccounts.find((account) => account.email === normalized);
    if (demo) {
      const user = signInDemoUser(demo);
      setMessage(`${roleLabel[user.role]} 계정으로 로그인했습니다.`);
      goAfterLogin(user.role);
      return;
    }
    const user = signInUser(normalized);
    if (!user) {
      setMessage("등록된 계정이 없습니다. 이메일로 회원가입을 진행하세요.");
      return;
    }
    setMessage(`${roleLabel[user.role]} 계정으로 로그인했습니다.`);
    goAfterLogin(user.role);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    finish(email);
  };


  const startKakao = () => {
    window.location.href = "/api/auth/kakao?mode=signup";
  };

  if (showSplash) {
    return (
      <main className="nova-splash" aria-label="NOVA startup splash">
        <div className="nova-splash-grid" aria-hidden="true" />
        <div className="nova-splash-glow" aria-hidden="true" />
        <section className="nova-splash-content">
          <div className="nova-splash-logo">NOVA</div>
          <div className="nova-splash-kicker">AI SPORTS PERFORMANCE PLATFORM</div>
          <h1>AI Sports Performance Platform</h1>
          <p>Smarter Training. Better Performance.</p>
          <div className="nova-splash-loader" aria-hidden="true"><span /></div>
          <small>INITIALIZING NOVA V2</small>
        </section>
      </main>
    );
  }

  return (
    <main className="nova-login-page">
      <section className="login-card">
        <span className="login-eyebrow">NOVA AI SPORTS PLATFORM</span>
        <h1>로그인</h1>
        <p>이메일 또는 카카오 계정으로 로그인할 수 있습니다.</p>

        <form onSubmit={submit} className="login-form">
          <label>
            이메일
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)}
              placeholder="email@nova.ai" autoComplete="email" required />
          </label>
          <button type="submit">이메일 로그인</button>
        </form>

        <div className="login-divider"><span>또는</span></div>
        <button type="button" className="kakao-login-button" onClick={startKakao}>
          <span className="kakao-dot">K</span> 카카오로 회원가입
        </button>

        <button type="button" className="signup-link" onClick={() => router.push("/signup")}>
          이메일로 회원가입
        </button>



        {message && <div className="login-message">{message}</div>}
      </section>
    </main>
  );
}
