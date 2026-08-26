 "use client";

import NovaTopBar from "../../../components/NovaTopBar";
import { useEffect, useMemo, useState } from "react";
import { getHistorySummary } from "../../../lib/nova-history";
import { getAthleteProfile } from "../../../lib/nova-data";
import "../measurements.css";
import "./history.css";

const today = "";
const monthAgo = "";

export default function MeasurementHistoryPage() {
  const athlete = getAthleteProfile();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 86400000);
    setEndDate(end.toISOString().slice(0, 10));
    setStartDate(start.toISOString().slice(0, 10));
  }, []);

  const rows = useMemo(() => getHistorySummary(startDate, endDate), [startDate, endDate]);

  return (
    <main className="history-page">
      <NovaTopBar />
      <section className="history-shell">
        <div className="history-heading">
          <span>MEASUREMENT HISTORY</span>
          <h1>{athlete.name || "선수"} 기록 조회</h1>
          <p>저장된 날짜별 측정값을 기간별로 확인합니다.</p>
        </div>

        <div className="history-filter">
          <label>시작일<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label>종료일<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        </div>

        <section className="history-card">
          <div className="history-card-title">
            <h2>신체 성장 및 체성분 변화</h2>
            <small>{startDate} ~ {endDate}</small>
          </div>
          <div className="history-table">
            <div className="history-row history-head">
              <span>날짜</span><span>키</span><span>몸무게</span><span>BMI</span><span>피로도</span><span>퍼포먼스</span><span>회복</span>
            </div>
            {rows.length === 0 ? (
              <div className="history-empty">선택한 기간에 저장된 기록이 없습니다.</div>
            ) : rows.map(row => (
              <div className="history-row" key={row.date}>
                <span>{row.date}</span>
                <span>{row.heightCm != null ? `${row.heightCm.toFixed(1)} cm` : "-"}</span>
                <span>{row.weightKg != null ? `${row.weightKg.toFixed(1)} kg` : "-"}</span>
                <span>{row.bmi != null ? row.bmi.toFixed(1) : "-"}</span>
                <span>{row.fatigue ?? "-"}</span>
                <span>{row.performance ?? "-"}</span>
                <span>{row.recovery ?? "-"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="history-card">
          <div className="history-card-title">
            <h2>기간 요약</h2>
            <small>첫 기록 → 마지막 기록</small>
          </div>
          <div className="history-summary-grid">
            {[
              ["키", rows.at(0)?.heightCm, rows.at(-1)?.heightCm, "cm"],
              ["몸무게", rows.at(0)?.weightKg, rows.at(-1)?.weightKg, "kg"],
              ["BMI", rows.at(0)?.bmi, rows.at(-1)?.bmi, ""],
              ["피로도", rows.at(0)?.fatigue, rows.at(-1)?.fatigue, "/100"],
              ["퍼포먼스", rows.at(0)?.performance, rows.at(-1)?.performance, "/100"],
              ["회복", rows.at(0)?.recovery, rows.at(-1)?.recovery, "/100"],
            ].map(([label, first, last, unit]) => {
              const a = typeof first === "number" ? first : null;
              const b = typeof last === "number" ? last : null;
              const delta = a != null && b != null ? b - a : null;
              return (
                <div className="history-summary" key={label as string}>
                  <span>{label}</span>
                  <b>{b != null ? `${b.toFixed(label === "키" || label === "몸무게" || label === "BMI" ? 1 : 0)}${unit}` : "-"}</b>
                  <small>{delta == null ? "-" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}</small>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
