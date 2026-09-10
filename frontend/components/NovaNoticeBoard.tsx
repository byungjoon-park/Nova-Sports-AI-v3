"use client";

import { useEffect, useState } from "react";

type Notice = {
  id: string;
  title: string;
  body: string;
  type: "manual" | "update";
  createdAt: string;
};

export default function NovaNoticeBoard() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/notices", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.notices?.[0]) setNotice(data.notices[0]);
      })
      .catch(() => {});

    const onLocalNotice = (event: Event) => {
      const detail = (event as CustomEvent<Notice>).detail;
      if (detail?.title && detail?.body) setNotice(detail);
    };
    window.addEventListener("nova-notice-updated", onLocalNotice);
    return () => {
      active = false;
      window.removeEventListener("nova-notice-updated", onLocalNotice);
    };
  }, []);

  if (!notice) return null;

  return (
    <aside className="nova-notice-board" aria-label="공지사항">
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.body}</p>
      </div>
      <small>{notice.type === "update" ? "서비스 업데이트" : "관리자 공지"}</small>
    </aside>
  );
}
