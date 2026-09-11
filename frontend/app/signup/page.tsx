/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthStore, registerUser, requestTeamJoin, NovaUserRole } from "../../lib/nova-auth";
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
  const { setRole } = useNovaSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setSignupRole] = useState<Exclude<NovaUserRole, "admin">>("athlete");
  const [inviteCode, setInviteCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [kakaoConnected, setKakaoConnected] = useState(false);

  const requiresCode = role === "coach" || role === "athlete" || role === "parent";

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
    if (requiresCode && !inviteCode.trim()) {
      setMessage(role === "parent" ? "학부모 인증번호를 입력하세요." : "팀 인증번호를 입력하세요.");
      return;
    }

    if (role === "coach" || role === "athlete") {
      const normalizedCode = inviteCode.trim().toUpperCase();
      const invite = getAuthStore().invites.find(
        (item) =>
          item.code === normalizedCode &&
          item.status === "pending" &&
          item.role === role &&
          new Date(item.expiresAt).getTime() >= Date.now(),
      );
      if (!invite) {
        setMessage("유효하지 않거나 만료된 팀 인증번호입니다.");
        return;
      }
    }

    const user = registerUser({ name, email, role });

    if (role === "coach" || role === "athlete") {
      requestTeamJoin(inviteCode, user.id);
    }

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
    <main className="nova-signup-page theme-ivory" data-theme="ivory">
      <section className="signup-card">
        <button className="signup-back" type="button" onClick={() => router.push("/login")}>← 로그인</button>
        <span className="signup-eyebrow">NOVA SPORTS AI</span>
        <h1>회원가입</h1>
        <p>계정을 만들고 NOVA Sports AI를 시작하세요.</p>
        <div className="signup-free-trial">신규 가입자는 14일간 무료로 사용할 수 있습니다.</div>

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
                <button
                  key={item.value}
                  type="button"
                  className={role === item.value ? "selected" : ""}
                  onClick={() => {
                    setSignupRole(item.value);
                    setInviteCode("");
                    setMessage("");
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          {requiresCode && (
            <label>
              {role === "parent" ? "학부모 인증번호" : "팀 인증번호"}
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder={role === "parent" ? "자녀에게 받은 인증번호" : "감독에게 받은 팀 인증번호"}
                autoComplete="one-time-code"
                required
              />
            </label>
          )}

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
