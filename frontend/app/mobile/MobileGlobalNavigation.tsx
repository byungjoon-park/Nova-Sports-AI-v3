"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, signOutUser, type NovaUserRole } from "../../lib/nova-auth";

type MenuItem = {
  label: string;
  description: string;
  href: string;
  roles?: NovaUserRole[];
};

const MENU: MenuItem[] = [
  { label: "대시보드", description: "퍼포먼스·회복·훈련 현황", href: "/mobile/dashboard" },
  { label: "카메라 AI", description: "동작 촬영과 AI 분석", href: "/mobile/camera-ai", roles: ["admin", "director", "coach", "athlete"] },
  { label: "AI 분석", description: "퍼포먼스·회복·피로도 분석", href: "/mobile/analysis" },
  { label: "GPS", description: "GPS 데이터와 활동 분석", href: "/mobile/gps-test" },
  { label: "성장·체력", description: "신체와 체력 측정", href: "/mobile/growth-analysis" },
  { label: "측정 기록", description: "측정값과 변화 이력", href: "/mobile/measurements" },
  { label: "의료·재활", description: "부상·진료·재활 기록", href: "/mobile/medical" },
  { label: "리포트", description: "선수 데이터 요약과 보고서", href: "/mobile/report" },
  { label: "선수 관리", description: "선수 프로필과 선수 목록", href: "/mobile/players", roles: ["admin", "director", "coach"] },
  { label: "감독·코치", description: "선수와 훈련 관리", href: "/mobile/team", roles: ["admin", "director", "coach"] },
  { label: "팀", description: "팀 구성과 단체 운영 문의", href: "/mobile/inquiry", roles: ["admin", "director", "coach"] },
  { label: "프로필", description: "내 계정과 선수 정보", href: "/mobile/profile" },
  { label: "결제", description: "개인 Premium 구독 및 결제", href: "/mobile/billing", roles: ["athlete"] },
  { label: "1:1 문의", description: "NOVA 고객지원 문의", href: "/mobile/inquiry" },
  { label: "설정", description: "언어·테마·계정 설정", href: "/mobile/settings" },
];

const roleLabel = (role: NovaUserRole) =>
  role === "director" ? "감독" :
  role === "coach" ? "코치" :
  role === "athlete" ? "선수" :
  role === "parent" ? "학부모" : "관리자";

export default function MobileGlobalNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<NovaUserRole | null>(() => getCurrentUser()?.role ?? null);
  const [open, setOpen] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);

  useEffect(() => {
    try {
      setAutoLogin(localStorage.getItem("nova-auto-login") !== "0");
    } catch {}

    const current = getCurrentUser();
    if (!current) return;
    setRole(current.role);

    try {
      sessionStorage.setItem("nova-mobile-login-complete", "1");
      localStorage.setItem("nova-active-role", current.role);
      localStorage.setItem("nova-login-role", current.role);
      localStorage.setItem("nova-role", current.role);
    } catch {}
  }, []);

  useEffect(() => {
    const current = getCurrentUser();
    if (current && (pathname === "/mobile/login" || pathname === "/mobile/signup") && autoLogin) {
      router.replace(current.role === "admin" ? "/admin" : "/mobile");
    }
  }, [autoLogin, pathname, router]);

  const items = useMemo(
    () => MENU.filter((item) => !item.roles || (role ? item.roles.includes(role) : false)),
    [role],
  );

  if (pathname === "/mobile/login" || pathname === "/mobile/signup") {
    return (
      <label className="nova-mobile-auto-login-control">
        <input
          type="checkbox"
          checked={autoLogin}
          onChange={(event) => {
            const enabled = event.target.checked;
            setAutoLogin(enabled);
            try {
              localStorage.setItem("nova-auto-login", enabled ? "1" : "0");
            } catch {}
          }}
        />
        <span>자동 로그인 유지</span>
      </label>
    );
  }

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        className="nova-mobile-global-menu-button"
        aria-label="전체 메뉴 열기"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span>
        <strong>메뉴</strong>
      </button>

      {open && (
        <button
          type="button"
          className="nova-mobile-global-menu-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`nova-mobile-global-menu-panel${open ? " is-open" : ""}`}
        aria-label={`${role ? roleLabel(role) : "NOVA"} 전체 메뉴`}
      >
        <div className="nova-mobile-global-menu-head">
          <div>
            <span>NOVA SPORTS AI</span>
            <strong>{role ? `${roleLabel(role)} 전체 메뉴` : "전체 메뉴"}</strong>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="메뉴 닫기">×</button>
        </div>

        <nav className="nova-mobile-global-menu-list">
          {items.map((item) => (
            <button
              type="button"
              key={`${item.href}-${item.label}`}
              className={`nova-mobile-global-menu-item${pathname === item.href ? " active" : ""}`}
              onClick={() => go(item.href)}
            >
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </nav>

        {role && (
          <button
            type="button"
            className="nova-mobile-global-logout"
            onClick={() => {
              signOutUser();
              setOpen(false);
              try {
                sessionStorage.removeItem("nova-mobile-login-complete");
              } catch {}
              router.replace("/mobile/login");
            }}
          >
            로그아웃
          </button>
        )}
      </aside>
    </>
  );
}
