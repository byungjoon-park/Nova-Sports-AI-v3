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

    const loadNotices = async () => {
      const candidates: Notice[] = [];

      try {
        const response = await fetch(`/latest-notice.json?ts=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data?.notice?.title && data?.notice?.body) candidates.push(data.notice as Notice);
        }
      } catch {}

      try {
        const response = await fetch(`/api/notices?ts=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.notices)) candidates.push(...(data.notices as Notice[]));
        }
      } catch {}

      if (active && candidates.length) {
        candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotice(candidates[0]);
      }
    };

    loadNotices();

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
