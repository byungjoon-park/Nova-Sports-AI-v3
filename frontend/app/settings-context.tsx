/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type NovaLanguage = "ko" | "en" | "ja";
export type NovaTheme = "dark" | "white" | "ivory";
export type NovaRole = "coach" | "director" | "athlete" | "parent" | "admin";

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
  coach: "코치",
  director: "감독",
  athlete: "선수",
  parent: "학부모",
  admin: "관리자 모드",
};

export const themeLabels: Record<NovaTheme, string> = {
  dark: "다크",
  white: "화이트",
  ivory: "아이보리",
};

export function NovaSettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<NovaLanguage>("ko");
  const [theme, setThemeState] = useState<NovaTheme>("ivory");
  const [role, setRoleState] = useState<NovaRole>("coach");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("nova-language") as NovaLanguage | null;
      const savedTheme = localStorage.getItem("nova-theme") as NovaTheme | null;
      const savedRole = localStorage.getItem("nova-role") as NovaRole | null;
      if (savedLanguage && ["ko", "en"].includes(savedLanguage)) setLanguageState(savedLanguage);
      if (savedTheme && ["dark", "white", "ivory"].includes(savedTheme)) setThemeState(savedTheme);
      if (savedRole && ["coach", "director", "athlete", "parent", "admin"].includes(savedRole)) setRoleState(savedRole);
    } catch {
      // Keep safe defaults.
    } finally {
      setStorageLoaded(true);
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
    if (!storageLoaded) return;
    try {
      localStorage.setItem("nova-role", role);
    } catch {
      // Ignore storage failures.
    }
  }, [role, storageLoaded]);

  useEffect(() => {
    const syncRoleFromStorage = () => {
      try {
        const savedRole = localStorage.getItem("nova-role");
        if (savedRole === "coach" || savedRole === "director" || savedRole === "athlete" || savedRole === "parent" || savedRole === "admin") {
          setRoleState(savedRole);
        }
      } catch {}
    };

    const open = () => setSettingsOpen(true);
    window.addEventListener("storage", syncRoleFromStorage);
    window.addEventListener("nova-settings-change", syncRoleFromStorage);
    window.addEventListener("nova-open-settings", open);
    return () => {
      window.removeEventListener("storage", syncRoleFromStorage);
      window.removeEventListener("nova-settings-change", syncRoleFromStorage);
      window.removeEventListener("nova-open-settings", open);
    };
  }, []);

  const setLanguage = (next: NovaLanguage) => { setLanguageState(next); window.dispatchEvent(new CustomEvent("nova-language-changed", { detail: next })); };
  const setTheme = (next: NovaTheme) => { setThemeState(next); window.dispatchEvent(new CustomEvent("nova-theme-changed", { detail: next })); };
  const setRole = (next: NovaRole) => {
    setRoleState(next);
    try {
      localStorage.setItem("nova-role", next);
      localStorage.setItem("nova-role-mode", "manual");
    } catch {}
    window.dispatchEvent(new CustomEvent("nova-settings-change", { detail: { role: next } }));
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
  const { language, theme, role, setLanguage, setTheme, closeSettings } = useNovaSettings();

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
          <label>{language === "en" ? "Current account" : "현재 사용자"}</label>
          <div className="nova-role-summary">
            <strong>{roleLabels[role]}</strong>
            <small>{language === "en" ? "This role is assigned to the account at sign-up and cannot be changed here." : "가입 시 지정된 계정 역할입니다. 환경설정에서는 변경할 수 없습니다."}</small>
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
