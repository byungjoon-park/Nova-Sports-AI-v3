"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import "./dashboard.css";

type Metric = {
  key: "performance" | "recovery" | "load" | "risk";
  title: string;
  value: string;
  unit: string;
  change: string;
  positive: boolean;
  icon: string;
};



const DASHBOARD_COPY = {
  ko: {
    system: "AI 시스템 온라인", operational: "모든 시스템 정상",
    overview: "개요", dashboard: "대시보드", analytics: "AI 분석", camera: "카메라 AI",
    athletes: "선수 관리", analysis: "동작분석", health: "건강 및 재활", medical: "재활관리",
    report: "리포트", management: "관리", coach: "감독 / 코치", team: "팀", adminStats: "관리자 통계",
    settings: "환경설정", adminMode: "관리자 모드", profile: "프로필", logout: "로그아웃",
    welcome: "John Kim님, 다시 오신 것을 환영합니다", search: "검색", notification: "알림",
    notice: "공지사항", noticeTitle: "NOVA V3 AI 분석 시스템 업데이트 안내",
    noticeBody: "새로운 카메라 AI 분석 기능과 선수 퍼포먼스 분석 기능이 추가되었습니다. 자세한 내용은 업데이트 안내에서 확인할 수 있습니다.",
    details: "자세히 보기", collapse: "접기", expand: "펼치기", hide: "7일간 보지 않기", close: "공지 닫기",
    insightEyebrow: "AI 인사이트", insight: "AI 인사이트", viewDetails: "자세히 보기 →",
    insightBody: "현재 훈련 강도는 적절합니다.|회복 점수가 양호하며, 부상 위험도는 낮은 상태입니다.|다만 최근 점프 및 좌측 무릎에 부하가 증가하고 있습니다.",
    insightAction: "스트렝스 훈련 시 하체 안정성 강화에 집중하세요.",
    performance: "퍼포먼스", trend: "퍼포먼스 추이", last7: "최근 7일", last30: "최근 30일", last90: "최근 90일",
    training: "훈련", schedule: "오늘의 일정", viewAll: "전체 보기", activity: "활동", recent: "최근 활동", viewActivity: "모든 활동 보기 →",
    strength: "근력 훈련", video: "영상 분석", skill: "기술 훈련", recovery: "회복 세션",
    completed: "완료", progress: "진행 중", upcoming: "예정",
    cameraDone: "카메라 AI 분석 완료", jumpFile: "점프 분석.mp4", recoveryCheck: "회복 상태 확인",
    hrv: "심박변이도", performanceTest: "퍼포먼스 테스트", verticalJump: "수직 점프 테스트",
    injuryRisk: "부상 위험 업데이트", riskLow: "위험도: 낮음", hours2: "2시간 전", hours3: "3시간 전", hours5: "5시간 전", day1: "1일 전",
    metrics: { performance: "퍼포먼스 점수", recovery: "회복 점수", load: "훈련 부하", risk: "부상 위험도" },
    role: { coach: "코치 / 감독", athlete: "선수", parent: "학부모", admin: "관리자 모드" },
  },
  en: {
    system: "AI System Online", operational: "All systems operational",
    overview: "OVERVIEW", dashboard: "Dashboard", analytics: "AI ANALYTICS", camera: "Camera AI",
    athletes: "Athletes", analysis: "Motion Analysis", health: "HEALTH & MEDICAL", medical: "Rehabilitation", report: "Report",
    management: "MANAGEMENT", coach: "Coach / Director", team: "Team", adminStats: "Admin Statistics",
    settings: "Settings", adminMode: "Admin Mode", profile: "Profile", logout: "Log out",
    welcome: "Welcome back, John Kim", search: "Search", notification: "Notifications",
    notice: "NOTICE", noticeTitle: "NOVA V3 AI Analysis System Update",
    noticeBody: "New Camera AI analysis and athlete performance analysis features have been added. See the update guide for details.",
    details: "View Details", collapse: "Collapse", expand: "Expand", hide: "Hide for 7 days", close: "Close notice",
    insightEyebrow: "AI INSIGHT", insight: "AI Insight", viewDetails: "View Details →",
    insightBody: "Current training intensity is appropriate.|Recovery score is good and injury risk is low.|However, recent jumping and left-knee load have increased.",
    insightAction: "Focus on lower-body stability during strength training.",
    performance: "PERFORMANCE", trend: "Performance Trend", last7: "Last 7 Days", last30: "Last 30 Days", last90: "Last 90 Days",
    training: "TRAINING", schedule: "Today's Schedule", viewAll: "View All", activity: "ACTIVITY", recent: "Recent Activity", viewActivity: "View All Activity →",
    strength: "Strength Training", video: "Video Analysis", skill: "Skill Training", recovery: "Recovery Session",
    completed: "Completed", progress: "In Progress", upcoming: "Upcoming",
    cameraDone: "Camera AI Analysis Completed", jumpFile: "Jump Analysis.mp4", recoveryCheck: "Recovery Check",
    hrv: "Heart Rate Variability", performanceTest: "Performance Test", verticalJump: "Vertical Jump Test",
    injuryRisk: "Injury Risk Update", riskLow: "Risk Level: Low", hours2: "2h ago", hours3: "3h ago", hours5: "5h ago", day1: "1d ago",
    metrics: { performance: "Performance Score", recovery: "Recovery Score", load: "Training Load", risk: "Injury Risk" },
    role: { coach: "Coach / Director", athlete: "Athlete", parent: "Parent", admin: "Admin Mode" },
  },
  ja: {
    system: "AIシステム オンライン", operational: "すべてのシステムが正常です",
    overview: "概要", dashboard: "ダッシュボード", analytics: "AI分析", camera: "カメラAI", athletes: "選手管理",
    analysis: "動作分析", health: "健康・医療", medical: "リハビリ管理", report: "レポート",
    management: "管理", coach: "コーチ / 監督", team: "チーム", adminStats: "管理者統計",
    settings: "設定", adminMode: "管理者モード", profile: "プロフィール", logout: "ログアウト",
    welcome: "John Kimさん、おかえりなさい", search: "検索", notification: "通知",
    notice: "お知らせ", noticeTitle: "NOVA V3 AI分析システム更新のお知らせ",
    noticeBody: "新しいカメラAI分析と選手パフォーマンス分析機能が追加されました。詳細は更新案内をご確認ください。",
    details: "詳細を見る", collapse: "折りたたむ", expand: "展開", hide: "7日間表示しない", close: "お知らせを閉じる",
    insightEyebrow: "AIインサイト", insight: "AIインサイト", viewDetails: "詳細を見る →",
    insightBody: "現在のトレーニング強度は適切です。|回復スコアは良好で、負傷リスクは低い状態です。|ただし最近、ジャンプと左膝への負荷が増加しています。",
    insightAction: "ストレングストレーニングでは下肢の安定性を強化してください。",
    performance: "パフォーマンス", trend: "パフォーマンス推移", last7: "過去7日", last30: "過去30日", last90: "過去90日",
    training: "トレーニング", schedule: "本日の予定", viewAll: "すべて見る", activity: "アクティビティ", recent: "最近の活動", viewActivity: "すべての活動を見る →",
    strength: "筋力トレーニング", video: "動画分析", skill: "スキルトレーニング", recovery: "リカバリーセッション",
    completed: "完了", progress: "進行中", upcoming: "予定",
    cameraDone: "カメラAI分析完了", jumpFile: "ジャンプ分析.mp4", recoveryCheck: "回復状態チェック",
    hrv: "心拍変動", performanceTest: "パフォーマンステスト", verticalJump: "垂直跳びテスト",
    injuryRisk: "負傷リスク更新", riskLow: "リスク: 低", hours2: "2時間前", hours3: "3時間前", hours5: "5時間前", day1: "1日前",
    metrics: { performance: "パフォーマンススコア", recovery: "リカバリースコア", load: "トレーニング負荷", risk: "負傷リスク" },
    role: { coach: "コーチ / 監督", athlete: "選手", parent: "保護者", admin: "管理者モード" },
  },
} as const;

const metrics: Metric[] = [
  {
    key: "performance",
    title: "Performance Score",
    value: "87",
    unit: "/100",
    change: "12%",
    positive: true,
    icon: "↗",
  },
  {
    key: "recovery",
    title: "Recovery Score",
    value: "92",
    unit: "/100",
    change: "8%",
    positive: true,
    icon: "♡",
  },
  {
    key: "load",
    title: "Training Load",
    value: "76",
    unit: "/100",
    change: "5%",
    positive: true,
    icon: "▥",
  },
  {
    key: "risk",
    title: "Injury Risk",
    value: "12",
    unit: "/100",
    change: "3%",
    positive: true,
    icon: "◇",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { language, theme, role, openSettings } = useNovaSettings();
  const t = DASHBOARD_COPY[language];
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const [hideAnnouncement, setHideAnnouncement] = useState(false);

  const hideForSevenDays = () => {
    localStorage.setItem(
      "nova-announcement-hidden-until",
      String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    setHideAnnouncement(true);
  };

  const goCameraAI = () => {
    router.push("/camera-ai");
  };

  const goDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <main className="nova-dashboard" data-theme={theme}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <strong>NOVA</strong>
          <span>AI SPORTS PLATFORM</span>
        </div>

        <div className="system-status">
          <span className="status-dot" />

          <div>
            <strong>{t.system}</strong>
            <small>{t.operational}</small>
          </div>
        </div>

        <nav className="dashboard-nav">
          <div className="nav-section">
            <span className="nav-label">{t.overview}</span>

            <button
              className="nav-item active"
              type="button"
              onClick={goDashboard}
            >
              <span>⌂</span>
              {t.dashboard}
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">{t.analytics}</span>

            <button
              className="nav-item"
              type="button"
              onClick={goCameraAI}
            >
              <span>◎</span>
              {t.camera}
            </button>

            <button className="nav-item" type="button">
              <span>♙</span>
              {t.athletes}
            </button>

            <button className="nav-item" type="button">
              <span>▥</span>
              {t.analysis}
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">{t.health}</span>

            <button className="nav-item" type="button" onClick={() => router.push("/medical")}>
              <span>♡</span>
              {t.medical}
            </button>

            <button className="nav-item" type="button">
              <span>▤</span>
              {t.report}
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">{t.management}</span>

            <button className="nav-item" type="button">
              <span>♙</span>
              {t.coach}
            </button>

            <button className="nav-item" type="button">
              <span>▣</span>
              {t.team}
            </button>

            {role === "admin" && (
              <button className="nav-item admin-nav-item" type="button" onClick={() => router.push("/admin")}>
                <span>▤</span>
                {t.adminStats}
              </button>
            )}
          </div>
        </nav>

        <div className="sidebar-user-wrap">
          <button className="sidebar-user" type="button" onClick={() => setUserMenuOpen((value) => !value)} aria-expanded={userMenuOpen}>
            <div className="user-avatar">JK</div>
            <div className="user-info">
              <strong>John Kim</strong>
              <span>{t.role[role]}</span>
            </div>
            <span className="user-more">⌄</span>
          </button>

          {userMenuOpen && (
            <div className="user-menu" role="menu">
              <button type="button" onClick={() => { setUserMenuOpen(false); openSettings(); }}>⚙ {t.settings}</button>
              {role === "admin" && (
                <button type="button" onClick={() => { setUserMenuOpen(false); router.push("/admin"); }}>▤ {t.adminMode}</button>
              )}
            </div>
          )}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{t.dashboard}</h1>
            <p>{t.welcome}</p>
          </div>

          <div className="header-actions">
            <button type="button" aria-label={t.search}>
              ⌕
            </button>

            <button
              type="button"
              aria-label={t.notification}
              className="notification-button"
            >
              ♧
              <span>3</span>
            </button>

            <button className="date-button" type="button">
              ▣ &nbsp; {language === "ko" ? "2024년 5월 19일" : "May 19, 2024"} &nbsp;⌄
            </button>
          </div>
        </header>

        {!hideAnnouncement && (
          <section className="announcement">
            <div className="announcement-main">
              <div className="announcement-icon">!</div>

              <div>
                <div className="announcement-title">
                  <span>{t.notice}</span>

                  <strong>
                    {t.noticeTitle}
                  </strong>
                </div>

                {announcementOpen && (
                  <p>
                    새로운 카메라 AI 분석 기능과 선수 퍼포먼스
                    분석 기능이 추가되었습니다. 자세한 내용은
                    업데이트 안내에서 확인할 수 있습니다.
                  </p>
                )}
              </div>
            </div>

            <div className="announcement-actions">
              <button type="button">{t.details}</button>

              <button
                type="button"
                onClick={() =>
                  setAnnouncementOpen((current) => !current)
                }
              >
                {announcementOpen ? t.collapse : t.expand}
              </button>

              <button type="button" onClick={hideForSevenDays}>
                {t.hide}
              </button>

              <button
                type="button"
                aria-label={t.close}
                onClick={() => setAnnouncementOpen(false)}
              >
                ×
              </button>
            </div>
          </section>
        )}

        <section className="metrics-grid">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.title}>
              <div className="metric-top">
                <div className="metric-icon">{metric.icon}</div>

                <span>{t.metrics[metric.key]}</span>
              </div>

              <div className="metric-value">
                {metric.value}
                <small>{metric.unit}</small>
              </div>

              <div
                className={`metric-change ${
                  metric.positive ? "positive" : "negative"
                }`}
              >
                ▲ {metric.change}
              </div>

              <div className="metric-line">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card insight-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{t.insightEyebrow}</span>
                <h2>{t.insight}</h2>
              </div>

              <button type="button">{t.viewDetails}</button>
            </div>

            <div className="insight-content">
              <div className="insight-badge">✦</div>

              <div>
                <p>
                  {t.insightBody.split("|").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}
                </p>

                <strong>
                  {t.insightAction}
                </strong>
              </div>
            </div>
          </article>

          <article className="dashboard-card trend-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{t.performance}</span>
                <h2>{t.trend}</h2>
              </div>

              <select defaultValue="7">
                <option value="7">{t.last7}</option>
                <option value="30">{t.last30}</option>
                <option value="90">{t.last90}</option>
              </select>
            </div>

            <div className="chart">
              <div className="chart-y">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>

              <div className="chart-area">
                {[100, 75, 50, 25, 0].map((line) => (
                  <div
                    className="chart-grid-line"
                    style={{ bottom: `${line}%` }}
                    key={line}
                  />
                ))}

                <svg
                  className="performance-svg"
                  viewBox="0 0 600 220"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points="0,110 55,92 110,96 165,86 220,90 275,78 330,82 385,65 440,69 495,54 550,58 600,48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="chart-current">87</div>
              </div>
            </div>

            <div className="chart-labels">
              <span>May 13</span>
              <span>May 14</span>
              <span>May 15</span>
              <span>May 16</span>
              <span>May 17</span>
              <span>May 18</span>
              <span>May 19</span>
            </div>
          </article>

          <article className="dashboard-card schedule-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{t.training}</span>
                <h2>{t.schedule}</h2>
              </div>

              <button type="button">{t.viewAll}</button>
            </div>

            <div className="schedule-list">
              <ScheduleItem
                time="09:00"
                title={t.strength}
                status={t.completed}
                type="completed"
              />

              <ScheduleItem
                time="11:00"
                title={t.video}
                status={t.progress}
                type="progress"
              />

              <ScheduleItem
                time="14:00"
                title={t.skill}
                status={t.upcoming}
                type="upcoming"
              />

              <ScheduleItem
                time="16:00"
                title={t.recovery}
                status={t.upcoming}
                type="upcoming"
              />
            </div>
          </article>
        </section>

        <section className="dashboard-card activity-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">{t.activity}</span>
              <h2>{t.recent}</h2>
            </div>

            <button type="button">{t.viewActivity}</button>
          </div>

          <div className="activity-list">
            <ActivityItem
              icon="◎"
              title={t.cameraDone}
              detail={t.jumpFile}
              time={t.hours2}
            />

            <ActivityItem
              icon="♡"
              title={t.recoveryCheck}
              detail={t.hrv}
              time={t.hours3}
            />

            <ActivityItem
              icon="▥"
              title={t.performanceTest}
              detail={t.verticalJump}
              time={t.hours5}
            />

            <ActivityItem
              icon="◇"
              title={t.injuryRisk}
              detail={t.riskLow}
              time={t.day1}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function ScheduleItem({
  time,
  title,
  status,
  type,
}: {
  time: string;
  title: string;
  status: string;
  type: "completed" | "progress" | "upcoming";
}) {
  return (
    <div className="schedule-item">
      <time>{time}</time>

      <strong>{title}</strong>

      <span className={`schedule-status ${type}`}>
        {status}
      </span>
    </div>
  );
}

function ActivityItem({
  icon,
  title,
  detail,
  time,
}: {
  icon: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="activity-item">
      <div className="activity-icon">{icon}</div>

      <div className="activity-info">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>

      <time>{time}</time>
    </div>
  );
}