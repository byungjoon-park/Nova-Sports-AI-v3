import React from "react";
import type { PerformanceHistoryPoint } from "../../lib/performance/report-history";

type Props = {
  points: PerformanceHistoryPoint[];
};

export default function PerformanceTrend({ points }: Props) {
  if (!points.length) {
    return (
      <section className="performance-trend">
        <h2>퍼포먼스 점수 추이</h2>
        <p>측정 데이터가 쌓이면 날짜별 점수 추이가 표시됩니다.</p>
      </section>
    );
  }

  const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(...ordered.map((p) => p.score), 100);
  const min = Math.min(...ordered.map((p) => p.score), 0);

  return (
    <section className="performance-trend" aria-labelledby="performance-trend-title">
      <div>
        <span className="card-eyebrow">TREND</span>
        <h2 id="performance-trend-title">퍼포먼스 점수 추이</h2>
      </div>

      <div className="performance-trend-table">
        {ordered.map((point, index) => {
          const previous = ordered[index - 1]?.score;
          const change = previous == null ? null : point.score - previous;

          return (
            <div className="performance-trend-row" key={`${point.date}-${index}`}>
              <time>{point.date}</time>
              <span>{point.score}/100</span>
              <span>
                {change == null ? "—" : `${change > 0 ? "+" : ""}${change}`}
              </span>
              <progress max={max} value={point.score} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
