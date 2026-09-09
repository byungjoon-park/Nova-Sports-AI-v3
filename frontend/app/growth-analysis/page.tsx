/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { readNovaAthleteData } from "../../lib/nova-data";
import { useNovaSettings } from "../settings-context";
import NovaTopBar from "../../components/NovaTopBar";
import "./growth-analysis.css";

function latest<T extends { date: string }>(records: T[]) {
  return records.length ? [...records].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null : null;
}

function change(current?: number, previous?: number) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default function GrowthAnalysisPage() {
  const { theme } = useNovaSettings();
  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";
  const [data, setData] = useState<ReturnType<typeof readNovaAthleteData> | null>(null);

  useEffect(() => {
    setData(readNovaAthleteData());
  }, []);

  if (!data) {
    return (
      <main className={`growth-analysis-page theme-${activeTheme}`} data-theme={activeTheme}>
        <NovaTopBar />
        <section className="growth-shell">
          <div className="growth-empty">측정 데이터를 불러오는 중입니다.</div>
        </section>
      </main>
    );
  }

  const athlete = data.athlete;
  const body = [...data.bodyRecords].sort((a, b) => a.date.localeCompare(b.date));
  const performance = [...data.performanceRecords].sort((a, b) => a.date.localeCompare(b.date));
  const jump = [...data.jumpFatigueRecords].sort((a, b) => a.date.localeCompare(b.date));
  const fatigue = [...data.fatigueRecords].sort((a, b) => a.date.localeCompare(b.date));
  const recovery = [...data.recoveryRecords].sort((a, b) => a.date.localeCompare(b.date));

  const latestBody = latest(body);
  const previousBody = body.length > 1 ? body[body.length - 2] : null;
  const latestJump = latest(jump);
  const latestPerformance = latest(performance);
  const latestFatigue = latest(fatigue);
  const latestRecovery = latest(recovery);

  const heightChange = change(latestBody?.heightCm, previousBody?.heightCm);
  const weightChange = change(latestBody?.weightKg, previousBody?.weightKg);
  const bodyRows = body.slice(-8).reverse();

  return (
    <main className={`growth-analysis-page theme-${activeTheme}`} data-theme={activeTheme}>
      <NovaTopBar />
      <section className="growth-shell">
        <header className="growth-header">
          <div>
            <span className="growth-eyebrow">GROWTH / FITNESS ANALYSIS</span>
            <h1>성장 / 체력 분석</h1>
            <p>{athlete.name || "선수"}의 실제 측정 기록을 기준으로 성장과 체력 변화를 확인합니다.</p>
          </div>
        </header>

        <section className="growth-grid">
          <article className="growth-card"><span>키</span><strong>{latestBody?.heightCm != null ? `${latestBody.heightCm} cm` : "—"}</strong><small>{heightChange == null ? "이전 기록 없음" : `${heightChange >= 0 ? "▲" : "▼"} ${Math.abs(heightChange).toFixed(1)}%`}</small></article>
          <article className="growth-card"><span>몸무게</span><strong>{latestBody?.weightKg != null ? `${latestBody.weightKg} kg` : "—"}</strong><small>{weightChange == null ? "이전 기록 없음" : `${weightChange >= 0 ? "▲" : "▼"} ${Math.abs(weightChange).toFixed(1)}%`}</small></article>
          <article className="growth-card"><span>점프력</span><strong>{latestJump ? `${latestJump.currentJumpCm} cm` : "—"}</strong><small>{latestJump ? `전일 ${latestJump.previousJumpCm} cm` : "Camera AI 기록 없음"}</small></article>
          <article className="growth-card"><span>속도</span><strong>—</strong><small>기록 없음</small></article>
          <article className="growth-card"><span>근력</span><strong>—</strong><small>기록 없음</small></article>
        </section>

        <section className="growth-panel">
          <div className="growth-panel-head"><div><span className="growth-eyebrow">GROWTH TREND</span><h2>성장 기록</h2></div><span className="growth-muted">최근 8회</span></div>
          {bodyRows.length ? (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>측정일</th><th>키</th><th>몸무게</th><th>BMI</th></tr></thead>
                <tbody>{bodyRows.map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.heightCm != null ? `${row.heightCm} cm` : "—"}</td><td>{row.weightKg != null ? `${row.weightKg} kg` : "—"}</td><td>{row.bmi != null ? row.bmi.toFixed(1) : "—"}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <div className="growth-empty">측정 기록이 없습니다.</div>}
        </section>

        <section className="growth-grid growth-grid-secondary">
          <article className="growth-panel compact"><span className="growth-eyebrow">PERFORMANCE</span><h2>최근 퍼포먼스</h2><strong>{latestPerformance ? `${latestPerformance.score} / 100` : "—"}</strong><small>{latestPerformance?.date || "기록 없음"}</small></article>
          <article className="growth-panel compact"><span className="growth-eyebrow">RECOVERY</span><h2>최근 회복</h2><strong>{latestRecovery ? `${latestRecovery.score} / 100` : "—"}</strong><small>{latestRecovery?.date || "기록 없음"}</small></article>
          <article className="growth-panel compact"><span className="growth-eyebrow">FATIGUE</span><h2>최근 피로도</h2><strong>{latestFatigue ? `${latestFatigue.score} / 100` : "—"}</strong><small>{latestFatigue?.date || "기록 없음"}</small></article>
        </section>

        <p className="growth-footnote">속도와 근력은 현재 프로젝트에서 실제 측정 데이터가 확인될 때까지 임의의 값을 표시하지 않습니다.</p>
      </section>
    </main>
  );
}
