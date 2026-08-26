import React from "react";
import type { PerformanceResult } from "../../lib/performance/types";

type Props = {
  result: PerformanceResult;
  labels: Record<PerformanceResult["breakdown"][number]["key"], string>;
};

export default function PerformanceBreakdown({ result, labels }: Props) {
  return (
    <section className="performance-breakdown" aria-labelledby="performance-breakdown-title">
      <div className="performance-breakdown-heading">
        <div>
          <span className="card-eyebrow">PERFORMANCE</span>
          <h2 id="performance-breakdown-title">퍼포먼스 점수 산출 내역</h2>
        </div>
        <strong>{result.score}<small>/100</small></strong>
      </div>

      <div className="performance-breakdown-list">
        {result.breakdown.map((item) => (
          <div className="performance-breakdown-row" key={item.key}>
            <div>
              <strong>{labels[item.key]}</strong>
              <span>{item.score}점 × {Math.round(item.weight * 100)}%</span>
            </div>
            <strong>{Math.round(item.contribution * 10) / 10}점</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
