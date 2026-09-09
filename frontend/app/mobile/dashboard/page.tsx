"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../../settings-context";
import NovaTopBar from "../../../components/NovaTopBar";
import "./dashboard.css";

const metrics = [
  { label: "퍼포먼스 점수", value: "84", unit: "/100", change: "+4", icon: "↗" },
  { label: "회복 점수", value: "78", unit: "/100", change: "+2", icon: "♡" },
  { label: "피로도", value: "32", unit: "/100", change: "-6", icon: "◒" },
  { label: "부상 위험도", value: "18", unit: "/100", change: "-3", icon: "◇" },
];

const schedule = [
  ["09:00", "근력 훈련", "완료"],
  ["11:30", "카메라 AI 분석", "진행 중"],
  ["15:00", "기술 훈련", "예정"],
  ["18:00", "회복 세션", "예정"],
];

const activity = [
  ["◎", "카메라 AI 분석 완료", "2시간 전"],
  ["↗", "수직 점프 테스트", "3시간 전"],
  ["♡", "회복 상태 확인", "5시간 전"],
  ["◇", "부상 위험 업데이트", "어제"],
];

export default function MobileDashboardPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const activeTheme =
    theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";

  return (
    <main className={`mobile-dashboard theme-${activeTheme}`} data-theme={activeTheme}>
      <NovaTopBar statusText="AI 시스템 온라인" />

      <div className="mobile-dashboard-shell">
        <header className="mobile-dashboard-header">
          <div>
            <span className="mobile-dashboard-eyebrow">OVERVIEW</span>
            <h1>대시보드</h1>
            <p>퍼포먼스·회복·훈련 현황을 한눈에 확인합니다.</p>
          </div>
          <div className="mobile-dashboard-header-actions">
            <button type="button" aria-label="검색">⌕</button>
            <button type="button" aria-label="알림" className="has-badge">♧<span>3</span></button>
          </div>
        </header>

        <section className="mobile-dashboard-notice">
          <div className="notice-copy">
            <span className="notice-icon">!</span>
            <div>
              <span>공지사항</span>
              <strong>NOVA V3 AI 분석 시스템 업데이트 안내</strong>
              {noticeOpen && <p>새로운 카메라 AI 분석과 선수 퍼포먼스 분석 기능이 추가되었습니다.</p>}
            </div>
          </div>
          <button type="button" onClick={() => setNoticeOpen(v => !v)}>
            {noticeOpen ? "접기" : "자세히"}
          </button>
        </section>

        <section className="mobile-metrics-grid">
          {metrics.map((metric) => (
            <article className="mobile-metric-card" key={metric.label}>
              <div className="metric-card-top">
                <span className="metric-icon">{metric.icon}</span>
                <span>{metric.label}</span>
              </div>
              <div className="metric-number">{metric.value}<small>{metric.unit}</small></div>
              <span className="metric-change">{metric.change}</span>
              <div className="metric-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </article>
          ))}
        </section>

        <section className="mobile-dashboard-card insight-card">
          <div className="mobile-card-heading">
            <div><span>AI INSIGHT</span><h2>AI 인사이트</h2></div>
            <button type="button" onClick={() => router.push("/mobile/analysis")}>AI 분석 →</button>
          </div>
          <div className="insight-body">
            <span className="insight-badge">✦</span>
            <div>
              <p>현재 훈련 강도는 적절합니다. 회복 점수가 양호하며 부상 위험도는 낮은 상태입니다.</p>
              <strong>최근 점프 및 좌측 무릎 부하는 다음 분석에서 우선 확인하세요.</strong>
            </div>
          </div>
        </section>

        <section className="mobile-dashboard-card trend-card">
          <div className="mobile-card-heading">
            <div><span>PERFORMANCE</span><h2>퍼포먼스 추이</h2></div>
            <select defaultValue="7" aria-label="기간">
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
            </select>
          </div>
          <div className="mobile-chart">
            <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            <div className="chart-area">
              <span className="grid-line g100" /><span className="grid-line g75" />
              <span className="grid-line g50" /><span className="grid-line g25" />
              <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
                <polyline points="0,155 100,130 200,142 300,92 400,105 500,58 600,70"
                  fill="none" stroke="currentColor" strokeWidth="5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <b>84</b>
            </div>
          </div>
          <div className="chart-labels"><span>9/3</span><span>9/4</span><span>9/5</span><span>9/6</span><span>9/7</span><span>9/8</span><span>9/9</span></div>
        </section>

        <section className="mobile-dashboard-card schedule-card">
          <div className="mobile-card-heading">
            <div><span>TRAINING</span><h2>오늘의 일정</h2></div>
            <button type="button">전체 보기</button>
          </div>
          <div className="schedule-list">
            {schedule.map(([time, title, status]) => (
              <div className="schedule-row" key={`${time}-${title}`}>
                <time>{time}</time><strong>{title}</strong>
                <span className={`schedule-status ${status === "완료" ? "done" : status === "진행 중" ? "progress" : "upcoming"}`}>{status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mobile-dashboard-card activity-card">
          <div className="mobile-card-heading">
            <div><span>ACTIVITY</span><h2>최근 활동</h2></div>
            <button type="button">전체 보기</button>
          </div>
          <div className="activity-list">
            {activity.map(([icon, title, time]) => (
              <div className="activity-row" key={title}>
                <span className="activity-icon">{icon}</span>
                <div><strong>{title}</strong><span>{time}</span></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
