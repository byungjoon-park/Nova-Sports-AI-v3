"use client";

import "./mobile.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAthleteProfile, getCurrentUser, signOutUser, type NovaUser, type NovaUserRole } from "../../lib/nova-auth";
import { getMeasurementRange } from "../../lib/nova-measurements";
import { useNovaSettings } from "../settings-context";

type MobileMenuItem = {
  label: string;
  description: string;
  href: string;
  section: "main" | "health" | "management" | "system";
  roles?: NovaUserRole[];
};

const menuItems: MobileMenuItem[] = [
  { label: "대시보드", description: "퍼포먼스·회복·훈련 현황", href: "/mobile/dashboard", section: "main" },
  { label: "카메라 AI", description: "동작 촬영과 AI 분석", href: "/mobile/camera-ai", section: "main" },
  { label: "GPS", description: "GPS 데이터와 피로 분석", href: "/mobile/gps-test", section: "main" },
  { label: "선수 관리", description: "선수 프로필과 선수 목록", href: "/mobile/players", section: "main", roles: ["admin", "director", "coach"] },
  { label: "AI 분석", description: "퍼포먼스와 신체 분석", href: "/mobile/analysis", section: "main" },
  { label: "성장·체력", description: "성장 및 체력 측정", href: "/mobile/growth-analysis", section: "main" },
  { label: "측정 기록", description: "측정값과 이력 확인", href: "/mobile/measurements", section: "main" },
  { label: "의료·재활", description: "진료·부상·재활 기록", href: "/mobile/medical", section: "health" },
  { label: "리포트", description: "선수 분석 리포트", href: "/mobile/report", section: "health" },
  { label: "팀 관리", description: "팀과 선수 구성 관리", href: "/mobile/team", section: "management", roles: ["admin", "director", "coach"] },
  { label: "감독·코치", description: "선수와 훈련 관리", href: "/mobile/team", section: "management", roles: ["admin", "director", "coach"] },
  { label: "프로필", description: "내 계정·선수 정보 수정", href: "/mobile/profile", section: "system" },
  { label: "결제", description: "Premium 구독 및 결제", href: "/mobile/billing", section: "system", roles: ["athlete", "parent"] },
  { label: "1:1 문의", description: "NOVA 고객지원 문의", href: "/mobile/inquiry", section: "system" },
];

const sectionLabels = {
  main: "주요 기능",
  health: "건강·재활",
  management: "관리",
  system: "내 계정",
};

export default function MobileBetaPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [noticeIndex, setNoticeIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let loggedIn = false;
      try {
        loggedIn = sessionStorage.getItem("nova-mobile-login-complete") === "1";
      } catch {}
      if (loggedIn) {
        setUser(getCurrentUser());
      } else {
        router.replace("/mobile/login");
      }
      setBooting(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [router]);

  const notices = [
    {
      date: "2026. 8. 29.",
      title: "NOVA V3 AI 분석 시스템 업데이트 안내",
      body: "카메라 AI 분석과 선수 퍼포먼스 분석 기능이 업데이트되었습니다.",
      href: "/mobile/dashboard",
    },
    {
      date: "2026. 8. 29.",
      title: "GPS 연동 가능 제품 안내",
      body: "Catapult Vector S7/X7, STATSports APEX 2.0 등 스포츠 GPS 장비 연동을 준비하고 있습니다. 실제 지원 범위는 데이터/API 확인 후 적용됩니다.",
      href: "/mobile/gps-test",
    },
    {
      date: "2026. 8. 29.",
      title: "GPS 데이터 · AI 분석 연계 안내",
      body: "GPS 이동거리·고속주행·최고속도·스프린트 데이터를 카메라 AI 및 피로 분석과 함께 확인할 수 있도록 연동 범위를 확대합니다.",
      href: "/mobile/gps-test",
    },
  ];

  useEffect(() => {
    if (booting || !user) return;
    const timer = window.setInterval(() => {
      setNoticeIndex((index) => (index + 1) % notices.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [booting, user, notices.length]);

  const mobileRole: NovaUserRole | null = user?.role ?? null;
  const mobileUser = user && mobileRole !== "admin" ? user : null;
  const mobileDisplayName = mobileUser?.name ?? "사용자";
  const profile = useMemo(() => (mobileRole === "athlete" ? getAthleteProfile() : null), [mobileRole]);
  const measurementData = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    return getMeasurementRange(iso(start), iso(end));
  }, []);

  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";
  const visibleMenuItems = mobileUser
    ? menuItems.filter((item) => !item.roles || item.roles.includes(mobileUser.role))
    : [];
  const groupedItems = (section: MobileMenuItem["section"]) => visibleMenuItems.filter((item) => item.section === section);
  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  const latest = (items: Array<{ date: string; score: number }>) => {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.at(-1)?.score;
  };
  const performance = latest(measurementData.performanceRecords);
  const recovery = latest(measurementData.recoveryRecords);
  const fatigue = latest(measurementData.fatigueRecords);
  const trend = [...measurementData.performanceRecords].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const trendMax = Math.max(...trend.map((item) => item.score), 100);
  const trendMin = Math.min(...trend.map((item) => item.score), 0);

  if (booting) {
    return (
      <main className={`mobile-splash theme-${activeTheme}`}>
        <div className="mobile-splash-brand">NOVA</div>
        <div className="mobile-splash-platform">AI SPORTS PERFORMANCE PLATFORM</div>
        <h1>AI Sports Performance Platform</h1>
        <p>Smarter Training. Better Performance.</p>
        <div className="mobile-splash-progress"><span /></div>
        <small>INITIALIZING NOVA V2</small>
      </main>
    );
  }

  if (!mobileUser) {
    return <main className={`mobile-page theme-${activeTheme}`}><div className="mobile-loading">로그인 화면으로 이동 중...</div></main>;
  }

  const roleDescription = mobileUser.role === "athlete"
    ? "내 퍼포먼스와 회복 상태를 확인합니다."
    : mobileUser.role === "parent"
      ? "선수의 상태와 일정, 리포트를 확인합니다."
      : "팀·선수·훈련 현황을 한 화면에서 확인합니다.";

  return (
    <main className={`mobile-page theme-${activeTheme}`}>
      {menuOpen && <button type="button" className="mobile-menu-backdrop" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}

      <aside className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-label="NOVA 모바일 전체 메뉴">
        <div className="mobile-menu-head">
          <div><span className="mobile-eyebrow">NOVA SPORTS AI</span><strong>전체 기능</strong></div>
          <button type="button" className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기">×</button>
        </div>
        {(["main", "health", "management", "system"] as const).map((section) => {
          const items = groupedItems(section);
          if (!items.length) return null;
          return (
            <section className="mobile-menu-section" key={section}>
              <span className="mobile-menu-label">{sectionLabels[section]}</span>
              {items.map((item) => (
                <button key={`${item.href}-${item.label}`} type="button" className="mobile-menu-item" onClick={() => go(item.href)}>
                  <span className="mobile-menu-item-text"><strong>{item.label}</strong><small>{item.description}</small></span><span aria-hidden="true">›</span>
                </button>
              ))}
            </section>
          );
        })}
        <section className="mobile-menu-section mobile-menu-account">
          <button type="button" className="mobile-menu-item" onClick={() => go("/mobile/settings")}>
            <span className="mobile-menu-item-text"><strong>설정</strong><small>언어·테마·계정 설정</small></span><span aria-hidden="true">›</span>
          </button>
          <button type="button" className="mobile-menu-item" onClick={() => { signOutUser(); setMenuOpen(false); router.replace("/mobile/login"); }}>
            <span className="mobile-menu-item-text"><strong>로그아웃</strong><small>현재 계정에서 로그아웃</small></span><span aria-hidden="true">›</span>
          </button>
        </section>
      </aside>

      <header className="mobile-header">
        <div>
          <span className="mobile-eyebrow">NOVA SPORTS AI · MOBILE BETA</span>
          <h1>{mobileUser.role === "athlete" ? `${mobileDisplayName} 선수` : `${mobileDisplayName}님`}</h1>
          <p>{roleDescription}</p>
        </div>
        <button type="button" onClick={() => setMenuOpen(true)} className="mobile-menu-trigger" aria-label="전체 메뉴 열기">☰</button>
      </header>

      {(() => {
        const notice = notices[noticeIndex];
        return (
          <section className="mobile-notice-card" aria-label="공지사항">
            <div className="mobile-notice-top">
              <span className="mobile-notice-label">공지사항</span>
              <time>{notice.date}</time>
            </div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
            <div className="mobile-notice-actions">
              <button type="button" onClick={() => go(notice.href)}>자세히 보기</button>
              <button type="button" onClick={() => setMenuOpen(true)}>전체 기능</button>
            </div>
            <div className="mobile-notice-dots" aria-label="공지사항 순서">
              {notices.map((item, index) => (
                <button key={item.title} type="button" className={index === noticeIndex ? "active" : ""} aria-label={`${index + 1}번 공지`} onClick={() => setNoticeIndex(index)} />
              ))}
            </div>
          </section>
        );
      })()}

      <section className="mobile-metric-grid" aria-label="주요 지표">
        <article className="mobile-metric-card"><span>Performance</span><strong>{performance ?? "-"}</strong><small>/100</small></article>
        <article className="mobile-metric-card"><span>Recovery</span><strong>{recovery ?? "-"}</strong><small>/100</small></article>
        <article className="mobile-metric-card"><span>Fatigue</span><strong>{fatigue ?? "-"}</strong><small>/100</small></article>
      </section>

      <section className="mobile-content-grid">
        <article className="mobile-content-card mobile-insight-card">
          <div className="mobile-card-heading"><span>AI INSIGHT</span><strong>오늘의 상태</strong></div>
          <div className="mobile-insight-status"><span className="mobile-status-dot" />{performance == null ? "측정 기록이 없습니다." : performance >= 80 ? "현재 퍼포먼스 상태가 좋습니다." : "최근 퍼포먼스 데이터를 확인하세요."}</div>
          <p>{recovery == null ? "측정값을 입력하면 퍼포먼스와 회복 분석이 시작됩니다." : `회복 점수 ${recovery}/100 기준으로 오늘의 컨디션을 확인할 수 있습니다.`}</p>
        </article>

        <article className="mobile-content-card">
          <div className="mobile-card-heading"><span>PERFORMANCE</span><strong>최근 추이</strong><button type="button" onClick={() => go("/mobile/analysis")}>더보기 ›</button></div>
          {trend.length > 0 ? (
            <div className="mobile-trend" aria-label="최근 퍼포먼스 추이">
              {trend.map((item) => {
                const ratio = trendMax === trendMin ? 0.55 : (item.score - trendMin) / (trendMax - trendMin);
                return <div className="mobile-trend-bar" key={item.date}><span style={{ height: `${Math.max(18, Math.round(ratio * 82))}%` }} /><small>{item.score}</small></div>;
              })}
            </div>
          ) : <div className="mobile-empty">퍼포먼스 측정 기록이 없습니다.</div>}
        </article>

        {mobileUser.role === "athlete" ? (
          <article className="mobile-content-card">
            <div className="mobile-card-heading"><span>PLAYER PROFILE</span><strong>선수 프로필</strong><button type="button" onClick={() => go("/mobile/player-profile")}>보기 ›</button></div>
            <div className="mobile-profile-list">
              <div><span>종목</span><strong>{profile?.sport ?? "미등록"}</strong></div>
              <div><span>포지션</span><strong>{profile?.position ?? "미등록"}</strong></div>
              <div><span>신장</span><strong>{profile?.height ? `${profile.height} cm` : "-"}</strong></div>
              <div><span>체중</span><strong>{profile?.weight ? `${profile.weight} kg` : "-"}</strong></div>
            </div>
          </article>
        ) : (
          <article className="mobile-content-card">
            <div className="mobile-card-heading"><span>TEAM</span><strong>팀·선수 관리</strong><button type="button" onClick={() => go("/mobile/players")}>선수 ›</button></div>
            <div className="mobile-role-summary"><strong>{mobileUser.role === "parent" ? "선수 상태" : "팀 운영"}</strong><span>{mobileUser.role === "parent" ? "자녀의 퍼포먼스·회복·리포트를 확인하세요." : "선수 관리, 훈련, AI 분석 기능을 바로 사용할 수 있습니다."}</span></div>
          </article>
        )}

        <article className="mobile-content-card">
          <div className="mobile-card-heading"><span>HEALTH</span><strong>의료·재활</strong><button type="button" onClick={() => go("/mobile/medical")}>보기 ›</button></div>
          <div className="mobile-health-timeline">
            <div><i /><span>최근 진료·재활 기록</span><strong>{mobileUser.role === "athlete" ? (profile?.injuryHistory || "기록 없음") : "선수별 기록 확인"}</strong></div>
            <div><i /><span>회복 상태</span><strong>{recovery == null ? "측정 필요" : `${recovery}/100`}</strong></div>
          </div>
        </article>

        <article className="mobile-content-card mobile-report-card">
          <div className="mobile-card-heading"><span>REPORT</span><strong>리포트</strong><button type="button" onClick={() => go("/mobile/report")}>전체 ›</button></div>
          <button type="button" onClick={() => go("/mobile/report")} className="mobile-report-row"><span>퍼포먼스 리포트</span><b>›</b></button>
          <button type="button" onClick={() => go("/mobile/report")} className="mobile-report-row"><span>신체 측정 리포트</span><b>›</b></button>
          <button type="button" onClick={() => go("/mobile/report")} className="mobile-report-row"><span>재활 진행 리포트</span><b>›</b></button>
        </article>
      </section>

      <section className="mobile-card-grid" aria-label="전체 주요 기능">
        {groupedItems("main").slice(0, 6).map((item) => (
          <button key={`${item.href}-${item.label}`} type="button" className="mobile-feature-card" onClick={() => go(item.href)}>
            <strong>{item.label}</strong><span>{item.description}</span><span className="mobile-card-arrow" aria-hidden="true">›</span>
          </button>
        ))}
      </section>

      <nav className="mobile-bottom-nav" aria-label="모바일 메뉴">
        <button className="active" type="button" onClick={() => router.push("/mobile")}>홈</button>
        <button type="button" onClick={() => router.push("/mobile/analysis")}>분석</button>
        <button type="button" onClick={() => router.push("/mobile/training")}>훈련</button>
        <button type="button" onClick={() => router.push("/mobile/rehab")}>재활</button>
        <button type="button" onClick={() => setMenuOpen(true)}>메뉴</button>
      </nav>
    </main>
  );
}
