"use client";

import { useEffect, useState } from "react";
import { useNovaSettings, type NovaLanguage, type NovaTheme, type NovaRole, roleCopy } from "../app/settings-context";

const copy = {
  ko:{title:"환경설정",language:"언어",theme:"테마",role:"사용 모드",close:"닫기",dark:"다크",white:"화이트",ivory:"아이보리"},
  en:{title:"Settings",language:"Language",theme:"Theme",role:"Mode",close:"Close",dark:"Dark",white:"White",ivory:"Ivory"},
} as const;

export default function SettingsPanel(){
  const {language,theme,role,setLanguage,setTheme,setRole}=useNovaSettings();
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    const fn=()=>setOpen(true);
    window.addEventListener("nova-open-settings",fn);
    return()=>window.removeEventListener("nova-open-settings",fn);
  },[]);

  if(!open)return null;
  const t=copy[language];

  return <div className="nova-settings-backdrop" onClick={()=>setOpen(false)}>
    <section className="nova-settings-panel" data-theme={theme} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="nova-settings-head"><h2>{t.title}</h2><button type="button" onClick={()=>setOpen(false)}>×</button></div>

      <label>{t.role}</label>
      <div className="nova-settings-options nova-role-options">
        {(["coach","athlete","parent","admin"] as NovaRole[]).map(v=>
          <button key={v} type="button" className={role===v?"selected":""} onClick={()=>setRole(v)}>
            {roleCopy[language][v]}
          </button>
        )}
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
