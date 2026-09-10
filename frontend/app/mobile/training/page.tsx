"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../../lib/nova-auth";
import { readNovaAthleteData, type NovaAthleteData } from "../../../lib/nova-data";
import NovaTopBar from "../../../components/NovaTopBar";

export default function MobileTraining() {
  const [data, setData] = useState<NovaAthleteData | null>(null);
  useEffect(() => { const user = getCurrentUser(); if (user?.role === "athlete") setData(readNovaAthleteData()); }, []);
  const records = data?.performanceRecords ? [...data.performanceRecords].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10) : [];
  return <div className="mobile-page"><NovaTopBar statusText="AI 시스템 준비" />
      <div className="mobile-page-title"><span className="mobile-eyebrow">NOVA SPORTS AI · MOBILE</span><h1>훈련</h1><p>저장된 퍼포먼스 기록</p></div><section className="mobile-list">{records.length ? records.map((r) => <article key={r.date} className="mobile-list-row"><div><strong>{r.date}</strong><span>퍼포먼스 기록</span></div><b>{r.score}</b></article>) : <div className="mobile-empty-card">훈련 측정 기록이 없습니다.</div>}</section><MobileNav /></div>;
}
function MobileNav() { return <nav className="mobile-bottom-nav"><Link href="/mobile">홈</Link><Link href="/mobile/analysis">분석</Link><Link className="active" href="/mobile/training">훈련</Link><Link href="/mobile/rehab">재활</Link><Link href="/mobile/report">리포트</Link></nav>; }