"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NovaTopBar from "../../../components/NovaTopBar";
import { getAuthStore, getCurrentUser, type NovaUser, type NovaUserRole } from "../../../lib/nova-auth";
import "../mobile.css";

type FeedbackMessage = {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: NovaUserRole;
  toId: string;
  toName: string;
  toRole: NovaUserRole;
  body: string;
  createdAt: string;
};

const FEEDBACK_KEY = "nova-feedback-messages";

const roleLabel = (role: NovaUserRole) =>
  role === "director" ? "감독" : role === "coach" ? "코치" : role === "athlete" ? "선수" : role === "parent" ? "학부모" : "관리자";

function readMessages(): FeedbackMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
  } catch {
    return [];
  }
}

function canFeedback(from: NovaUser, to: NovaUser): boolean {
  if (from.id === to.id) return false;
  const pair = new Set([from.role, to.role]);
  if (pair.has("parent") && pair.has("athlete")) return true;
  if (pair.has("director") && pair.has("athlete")) return true;
  if (pair.has("coach") && pair.has("athlete")) return true;
  return false;
}

function allowedTargets(user: NovaUser): NovaUser[] {
  const store = getAuthStore();
  const users = store.users;
  const result: NovaUser[] = [];

  if (user.role === "parent") {
    const childIds = new Set(
      store.guardianLinks
        .filter((link) => link.guardianUserId === user.id && link.status === "active")
        .map((link) => link.athleteUserId),
    );
    users.forEach((candidate) => {
      if (childIds.has(candidate.id) && candidate.role === "athlete" && canFeedback(user, candidate)) result.push(candidate);
    });
  } else if (user.role === "athlete") {
    const teamIds = new Set(store.members.filter((member) => member.userId === user.id && member.status === "active").map((member) => member.teamId));
    users.forEach((candidate) => {
      if (!canFeedback(user, candidate)) return;
      const sharesTeam = store.members.some((member) => teamIds.has(member.teamId) && member.userId === candidate.id && member.status === "active");
      if (sharesTeam) result.push(candidate);
    });
    store.guardianLinks.filter((link) => link.athleteUserId === user.id && link.status === "active").forEach((link) => {
      const parent = users.find((candidate) => candidate.id === link.guardianUserId);
      if (parent && canFeedback(user, parent)) result.push(parent);
    });
  } else if (user.role === "director" || user.role === "coach") {
    const teamIds = new Set(store.members.filter((member) => member.userId === user.id && member.status === "active").map((member) => member.teamId));
    users.forEach((candidate) => {
      if (candidate.role !== "athlete" || !canFeedback(user, candidate)) return;
      const sharesTeam = store.members.some((member) => teamIds.has(member.teamId) && member.userId === candidate.id && member.status === "active");
      if (sharesTeam) result.push(candidate);
    });
  }

  return Array.from(new Map(result.map((item) => [item.id, item])).values());
}

export default function MobileFeedbackPage() {
  const router = useRouter();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [targets, setTargets] = useState<NovaUser[]>([]);
  const [targetId, setTargetId] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace("/mobile/login");
      return;
    }
    setUser(current);
    const allowed = allowedTargets(current);
    setTargets(allowed);
    setTargetId(allowed[0]?.id || "");
    setMessages(readMessages());
  }, [router]);

  const visibleMessages = useMemo(() => {
    if (!user) return [];
    return messages
      .filter((item) => item.fromId === user.id || item.toId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [messages, user]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !body.trim()) return;
    const target = targets.find((item) => item.id === targetId);
    if (!target || !canFeedback(user, target)) return;

    const message: FeedbackMessage = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromId: user.id,
      fromName: user.name,
      fromRole: user.role,
      toId: target.id,
      toName: target.name,
      toRole: target.role,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [message, ...readMessages()];
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
    setMessages(next);
    setBody("");
    setSent(true);
  };

  if (!user) return null;

  return (
    <main className="mobile-page theme-ivory">
      <NovaTopBar statusText="피드백" />
      <div className="mobile-page-title">
        <h1>피드백</h1>
        <p>허용된 상대에게만 피드백 메시지를 남길 수 있습니다.</p>
      </div>

      <section className="mobile-content-card">
        <form onSubmit={submit} className="mobile-account-form">
          <label>
            받는 사람
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={!targets.length}>
              {!targets.length && <option value="">피드백 가능한 상대가 없습니다.</option>}
              {targets.map((target) => <option key={target.id} value={target.id}>{roleLabel(target.role)} · {target.name}</option>)}
            </select>
          </label>
          <label>
            피드백 내용
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="피드백 내용을 입력하세요." required disabled={!targets.length} />
          </label>
          <button className="mobile-action-button" type="submit" disabled={!targets.length}>피드백 남기기</button>
          {sent && <p className="mobile-note">피드백이 저장되었습니다.</p>}
        </form>
      </section>

      <section className="mobile-content-card">
        <div className="mobile-card-heading"><span>HISTORY</span><strong>피드백 기록</strong></div>
        {!visibleMessages.length ? (
          <div className="mobile-empty">아직 피드백 기록이 없습니다.</div>
        ) : (
          <div className="mobile-feedback-list">
            {visibleMessages.map((item) => {
              const created = new Date(item.createdAt);
              return (
                <article key={item.id} className="mobile-feedback-item">
                  <div>
                    <strong>{item.fromId === user.id ? "내가 보낸 피드백" : `${item.fromName}의 피드백`}</strong>
                    <span>{item.fromId === user.id ? `${roleLabel(item.fromRole)} → ${roleLabel(item.toRole)} · ${item.toName}` : `${roleLabel(item.fromRole)} → 나`}</span>
                  </div>
                  <time dateTime={item.createdAt}>{created.toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
