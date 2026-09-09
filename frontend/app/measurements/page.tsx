/* eslint-disable react-hooks/set-state-in-effect */
 "use client";

import { useEffect, useState } from "react";
import NovaTopBar from "../../components/NovaTopBar";
import { getMeasurementRange, saveDailyMeasurement } from "../../lib/nova-measurements";
import { getAthleteProfile } from "../../lib/nova-data";
import "./measurements.css";

const today = "";

export default function MeasurementsPage() {
  const athlete = getAthleteProfile();
  const [date, setDate] = useState(today);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fatigue, setFatigue] = useState("");
  const [performance, setPerformance] = useState("");
  const [recovery, setRecovery] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    const range = getMeasurementRange(date, date);
    const body = range.bodyRecords.at(-1);
    const f = range.fatigueRecords.at(-1);
    const p = range.performanceRecords.at(-1);
    const r = range.recoveryRecords.at(-1);
    setHeight(body?.heightCm?.toString() || "");
    setWeight(body?.weightKg?.toString() || "");
    setFatigue(f?.score?.toString() || "");
    setPerformance(p?.score?.toString() || "");
    setRecovery(r?.score?.toString() || "");
    setNote(f?.note || p?.note || r?.note || "");
  }, [date]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      saveDailyMeasurement({
        date,
        heightCm: height ? Number(height) : undefined,
        weightKg: weight ? Number(weight) : undefined,
        fatigueScore: fatigue ? Number(fatigue) : undefined,
        performanceScore: performance ? Number(performance) : undefined,
        recoveryScore: recovery ? Number(recovery) : undefined,
        note: note.trim() || undefined,
      });
      setMessage("측정값이 저장되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    }
  };

  return (
    <main className="nova-measurements">
      <NovaTopBar />
      <section className="measure-shell">
        <span className="eyebrow">DAILY MEASUREMENT</span>
        <h1>{athlete.name || "선수"} 측정 기록</h1>
        <p>날짜별 측정값을 저장하면 기간별 변화 그래프와 리포트에서 사용할 수 있습니다.</p>

        <form onSubmit={save} className="measure-card">
          <label><span>측정 날짜</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <div className="measure-grid">
            <label><span>키 (cm)</span><input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} placeholder="182.0" /></label>
            <label><span>몸무게 (kg)</span><input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="76.0" /></label>
            <label><span>피로도 (0–100)</span><input type="number" min="0" max="100" value={fatigue} onChange={e => setFatigue(e.target.value)} placeholder="63" /></label>
            <label><span>퍼포먼스 (0–100)</span><input type="number" min="0" max="100" value={performance} onChange={e => setPerformance(e.target.value)} placeholder="87" /></label>
            <label><span>회복 (0–100)</span><input type="number" min="0" max="100" value={recovery} onChange={e => setRecovery(e.target.value)} placeholder="92" /></label>
          </div>
          <label><span>메모</span><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="오늘의 컨디션 또는 측정 메모" /></label>
          <div className="measure-actions">
            <button type="submit">측정값 저장</button>
            {message && <span>{message}</span>}
          </div>
        </form>
      </section>
    </main>
  );
}
