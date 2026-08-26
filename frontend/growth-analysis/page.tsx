"use client";

import { useMemo } from "react";
import { useNovaSettings } from "../settings-context";
import { getCurrentUser } from "../../lib/nova-auth";
import { readNovaAthleteData, type NovaCameraAIResult } from "../../lib/nova-data";
import "./growth-analysis.css";

type TrendPoint = { date: string; value: number };

function numberFromMetric(result: NovaCameraAIResult | undefined, labels: string[]) {
  if (!result) return null;
  const metric = result.metrics.find((item) => labels.some((label) => item.label.toLowerCase().includes(label.toLowerCase())));
  if (!metric) return null;
  const match = metric.value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function latest<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
}

function formatDate(value?: string) {
  if (!value) return "—";
  return value.replace(/-/g, ".");
}

function TrendChart({ points, unit, empty }: { points: TrendPoint[]; unit: string; empty: string }) {
  if (!points.length) return <div className="growth-empty">{empty}</div>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value));
  const range = Math.max(max - min, 1);

  return (
    <div className="trend-chart" aria-label={`${unit} 추이`}>
      <div className="trend-bars">
        {points.slice(-8).map((point) => {
          const height = 20 + ((point.value - min) / range) * 80;
          return (
            <div className="trend-column" key={`${point.date}-${point.value}`}>
              <span className="trend-value">{point.value}{unit}</span>
              <div className="trend-bar-track"><div className="trend-bar" style={{ height: `${height}%` }} /></div>
              <small>{point.date.slice(5)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GrowthAnalysisPage() {
  const { language } = useNovaSettings();
  const data = readNovaAthleteData();
  const user = getCurrentUser();
  const isEn = language === "en";

  const bodyRecords = [...data.bodyRecords].sort((a, b) => a.date.localeCompare(b.date));
  const fatigueRecords = [...data.fatigueRecords].sort((a, b) => a.date.localeCompare(b.date));
  const performanceRecords = [...data.performanceRecords].sort((a, b) => a.date.localeCompare(b.date));
  const recoveryRecords = [...data.recoveryRecords].sort((a, b) => a.date.localeCompare(b.date));
  const cameraResults = [...data.cameraAIResults].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const latestCamera = cameraResults.at(-1);

  const jumpPoints = useMemo(() => cameraResults
    .map((result) => ({ date: result.completedAt.slice(0, 10), value: numberFromMetric(result, isEn ? ["jump height", "vertical jump"] : ["점프 높이", "수직 점프"]) }))
    .filter((point): point is { date: string; value: number } => point.value !== null), [cameraResults, isEn]);

  const latestBody = latest(bodyRecords);
  const latestPerformance = performanceRecords.at(-1);
  const latestRecovery = recoveryRecords.at(-1);
  const latestFatigue = fatigueRecords.at(-1);
  const latestJump = jumpPoints.at(-1);
  const previousJump = jumpPoints.length > 1 ? jumpPoints.at(-2) : undefined;
  const jumpChange = latestJump && previousJump ? ((latestJump.value - previousJump.value) / previousJump.value) * 100 : null;

  const labels = isEn ? {
    eyebrow: "GROWTH & FITNESS ANALYSIS",
    title: "Growth / Fitness Analysis",
    desc: "Track body growth and performance changes in one place.",
    growth: "Growth",
    fitness: "Fitness",
    height: "Height",
    weight: "Weight",
    performance: "Performance",
    recovery: "Recovery",
    fatigue: "Fatigue",
    jump: "Vertical Jump",
    trend: "Measurement Trend",
    fitnessTrend: "Fitness Trend",
    history: "Recent Measurements",
    noData: "No measurement data yet.",
    camera: "Source: Camera AI",
    gps: "Source: GPS",
    strength: "Strength",
    unavailable: "No recorded data",
    athlete: "Athlete",
    date: "Date",
    change: "Change",
  } : {
    eyebrow: "성장 · 체력 분석",
    title: "성장 / 체력 분석",
    desc: "신체 성장과 체력 변화를 한 화면에서 확인합니다.",
    growth: "성장 분석",
    fitness: "체력 분석",
    height: "키",
    weight: "체중",
    performance: "퍼포먼스",
    recovery: "회복",
    fatigue: "피로도",
    jump: "수직 점프",
    trend: "신체 측정 추이",
    fitnessTrend: "체력 지표 추이",
    history: "최근 측정 기록",
    noData: "아직 측정 기록이 없습니다.",
    camera: "측정 출처: Camera AI",
    gps: "측정 출처: GPS",
    strength: "근력",
    unavailable: "기록 없음",
    athlete: "선수",
    date: "날짜",
    change: "변화",
  };

  return (
    <main className="growth-page">
      <header className="growth-header">
        <div>
          <span className="growth-eyebrow">{labels.eyebrow}</span>
          <h1>{labels.title}</h1>
          <p>{labels.desc}</p>
        </div>
        <div className="growth-athlete">
          <span>{labels.athlete}</span>
          <strong>{data.athlete.name || user?.name || "NOVA Athlete"}</strong>
        </div>
      </header>

      <section className="growth-section">
        <div className="section-title"><span>{labels.growth}</span><h2>{labels.growth}</h2></div>
        <div className="summary-grid">
          <article className="summary-card"><span>{labels.height}</span><strong>{latestBody?.heightCm != null ? `${latestBody.heightCm} cm` : "—"}</strong><small>{latestBody ? formatDate(latestBody.date) : labels.noData}</small></article>
          <article className="summary-card"><span>{labels.weight}</span><strong>{latestBody?.weightKg != null ? `${latestBody.weightKg} kg` : "—"}</strong><small>{latestBody ? formatDate(latestBody.date) : labels.noData}</small></article>
        </div>
        <div className="chart-grid">
          <article className="analysis-card"><div className="card-heading"><div><span>{labels.height}</span><h3>{labels.trend}</h3></div></div><TrendChart points={bodyRecords.filter((x) => x.heightCm != null).map((x) => ({ date: x.date, value: x.heightCm! }))} unit=" cm" empty={labels.noData} /></article>
          <article className="analysis-card"><div className="card-heading"><div><span>{labels.weight}</span><h3>{labels.trend}</h3></div></div><TrendChart points={bodyRecords.filter((x) => x.weightKg != null).map((x) => ({ date: x.date, value: x.weightKg! }))} unit=" kg" empty={labels.noData} /></article>
        </div>
      </section>

      <section className="growth-section">
        <div className="section-title"><span>{labels.fitness}</span><h2>{labels.fitness}</h2></div>
        <div className="fitness-grid">
          <article className="fitness-card"><span>{labels.performance}</span><strong>{latestPerformance ? `${latestPerformance.score}/100` : "—"}</strong><small>{latestPerformance ? formatDate(latestPerformance.date) : labels.noData}</small></article>
          <article className="fitness-card"><span>{labels.recovery}</span><strong>{latestRecovery ? `${latestRecovery.score}/100` : "—"}</strong><small>{latestRecovery ? formatDate(latestRecovery.date) : labels.noData}</small></article>
          <article className="fitness-card"><span>{labels.fatigue}</span><strong>{latestFatigue ? `${latestFatigue.score}/100` : "—"}</strong><small>{latestFatigue ? formatDate(latestFatigue.date) : labels.noData}</small></article>
          <article className="fitness-card"><span>{labels.jump}</span><strong>{latestJump ? `${latestJump.value.toFixed(1)} cm` : "—"}</strong><small>{latestJump ? `${formatDate(latestJump.date)} · ${labels.camera}` : labels.noData}</small></article>
        </div>
        <div className="chart-grid">
          <article className="analysis-card"><div className="card-heading"><div><span>{labels.performance} · {labels.recovery} · {labels.fatigue}</span><h3>{labels.fitnessTrend}</h3></div></div><div className="score-list">
            {[
              [labels.performance, latestPerformance?.score],
              [labels.recovery, latestRecovery?.score],
              [labels.fatigue, latestFatigue?.score],
            ].map(([label, value]) => <div className="score-row" key={String(label)}><span>{label}</span><div className="score-track"><i style={{ width: `${Number(value ?? 0)}%` }} /></div><strong>{value != null ? value : "—"}</strong></div>)}
          </div></article>
          <article className="analysis-card"><div className="card-heading"><div><span>{labels.jump}</span><h3>{labels.fitnessTrend}</h3></div></div><TrendChart points={jumpPoints} unit=" cm" empty={labels.noData} />{jumpChange !== null && <div className="change-note">{labels.change}: {jumpChange >= 0 ? "+" : ""}{jumpChange.toFixed(1)}%</div>}</article>
        </div>
        <div className="source-grid">
          <div><strong>{labels.jump}</strong><span>{latestJump ? labels.camera : labels.unavailable}</span></div>
          <div><strong>{isEn ? "Speed" : "속도"}</strong><span>{labels.unavailable} · {labels.gps}</span></div>
          <div><strong>{labels.strength}</strong><span>{labels.unavailable}</span></div>
        </div>
      </section>

      <section className="growth-section">
        <div className="section-title"><span>{labels.history}</span><h2>{labels.history}</h2></div>
        <div className="history-table">
          <div className="history-row history-head"><span>{labels.date}</span><span>{labels.height}</span><span>{labels.weight}</span><span>{labels.performance}</span><span>{labels.recovery}</span><span>{labels.fatigue}</span></div>
          {bodyRecords.length || performanceRecords.length || recoveryRecords.length || fatigueRecords.length ? [...new Set([...bodyRecords.map(x => x.date), ...performanceRecords.map(x => x.date), ...recoveryRecords.map(x => x.date), ...fatigueRecords.map(x => x.date)])].sort((a,b)=>b.localeCompare(a)).slice(0,10).map(date => {
            const body = bodyRecords.find(x => x.date === date);
            const performance = performanceRecords.find(x => x.date === date);
            const recovery = recoveryRecords.find(x => x.date === date);
            const fatigue = fatigueRecords.find(x => x.date === date);
            return <div className="history-row" key={date}><span>{formatDate(date)}</span><span>{body?.heightCm != null ? `${body.heightCm} cm` : "—"}</span><span>{body?.weightKg != null ? `${body.weightKg} kg` : "—"}</span><span>{performance?.score ?? "—"}</span><span>{recovery?.score ?? "—"}</span><span>{fatigue?.score ?? "—"}</span></div>;
          }) : <div className="history-empty">{labels.noData}</div>}
        </div>
      </section>
    </main>
  );
}
