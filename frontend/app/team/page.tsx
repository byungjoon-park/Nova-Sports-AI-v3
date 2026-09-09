/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import { createTeam, createTeamInvite, getCurrentUser, getUserTeams, NovaTeam, NovaUserRole } from "../../lib/nova-auth";
import "./team.css";
import NovaTopBar from "../../components/NovaTopBar";

const roles: Array<{ value: Exclude<NovaUserRole, "admin">; label: string }> = [
  { value: "coach", label: "코치" },
  { value: "athlete", label: "선수" },
  { value: "parent", label: "학부모" },
];

export default function TeamPage() {
  const { theme } = useNovaSettings();
  const router = useRouter();
  const [user] = useState(() => getCurrentUser());
  const [teams, setTeams] = useState<NovaTeam[]>([]);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [organization, setOrganization] = useState("");
  const [teamId, setTeamId] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<NovaUserRole, "admin">>("coach");
  const [invite, setInvite] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    setTeams(getUserTeams(user.id));
  }, [user, router]);

  const submitTeam = (event: FormEvent) => {
    event.preventDefault();
    const team = createTeam({ name, sport, organization });
    if (!team) {
      setMessage("감독 권한으로 로그인한 후 팀을 생성할 수 있습니다.");
      return;
    }
    setTeams(getUserTeams(user?.id));
    setTeamId(team.id);
    setName("");
    setMessage(`팀이 생성되었습니다. 팀 ID: ${team.id}`);
  };

  const makeInvite = () => {
    if (!teamId) return setMessage("초대할 팀을 먼저 선택하세요.");
    const created = createTeamInvite({ teamId, role: inviteRole });
    if (!created) return setMessage("이 팀의 초대 권한이 없습니다.");
    setInvite(created.code);
    setMessage("초대 코드가 생성되었습니다. 상대방에게 전달하세요.");
  };

  return (
    <main className="nova-team-page" data-theme={theme}>
      <NovaTopBar />
      <section className="team-card">
        <span className="eyebrow">NOVA TEAM / STEP 81</span>
        <h1>팀 생성 및 인증</h1>
        <p>감독이 팀을 만들고 코치·선수·학부모를 초대하는 1차 인증 구조입니다.</p>

        {user && <div className="team-user"><b>{user.name}</b><span>{user.email} · {user.role}</span></div>}

        <form onSubmit={submitTeam} className="team-form">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="팀명" required />
          <input value={sport} onChange={(e) => setSport(e.target.value)} placeholder="종목" />
          <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="소속" />
          <button type="submit">팀 생성</button>
        </form>

        {teams.length > 0 && (
          <div className="team-section">
            <h2>내 팀</h2>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">팀 선택</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>

            <div className="invite-row">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
                {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <button type="button" onClick={makeInvite}>초대코드 생성</button>
            </div>
            {invite && <div className="invite-code">{invite}</div>}
          </div>
        )}

        {message && <p className="team-message">{message}</p>}
      </section>
    </main>
  );
}
