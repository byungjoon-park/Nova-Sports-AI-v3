"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAthleteProfile, getAuthStore, getCurrentUser, getUserTeams, NovaTeamMember, saveAthleteProfile } from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";
import "./players.css";
import NovaTopBar from "../../components/NovaTopBar";

const roleLabel: Record<string, string> = {
  director: "감독",
  coach: "코치",
  athlete: "선수",
  parent: "학부모",
};

export default function PlayersPage() {
  const router = useRouter();

  // NOVA role access guard: players management is for admin/director/coach only.
  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin" && user.role !== "director" && user.role !== "coach") {
      router.replace("/dashboard");
    }
  }, [router]);

  const { theme } = useNovaSettings();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [members, setMembers] = useState<NovaTeamMember[]>([]);
  const [athleteProfile, setAthleteProfile] = useState({ height: "", weight: "", bodyFat: "", position: "", gender: "" as "" | "male" | "female" | "other", birthYear: "", sport: "" });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace("/login");
      return;
    }
    setUser(current);
    if (current.role === "athlete") {
      const profile = getAthleteProfile(current.id);
      if (profile) {
        setAthleteProfile({
          height: profile.height == null ? "" : String(profile.height),
          weight: profile.weight == null ? "" : String(profile.weight),
          bodyFat: profile.bodyFat == null ? "" : String(profile.bodyFat),
          position: profile.position ?? "",
          gender: profile.gender ?? "",
          birthYear: profile.birthYear == null ? "" : String(profile.birthYear),
          sport: profile.sport ?? "",
        });
      }
      return;
    }
    const teams = getUserTeams(current.id);
    if (teams.length) {
      const teamId = selectedTeamId || teams[0].id;
      setSelectedTeamId(teamId);
      setMembers(getAuthStore().members.filter((m) => m.teamId === teamId && m.status === "active"));
    }
  }, [router, selectedTeamId]);

  const saveProfile = () => {
    if (user?.role !== "athlete") return;
    const saved = saveAthleteProfile({
      userId: user.id,
      height: athleteProfile.height ? Number(athleteProfile.height) : undefined,
      weight: athleteProfile.weight ? Number(athleteProfile.weight) : undefined,
      bodyFat: athleteProfile.bodyFat ? Number(athleteProfile.bodyFat) : undefined,
      position: athleteProfile.position.trim() || undefined,
      gender: athleteProfile.gender || undefined,
      birthYear: athleteProfile.birthYear ? Number(athleteProfile.birthYear) : undefined,
      sport: athleteProfile.sport.trim() || undefined,
    });
    if (saved) {
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 1800);
    }
  };

  const teams = useMemo(() => user ? getUserTeams(user.id) : [], [user]);

  const athletes = useMemo(() => {
    const store = getAuthStore();
    const role = user?.role;

    if (!user) return [];

    // 선수: 본인만
    if (role === "athlete") {
      const own = store.users.find((u) => u.id === user.id && u.role === "athlete");
      if (!own) return [];
      const member = store.members.find((m) => m.userId === own.id && m.role === "athlete" && m.status === "active");
      return [{ member: member ?? ({
        id: `self-${own.id}`,
        teamId: "",
        userId: own.id,
        role: "athlete" as const,
        status: "active" as const,
      }), user: own }];
    }

    // 학부모: 활성 guardian link가 있는 자녀만
    if (role === "parent") {
      const childIds = new Set(
        store.guardianLinks
          .filter((link) => link.guardianUserId === user.id && link.status === "active")
          .map((link) => link.athleteUserId),
      );
      return store.users
        .filter((u) => u.role === "athlete" && childIds.has(u.id))
        .map((athlete) => {
          const member = store.members.find((m) => m.userId === athlete.id && m.role === "athlete" && m.status === "active");
          return {
            member: member ?? ({
              id: `child-${athlete.id}`,
              teamId: "",
              userId: athlete.id,
              role: "athlete" as const,
              status: "active" as const,
            }),
            user: athlete,
          };
        });
    }

    // 관리자: 전체 선수
    if (role === "admin") {
      return store.users
        .filter((u) => u.role === "athlete")
        .map((athlete) => {
          const member = store.members.find((m) => m.userId === athlete.id && m.role === "athlete" && m.status === "active");
          return {
            member: member ?? ({
              id: `admin-${athlete.id}`,
              teamId: "",
              userId: athlete.id,
              role: "athlete" as const,
              status: "active" as const,
            }),
            user: athlete,
          };
        });
    }

    // 감독/코치: 현재 선택된 팀에 속한 선수만
    return members
      .filter((m) => m.role === "athlete" && m.status === "active")
      .map((m) => ({ member: m, user: store.users.find((u) => u.id === m.userId) }))
      .filter((item) => item.user);
  }, [members, user]);

  return (
    <main className="nova-players-page" data-theme={theme}>
      <section className="players-shell">
        <NovaTopBar />
        <div className="players-header">
          <div>
            <span className="players-eyebrow">NOVA / ATHLETE MANAGEMENT</span>
            <h1>선수 관리</h1>
            <p>팀에 등록된 선수의 기본 계정과 소속 상태를 확인합니다.</p>
          </div>
        </div>

        {user?.role !== "athlete" && user?.role !== "parent" ? (
          <div className="players-toolbar">
            <label>
              팀
              <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}>
                {teams.length === 0 && <option value="">가입된 팀 없음</option>}
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <div className="players-count">선수 <strong>{athletes.length}</strong>명</div>
          </div>
        ) : (
          <div className="players-toolbar">
            <div className="players-count">{user.role === "athlete" ? "내 선수 정보" : "연결된 자녀"} <strong>{athletes.length}</strong>명</div>
          </div>
        )}

        {athletes.length > 0 ? (
          <>
            {user?.role === "athlete" ? (
              <section className="players-table-wrap" style={{ padding: "20px" }}>
                {athletes.map(({ member, user: athlete }) => (
                  <div key={member.id}>
                    <table className="players-table">
                      <tbody>
                        <tr><th>선수</th><td><strong>{athlete?.name}</strong></td></tr>
                        <tr><th>이메일</th><td>{athlete?.email}</td></tr>
                        <tr><th>역할</th><td>{roleLabel[member.role] ?? member.role}</td></tr>
                        <tr><th>상태</th><td><span className="status">{member.status === "active" ? "활성" : member.status}</span></td></tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
                      <strong>내 선수 데이터 수정</strong>
                      <label>키 (cm)<input inputMode="decimal" value={athleteProfile.height} onChange={(e) => setAthleteProfile((v) => ({ ...v, height: e.target.value }))} /></label>
                      <label>체중 (kg)<input inputMode="decimal" value={athleteProfile.weight} onChange={(e) => setAthleteProfile((v) => ({ ...v, weight: e.target.value }))} /></label>
                      <label>체지방률 (%)<input inputMode="decimal" value={athleteProfile.bodyFat} onChange={(e) => setAthleteProfile((v) => ({ ...v, bodyFat: e.target.value }))} /></label>
                      <label>포지션<input value={athleteProfile.position} onChange={(e) => setAthleteProfile((v) => ({ ...v, position: e.target.value }))} /></label><label>성별<select value={athleteProfile.gender} onChange={(e) => setAthleteProfile((v) => ({ ...v, gender: e.target.value as typeof v.gender }))}><option value="">선택</option><option value="male">남성</option><option value="female">여성</option><option value="other">기타</option></select></label><label>출생연도<input inputMode="numeric" value={athleteProfile.birthYear} onChange={(e) => setAthleteProfile((v) => ({ ...v, birthYear: e.target.value }))} /></label><label>종목<input value={athleteProfile.sport} onChange={(e) => setAthleteProfile((v) => ({ ...v, sport: e.target.value }))} /></label>
                      <button type="button" onClick={saveProfile} style={{ justifySelf: "start", border: 0, borderRadius: "10px", background: "#171717", color: "#fff", padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>
                        {profileSaved ? "저장됨" : "저장"}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <div className="players-table-wrap">
                <table className="players-table">
                  <thead><tr><th>선수</th><th>이메일</th><th>역할</th><th>상태</th></tr></thead>
                  <tbody>
                    {athletes.map(({ member, user: athlete }) => (
                      <tr key={member.id}>
                        <td><strong>{athlete?.name}</strong></td>
                        <td>{athlete?.email}</td>
                        <td>{roleLabel[member.role] ?? member.role}</td>
                        <td><span className="status">{member.status === "active" ? "활성" : member.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="players-empty">
            <strong>등록된 선수가 없습니다.</strong>
            <p>감독이 팀 관리에서 선수 초대코드를 생성한 뒤 선수를 팀에 가입시키면 이곳에 표시됩니다.</p>
            {(user?.role === "director" || user?.role === "admin" || user?.role === "coach") && (
              <button type="button" onClick={() => router.push("/team")}>팀 관리로 이동</button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
