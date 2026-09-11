"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  canSendNovaFeedback,
  createNovaFeedback,
  formatNovaFeedbackDate,
  getNovaFeedbackForUser,
  syncNovaFeedbackForUser,
  getNovaFeedbackTargets,
  updateNovaFeedback,
  type NovaFeedback,
} from "../lib/nova-feedback";
import { getCurrentUser, type NovaUser, type NovaUserRole } from "../lib/nova-auth";
import "./nova-feedback-surface.css";

const roleLabel: Record<NovaUserRole, string> = {
  admin: "관리자",
  director: "감독",
  coach: "코치",
  athlete: "선수",
  parent: "학부모",
};

function direction(item: NovaFeedback) {
  return `${roleLabel[item.fromRole]} → ${roleLabel[item.toRole]}`;
}

export default function NovaFeedbackSurface({ placement = "dashboard" }: { placement?: "dashboard" | "players" }) {
  const pathname = usePathname();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [records, setRecords] = useState<NovaFeedback[]>([]);
  const [targets, setTargets] = useState<NovaUser[]>([]);
  const [targetId, setTargetId] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const playersMode = placement === "players";
  const visible = playersMode ? pathname === "/players" : pathname === "/dashboard" || pathname === "/mobile";

  const reload = () => {
    const current = getCurrentUser();
    if (!current) return;
    const nextTargets = getNovaFeedbackTargets(current);
    setUser(current);
    setRecords(getNovaFeedbackForUser(current));
    setTargets(nextTargets);
    setTargetId((currentTarget) => nextTargets.some((item) => item.id === currentTarget) ? currentTarget : nextTargets[0]?.id || "");
  };

  useEffect(() => {
    if (!visible) return;
    reload();
    let cancelled = false;
    const current = getCurrentUser();
    if (current) {
      void syncNovaFeedbackForUser(current).then((next) => {
        if (!cancelled) setRecords(next);
      });
    }
    const onUpdate = () => reload();
    window.addEventListener("nova-feedback-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("nova-feedback-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [pathname]);

  const selectedTarget = useMemo(() => targets.find((item) => item.id === targetId) || null, [targets, targetId]);
  const canCompose = Boolean(user && selectedTarget && canSendNovaFeedback(user, selectedTarget));

  if (!visible || !user || user.role === "admin") return null;

  const submit = () => {
    if (!selectedTarget || !canCompose || !body.trim()) return;
    const saved = createNovaFeedback(user, selectedTarget, body);
    if (saved) {
      setBody("");
      reload();
    }
  };

  const saveEdit = () => {
    if (!editingId || !editingBody.trim()) return;
    const saved = updateNovaFeedback(user, editingId, editingBody);
    if (saved) {
      setEditingId(null);
      setEditingBody("");
      reload();
    }
  };

  return (
    <section className={`nova-feedback-surface ${playersMode ? "is-player-management" : ""}`} aria-label="피드백">
      <div className="nova-feedback-header">
        <div>
          <span className="nova-feedback-eyebrow">NOVA FEEDBACK</span>
          <h2>{playersMode ? "선수별 피드백 관리" : "피드백"}</h2>
          <p>{playersMode ? "선수 한 명을 선택하여 피드백을 남기고 전체 기록을 확인합니다." : "허용된 상대와 주고받은 피드백을 날짜·시간순으로 확인합니다."}</p>
        </div>
        <span className="nova-feedback-count">{records.length}건</span>
      </div>

      {targets.length > 0 && (
        <div className="nova-feedback-compose">
          <div className="nova-feedback-compose-title">피드백 남기기</div>
          <label>
            대상
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {targets.map((target) => <option key={target.id} value={target.id}>{target.name} · {roleLabel[target.role]}</option>)}
            </select>
          </label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="피드백 내용을 입력하세요." rows={4} />
          <button type="button" onClick={submit} disabled={!canCompose || !body.trim()}>피드백 등록</button>
        </div>
      )}

      {records.length === 0 ? (
        <div className="nova-feedback-empty">아직 피드백 기록이 없습니다.</div>
      ) : (
        <div className="nova-feedback-list">
          {records.map((item) => (
            <article className="nova-feedback-item" key={item.id}>
              <div className="nova-feedback-meta">
                <strong>{item.fromName} → {item.toName}</strong>
                <span>{direction(item)}</span>
                <time>{formatNovaFeedbackDate(item.createdAt)}{item.updatedAt ? ` · 수정 ${formatNovaFeedbackDate(item.updatedAt)}` : ""}</time>
              </div>
              {editingId === item.id ? (
                <div className="nova-feedback-edit">
                  <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={4} />
                  <div><button type="button" onClick={saveEdit}>수정 저장</button><button type="button" onClick={() => { setEditingId(null); setEditingBody(""); }}>취소</button></div>
                </div>
              ) : (
                <>
                  <p>{item.body}</p>
                  {(item.fromUserId === user.id || (item.fromEmail || "").toLowerCase() === user.email.toLowerCase()) && <button type="button" className="nova-feedback-edit-link" onClick={() => { setEditingId(item.id); setEditingBody(item.body); }}>수정</button>}
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
