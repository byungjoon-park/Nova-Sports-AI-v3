"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthStore, getCurrentUser, type NovaAthleteProfile } from "../../../lib/nova-auth";
import "../coach-dashboard.css";
import NovaTopBar from "../../../components/NovaTopBar";

type Row = { id: string; name: string; position: string; status: string; injury: string };

export default function CoachPlayersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "position" | "status">("name");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || (user.role !== "coach" && user.role !== "director")) {
      router.replace("/dashboard");
      return;
    }
    const store = getAuthStore();
    const teamIds = new Set(store.members.filter((m) => m.userId === user.id && m.status === "active").map((m) => m.teamId));
    const athleteIds = new Set(store.members.filter((m) => teamIds.has(m.teamId) && m.role === "athlete" && m.status === "active").map((m) => m.userId));
    const profiles = new Map<string, NovaAthleteProfile>(store.athleteProfiles.map((p) => [p.userId, p]));
    const users = store.users.filter((u) => athleteIds.has(u.id));
    setRows(users.map((u) => {
      const p = profiles.get(u.id);
      return {
        id: u.id,
        name: u.name,
        position: p?.position || "미입력",
        status: p ? "프로필 입력" : "프로필 미입력",
        injury: p?.injuryHistory?.trim() ? "부상 이력 있음" : "부상 이력 없음",
      };
    }));
  }, [router]);

  const visible = useMemo(() => rows.filter((r) => `${r.name} ${r.position}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const key = sort === "name" ? "name" : sort === "position" ? "position" : "status";
    return a[key].localeCompare(b[key], "ko");
  }), [rows, query, sort]);

  return <main className="coach-dashboard"><NovaTopBar /><header className="coach-head"><div><span>TEAM MANAGEMENT</span><h1>선수 현황</h1></div></header><section className="coach-shell"><div className="coach-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="선수명, 포지션 검색" /><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="name">이름순</option><option value="position">포지션순</option><option value="status">프로필 상태순</option></select></div><div className="coach-table-wrap"><table><thead><tr><th>선수</th><th>포지션</th><th>프로필</th><th>부상 이력</th></tr></thead><tbody>{visible.length ? visible.map((r) => <tr key={r.id}><td><button type="button" className="coach-player-link" onClick={() => router.push(`/coach-dashboard/players/${r.id}`)}>{r.name}</button></td><td>{r.position}</td><td>{r.status}</td><td>{r.injury}</td></tr>) : <tr><td colSpan={4}>담당 팀의 선수 데이터가 없습니다.</td></tr>}</tbody></table></div></section></main>;
}
