/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser, NovaUserRole } from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";
import "./signup.css";

const roles: Array<{ value: Exclude<NovaUserRole, "admin">; label: string }> = [
  { value: "director", label: "감독" },
  { value: "coach", label: "코치" },
  { value: "athlete", label: "선수" },
  { value: "parent", label: "학부모" },
];

export default function SignupPage() {
  const router = useRouter();
  const { setRole, theme } = useNovaSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setSignupRole] = useState<Exclude<NovaUserRole, "admin">>("athlete");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [kakaoConnected, setKakaoConnected] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kakao") === "connected") {
      setKakaoConnected(true);
      const kakaoEmail = params.get("email");
      const kakaoName = params.get("name");
      if (kakaoEmail) setEmail(kakaoEmail);
      if (kakaoName) setName(kakaoName);
    }
    if (params.get("error")) setMessage("카카오 연결에 실패했습니다. 이메일 회원가입을 이용하세요.");
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
    setRole(user.role);
    try {
      localStorage.setItem("nova-active-role", user.role);
      localStorage.setItem("nova-login-role", user.role);
    } catch {}
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/dashboard";
  };

  const startKakao = () => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/auth/kakao?mode=signup";
  };

  return (
    <main className="nova-signup-page" data-theme={theme}>
      <section className="signup-card">
        <button className="signup-back" type="button" onClick={() => router.push("/login")}>← 로그인</button>
        <span className="signup-eyebrow">NOVA SPORTS AI</span>
        <h1>회원가입</h1>
        <p>계정을 만들고 NOVA Sports AI를 시작하세요.</p><div style={{ margin: "12px 0 18px", padding: "10px 12px", borderRadius: "9px", background: "#f3f7ff", color: "#2457a6", fontSize: "12px" }}>신규 가입자는 14일간 무료로 사용할 수 있습니다.</div>

        {kakaoConnected && <div className="kakao-connected">카카오 계정이 연결되었습니다. 역할을 선택하고 약관에 동의하세요.</div>}

        <button type="button" className="kakao-signup-button" onClick={startKakao}>
          <span className="kakao-dot">K</span> 카카오로 회원가입
        </button>

        <div className="signup-divider"><span>또는 이메일</span></div>

        <form onSubmit={submit}>
          <label>이름<input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" required /></label>
          <label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" autoComplete="email" required /></label>

          <fieldset>
            <legend>사용자 유형</legend>
            <div className="role-grid">
              {roles.map((item) => (
                <button key={item.value} type="button" className={role === item.value ? "selected" : ""} onClick={() => setSignupRole(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="terms-box">
            <label className="check"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span><a href="/terms" target="_blank">이용약관</a>에 동의합니다. <b>(필수)</b></span>
            </label>
            <label className="check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
              <span><a href="/terms#privacy" target="_blank">개인정보처리방침</a>에 동의합니다. <b>(필수)</b></span>
            </label>
          </div>

          <button className="signup-submit" type="submit">회원가입</button>
        </form>
        {message && <div className="signup-message">{message}</div>}
      </section>
    </main>
  );
}
