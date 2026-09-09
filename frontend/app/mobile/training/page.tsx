"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../../lib/nova-auth";
import { readNovaAthleteData, type NovaAthleteData } from "../../../lib/nova-data";

export default function MobileTraining() {
  const [data, setData] = useState<NovaAthleteData | null>(null);
  useEffect(() => { const user = getCurrentUser(); if (user?.role === "athlete") setData(readNovaAthleteData()); }, []);
  const records = data?.performanceRecords ? [...data.performanceRecords].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10) : [];
  return <div className="mobile-page"><header className="mobile-subheader"><div className="mobile-desktop-header"><div className="mobile-desktop-header-left"><Link href="/mobile" aria-label="뒤로">←</Link><div className="mobile-desktop-brand"><strong>N O V A</strong><span>AI SPORTS PERFORMANCE PLATFORM</span></div></div><div className="mobile-ai-status"><i></i> AI 시스템 준비</div></div><div className="mobile-page-title"><h1>훈련</h1><p>저장된 퍼포먼스 기록</p></div></header><section className="mobile-list">{records.length ? records.map((r) => <article key={r.date} className="mobile-list-row"><div><strong>{r.date}</strong><span>퍼포먼스 기록</span></div><b>{r.score}</b></article>) : <div className="mobile-empty-card">훈련 측정 기록이 없습니다.</div>}</section><MobileNav /></div>;
}
function MobileNav() { return <nav className="mobile-bottom-nav"><Link href="/mobile">홈</Link><Link href="/mobile/analysis">분석</Link><Link className="active" href="/mobile/training">훈련</Link><Link href="/mobile/rehab">재활</Link><Link href="/mobile/report">리포트</Link></nav>; }
