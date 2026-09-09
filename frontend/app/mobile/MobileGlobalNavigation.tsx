"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getCurrentUser,
  signOutUser,
  type NovaUserRole,
} from "../../lib/nova-auth";

type MenuItem = {
  label: string;
  description: string;
  href: string;
  roles?: NovaUserRole[];
};

const MENU: MenuItem[] = [
  { label: "대시보드", description: "퍼포먼스·회복·훈련 현황", href: "/mobile/dashboard" },
  { label: "카메라 AI", description: "동작 촬영과 AI 분석", href: "/mobile/camera-ai" },
  { label: "AI 분석", description: "퍼포먼스·회복·피로도 분석", href: "/mobile/analysis" },
  { label: "GPS", description: "GPS 데이터와 활동 분석", href: "/mobile/gps-test" },
  { label: "성장·체력", description: "신체와 체력 측정", href: "/mobile/growth-analysis" },
  { label: "측정 기록", description: "측정값과 변화 이력", href: "/mobile/measurements" },
  { label: "의료·재활", description: "부상·진료·재활 기록", href: "/mobile/medical" },
  { label: "리포트", description: "선수 데이터 요약과 보고서", href: "/mobile/report" },
  { label: "선수 관리", description: "선수 프로필과 선수 목록", href: "/mobile/players", roles: ["admin", "director", "coach"] },
  { label: "팀 관리", description: "팀·선수 구성과 운영", href: "/mobile/team", roles: ["admin", "director", "coach"] },
  { label: "프로필", description: "내 계정과 선수 정보", href: "/mobile/profile" },
  { label: "결제", description: "Premium 구독 및 결제", href: "/mobile/billing", roles: ["athlete", "parent"] },
  { label: "1:1 문의", description: "NOVA 고객지원 문의", href: "/mobile/inquiry" },
  { label: "설정", description: "언어·테마·계정 설정", href: "/mobile/settings" },
];

const labelForRole = (role: NovaUserRole) =>
  role === "director" ? "감독" :
  role === "coach" ? "코치" :
  role === "athlete" ? "선수" :
  role === "parent" ? "학부모" : "관리자";

export default function MobileGlobalNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<NovaUserRole | null>(null);

  useEffect(() => {
    const current = getCurrentUser();
    if (current) {
      setRole(current.role);
      try {
        sessionStorage.setItem("nova-mobile-login-complete", "1");
        localStorage.setItem("nova-active-role", current.role);
        localStorage.setItem("nova-login-role", current.role);
        localStorage.setItem("nova-role", current.role);
      } catch {}

      if (pathname === "/mobile/login" || pathname === "/mobile/signup") {
        router.replace(current.role === "admin" ? "/admin" : "/mobile");
      }
    }
  }, [pathname, router]);

  const items = useMemo(
    () => MENU.filter((item) => !item.roles || (role ? item.roles.includes(role) : false)),
    [role],
  );

  if (pathname === "/mobile/login" || pathname === "/mobile/signup" || !role) {
    return null;
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
        aria-label={`${labelForRole(role)} 전체 메뉴`}
      >
        <div className="nova-mobile-global-menu-head">
          <div>
            <span>NOVA SPORTS AI</span>
            <strong>{labelForRole(role)} 전체 메뉴</strong>
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
      </aside>
    </>
  );
}
