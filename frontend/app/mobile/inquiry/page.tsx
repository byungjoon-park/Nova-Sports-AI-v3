"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NovaTopBar from "../../../components/NovaTopBar";
import { getCurrentUser } from "../../../lib/nova-auth";
import "../mobile.css";

type InquiryRow = {
  id: string;
  user: string;
  userEmail: string;
  type: string;
  content: string;
  status: string;
  received: string;
  createdAt: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function MobileInquiryPage() {
  const router = useRouter();
  const inquiryRef = useRef<HTMLElement | null>(null);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [type, setType] = useState("일반");
  const [inquiryContent, setInquiryContent] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace("/mobile/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const askAssistant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || !consent || chatBusy) return;

    const nextMessages = [...messages, { role: "user" as const, content: question }].slice(-8);
    setMessages(nextMessages);
    setChatInput("");
    setChatError("");
    setChatBusy(true);

    try {
      const response = await fetch("/api/assistant/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, messages: nextMessages }),
      });
      const result = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "답변을 받지 못했습니다.");
      setMessages((current) => [...current, { role: "assistant" as const, content: result.answer! }].slice(-8));
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "AI 상담 연결에 실패했습니다.");
    } finally {
      setChatBusy(false);
    }
  };

  const sendInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !inquiryContent.trim()) return;

    let rows: InquiryRow[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem("nova-inquiries") || "[]");
      rows = Array.isArray(parsed)
        ? parsed.filter((row): row is InquiryRow => typeof row === "object" && row !== null && typeof (row as Record<string, unknown>).id === "string")
        : [];
    } catch {
      rows = [];
    }

    rows.unshift({
      id: `Q-${Date.now()}`,
      user: user.name,
      userEmail: user.email,
      type,
      content: inquiryContent.trim(),
      status: "답변 대기",
      received: new Date().toLocaleString("ko-KR"),
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("nova-inquiries", JSON.stringify(rows));
    setInquiryContent("");
    setSent(true);
  };

  const transferToInquiry = () => {
    const lastQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;
    if (lastQuestion) setInquiryContent(lastQuestion);
    inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!user) return null;

  return (
    <main className="mobile-page theme-ivory">
      <NovaTopBar statusText="AI 시스템 준비" />
      <div className="mobile-page-title">
        <span className="mobile-eyebrow">NOVA SPORTS AI · MOBILE</span>
        <h1>고객 지원</h1>
        <p>AI에게 앱 사용을 문의하거나 담당자에게 1:1 문의를 남겨 주세요.</p>
      </div>

      <section className="mobile-content-card mobile-support-ai-card">
        <div className="mobile-card-heading"><span>AI CUSTOMER SUPPORT</span><strong>AI 상담</strong></div>
        <p className="mobile-note">가입·로그인, 계정, 앱 메뉴와 문의 접수 방법을 안내합니다. 결제 세부 사항이나 건강 관련 질문은 담당자 또는 전문 의료진에게 문의해 주세요.</p>
        <div className="mobile-support-consent">
          <label>
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>입력한 질문이 답변 생성을 위해 OpenAI API로 전송되는 데 동의합니다. 이름·연락처·선수 건강정보는 입력하지 않겠습니다.</span>
          </label>
          <small>앱은 대화 내용을 문의 기록에 자동 저장하지 않습니다. AI 답변은 참고용이며 정확하지 않을 수 있습니다.</small>
        </div>
        {messages.length > 0 && (
          <div className="mobile-support-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`mobile-support-message ${message.role}`} key={`${message.role}-${index}`}>
                <strong>{message.role === "user" ? "나" : "NOVA AI 상담"}</strong>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
        )}
        {chatError && <p className="mobile-camera-error" role="alert">{chatError}</p>}
        <form className="mobile-support-chat-form" onSubmit={askAssistant}>
          <label htmlFor="support-ai-question">문의 내용</label>
          <textarea id="support-ai-question" value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={1200} rows={3} placeholder="예: 비밀번호를 어떻게 변경하나요?" required />
          <button className="mobile-action-button" type="submit" disabled={!consent || chatBusy || !chatInput.trim()}>{chatBusy ? "답변 작성 중…" : "AI에게 질문"}</button>
        </form>
        {messages.some((message) => message.role === "user") && <button className="mobile-secondary-button mobile-support-human-link" type="button" onClick={transferToInquiry}>담당자에게 문의 이어가기</button>}
      </section>

      <section className="mobile-content-card" ref={inquiryRef}>
        <div className="mobile-card-heading"><span>HUMAN SUPPORT</span><strong>1:1 문의</strong></div>
        <p className="mobile-note">AI가 해결하지 못한 문제나 계정·결제 관련 문의를 남겨 주세요.</p>
        <form onSubmit={sendInquiry} className="mobile-account-form">
          <label>문의 유형
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option>일반</option><option>결제</option><option>AI 분석</option><option>계정</option><option>선수 관리</option><option>기타</option>
            </select>
          </label>
          <label>문의 내용
            <textarea value={inquiryContent} onChange={(event) => setInquiryContent(event.target.value)} rows={7} placeholder="문의 내용을 입력하세요." required />
          </label>
          <button className="mobile-action-button" type="submit">문의 접수</button>
          {sent && <p className="mobile-note" role="status">문의가 접수되었습니다. 답변을 기다려 주세요.</p>}
        </form>
      </section>
    </main>
  );
}
