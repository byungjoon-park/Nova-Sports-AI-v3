"use client";

import { useEffect, useState } from "react";
import { useNovaSettings, type NovaLanguage, type NovaTheme, roleLabels } from "../app/settings-context";

const copy = {
  ko:{title:"환경설정",language:"언어",theme:"테마",role:"현재 사용자",close:"닫기",dark:"다크",white:"화이트",ivory:"아이보리"},
  en:{title:"Settings",language:"Language",theme:"Theme",role:"Current account",close:"Close",dark:"Dark",white:"White",ivory:"Ivory"},
} as const;

export default function SettingsPanel(){
  const {language,theme,role,setLanguage,setTheme}=useNovaSettings();
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    const fn=()=>setOpen(true);
    window.addEventListener("nova-open-settings",fn);
    return()=>window.removeEventListener("nova-open-settings",fn);
  },[]);

  if(!open)return null;
  const t=copy[language === "en" ? "en" : "ko"];

  return <div className="nova-settings-backdrop" onClick={()=>setOpen(false)}>
    <section className="nova-settings-panel" data-theme={theme} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="nova-settings-head"><h2>{t.title}</h2><button type="button" onClick={()=>setOpen(false)}>×</button></div>

      <label>{t.role}</label>
      <div className="nova-settings-current-role">
        <strong>{roleLabels[role]}</strong>
        <small>{language === "en" ? "Assigned to this account at sign-up." : "회원가입 시 지정된 계정 역할입니다."}</small>
      </div>


      <label>{t.language}</label>
      <div className="nova-settings-options">
        {(["ko","en"] as NovaLanguage[]).map(v=>
          <button key={v} type="button" className={language===v?"selected":""} onClick={()=>setLanguage(v)}>
            {v==="ko"?"한국어":"English"}
          </button>
        )}
      </div>

      <label>{t.theme}</label>
      <div className="nova-settings-options">
        {(["ivory","white","dark"] as NovaTheme[]).map(v=>
          <button key={v} type="button" className={theme===v?"selected":""} onClick={()=>setTheme(v)}>{t[v]}</button>
        )}
      </div>
    </section>
  </div>;
}
