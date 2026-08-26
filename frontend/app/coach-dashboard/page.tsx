"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthStore, getCurrentUser, getAthleteProfile, getUserTeams, NovaUserRole } from "../../lib/nova-auth";
import NovaTopBar from "../../components/NovaTopBar";
import { useNovaSettings } from "../settings-context";
import "./coach-dashboard.css";

type RosterRow = {
  id: string;
  name: string;
  role: NovaUserRole;
  position: string;
  profile: "완료" | "부분 입력" | "미입력";
  injury: string;
};

export default function CoachDashboardPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [teamId, setTeamId] = useState("");

  useEffect(() => {
    const current = getCurrentUser();
    setUser(current);
    if (!current) router.replace("/login");
  }, [router]);

  const teams = useMemo(() => user ? getUserTeams(user.id) : [], [user]);
  const selectedTeam = teams.find((team) => team.id === teamId) ?? teams[0];

  const roster = useMemo<RosterRow[]>(() => {
    if (!selectedTeam) return [];
    const store = getAuthStore();
    const members = store.members.filter((member) => member.teamId === selectedTeam.id && member.status === "active");
    return members
      .map((member) => {
        const memberUser = store.users.find((candidate) => candidate.id === member.userId);
        if (!memberUser) return null;
        const profile = memberUser.role === "athlete" ? getAthleteProfile(memberUser.id) : null;
        const profileFields = profile ? [profile.height, profile.weight, profile.bodyFat, profile.position, profile.sport].filter((value) => value !== undefined && value !== "").length : 0;
        return {
          id: memberUser.id,
          name: memberUser.name,
          role: memberUser.role,
          position: profile?.position || "미입력",
          profile: profileFields >= 4 ? "완료" : profileFields > 0 ? "부분 입력" : "미입력",
          injury: profile?.injuryHistory || "등록된 부상 이력 없음",
        };
      })
      .filter((row): row is RosterRow => row !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [selectedTeam]);

  const athletes = roster.filter((row) => row.role === "athlete");
  const coaches = roster.filter((row) => row.role === "coach" || row.role === "director");
  const profileComplete = athletes.filter((row) => row.profile === "완료").length;
  const injuryCount = athletes.filter((row) => row.injury !== "등록된 부상 이력 없음").length;

  if (!user) return null;
  if (user.role !== "director" && user.role !== "coach") {
    return (
      <main className="coach-dashboard-page" data-theme={theme}>
        <NovaTopBar />
        <section className="coach-dashboard-card access-card">
          <span className="eyebrow">TEAM MANAGEMENT</span>
          <h1>감독·코치 전용 화면</h1>
          <p>감독 또는 코치 권한으로 로그인한 경우에만 사용할 수 있습니다.</p>
          <button type="button" onClick={() => router.push("/dashboard")}>대시보드로 이동</button>
        </section>
      </main>
    );
  }

  return (
    <main className="coach-dashboard-page" data-theme={theme}>
      <NovaTopBar />
      <section className="coach-dashboard-wrap">
        <header className="coach-dashboard-header">
          <div>
            <span className="eyebrow">TEAM MANAGEMENT</span>
            <h1>{user.role === "director" ? "감독 팀 대시보드" : "코치 팀 대시보드"}</h1>
            <p>담당 팀의 구성원과 선수 기본정보를 확인합니다.</p>
          </div>
          <div className="coach-dashboard-header-actions">
            <button type="button" onClick={() => router.push("/coach-dashboard/players")}>선수 현황</button>
            <button type="button" onClick={() => router.push("/team")}>팀 관리</button>
          </div>
        </header>

        {teams.length === 0 ? (
          <section className="coach-dashboard-card empty-card">
            <h2>담당 팀이 없습니다.</h2>
            <p>팀을 생성하거나 초대받은 뒤 이 화면에서 팀 현황을 확인할 수 있습니다.</p>
          </section>
        ) : (
          <>
            <section className="coach-dashboard-toolbar">
              <label>
                <span>팀 선택</span>
                <select value={selectedTeam?.id ?? ""} onChange={(event) => setTeamId(event.target.value)}>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
            </section>

            <section className="coach-dashboard-metrics">
              <article><span>선수</span><strong>{athletes.length}</strong><small>명</small></article>
              <article><span>코치</span><strong>{coaches.length}</strong><small>명</small></article>
              <article><span>프로필 완료</span><strong>{profileComplete}</strong><small>/ {athletes.length || 0}</small></article>
              <article><span>부상 이력 등록</span><strong>{injuryCount}</strong><small>명</small></article>
            </section>

            <section className="coach-dashboard-card">
              <div className="section-head">
                <div><span className="eyebrow">TEAM ROSTER</span><h2>팀 구성원</h2></div>
                <span>{roster.length}명</span>
              </div>
              <div className="roster-table" role="table" aria-label="팀 구성원">
                <div className="roster-row roster-head" role="row"><span>이름</span><span>역할</span><span>포지션</span><span>프로필</span><span>부상 이력</span></div>
                {roster.map((row) => (
                  <div className="roster-row" role="row" key={row.id}>
                    <strong>{row.name}</strong>
                    <span>{row.role === "athlete" ? "선수" : row.role === "director" ? "감독" : "코치"}</span>
                    <span>{row.position}</span>
                    <span>{row.profile}</span>
                    <span>{row.injury}</span>
                  </div>
                ))}
                {roster.length === 0 && <div className="roster-empty">활성 팀 구성원이 없습니다.</div>}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
