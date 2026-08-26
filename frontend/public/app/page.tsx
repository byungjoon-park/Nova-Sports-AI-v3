"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings, localizedRoleLabels } from "../settings-context";
import "./dashboard.css";

type Metric = {
  key: "performance" | "recovery" | "load" | "risk";
  value: string;
  unit: string;
  change: string;
  positive: boolean;
  icon: string;
};

const metrics: Metric[] = [
  { key: "performance", value: "87", unit: "/100", change: "12%", positive: true, icon: "↗" },
  { key: "recovery", value: "92", unit: "/100", change: "8%", positive: true, icon: "♡" },
  { key: "load", value: "76", unit: "/100", change: "5%", positive: true, icon: "▥" },
  { key: "risk", value: "12", unit: "/100", change: "3%", positive: true, icon: "◇" },
];

const copy = {
  ko: {
    online: "AI 시스템 온라인", operational: "모든 시스템 정상", overview: "개요", dashboard: "대시보드", analytics: "AI 분석", camera: "카메라 AI", athletes: "선수 관리", analysis: "AI 분석", health: "건강 및 재활", medical: "재활관리", report: "리포트", management: "관리", coach: "감독 / 코치", team: "팀", admin: "관리자 통계", profile: "프로필", settings: "환경설정", logout: "로그아웃",
    performance: "퍼포먼스 점수", recovery: "회복 점수", load: "훈련 부하", risk: "부상 위험도", welcome: "John Kim님, 다시 오신 것을 환영합니다", search: "검색", notification: "알림", date: "2024년 5월 19일",
    notice: "공지사항", noticeTitle: "NOVA V3 AI 분석 시스템 업데이트 안내", noticeBody: "새로운 카메라 AI 분석 기능과 선수 퍼포먼스 분석 기능이 추가되었습니다. 자세한 내용은 업데이트 안내에서 확인할 수 있습니다.", details: "자세히 보기", collapse: "접기", expand: "펼치기", hide: "7일간 보지 않기", close: "공지 닫기",
    insight: "AI 인사이트", performance: "퍼포먼스", trend: "퍼포먼스 추이", last7: "최근 7일", last30: "최근 30일", last90: "최근 90일", training: "훈련", schedule: "오늘의 일정", viewAll: "전체 보기", activity: "활동", recent: "최근 활동", viewActivity: "모든 활동 보기 →",
    insight1: "현재 훈련 강도는 적절합니다.", insight2: "회복 점수가 양호하며, 부상 위험도는 낮은 상태입니다.", insight3: "다만 최근 점프 및 좌측 무릎에 부하가 증가하고 있습니다.", insight4: "스트렝스 훈련 시 하체 안정성 강화에 집중하세요.", strength: "근력 훈련", video: "영상 분석", skill: "기술 훈련", recoverySession: "회복 세션", completed: "완료", progress: "진행 중", upcoming: "예정", cameraDone: "카메라 AI 분석 완료", jumpFile: "점프 분석.mp4", recoveryCheck: "회복 상태 확인", hrv: "심박변이도", performanceTest: "퍼포먼스 테스트", vertical: "수직 점프 테스트", injury: "부상 위험 업데이트", riskLow: "위험 수준: 낮음", ago2: "2시간 전", ago3: "3시간 전", ago5: "5시간 전", ago1d: "1일 전", viewDetails: "자세히 보기 →", viewActivityButton: "모든 활동 보기 →",
  },
  en: {
    online: "AI System Online", operational: "All systems operational", overview: "OVERVIEW", dashboard: "Dashboard", analytics: "AI ANALYTICS", camera: "Camera AI", athletes: "Athletes", analysis: "AI Analysis", health: "HEALTH & REHABILITATION", medical: "Rehabilitation", report: "Report", management: "MANAGEMENT", coach: "Coach / Director", team: "Team", admin: "Admin Statistics", profile: "Profile", settings: "Settings", logout: "Log out",
    performance: "Performance Score", recovery: "Recovery Score", load: "Training Load", risk: "Injury Risk", welcome: "Welcome back, John Kim", search: "Search", notification: "Notifications", date: "May 19, 2024",
    notice: "Notice", noticeTitle: "NOVA V3 AI Analysis System Update", noticeBody: "New Camera AI and athlete performance analysis features have been added. See the update notice for details.", details: "View Details", collapse: "Collapse", expand: "Expand", hide: "Don't show for 7 days", close: "Close notice",
    insight: "AI Insight", performance: "PERFORMANCE", trend: "Performance Trend", last7: "Last 7 Days", last30: "Last 30 Days", last90: "Last 90 Days", training: "TRAINING", schedule: "Today's Schedule", viewAll: "View All", activity: "ACTIVITY", recent: "Recent Activity", viewActivity: "View All Activity →",
    insight1: "Your current training intensity is appropriate.", insight2: "Your recovery score is good and injury risk is currently low.", insight3: "However, recent jump activity has increased load on the left knee.", insight4: "Focus on lower-body stability during strength training.", strength: "Strength Training", video: "Video Analysis", skill: "Skill Training", recoverySession: "Recovery Session", completed: "Completed", progress: "In Progress", upcoming: "Upcoming", cameraDone: "Camera AI Analysis Completed", jumpFile: "Jump Analysis.mp4", recoveryCheck: "Recovery Check", hrv: "Heart Rate Variability", performanceTest: "Performance Test", vertical: "Vertical Jump Test", injury: "Injury Risk Update", riskLow: "Risk Level: Low", ago2: "2h ago", ago3: "3h ago", ago5: "5h ago", ago1d: "1d ago", viewDetails: "View Details →", viewActivityButton: "View All Activity →",
  },
  ja: {
    online: "AIシステム オンライン", operational: "すべてのシステムが正常です", overview: "概要", dashboard: "ダッシュボード", analytics: "AI分析", camera: "カメラAI", athletes: "選手管理", analysis: "AI分析", health: "健康・リハビリ", medical: "リハビリ管理", report: "レポート", management: "管理", coach: "監督 / コーチ", team: "チーム", admin: "管理者統計", profile: "プロフィール", settings: "設定", logout: "ログアウト",
    performance: "パフォーマンススコア", recovery: "リカバリースコア", load: "トレーニング負荷", risk: "負傷リスク", welcome: "John Kimさん、おかえりなさい", search: "検索", notification: "通知", date: "2024年5月19日",
    notice: "お知らせ", noticeTitle: "NOVA V3 AI分析システム アップデートのお知らせ", noticeBody: "新しいカメラAI分析と選手パフォーマンス分析機能が追加されました。詳細はアップデートのお知らせをご確認ください。", details: "詳細を見る", collapse: "閉じる", expand: "展開", hide: "7日間表示しない", close: "お知らせを閉じる",
    insight: "AIインサイト", performance: "パフォーマンス", trend: "パフォーマンス推移", last7: "過去7日", last30: "過去30日", last90: "過去90日", training: "トレーニング", schedule: "本日の予定", viewAll: "すべて表示", activity: "アクティビティ", recent: "最近の活動", viewActivity: "すべての活動を見る →",
    insight1: "現在のトレーニング強度は適切です。", insight2: "回復スコアは良好で、現在の負傷リスクは低い状態です。", insight3: "ただし、最近のジャンプ動作で左膝への負荷が増加しています。", insight4: "ストレングストレーニングでは下半身の安定性強化に集中してください。", strength: "ストレングストレーニング", video: "動画分析", skill: "スキルトレーニング", recoverySession: "リカバリーセッション", completed: "完了", progress: "進行中", upcoming: "予定", cameraDone: "カメラAI分析完了", jumpFile: "ジャンプ分析.mp4", recoveryCheck: "回復チェック", hrv: "心拍変動", performanceTest: "パフォーマンステスト", vertical: "垂直跳びテスト", injury: "負傷リスク更新", riskLow: "リスクレベル：低", ago2: "2時間前", ago3: "3時間前", ago5: "5時間前", ago1d: "1日前", viewDetails: "詳細を見る →", viewActivityButton: "すべての活動を見る →",
  },
} as const;

const metricLabels = { performance: "performance", recovery: "recovery", load: "load", risk: "risk" } as const;

export default function DashboardPage() {
  const router = useRouter();
  const { language, theme, role, openSettings } = useNovaSettings();
  const t = copy[language];
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const [hideAnnouncement, setHideAnnouncement] = useState(false);

  const hideForSevenDays = () => {
    localStorage.setItem("nova-announcement-hidden-until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setHideAnnouncement(true);
  };

  return (
    <main className="nova-dashboard" data-theme={theme}>
      <aside className="dashboard-sidebar">
        <button className="sidebar-logo" type="button" aria-label={language === "ko" ? "홈" : "Home"} onClick={() => router.push("/")}>
          <strong>NOVA</strong><span>AI SPORTS PLATFORM</span>
        </button>
        <div className="system-status"><span className="status-dot" /><div><strong>{t.online}</strong><small>{t.operational}</small></div></div>
        <nav className="dashboard-nav">
          <div className="nav-section"><span className="nav-label">{t.overview}</span><button className="nav-item active" type="button" onClick={() => router.push("/dashboard")}><span>⌂</span>{t.dashboard}</button></div>
          <div className="nav-section"><span className="nav-label">{t.analytics}</span><button className="nav-item" type="button" onClick={() => router.push("/camera-ai")}><span>◎</span>{t.camera}</button><button className="nav-item" type="button"><span>♙</span>{t.athletes}</button><button className="nav-item" type="button"><span>▥</span>{t.analysis}</button></div>
          <div className="nav-section"><span className="nav-label">{t.health}</span><button className="nav-item" type="button" onClick={() => router.push("/medical")}><span>♡</span>{t.medical}</button><button className="nav-item" type="button"><span>▤</span>{t.report}</button></div>
          <div className="nav-section"><span className="nav-label">{t.management}</span><button className="nav-item" type="button"><span>♙</span>{t.coach}</button><button className="nav-item" type="button"><span>▣</span>{t.team}</button>{role === "admin" && <button className="nav-item admin-nav-item" type="button" onClick={() => router.push("/admin")}><span>▤</span>{t.admin}</button>}</div>
        </nav>
        <div className="sidebar-user-wrap">
          <button className="sidebar-user" type="button" onClick={() => setUserMenuOpen((v) => !v)} aria-expanded={userMenuOpen}>
            <div className="user-avatar">JK</div><div className="user-info"><strong>John Kim</strong><span>{localizedRoleLabels[language][role]}</span></div><span className="user-more">⌄</span>
          </button>
          {userMenuOpen && <div className="user-menu" role="menu">
            <button type="button" onClick={() => { setUserMenuOpen(false); setProfileOpen(true); }}>◉ {t.profile}</button>
            <button type="button" onClick={() => { setUserMenuOpen(false); openSettings(); }}>⚙ {t.settings}</button>
            {role === "admin" && <button type="button" onClick={() => { setUserMenuOpen(false); router.push("/admin"); }}>▤ {t.admin}</button>}
            <button type="button" className="logout-menu-item" onClick={() => { try { localStorage.removeItem("nova-authenticated"); localStorage.removeItem("nova-user-role"); localStorage.removeItem("nova-auth"); localStorage.removeItem("nova-user"); } catch {} setUserMenuOpen(false); router.push("/"); }}>↪ {t.logout}</button>
          </div>}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header"><div><h1>{t.dashboard}</h1><p>{t.welcome}</p></div><div className="header-actions"><button type="button" aria-label={t.search}>⌕</button><button type="button" aria-label={t.notification} className="notification-button">♧<span>3</span></button><button className="date-button" type="button">▣ &nbsp;{t.date}&nbsp;⌄</button></div></header>

        {!hideAnnouncement && <section className="announcement"><div className="announcement-main"><div className="announcement-icon">!</div><div><div className="announcement-title"><span>{t.notice}</span><strong>{t.noticeTitle}</strong></div>{announcementOpen && <p>{t.noticeBody}</p>}</div></div><div className="announcement-actions"><button type="button">{t.details}</button><button type="button" onClick={() => setAnnouncementOpen((v) => !v)}>{announcementOpen ? t.collapse : t.expand}</button><button type="button" onClick={hideForSevenDays}>{t.hide}</button><button type="button" aria-label={t.close} onClick={() => setHideAnnouncement(true)}>×</button></div></section>}

        <section className="metrics-grid">{metrics.map((metric) => <article className="metric-card" key={metric.key}><div className="metric-top"><div className="metric-icon">{metric.icon}</div><span>{t[metricLabels[metric.key]]}</span></div><div className="metric-value">{metric.value}<small>{metric.unit}</small></div><div className={`metric-change ${metric.positive ? "positive" : "negative"}`}>▲ {metric.change}</div><div className="metric-line"><span/><span/><span/><span/><span/><span/><span/></div></article>)}</section>

        <section className="dashboard-grid">
          <article className="dashboard-card insight-card"><div className="card-header"><div><span className="card-eyebrow">{t.insight}</span><h2>{t.insight}</h2></div><button type="button">{t.viewDetails}</button></div><div className="insight-content"><div className="insight-badge">✦</div><div><p>{t.insight1}<br/>{t.insight2}<br/>{t.insight3}</p><strong>{t.insight4}</strong></div></div></article>
          <article className="dashboard-card trend-card"><div className="card-header"><div><span className="card-eyebrow">{t.performance}</span><h2>{t.trend}</h2></div><select defaultValue="7" aria-label={t.trend}><option value="7">{t.last7}</option><option value="30">{t.last30}</option><option value="90">{t.last90}</option></select></div><div className="chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-area">{[100,75,50,25,0].map((line) => <div className="chart-grid-line" style={{bottom:`${line}%`}} key={line}/>) }<svg className="performance-svg" viewBox="0 0 600 220" preserveAspectRatio="none"><polyline points="0,110 55,92 110,96 165,86 220,90 275,78 330,82 385,65 440,69 495,54 550,58 600,48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="chart-current">87</div></div></div><div className="chart-labels"><span>May 13</span><span>May 14</span><span>May 15</span><span>May 16</span><span>May 17</span><span>May 18</span><span>May 19</span></div></article>
          <article className="dashboard-card schedule-card"><div className="card-header"><div><span className="card-eyebrow">{t.training}</span><h2>{t.schedule}</h2></div><button type="button">{t.viewAll}</button></div><div className="schedule-list"><ScheduleItem time="09:00" title={t.strength} status={t.completed} type="completed"/><ScheduleItem time="11:00" title={t.video} status={t.progress} type="progress"/><ScheduleItem time="14:00" title={t.skill} status={t.upcoming} type="upcoming"/><ScheduleItem time="16:00" title={t.recoverySession} status={t.upcoming} type="upcoming"/></div></article>
        </section>

        <section className="dashboard-card activity-card"><div className="card-header"><div><span className="card-eyebrow">{t.activity}</span><h2>{t.recent}</h2></div><button type="button">{t.viewActivityButton}</button></div><div className="activity-list"><ActivityItem icon="◎" title={t.cameraDone} detail={t.jumpFile} time={t.ago2}/><ActivityItem icon="♡" title={t.recoveryCheck} detail={t.hrv} time={t.ago3}/><ActivityItem icon="▥" title={t.performanceTest} detail={t.vertical} time={t.ago5}/><ActivityItem icon="◇" title={t.injury} detail={t.riskLow} time={t.ago1d}/></div></section>
      </section>

      {profileOpen && <div className="nova-profile-backdrop" role="presentation" onMouseDown={() => setProfileOpen(false)}><section className="nova-profile-modal" role="dialog" aria-modal="true" aria-labelledby="nova-profile-title" onMouseDown={(e) => e.stopPropagation()}><div className="nova-profile-head"><div className="user-avatar profile-avatar">JK</div><button type="button" onClick={() => setProfileOpen(false)} aria-label={t.close}>×</button></div><span className="profile-eyebrow">PROFILE</span><h2 id="nova-profile-title">John Kim</h2><p>john.kim@nova.local</p><div className="profile-role">{localizedRoleLabels[language][role]}</div><div className="profile-actions"><button type="button" onClick={() => { setProfileOpen(false); openSettings(); }}>{t.settings}</button><button type="button" className="profile-logout" onClick={() => { try { localStorage.clear(); } catch {} setProfileOpen(false); router.push("/"); }}>{t.logout}</button></div></section></div>}
    </main>
  );
}

function ScheduleItem({ time, title, status, type }: { time: string; title: string; status: string; type: "completed" | "progress" | "upcoming" }) { return <div className="schedule-item"><time>{time}</time><strong>{title}</strong><span className={`schedule-status ${type}`}>{status}</span></div>; }
function ActivityItem({ icon, title, detail, time }: { icon: string; title: string; detail: string; time: string }) { return <div className="activity-item"><div className="activity-icon">{icon}</div><div className="activity-info"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>; }