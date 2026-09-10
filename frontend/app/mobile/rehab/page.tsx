"use client";
import NovaTopBar from "../../../components/NovaTopBar";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getCurrentUser } from "../../../lib/nova-auth";
import { readNovaAthleteData, writeNovaAthleteData, type NovaAthleteData } from "../../../lib/nova-data";

export default function MobileRehab() {
  const [data, setData] = useState<NovaAthleteData | null>(null);
  const [area, setArea] = useState("");
  const [exercise, setExercise] = useState("");
  const [note, setNote] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role === "athlete") setData(readNovaAthleteData());
  }, []);

  const records = data?.rehabRecords ? [...data.rehabRecords].sort((a,b) => b.date.localeCompare(a.date)) : [];

  const addRecord = (e: FormEvent) => {
    e.preventDefault();
    if (!data || !area.trim() || !exercise.trim()) return;
    const next = {
      ...data,
      rehabRecords: [
        ...data.rehabRecords,
        { date: new Date().toISOString().slice(0,10), area: area.trim(), exercise: exercise.trim(), completed, note: note.trim() || undefined },
      ],
    };
    writeNovaAthleteData(next);
    setData(next);
    setArea(""); setExercise(""); setNote(""); setCompleted(false);
  };

  return <div className="mobile-page">
    <NovaTopBar statusText="AI 시스템 준비" /><div className="mobile-page-title"><h1>재활</h1><p>재활 기록과 진행 상태를 관리합니다.</p></div>

    <section className="mobile-content-card">
      <div className="mobile-card-heading"><span>REHABILITATION</span><strong>재활 기록 등록</strong></div>
      <form className="mobile-rehab-form" onSubmit={addRecord}>
        <label>부위<input value={area} onChange={e=>setArea(e.target.value)} placeholder="예: 무릎" required /></label>
        <label>운동/치료 내용<input value={exercise} onChange={e=>setExercise(e.target.value)} placeholder="예: 하체 안정화 운동" required /></label>
        <label>메모<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="진행 내용을 입력하세요." rows={3} /></label>
        <label className="mobile-check-row"><input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)} /> 완료된 재활</label>
        <button className="mobile-action-button" type="submit">재활 기록 저장</button>
      </form>
    </section>

    <section className="mobile-list">
      <h2 className="mobile-section-title">최근 재활 기록</h2>
      {records.length ? records.map((r,i)=><article key={`${r.date}-${i}`} className="mobile-list-row rehab"><div><strong>{r.date} · {r.area}</strong><span>{r.exercise}{r.note ? ` · ${r.note}` : ""}</span></div><b>{r.completed ? "완료" : "진행"}</b></article>) : <div className="mobile-empty-card">재활 기록이 없습니다.</div>}
    </section>
    <MobileNav />
  </div>;
}

function MobileNav() { return <nav className="mobile-bottom-nav"><Link href="/mobile">홈</Link><Link href="/mobile/analysis">분석</Link><Link href="/mobile/training">훈련</Link><Link className="active" href="/mobile/rehab">재활</Link><Link href="/mobile/report">리포트</Link></nav>; }
