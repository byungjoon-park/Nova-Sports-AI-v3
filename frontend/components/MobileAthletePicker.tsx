"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAuthStore, getCurrentUser, getUserTeams, type NovaUser } from "../lib/nova-auth";

export type MobileSelectableAthlete = Pick<NovaUser, "id" | "name" | "email">;

export function isMobileManagerRole(role?: string | null) {
  return role === "admin" || role === "director" || role === "coach";
}

export function getMobileSelectableAthletes(user: NovaUser | null = getCurrentUser()): MobileSelectableAthlete[] {
  if (!user) return [];
  const store = getAuthStore();
  const athletes = store.users.filter((entry) => entry.role === "athlete");
  if (user.role === "admin") return athletes.map(({ id, name, email }) => ({ id, name, email }));
  if (user.role === "parent") {
    const linked = new Set(store.guardianLinks.filter((link) => link.guardianUserId === user.id && link.status === "active").map((link) => link.athleteUserId));
    return athletes.filter((entry) => linked.has(entry.id)).map(({ id, name, email }) => ({ id, name, email }));
  }
  if (user.role !== "director" && user.role !== "coach") return [];
  const teamIds = new Set(getUserTeams(user.id).map((team) => team.id));
  const athleteIds = new Set(store.members.filter((member) => teamIds.has(member.teamId) && member.role === "athlete" && member.status === "active").map((member) => member.userId));
  return athletes.filter((entry) => athleteIds.has(entry.id)).map(({ id, name, email }) => ({ id, name, email }));
}

function selectionKey(userId: string) { return `nova-mobile-selected-athlete:${userId}`; }

export function getSavedMobileAthleteId(userId: string) {
  try { return localStorage.getItem(selectionKey(userId)) || ""; } catch { return ""; }
}

export function saveMobileAthleteId(userId: string, athleteId: string) {
  try { localStorage.setItem(selectionKey(userId), athleteId); } catch {}
}

export default function MobileAthletePicker({ onSelect }: { onSelect: (athlete: MobileSelectableAthlete | null) => void }) {
  const callbackRef = useRef(onSelect);
  const [user, setUser] = useState<NovaUser | null>(null);
  const [athletes, setAthletes] = useState<MobileSelectableAthlete[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => { callbackRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    const current = getCurrentUser();
    if (!current || !isMobileManagerRole(current.role)) return;
    const list = getMobileSelectableAthletes(current);
    const saved = getSavedMobileAthleteId(current.id);
    const selected = list.find((item) => item.id === saved) ?? list[0] ?? null;
    setUser(current);
    setAthletes(list);
    setSelectedId(selected?.id ?? "");
    callbackRef.current(selected);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? athletes.filter((athlete) => `${athlete.name} ${athlete.email}`.toLocaleLowerCase().includes(needle)) : athletes;
  }, [athletes, query]);

  if (!user || !isMobileManagerRole(user.role)) return null;
  return (
    <section aria-label="선수 선택" style={{ maxWidth: 720, margin: "0 auto 14px", padding: "13px 14px", border: "1px solid #e3dfd6", borderRadius: 14, background: "rgba(255,255,255,.72)" }}>
      <label style={{ display: "grid", gap: 7, color: "#556171", fontSize: 12, fontWeight: 650 }}>
        선수 검색
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="선수 이름 또는 이메일" aria-label="선수 이름 또는 이메일 검색" style={{ boxSizing: "border-box", width: "100%", minHeight: 42, padding: "0 11px", border: "1px solid #d9d5cc", borderRadius: 9, background: "#fff", color: "#20252d", font: "inherit" }} />
      </label>
      {athletes.length ? (
        <div role="listbox" aria-label="검색된 선수" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          {filtered.map((athlete) => <button key={athlete.id} type="button" role="option" aria-selected={selectedId === athlete.id} onClick={() => {
            setSelectedId(athlete.id);
            saveMobileAthleteId(user.id, athlete.id);
            callbackRef.current(athlete);
          }} style={{ minHeight: 36, padding: "0 11px", border: selectedId === athlete.id ? "1px solid #71839b" : "1px solid #dedbd4", borderRadius: 18, background: selectedId === athlete.id ? "#e9edf2" : "transparent", color: "#263241", font: "inherit", fontSize: 12, cursor: "pointer" }}>{athlete.name}</button>)}
          {!filtered.length && <span style={{ color: "#697586", fontSize: 12 }}>검색 결과가 없습니다.</span>}
        </div>
      ) : <p style={{ margin: "10px 0 0", color: "#697586", fontSize: 12, lineHeight: 1.5 }}>조회할 수 있는 소속 선수가 없습니다. 활성 팀원 연결을 확인해 주세요.</p>}
    </section>
  );
}
