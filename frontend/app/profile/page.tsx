/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAthleteProfile, getCurrentUser, saveAthleteProfile, updateCurrentUserProfile, type NovaUser } from "../../lib/nova-auth";
import "./profile.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [athlete, setAthlete] = useState({ height:"", weight:"", bodyFat:"", position:"", injuryHistory:"" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/login"); return; }
    setUser(current); setName(current.name); setEmail(current.email);
    const p = getAthleteProfile(current.id);
    if (p) setAthlete({ height:p.height == null ? "" : String(p.height), weight:p.weight == null ? "" : String(p.weight), bodyFat:p.bodyFat == null ? "" : String(p.bodyFat), position:p.position ?? "", injuryHistory:p.injuryHistory ?? "" });
  }, [router]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated = updateCurrentUserProfile({ name, email });
    if (!updated) { setMessage("이름과 이메일을 확인하세요. 이미 사용 중인 이메일일 수도 있습니다."); return; }
    if (user.role === "athlete") {
      saveAthleteProfile({
        userId:user.id,
        height: athlete.height ? Number(athlete.height) : undefined,
        weight: athlete.weight ? Number(athlete.weight) : undefined,
        bodyFat: athlete.bodyFat ? Number(athlete.bodyFat) : undefined,
        position: athlete.position.trim() || undefined,
        injuryHistory: athlete.injuryHistory.trim() || undefined,
      });
    }
    setUser(updated); setMessage("프로필이 저장되었습니다.");
  };

  if (!user) return null;
  return <main className="nova-account-profile"><section>
    <span>ACCOUNT PROFILE</span><h1>프로필</h1><p>계정 정보와 선수 정보를 수정할 수 있습니다.</p>
    <form onSubmit={submit}>
      <label>이름<input value={name} onChange={e=>setName(e.target.value)} required /></label>
      <label>이메일<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <div className="profile-role">현재 역할 <strong>{user.role==="director"?"감독":user.role==="coach"?"코치":user.role==="athlete"?"선수":user.role==="parent"?"학부모":"관리자"}</strong></div>
      {user.role==="athlete" && <div className="profile-athlete-grid">
        <label>키 (cm)<input inputMode="decimal" value={athlete.height} onChange={e=>setAthlete(v=>({...v,height:e.target.value}))}/></label>
        <label>체중 (kg)<input inputMode="decimal" value={athlete.weight} onChange={e=>setAthlete(v=>({...v,weight:e.target.value}))}/></label>
        <label>체지방률<input inputMode="decimal" value={athlete.bodyFat} onChange={e=>setAthlete(v=>({...v,bodyFat:e.target.value}))}/></label>
        <label>포지션<input value={athlete.position} onChange={e=>setAthlete(v=>({...v,position:e.target.value}))}/></label>
        <label className="profile-wide">부상 이력<input value={athlete.injuryHistory} onChange={e=>setAthlete(v=>({...v,injuryHistory:e.target.value}))}/></label>
      </div>}
      <div className="profile-actions"><button type="button" onClick={()=>router.push("/dashboard")}>대시보드</button><button type="submit">프로필 저장</button></div>
      {message && <p className="profile-message">{message}</p>}
    </form>
  </section></main>;
}
