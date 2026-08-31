/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type NovaLanguage = "ko" | "en" | "ja";
export type NovaTheme = "dark" | "white" | "ivory";
export type NovaRole = "coach" | "athlete" | "parent" | "admin";

type NovaSettings = {
  language: NovaLanguage;
  theme: NovaTheme;
  role: NovaRole;
  settingsOpen: boolean;
  setLanguage: (language: NovaLanguage) => void;
  setTheme: (theme: NovaTheme) => void;
  setRole: (role: NovaRole) => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const SettingsContext = createContext<NovaSettings>({
  language: "ko",
  theme: "ivory",
  setLanguage: () => undefined,
  role: "coach",
  settingsOpen: false,
  setTheme: () => undefined,
  setRole: () => undefined,
  openSettings: () => undefined,
  closeSettings: () => undefined,
});

export const roleLabels: Record<NovaRole, string> = {
  coach: "코치 / 감독",
  athlete: "선수",
  parent: "학부모",
  admin: "관리자 모드",
};

export const localizedRoleLabels: Record<NovaLanguage, Record<NovaRole, string>> = {
  ko: { coach: "코치 / 감독", athlete: "선수", parent: "학부모", admin: "관리자 모드" },
  en: { coach: "Coach / Director", athlete: "Athlete", parent: "Parent", admin: "Admin Mode" },
  ja: { coach: "監督 / コーチ", athlete: "選手", parent: "保護者", admin: "管理者モード" },
};

export const themeLabels: Record<NovaTheme, string> = {
  dark: "다크",
  white: "화이트",
  ivory: "아이보리",
};

export function NovaSettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<NovaLanguage>(() => {
    if (typeof window === "undefined") return "ko";
    try {
      const saved = localStorage.getItem("nova-language");
      return saved && ["ko", "en", "ja"].includes(saved) ? saved as NovaLanguage : "ko";
    } catch { return "ko"; }
  });
  const [theme, setThemeState] = useState<NovaTheme>(() => {
    if (typeof window === "undefined") return "ivory";
    try {
      const saved = localStorage.getItem("nova-theme");
      return saved && ["dark", "white", "ivory"].includes(saved) ? saved as NovaTheme : "ivory";
    } catch { return "ivory"; }
  });
  const [role, setRoleState] = useState<NovaRole>(() => {
    if (typeof window === "undefined") return "coach";
    try {
      const saved = localStorage.getItem("nova-role") || localStorage.getItem("nova-user-role");
      return saved && ["coach", "athlete", "parent", "admin"].includes(saved) ? saved as NovaRole : "coach";
    } catch { return "coach"; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("nova-language") as NovaLanguage | null;
      const savedTheme = localStorage.getItem("nova-theme") as NovaTheme | null;
      const savedRole = localStorage.getItem("nova-role") as NovaRole | null;
      if (savedLanguage && ["ko", "en"].includes(savedLanguage)) setLanguageState(savedLanguage);
      if (savedTheme && ["dark", "white", "ivory"].includes(savedTheme)) setThemeState(savedTheme);
      if (savedRole && ["coach", "athlete", "parent", "admin"].includes(savedRole)) setRoleState(savedRole);
    } catch {
      // Keep safe defaults.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem("nova-language", language); } catch {}
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.novaTheme = theme;
    try {
      localStorage.setItem("nova-theme", theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("nova-role", role);
    } catch {
      // Ignore storage failures.
    }
  }, [role]);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener("nova-open-settings", open);
    return () => window.removeEventListener("nova-open-settings", open);
  }, []);

  const setLanguage = (next: NovaLanguage) => { setLanguageState(next); window.dispatchEvent(new CustomEvent("nova-language-changed", { detail: next })); };
  const setTheme = (next: NovaTheme) => { setThemeState(next); window.dispatchEvent(new CustomEvent("nova-theme-changed", { detail: next })); };
  const setRole = (next: NovaRole) => {
    setRoleState(next);
    try {
      localStorage.setItem("nova-role", next);
      localStorage.setItem("nova-user-role", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("nova-role-changed", { detail: next }));
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        theme,
        role,
        settingsOpen,
        setLanguage,
        setTheme,
        setRole,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
      }}
    >
      {children}
      {settingsOpen && <SettingsModal />}
    </SettingsContext.Provider>
  );
}

export function useNovaSettings() {
  return useContext(SettingsContext);
}

function SettingsModal() {
  const { language, theme, role, setLanguage, setTheme, setRole, closeSettings } = useNovaSettings();

  return (
    <div className="nova-settings-backdrop" role="presentation" onMouseDown={closeSettings}>
      <section className="nova-settings-modal" role="dialog" aria-modal="true" aria-labelledby="nova-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="nova-settings-head">
          <div>
            <span>SETTINGS</span>
            <h2 id="nova-settings-title">환경설정</h2>
          </div>
          <button type="button" className="nova-settings-close" onClick={closeSettings} aria-label="닫기">×</button>
        </div>

        <div className="nova-settings-group">
          <label>언어 / Language</label>
          <div className="nova-choice-grid two">
            <button type="button" className={language === "ko" ? "selected" : ""} onClick={() => setLanguage("ko")}>한국어</button>
            <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>English</button>
          </div>
        </div>

        <div className="nova-settings-group">
          <label>{language === "en" ? "Theme" : "테마"}</label>
          <div className="nova-choice-grid three">
            {(["dark", "white", "ivory"] as NovaTheme[]).map((item) => (
              <button key={item} type="button" className={theme === item ? "selected" : ""} onClick={() => setTheme(item)}>
                <span className={`theme-preview ${item}`} />
                {themeLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="nova-settings-group">
          <label>사용자 모드</label>
          <div className="nova-choice-grid two">
            {(["coach", "athlete", "parent", "admin"] as NovaRole[]).map((item) => (
              <button key={item} type="button" className={role === item ? "selected" : ""} onClick={() => setRole(item)}>
                <strong>{roleLabels[item]}</strong>
                <small>{item === "admin" ? "연구·통계·데이터 관리" : item === "coach" ? "팀·선수·훈련 관리" : item === "athlete" ? "개인 퍼포먼스·재활" : "선수 상태·일정 확인"}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="nova-settings-footer">
          <span>현재 모드: <strong>{roleLabels[role]}</strong></span>
          <button type="button" onClick={closeSettings}>완료</button>
        </div>
      </section>
    </div>
  );
}
