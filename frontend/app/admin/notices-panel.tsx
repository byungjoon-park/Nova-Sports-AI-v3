"use client";

import { useState } from "react";

export default function NoticeAdminPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");

  const publish = async () => {
    if (!title.trim() || !body.trim()) {
      setMessage("제목과 내용을 입력하세요.");
      return;
    }
    const response = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, type: "manual" }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error || "공지 저장에 실패했습니다.");
      return;
    }
    window.dispatchEvent(new CustomEvent("nova-notice-updated", { detail: data }));
    setTitle("");
    setBody("");
    setMessage("공지사항이 게시되었습니다.");
  };

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div><span>NOTICE</span><h2>공지사항</h2></div>
      </div>
      <label className="admin-field">제목<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지사항 제목" /></label>
      <label className="admin-field">내용<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="전체 사용자에게 전달할 내용을 입력하세요." /></label>
      <button className="admin-primary-button" onClick={publish}>공지 게시</button>
      {message && <p>{message}</p>}
    </section>
  );
}
