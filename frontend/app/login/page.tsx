"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInDemoUser, signInUser, NovaUserRole } from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";
import "./login.css";
import "../splash.css";

const demoAccounts: Array<{ label: string; role: NovaUserRole; email: string; name: string }> = [
  { label: "관리자", role: "admin", email: "admin@nova.ai", name: "NOVA Admin" },
  { label: "감독", role: "director", email: "director@nova.ai", name: "Team Director" },
  { label: "코치", role: "coach", email: "coach@nova.ai", name: "Team Coach" },
  { label: "선수", role: "athlete", email: "athlete@nova.ai", name: "NOVA Athlete" },
  { label: "학부모", role: "parent", email: "parent@nova.ai", name: "NOVA Parent" },
];

const roleLabel: Record<NovaUserRole, string> = {
  admin: "관리자",
  director: "감독",
  coach: "코치",
  athlete: "선수",
  parent: "학부모",
};

function settingsRole(role: NovaUserRole) {
  return role;
}

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
    const uiRole = settingsRole(role);
    try {
      localStorage.setItem("nova-role", uiRole);
      localStorage.setItem("nova-active-role", role);
      localStorage.setItem("nova-login-role", role);
      window.dispatchEvent(new CustomEvent("nova-settings-change", { detail: { role: uiRole, activeRole: role } }));
    } catch {}
    setRole(uiRole);
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

  const useDemo = (account: typeof demoAccounts[number]) => {
    const user = signInDemoUser(account);
    try {
      localStorage.setItem("nova-demo-role", user.role);
      localStorage.setItem("nova-demo-email", user.email);
    } catch {}
    setMessage(`${roleLabel[user.role]} 계정으로 로그인했습니다.`);
    goAfterLogin(user.role);
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

        <div className="demo-block">
          <span>개발 테스트 계정</span>
          <div className="demo-grid">
            {demoAccounts.map((account) => (
              <button key={account.role} type="button" onClick={() => useDemo(account)}>
                <strong>{account.label}</strong><small>{account.email}</small>
              </button>
            ))}
          </div>
        </div>

        {message && <div className="login-message">{message}</div>}
      </section>
    </main>
  );
}
