/* eslint-disable react-hooks/set-state-in-effect */
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import { getAthleteProfile, getAuthStore, getCurrentUser, getUserTeams, saveAthleteProfile, signOutUser } from "../../lib/nova-auth";
import { getMeasurementRange } from "../../lib/nova-measurements";
import "./dashboard.css";
import NovaFeedbackSurface from "../../components/NovaFeedbackSurface";

type Metric = {
  key: "performance" | "recovery" | "fatigue" | "risk";
  value: string;
  unit: string;
  change: string;
  icon: string;
};

const metricIcons: Record<Metric["key"], string> = {
  performance: "↗",
  recovery: "♡",
  fatigue: "◒",
  risk: "◇",
};

const metricKeys = {
  ko: {
    performance: "퍼포먼스 점수",
    recovery: "회복 점수",
    fatigue: "피로도",
    risk: "부상 위험도",
  },
  en: {
    performance: "Performance Score",
    recovery: "Recovery Score",
    fatigue: "Fatigue",
    risk: "Injury Risk",
  },
  ja: {
    performance: "パフォーマンススコア",
    recovery: "リカバリースコア",
    fatigue: "疲労度",
    risk: "負傷リスク",
  },
} as const;

const pageCopy = {
  ko: {
    online: "AI 시스템 온라인",
    operational: "모든 시스템 정상",
    overview: "개요",
    dashboard: "대시보드",
    analytics: "AI 분석",
    camera: "카메라 AI",
    athletes: "선수 관리",
    analysis: "AI 분석",
    growthAnalysis: "성장 / 체력 분석",
    health: "건강 및 재활",
    medical: "재활관리",
    report: "리포트",
    management: "관리",
    coach: "감독 / 코치",
    team: "팀",
    welcome: "다시 오신 것을 환영합니다",
    search: "검색",
    notification: "알림",
    notice: "공지사항",
    noticeTitle: "NOVA V3 AI 분석 시스템 업데이트 안내",
    noticeBody: "새로운 카메라 AI 분석 기능과 선수 퍼포먼스 분석 기능이 추가되었습니다. 자세한 내용은 업데이트 안내에서 확인할 수 있습니다.",
    details: "자세히 보기",
    collapse: "접기",
    expand: "펼치기",
    hide: "7일간 보지 않기",
    close: "공지 닫기",
    insight: "AI 인사이트",
    performance: "퍼포먼스",
    trend: "퍼포먼스 추이",
    last7: "최근 7일",
    last30: "최근 30일",
    last90: "최근 90일",
    training: "훈련",
    schedule: "오늘의 일정",
    viewAll: "전체 보기",
    activity: "활동",
    recent: "최근 활동",
    viewActivity: "모든 활동 보기 →",
    insight1: "현재 훈련 강도는 적절합니다.",
    insight2: "회복 점수가 양호하며, 부상 위험도는 낮은 상태입니다.",
    insight3: "다만 최근 점프 및 좌측 무릎에 부하가 증가하고 있습니다.",
    insight4: "스트렝스 훈련 시 하체 안정성 강화에 집중하세요.",
    strength: "근력 훈련",
    video: "영상 분석",
    skill: "기술 훈련",
    recovery: "회복 세션",
    completed: "완료",
    progress: "진행 중",
    upcoming: "예정",
    cameraDone: "카메라 AI 분석 완료",
    jumpFile: "점프 분석.mp4",
    recoveryCheck: "회복 상태 확인",
    hrv: "심박변이도",
    performanceTest: "퍼포먼스 테스트",
    vertical: "수직 점프 테스트",
    injury: "부상 위험 업데이트",
    riskLow: "위험 수준: 낮음",
    headCoach: "수석 코치",
    profile: "프로필",
    settings: "환경설정",
    logout: "로그아웃",
  },
  en: {
    online: "AI System Online",
    operational: "All systems operational",
    overview: "OVERVIEW",
    dashboard: "Dashboard",
    analytics: "AI ANALYTICS",
    camera: "Camera AI",
    athletes: "Athletes",
    analysis: "AI Analysis",
    growthAnalysis: "Growth / Fitness",
    health: "HEALTH & REHABILITATION",
    medical: "Rehabilitation",
    report: "Report",
    management: "MANAGEMENT",
    coach: "Coach",
    team: "Team",
    welcome: "Welcome back",
    search: "Search",
    notification: "Notifications",
    notice: "Notice",
    noticeTitle: "NOVA V3 AI Analysis System Update",
    noticeBody: "New Camera AI and athlete performance analysis features have been added. See the update notice for details.",
    details: "View Details",
    collapse: "Collapse",
    expand: "Expand",
    hide: "Don't show for 7 days",
    close: "Close notice",
    insight: "AI Insight",
    performance: "PERFORMANCE",
    trend: "Performance Trend",
    last7: "Last 7 Days",
    last30: "Last 30 Days",
    last90: "Last 90 Days",
    training: "TRAINING",
    schedule: "Today's Schedule",
    viewAll: "View All",
    activity: "ACTIVITY",
    recent: "Recent Activity",
    viewActivity: "View All Activity →",
    insight1: "Your current training intensity is appropriate.",
    insight2: "Your recovery score is good and injury risk is currently low.",
    insight3: "However, recent jump activity has increased load on the left knee.",
    insight4: "Focus on lower-body stability during strength training.",
    strength: "Strength Training",
    video: "Video Analysis",
    skill: "Skill Training",
    recovery: "Recovery Session",
    completed: "Completed",
    progress: "In Progress",
    upcoming: "Upcoming",
    cameraDone: "Camera AI Analysis Completed",
    jumpFile: "Jump Analysis.mp4",
    recoveryCheck: "Recovery Check",
    hrv: "Heart Rate Variability",
    performanceTest: "Performance Test",
    vertical: "Vertical Jump Test",
    injury: "Injury Risk Update",
    riskLow: "Risk Level: Low",
    headCoach: "Head Coach",
    profile: "Profile",
    settings: "Settings",
    logout: "Log out",
  },
  ja: {
    online: "AIシステム オンライン",
    operational: "すべてのシステムが正常です",
    overview: "概要",
    dashboard: "ダッシュボード",
    analytics: "AI分析",
    camera: "カメラAI",
    athletes: "選手管理",
    analysis: "AI分析",
    growthAnalysis: "成長・体力分析",
    health: "健康・リハビリ",
    medical: "リハビリ管理",
    report: "レポート",
    management: "管理",
    coach: "監督 / コーチ",
    team: "チーム",
    welcome: "おかえりなさい",
    search: "検索",
    notification: "通知",
    notice: "お知らせ",
    noticeTitle: "NOVA V3 AI分析システム アップデートのお知らせ",
    noticeBody: "新しいカメラAI分析と選手パフォーマンス分析機能が追加されました。詳細はアップデートのお知らせをご確認ください。",
    details: "詳細を見る",
    collapse: "閉じる",
    expand: "展開",
    hide: "7日間表示しない",
    close: "お知らせを閉じる",
    insight: "AIインサイト",
    performance: "パフォーマンス",
    trend: "パフォーマンス推移",
    last7: "過去7日",
    last30: "過去30日",
    last90: "過去90日",
    training: "トレーニング",
    schedule: "本日の予定",
    viewAll: "すべて表示",
    activity: "アクティビティ",
    recent: "最近の活動",
    viewActivity: "すべての活動を見る →",
    insight1: "現在のトレーニング強度は適切です。",
    insight2: "回復スコアは良好で、現在の負傷リスクは低い状態です。",
    insight3: "ただし、最近のジャンプ動作で左膝への負荷が増加しています。",
    insight4: "ストレングストレーニングでは下半身の安定性強化に集中してください。",
    strength: "ストレングストレーニング",
    video: "動画分析",
    skill: "スキルトレーニング",
    recovery: "リカバリーセッション",
    completed: "完了",
    progress: "進行中",
    upcoming: "予定",
    cameraDone: "カメラAI分析完了",
    jumpFile: "ジャンプ分析.mp4",
    recoveryCheck: "回復チェック",
    hrv: "心拍変動",
    performanceTest: "パフォーマンステスト",
    vertical: "垂直跳びテスト",
    injury: "負傷リスク更新",
    riskLow: "リスクレベル：低",
    headCoach: "ヘッドコーチ",
    profile: "プロフィール",
    settings: "設定",
    logout: "ログアウト",
  },
} as const;

export default function DashboardPage() {
  const router = useRouter();
  const { language, theme, role: settingsRole } = useNovaSettings();
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [measurementData, setMeasurementData] = useState({
    performance: [] as Array<{ date: string; score: number }>,
    recovery: [] as Array<{ date: string; score: number }>,
    fatigue: [] as Array<{ date: string; score: number }>,
  });

  useEffect(() => {
    setMounted(true);
    setCurrentUser(getCurrentUser());
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    const range = getMeasurementRange("2000-01-01", "2100-12-31");
    setMeasurementData({
      performance: range.performanceRecords.map((item) => ({ date: item.date, score: item.score })),
      recovery: range.recoveryRecords.map((item) => ({ date: item.date, score: item.score })),
      fatigue: range.fatigueRecords.map((item) => ({ date: item.date, score: item.score })),
    });
  }, [authChecked]);

  // Keep the server render and the first client render identical.
  // Role-specific UI is switched only after hydration has completed.
  const activeRole = mounted
    ? currentUser?.role ?? settingsRole
    : "coach";
  const canSeeManagement =
    activeRole === "admin" ||
    activeRole === "director" ||
    activeRole === "coach";
  const t = pageCopy[language];
  const metricsText = metricKeys[language];

  const roleView = {
    director: {
      title: language === "en" ? "Team Director Dashboard" : "감독 대시보드",
      welcome: language === "en" ? "Team-wide performance, training and report overview." : "팀 전체 퍼포먼스·훈련·리포트를 확인합니다.",
      showTeam: true,
      showManagement: true,
      showMedical: true,
      showReport: true,
      showAnalytics: true,
    },
    coach: {
      title: language === "en" ? "Coach Dashboard" : "코치 대시보드",
      welcome: language === "en" ? "Monitor assigned athletes and training progress." : "담당 선수와 훈련 진행 상황을 확인합니다.",
      showTeam: true,
      showManagement: true,
      showMedical: true,
      showReport: true,
      showAnalytics: true,
    },
    athlete: {
      title: language === "en" ? "Athlete Dashboard" : "선수 대시보드",
      welcome: language === "en" ? "Your performance, recovery and training at a glance." : "내 퍼포먼스·회복·훈련 현황을 확인합니다.",
      showTeam: false,
      showManagement: false,
      showMedical: true,
      showReport: true,
      showAnalytics: true,
    },
    parent: {
      title: language === "en" ? "Parent Dashboard" : "학부모 대시보드",
      welcome: language === "en" ? "View your athlete's performance, recovery and reports." : "자녀의 퍼포먼스·회복·리포트를 확인합니다.",
      showTeam: false,
      showManagement: false,
      showMedical: true,
      showReport: true,
      showAnalytics: true,
    },
    admin: {
      title: language === "en" ? "Admin Dashboard" : "관리자 대시보드",
      welcome: language === "en" ? "Research, platform and business overview." : "연구·플랫폼·매출 현황을 관리합니다.",
      showTeam: true,
      showManagement: true,
      showMedical: true,
      showReport: true,
      showAnalytics: true,
    },
  }[activeRole];

  // Dashboard card data. Keep this derived from the active language copy
  // so the page never references an undeclared `dashboard` object.
  const dashboard = {
    scheduleItems: {
      strength: t.strength,
      video: t.video,
      skill: t.skill,
      recovery: t.recovery,
    },
    status: {
      completed: t.completed,
      progress: t.progress,
      upcoming: t.upcoming,
    },
    activityItems: {
      camera: t.cameraDone,
      jump: t.jumpFile,
      recovery: t.recoveryCheck,
      hrv: t.hrv,
      performance: t.performanceTest,
      vertical: t.vertical,
      injury: t.injury,
      risk: t.riskLow,
    },
    times:
      language === "en"
        ? { two: "2 hours ago", three: "3 hours ago", five: "5 hours ago", day: "Yesterday" }
        : { two: "2시간 전", three: "3시간 전", five: "5시간 전", day: "어제" },
  };

  // Keep the dashboard on the global theme. If no valid theme is available,
  // preserve NOVA's default ivory theme.
  const activeTheme =
    theme === "dark" || theme === "white" || theme === "ivory"
      ? theme
      : "ivory";

  const [now, setNow] = useState<Date | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hideAnnouncement, setHideAnnouncement] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string; updatedAt?: string } | null>(null);
  const [athleteProfile, setAthleteProfile] = useState({ height: "", weight: "", bodyFat: "", position: "", injuryHistory: "" });
  const [parentChildren, setParentChildren] = useState<Array<{ id: string; name: string; profile: ReturnType<typeof getAthleteProfile> }>>([]);
  const [profileSaved, setProfileSaved] = useState(false);
  const [teamOverview, setTeamOverview] = useState<Array<{
    id: string;
    name: string;
    sport: string;
    athletes: number;
    coaches: number;
    pending: number;
    profileComplete: number;
    injuryRecorded: number;
  }>>([]);
  const hideForSevenDays = () => setHideAnnouncement(true);
  useEffect(() => {
    if (activeRole !== "athlete" || !currentUser) return;
    const profile = getAthleteProfile(currentUser.id);
    if (!profile) return;
    setAthleteProfile({
      height: profile.height == null ? "" : String(profile.height),
      weight: profile.weight == null ? "" : String(profile.weight),
      bodyFat: profile.bodyFat == null ? "" : String(profile.bodyFat),
      position: profile.position ?? "",
      injuryHistory: profile.injuryHistory ?? "",
    });
  }, [activeRole, currentUser]);

  useEffect(() => {
    if ((activeRole !== "director" && activeRole !== "coach") || !currentUser) {
      setTeamOverview([]);
      return;
    }

    const store = getAuthStore();
    const teams = getUserTeams(currentUser.id);
    const overview = teams.map((team) => {
      const members = store.members.filter((member) => member.teamId === team.id);
      const activeAthletes = members.filter((member) => member.role === "athlete" && member.status === "active");
      const activeCoaches = members.filter((member) => member.role === "coach" && member.status === "active");
      const pending = members.filter((member) => member.status === "pending").length;
      const profiles = activeAthletes.map((member) => store.athleteProfiles.find((profile) => profile.userId === member.userId));
      const profileComplete = profiles.filter((profile) => Boolean(profile?.height && profile?.weight && profile?.sport && profile?.position)).length;
      const injuryRecorded = profiles.filter((profile) => Boolean(profile?.injuryHistory?.trim())).length;

      return {
        id: team.id,
        name: team.name,
        sport: team.sport || "미입력",
        athletes: activeAthletes.length,
        coaches: activeCoaches.length,
        pending,
        profileComplete,
        injuryRecorded,
      };
    });

    setTeamOverview(overview);
  }, [activeRole, currentUser]);

  useEffect(() => {
    if (activeRole !== "parent" || !currentUser) {
      setParentChildren([]);
      return;
    }

    const store = getAuthStore();
    const linkedIds = new Set(
      store.guardianLinks
        .filter((link) => link.guardianUserId === currentUser.id && link.status === "active")
        .map((link) => link.athleteUserId),
    );

    const children = store.users
      .filter((user) => user.role === "athlete" && linkedIds.has(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        profile: getAthleteProfile(user.id),
      }));

    setParentChildren(children);
  }, [activeRole, currentUser]);

  const saveProfile = () => {
    if (activeRole !== "athlete" || !currentUser) return;
    saveAthleteProfile({
      userId: currentUser.id,
      height: athleteProfile.height ? Number(athleteProfile.height) : undefined,
      weight: athleteProfile.weight ? Number(athleteProfile.weight) : undefined,
      bodyFat: athleteProfile.bodyFat ? Number(athleteProfile.bodyFat) : undefined,
      position: athleteProfile.position.trim() || undefined,
      injuryHistory: athleteProfile.injuryHistory.trim() || undefined,
    });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 1800);
  };


  useEffect(() => {
    if (!authChecked) return;

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // Client-only clock: the initial render stays deterministic for SSR, then
    // the browser clock updates once per second.
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);

    const loadNotice = async () => {
      try {
        const response = await fetch("/api/notice", { cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          if (result?.notice?.title && result?.notice?.body) {
            setNotice(result.notice);
            localStorage.setItem("nova-admin-notice", JSON.stringify(result.notice));
            return;
          }
        }
      } catch {}

      try {
        const raw = localStorage.getItem("nova-admin-notice");
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.title && saved?.body) setNotice(saved);
        }
      } catch {}
    };

    const handleNotice = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.title && detail?.body) setNotice(detail);
    };

    loadNotice();
    window.addEventListener("nova-notice-updated", handleNotice);
    window.addEventListener("storage", loadNotice);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("nova-notice-updated", handleNotice);
      window.removeEventListener("storage", loadNotice);
    };
  }, [authChecked, currentUser, router]);

  const dateLabel = now
    ? language === "en"
      ? now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : now.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
    : "";

  const timeLabel = now
    ? now.toLocaleTimeString(language === "en" ? "en-US" : "ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const latestMetric = (records: Array<{ date: string; score: number }>) => {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.at(-1);
    const previous = sorted.at(-2);
    if (!latest) return { value: "—", change: "—" };
    const delta = previous ? latest.score - previous.score : null;
    return { value: String(latest.score), change: delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}` };
  };

  const performanceMetric = latestMetric(measurementData.performance);
  const recoveryMetric = latestMetric(measurementData.recovery);
  const fatigueMetric = latestMetric(measurementData.fatigue);
  const dashboardMetrics: Metric[] = [
    { key: "performance", value: performanceMetric.value, unit: "/100", change: performanceMetric.change, icon: metricIcons.performance },
    { key: "recovery", value: recoveryMetric.value, unit: "/100", change: recoveryMetric.change, icon: metricIcons.recovery },
    { key: "fatigue", value: fatigueMetric.value, unit: "/100", change: fatigueMetric.change, icon: metricIcons.fatigue },
    { key: "risk", value: "—", unit: "/100", change: "—", icon: metricIcons.risk },
  ];

  const performanceTrend = [...measurementData.performance].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const performancePoints = performanceTrend.length > 1
    ? performanceTrend.map((item, index) => {
        const x = (index / (performanceTrend.length - 1)) * 600;
        const y = 220 - (Math.max(0, Math.min(100, item.score)) / 100) * 220;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : "";
  const performanceLatest = performanceTrend.at(-1)?.score;
  const hasAnyDashboardData = measurementData.performance.length > 0 || measurementData.recovery.length > 0 || measurementData.fatigue.length > 0;
  const dashboardInsight = hasAnyDashboardData
    ? (language === "en" ? "Current dashboard results are based on saved measurement records." : language === "ja" ? "現在のダッシュボード結果は保存された測定記録に基づいています。" : "현재 대시보드 결과는 저장된 측정 기록을 기준으로 표시됩니다.")
    : (language === "en" ? "No measurement data is available for analysis yet." : language === "ja" ? "分析できる測定記録がまだありません。" : "아직 분석할 측정 기록이 없습니다.");

  return (
    <main className={`nova-dashboard theme-${activeTheme}`} data-theme={activeTheme}>
      <aside className="dashboard-sidebar">
        <button
          className="sidebar-logo"
          type="button"
          aria-label={language === "en" ? "Home" : "홈"}
          onClick={() => router.push("/")}
        >
          <strong>NOVA</strong>
          <span>AI SPORTS PLATFORM</span>
        </button>

        <div className="system-status">
          <span className="status-dot" />
          <div>
            <strong>{t.online}</strong>
            <small>{t.operational}</small>
          </div>
        </div>

        <nav className="dashboard-nav">
          <div className="nav-section">
            <span className="nav-label">{t.overview}</span>
            <button className="nav-item active" type="button">
              <span>⌂</span>{t.dashboard}
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">{t.analytics}</span>
            <button className="nav-item" type="button" onClick={() => router.push("/camera-ai")}>
              <span>◎</span>{t.camera}
            </button>
            {canSeeManagement && (
              <button className="nav-item" type="button" onClick={() => router.push("/players")}>
                <span>♙</span>{t.athletes}
              </button>
            )}
            <a className="nav-item" href="/analysis">
              <span>▥</span>{t.analysis}
            </a>
          </div>

          {roleView.showMedical && (
            <div className="nav-section">
              <span className="nav-label">{t.health}</span>
              <button className="nav-item" type="button" onClick={() => router.push("/medical")}>
                <span>♡</span>{t.medical}
              </button>
              {roleView.showReport && (
                <button className="nav-item" type="button" onClick={() => router.push("/report")}>
                  <span>▤</span>{t.report}
                </button>
              )}
            </div>
          )}

          {canSeeManagement && (
            <div className="nav-section">
              <span className="nav-label">{t.management}</span>
              <button className="nav-item" type="button" onClick={() => router.push("/coach-dashboard")}>
                <span>♙</span>{t.coach}
              </button>
              <button className="nav-item" type="button" onClick={() => router.push("/team")}>
                <span>▣</span>{t.team}
              </button>
            </div>
          )}

          {activeRole === "admin" && (
            <div className="nav-section">
              <span className="nav-label">{language === "en" ? "ADMIN" : "관리"}</span>
              <button className="nav-item" type="button" onClick={() => router.push("/admin")}>
                <span>▤</span>{language === "en" ? "Research & Sales" : "연구·매출 통계"}</button>
            </div>
          )}
        </nav>

        <div className="sidebar-user-wrap">
          <button
            className="sidebar-user"
            type="button"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((value) => !value)}
          >
            <div className="user-avatar">JK</div>
            <div className="user-info">
              <strong>John Kim</strong>
              <span>
                {activeRole === "admin"
                  ? (language === "en" ? "Administrator" : language === "ja" ? "管理者" : "관리자")
                  : activeRole === "director"
                    ? (language === "en" ? "Director" : language === "ja" ? "監督" : "감독")
                    : activeRole === "athlete"
                      ? (language === "en" ? "Athlete" : language === "ja" ? "選手" : "선수")
                      : activeRole === "parent"
                        ? (language === "en" ? "Parent" : language === "ja" ? "保護者" : "학부모")
                        : t.headCoach}
              </span>
            </div>
            <span className={`user-more ${userMenuOpen ? "is-open" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {userMenuOpen && (
            <div className="user-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setUserMenuOpen(false); router.push("/profile"); }}>
                <span>◉</span>
                {t.profile}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  window.dispatchEvent(new Event("nova-open-settings"));
                }}
              >
                <span>⚙</span>
                {t.settings}
              </button>

              <div className="user-menu-divider" />

              <button
                type="button"
                role="menuitem"
                className="logout-menu-item"
                onClick={() => {
                  signOutUser();
                  setUserMenuOpen(false);
                  router.replace("/");
                }}
              >
                <span>↪</span>
                {t.logout}
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{roleView.title}</h1>
            <p>{roleView.welcome}</p>
          </div>

          <div className="header-actions">
            <button type="button" aria-label={t.search}>⌕</button>
            <button type="button" aria-label={t.notification} className="notification-button">
              ♧<span>3</span>
            </button>
            <button className="date-button" type="button" aria-label={language === "en" ? "Current date and time" : "현재 날짜와 시간"}>
              ▣ &nbsp;
              {dateLabel || "—"}
              {timeLabel && ` · ${timeLabel}`}
              &nbsp;⌄
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
                  <strong>{notice?.title || t.noticeTitle}</strong>
                </div>
                {announcementOpen && <p>{notice?.body || t.noticeBody}</p>}
                {notice?.updatedAt && (
                  <small className="announcement-updated">
                    {new Date(notice.updatedAt).toLocaleString(language === "en" ? "en-US" : "ko-KR")}
                  </small>
                )}
              </div>
            </div>

            <div className="announcement-actions">
              <button type="button">{t.details}</button>
              <button type="button" onClick={() => setAnnouncementOpen((v) => !v)}>
                {announcementOpen ? t.collapse : t.expand}
              </button>
              <button type="button" onClick={hideForSevenDays}>{t.hide}</button>
              <button type="button" aria-label={t.close} onClick={() => setHideAnnouncement(true)}>×</button>
            </div>
          </section>
        )}

        <section className="metrics-grid">
          {dashboardMetrics.map((metric) => (
            <article
              className="metric-card dashboard-clickable-card"
              key={metric.key}
              role="link"
              tabIndex={0}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
                const route = metric.key === "performance"
                  ? "/analysis"
                  : metric.key === "recovery" || metric.key === "fatigue" || metric.key === "risk"
                    ? "/medical"
                    : "/analysis";
                router.push(route);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  const route = metric.key === "performance"
                    ? "/analysis"
                    : metric.key === "recovery" || metric.key === "fatigue" || metric.key === "risk"
                      ? "/medical"
                      : "/analysis";
                  router.push(route);
                }
              }}
            >
              <div className="metric-top">
                <div className="metric-icon">{metric.icon}</div>
                <span>{metricsText[metric.key]}</span>
              </div>
              <div className="metric-value">
                {metric.value}<small>{metric.unit}</small>
              </div>
              <div className="metric-change positive">▲ {metric.change}</div>
              <div className="metric-line">
                <span /><span /><span /><span /><span /><span /><span />
              </div>
            </article>
          ))}
        </section>

        {(activeRole === "director" || activeRole === "coach") && (
          <section className="dashboard-card team-overview-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{activeRole === "director" ? "TEAM MANAGEMENT" : "ASSIGNED TEAM"}</span>
                <h2>{activeRole === "director" ? "팀 전체 현황" : "담당 팀 현황"}</h2>
              </div>
              <button type="button" onClick={() => router.push("/team")}>팀 관리 →</button>
            </div>

            {teamOverview.length === 0 ? (
              <div className="team-overview-empty">
                <strong>{activeRole === "director" ? "관리 중인 팀이 없습니다." : "담당 팀이 없습니다."}</strong>
                <p>팀에 가입되거나 활성화된 선수 데이터가 연결되면 팀 현황이 표시됩니다.</p>
              </div>
            ) : (
              <>
                <div className="team-summary-grid">
                  <div><span>관리 팀</span><strong>{teamOverview.length}</strong></div>
                  <div><span>전체 선수</span><strong>{teamOverview.reduce((sum, team) => sum + team.athletes, 0)}</strong></div>
                  <div><span>코치</span><strong>{teamOverview.reduce((sum, team) => sum + team.coaches, 0)}</strong></div>
                  <div><span>승인 대기</span><strong>{teamOverview.reduce((sum, team) => sum + team.pending, 0)}</strong></div>
                </div>

                <div className="team-overview-table-wrap">
                  <table className="team-overview-table">
                    <thead>
                      <tr><th>팀</th><th>종목</th><th>선수</th><th>프로필 입력</th><th>부상 이력</th></tr>
                    </thead>
                    <tbody>
                      {teamOverview.map((team) => (
                        <tr key={team.id}>
                          <td><strong>{team.name}</strong></td>
                          <td>{team.sport}</td>
                          <td>{team.athletes}명</td>
                          <td>{team.profileComplete}/{team.athletes}</td>
                          <td>{team.injuryRecorded}/{team.athletes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {activeRole === "athlete" && (
          <section className="dashboard-card athlete-input-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{language === "en" ? "MY PROFILE" : "내 선수 정보"}</span>
                <h2>{language === "en" ? "Enter My Athlete Data" : "내 선수 데이터 입력"}</h2>
              </div>
              <button type="button" onClick={saveProfile}>{profileSaved ? (language === "en" ? "Saved" : "저장됨") : (language === "en" ? "Save" : "저장")}</button>
            </div>
            <div className="athlete-input-grid">
              <label><span>{language === "en" ? "Height (cm)" : "키 (cm)"}</span><input inputMode="decimal" value={athleteProfile.height} onChange={(e) => setAthleteProfile((v) => ({ ...v, height: e.target.value }))} /></label>
              <label><span>{language === "en" ? "Weight (kg)" : "체중 (kg)"}</span><input inputMode="decimal" value={athleteProfile.weight} onChange={(e) => setAthleteProfile((v) => ({ ...v, weight: e.target.value }))} /></label>
              <label><span>{language === "en" ? "Body Fat (%)" : "체지방률 (%)"}</span><input inputMode="decimal" value={athleteProfile.bodyFat} onChange={(e) => setAthleteProfile((v) => ({ ...v, bodyFat: e.target.value }))} /></label>
              <label><span>{language === "en" ? "Position" : "포지션"}</span><input value={athleteProfile.position} onChange={(e) => setAthleteProfile((v) => ({ ...v, position: e.target.value }))} /></label>
              <label className="athlete-input-wide"><span>{language === "en" ? "Injury History" : "부상 이력"}</span><input value={athleteProfile.injuryHistory} onChange={(e) => setAthleteProfile((v) => ({ ...v, injuryHistory: e.target.value }))} /></label>
            </div>
          </section>
        )}

        {activeRole === "parent" && (
          <section className="dashboard-card athlete-input-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{language === "en" ? "LINKED ATHLETES" : "연결된 자녀 정보"}</span>
                <h2>{language === "en" ? "My Athlete Data" : "자녀 선수 데이터"}</h2>
              </div>
            </div>
            {parentChildren.length === 0 ? (
              <p>{language === "en" ? "No active linked athlete." : "현재 연결된 자녀가 없습니다."}</p>
            ) : (
              <div className="athlete-input-grid">
                {parentChildren.map((child) => (
                  <div className="athlete-input-wide" key={child.id}>
                    <strong>{child.name}</strong>
                    <div>
                      {language === "en" ? "Height" : "키"}: {child.profile?.height ?? "—"} ·
                      {" "}{language === "en" ? "Weight" : "체중"}: {child.profile?.weight ?? "—"} ·
                      {" "}{language === "en" ? "Position" : "포지션"}: {child.profile?.position || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <NovaFeedbackSurface />

        <section className="dashboard-grid">
          <article
            className="dashboard-card insight-card dashboard-clickable-card"
            role="link"
            tabIndex={0}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
              router.push("/analysis");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/analysis");
              }
            }}
          >
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{t.insight}</span>
                <h2>{t.insight}</h2>
              </div>
              <button type="button">{t.details} →</button>
            </div>
            <div className="insight-content">
              <div className="insight-badge">✦</div>
              <div>
                <p>{dashboardInsight}</p>
                <strong>{hasAnyDashboardData ? (language === "en" ? "Values update when measurement records are saved." : language === "ja" ? "測定記録を保存すると値が更新されます。" : "측정 기록을 저장하면 값이 업데이트됩니다.") : (language === "en" ? "Enter and save a measurement to start analysis." : language === "ja" ? "測定値を入力して保存すると分析が始まります。" : "측정값을 입력하고 저장하면 분석이 시작됩니다.")}</strong>
              </div>
            </div>
          </article>

          <article
            className="dashboard-card trend-card dashboard-clickable-card"
            role="link"
            tabIndex={0}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
              router.push("/analysis");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/analysis");
              }
            }}
          >
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{t.performance}</span>
                <h2>{t.trend}</h2>
              </div>
              <select defaultValue="7" aria-label={t.trend}>
                <option value="7">{t.last7}</option>
                <option value="30">{t.last30}</option>
                <option value="90">{t.last90}</option>
              </select>
            </div>
            {performanceTrend.length > 0 ? (
              <>
                <div className="chart">
                  <div className="chart-y">
                    <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
                  </div>
                  <div className="chart-area">
                    {[100, 75, 50, 25, 0].map((line) => (
                      <div className="chart-grid-line" style={{ bottom: `${line}%` }} key={line} />
                    ))}
                    {performancePoints && (
                      <svg className="performance-svg" viewBox="0 0 600 220" preserveAspectRatio="none">
                        <polyline points={performancePoints} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {performanceLatest != null && <div className="chart-current">{performanceLatest}</div>}
                  </div>
                </div>
                <div className="chart-labels">
                  {performanceTrend.map((item) => (
                    <span key={item.date}>{new Date(`${item.date}T00:00:00`).toLocaleDateString(language === "en" ? "en-US" : "ko-KR", { month: "short", day: "numeric" })}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-empty" role="status">
                {language === "en" ? "No performance measurement records." : language === "ja" ? "パフォーマンス測定記録がありません。" : "퍼포먼스 측정 기록이 없습니다."}
              </div>
            )}
          </article>

          <article
            className="dashboard-card schedule-card dashboard-clickable-card"
            role="link"
            tabIndex={0}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
              router.push("/team");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/team");
              }
            }}
          >
            <div className="card-header">
              <div>
                <span className="card-eyebrow">{t.training}</span>
                <h2>{t.schedule}</h2>
              </div>
              <button type="button">{t.viewAll}</button>
            </div>
            <div className="schedule-list">
              <ScheduleItem time="09:00" title={dashboard.scheduleItems.strength} status={dashboard.status.completed} type="completed" />
              <ScheduleItem time="11:00" title={dashboard.scheduleItems.video} status={dashboard.status.progress} type="progress" />
              <ScheduleItem time="14:00" title={dashboard.scheduleItems.skill} status={dashboard.status.upcoming} type="upcoming" />
              <ScheduleItem time="16:00" title={dashboard.scheduleItems.recovery} status={dashboard.status.upcoming} type="upcoming" />
            </div>
          </article>
        </section>

        <section
          className="dashboard-card activity-card dashboard-clickable-card"
          role="link"
          tabIndex={0}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
            router.push("/analysis");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push("/analysis");
            }
          }}
        >
          <div className="card-header">
            <div>
              <span className="card-eyebrow">{t.activity}</span>
              <h2>{t.recent}</h2>
            </div>
            <button type="button">{t.viewActivity}</button>
          </div>
          <div className="activity-list">
            <ActivityItem icon="◎" title={dashboard.activityItems.camera} detail={dashboard.activityItems.jump} time={dashboard.times.two} />
            <ActivityItem icon="♡" title={dashboard.activityItems.recovery} detail={dashboard.activityItems.hrv} time={dashboard.times.three} />
            <ActivityItem icon="▥" title={dashboard.activityItems.performance} detail={dashboard.activityItems.vertical} time={dashboard.times.five} />
            <ActivityItem icon="◇" title={dashboard.activityItems.injury} detail={dashboard.activityItems.risk} time={dashboard.times.day} />
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
      <span className={`schedule-status ${type}`}>{status}</span>
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
