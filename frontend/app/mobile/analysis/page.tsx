"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../../settings-context";
import NovaTopBar from "../../../components/NovaTopBar";
import { getMeasurementRange } from "../../../lib/nova-measurements";
import "./analysis.css";

type MetricKey = "performance" | "recovery" | "fatigue";
type Metric = { key: MetricKey; label: string; value: number | null; change: number | null; icon: string };

const metricMeta: Record<MetricKey, { label: string; icon: string; description: string }> = {
  performance: { label: "퍼포먼스", icon: "↗", description: "경기력 및 움직임 상태" },
  recovery: { label: "회복", icon: "♡", description: "훈련 이후 회복 상태" },
  fatigue: { label: "피로도", icon: "◒", description: "최근 피로 누적 수준" },
};

export default function MobileAnalysisPage() {
  const router = useRouter();
  const { theme, language } = useNovaSettings();
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState({
    performance: [] as Array<{ date: string; score: number }>,
    recovery: [] as Array<{ date: string; score: number }>,
    fatigue: [] as Array<{ date: string; score: number }>,
  });

  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";
  const isEnglish = language === "en";

  useEffect(() => {
    setMounted(true);
    const range = getMeasurementRange("2000-01-01", "2100-12-31");
    setRecords({
      performance: range.performanceRecords.map((item) => ({ date: item.date, score: item.score })),
      recovery: range.recoveryRecords.map((item) => ({ date: item.date, score: item.score })),
      fatigue: range.fatigueRecords.map((item) => ({ date: item.date, score: item.score })),
    });
  }, []);

  const metrics = useMemo<Metric[]>(() => {
    return (Object.keys(metricMeta) as MetricKey[]).map((key) => {
      const sorted = [...records[key]].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted.at(-1)?.score ?? null;
      const previous = sorted.at(-2)?.score ?? null;
      return { key, label: metricMeta[key].label, value: latest, change: latest != null && previous != null ? latest - previous : null, icon: metricMeta[key].icon };
    });
  }, [records]);

  const performanceTrend = [...records.performance].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const performancePoints = performanceTrend.length > 1
    ? performanceTrend.map((item, index) => {
        const x = (index / (performanceTrend.length - 1)) * 600;
        const y = 220 - (Math.max(0, Math.min(100, item.score)) / 100) * 220;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : "";
  const latestPerformance = performanceTrend.at(-1)?.score ?? null;
  const hasData = metrics.some((metric) => metric.value != null);
  const overall = metrics[0]?.value == null
    ? "데이터 부족"
    : metrics[0].value >= 80 && (metrics[1]?.value ?? 0) >= 80 && (metrics[2]?.value ?? 100) <= 30
      ? "정상 범위"
      : metrics[0].value < 50 || (metrics[1]?.value ?? 100) < 50 || (metrics[2]?.value ?? 0) >= 70
        ? "집중 관리 필요"
        : "관리 필요";

  return (
    <main className={`mobile-analysis theme-${activeTheme}`} data-theme={activeTheme}>
      <NovaTopBar statusText={isEnglish ? "AI System Ready" : "AI 시스템 준비"} />

      <div className="mobile-analysis-shell">
        <header className="mobile-analysis-header">
          <div>
            <span className="mobile-analysis-eyebrow">AI ANALYTICS</span>
            <h1>{isEnglish ? "AI Analysis" : "AI 분석"}</h1>
            <p>{isEnglish ? "Review performance, recovery and fatigue from saved records." : "저장된 측정 기록을 기준으로 퍼포먼스·회복·피로도를 확인합니다."}</p>
          </div>
          <button type="button" className="mobile-analysis-back" onClick={() => router.push("/mobile/dashboard")}>대시보드</button>
        </header>

        <section className="mobile-analysis-status">
          <div>
            <span>종합 상태</span>
            <strong>{mounted ? overall : "—"}</strong>
          </div>
          <p>{hasData ? "저장된 실제 측정 기록을 기준으로 현재 상태를 요약합니다." : "측정 기록을 저장하면 AI 분석 결과가 이 영역에 표시됩니다."}</p>
        </section>

        <section className="mobile-analysis-metrics" aria-label="AI 분석 주요 지표">
          {metrics.map((metric) => (
            <article className="mobile-analysis-metric" key={metric.key}>
              <div className="analysis-metric-top">
                <span className="analysis-metric-icon">{metric.icon}</span>
                <div><span>{metric.label}</span><small>{metricMeta[metric.key].description}</small></div>
              </div>
              <strong>{metric.value ?? "—"}<small>/100</small></strong>
              <em className={metric.change != null && metric.change < 0 && metric.key !== "performance" ? "is-negative" : ""}>
                {metric.change == null ? "변화 —" : `${metric.change > 0 ? "+" : ""}${metric.change}`}
              </em>
            </article>
          ))}
          <article className="mobile-analysis-metric risk-metric">
            <div className="analysis-metric-top">
              <span className="analysis-metric-icon">◇</span>
              <div><span>부상 위험도</span><small>현재 입력 데이터 기준</small></div>
            </div>
            <strong>—<small>/100</small></strong>
            <em>데이터 없음</em>
          </article>
        </section>

        <section className="mobile-analysis-card">
          <div className="mobile-analysis-card-heading">
            <div><span>PERFORMANCE</span><h2>퍼포먼스 추이</h2></div>
            <b>{latestPerformance != null ? `${latestPerformance}점` : "—"}</b>
          </div>
          {performanceTrend.length > 1 ? (
            <>
              <div className="mobile-analysis-chart">
                <div className="analysis-chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
                <div className="analysis-chart-area">
                  {[100, 75, 50, 25, 0].map((line) => <i key={line} style={{ bottom: `${line}%` }} />)}
                  <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
                    <polyline points={performancePoints} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="analysis-chart-labels">{performanceTrend.map((item) => <span key={item.date}>{item.date.slice(5)}</span>)}</div>
            </>
          ) : (
            <div className="mobile-analysis-empty">퍼포먼스 측정 기록이 없습니다.</div>
          )}
        </section>

        <section className="mobile-analysis-card">
          <div className="mobile-analysis-card-heading">
            <div><span>AI TOOLS</span><h2>분석 바로가기</h2></div>
          </div>
          <div className="mobile-analysis-links">
            <button type="button" onClick={() => router.push("/mobile/camera-ai")}>
              <span>◎</span><div><strong>카메라 AI</strong><small>동작 촬영과 AI 분석</small></div><b>›</b>
            </button>
            <button type="button" onClick={() => router.push("/mobile/report")}>
              <span>▤</span><div><strong>리포트</strong><small>선수 데이터 요약과 보고서</small></div><b>›</b>
            </button>
            <button type="button" onClick={() => router.push("/mobile/growth-analysis")}>
              <span>↗</span><div><strong>성장·체력</strong><small>신체와 체력 측정 변화</small></div><b>›</b>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
