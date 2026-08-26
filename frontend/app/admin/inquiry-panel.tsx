"use client";

import { useMemo, useState } from "react";

type Inquiry = { id: string; user: string; type: string; content: string; status: string; received: string; reply?: string };

const seed: Inquiry[] = [
  { id: "Q-260824-107", user: "김도현", type: "결제", content: "구독 결제가 중복되었습니다.", status: "답변 대기", received: "10:02" },
  { id: "Q-260824-103", user: "최유진", type: "AI 분석", content: "AI 분석 결과가 표시되지 않습니다.", status: "답변 대기", received: "09:31" },
  { id: "Q-260823-096", user: "정하늘", type: "선수 관리", content: "보호자 계정 연결 문의", status: "처리 중", received: "어제 18:24" },
  { id: "Q-260823-091", user: "박서준", type: "환불", content: "환불 처리 일정이 궁금합니다.", status: "답변 완료", received: "어제 15:10", reply: "환불 요청을 확인한 후 처리하겠습니다." },
  { id: "Q-260822-074", user: "이서연", type: "계정", content: "비밀번호를 재설정하고 싶습니다.", status: "답변 완료", received: "08/22 11:20", reply: "비밀번호 재설정 안내를 보내드렸습니다." },
];

export default function InquiryPanel() {
  const [rows, setRows] = useState<Inquiry[]>(() => {
    try { const raw = localStorage.getItem("nova-inquiries"); return raw ? JSON.parse(raw) : seed; } catch { return seed; }
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("전체");
  const [sort, setSort] = useState("newest");
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type))), [rows]);
  const stats = useMemo(() => types.map((type) => ({ type, count: rows.filter((r) => r.type === type).length })), [rows, types]);
  const visible = useMemo(() => {
    const next = filter === "전체" ? [...rows] : rows.filter((r) => r.type === filter);
    if (sort === "type") return next.sort((a, b) => a.type.localeCompare(b.type, "ko") || a.id.localeCompare(b.id, "ko"));
    if (sort === "status") return next.sort((a, b) => a.status.localeCompare(b.status, "ko") || a.id.localeCompare(b.id, "ko"));
    if (sort === "user") return next.sort((a, b) => a.user.localeCompare(b.user, "ko") || a.id.localeCompare(b.id, "ko"));
    if (sort === "oldest") return next.reverse();
    return next;
  }, [filter, rows, sort]);
  const save = (id: string) => {
    const reply = drafts[id]?.trim(); if (!reply) return;
    const next = rows.map((r) => r.id === id ? { ...r, reply, status: "답변 완료" } : r);
    setRows(next); localStorage.setItem("nova-inquiries", JSON.stringify(next)); setDrafts((d) => ({ ...d, [id]: "" }));
  };
  return <section className="admin-panel">
    <div className="admin-panel-head"><div><span>1:1 SUPPORT</span><h2>고객 문의</h2><p>문의에 직접 답변하고 유형별 접수 현황을 확인합니다.</p></div><b className="admin-count-badge">대기 {rows.filter((r) => r.status !== "답변 완료").length}건</b></div>
    <div className="admin-inquiry-stats">{stats.map((s) => <article key={s.type}><span>{s.type}</span><strong>{s.count}</strong><small>건</small></article>)}</div>
    <div className="admin-research-filters"><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="전체">전체 문의 유형</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select><label>정렬<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">최신 문의순</option><option value="oldest">오래된 문의순</option><option value="status">상태순</option><option value="type">유형순</option><option value="user">사용자순</option></select></label></div>
    <div className="admin-table-wrap"><table><thead><tr><th>문의 번호</th><th>사용자</th><th>유형</th><th>내용</th><th>상태</th><th>답변</th></tr></thead><tbody>{visible.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.user}</td><td>{r.type}</td><td>{r.content}</td><td><span className="admin-status">{r.status}</span></td><td><div className="admin-inquiry-reply"><textarea value={drafts[r.id] ?? r.reply ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))} placeholder={r.reply ? "답변 수정" : "답변 입력"} rows={2}/><button className="admin-primary-button" onClick={() => save(r.id)} disabled={!((drafts[r.id] ?? r.reply ?? "").trim())}>답변 저장</button></div></td></tr>)}</tbody></table></div>
  </section>;
}
