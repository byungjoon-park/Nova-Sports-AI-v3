"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuthStore, getCurrentUser, getAthleteProfile } from "../../../../lib/nova-auth";
import { readNovaAthleteData } from "../../../../lib/nova-data";
import NovaTopBar from "../../../../components/NovaTopBar";
import NovaFeedbackSurface from "../../../../components/NovaFeedbackSurface";
import "../../coach-dashboard.css";

export default function CoachPlayerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const athleteId = params?.id ?? "";
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || (user.role !== "coach" && user.role !== "director")) {
      router.replace("/dashboard");
      return;
    }
    const store = getAuthStore();
    const teamIds = new Set(
      store.members
        .filter((member) => member.userId === user.id && member.status === "active")
        .map((member) => member.teamId),
    );
    const isAthleteInTeam = store.members.some(
      (member) =>
        member.userId === athleteId &&
        member.role === "athlete" &&
        member.status === "active" &&
        teamIds.has(member.teamId),
    );
    if (!isAthleteInTeam) {
      router.replace("/coach-dashboard/players");
      return;
    }
    setAllowed(true);
  }, [athleteId, router]);

  const store = allowed ? getAuthStore() : null;
  const athlete = store?.users.find((user) => user.id === athleteId) ?? null;
  const profile = athlete ? getAthleteProfile(athlete.id) : null;

  const personalData = useMemo(() => {
    if (!allowed || !athlete) return null;
    const data = readNovaAthleteData();
    if (data.athlete.id !== athlete.id) return null;

    const latest = <T extends { date: string }>(records: T[]) =>
      records.length ? [...records].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

    const trend = (records: Array<{ date: string; score: number }>) =>
      [...records]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7)
        .map((record, index, list) => ({
          ...record,
          delta: index === 0 ? null : record.score - list[index - 1].score,
        }));

    return {
      performance: latest(data.performanceRecords),
      recovery: latest(data.recoveryRecords),
      fatigue: latest(data.fatigueRecords),
      performanceTrend: trend(data.performanceRecords),
      recoveryTrend: trend(data.recoveryRecords),
      fatigueTrend: trend(data.fatigueRecords),
      rehabCount: data.rehabRecords.length,
      injuryCount: data.injuryRecords.length,
    };
  }, [allowed, athlete]);

  if (!allowed || !athlete) return null;

  return (
    <main className="coach-dashboard">
      <NovaTopBar />

      <header className="coach-head">
        <div>
          <span>TEAM MANAGEMENT</span>
          <h1>{athlete.name}</h1>
          <p>선수 기본정보와 연결된 실제 기록만 확인합니다.</p>
        </div>
      </header>

      <section className="coach-shell">
        <div className="coach-toolbar">
          <button type="button" onClick={() => router.push("/coach-dashboard/players")}>
            선수 현황
          </button>
        </div>

        <div className="coach-table-wrap">
          <table>
            <tbody>
              <tr>
                <th>종목</th><td>{profile?.sport || "미입력"}</td>
                <th>포지션</th><td>{profile?.position || "미입력"}</td>
              </tr>
              <tr>
                <th>성별</th><td>{profile?.gender || "미입력"}</td>
                <th>출생연도</th><td>{profile?.birthYear || "미입력"}</td>
              </tr>
              <tr>
                <th>키</th><td>{profile?.height ? `${profile.height} cm` : "미입력"}</td>
                <th>체중</th><td>{profile?.weight ? `${profile.weight} kg` : "미입력"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="coach-table-wrap">
          <table>
            <thead><tr><th>실제 기록</th><th>값</th><th>기준일</th></tr></thead>
            <tbody>
              <tr><td>퍼포먼스</td><td>{personalData?.performance ? `${personalData.performance.score} / 100` : "기록 없음"}</td><td>{personalData?.performance?.date || "—"}</td></tr>
              <tr><td>회복</td><td>{personalData?.recovery ? `${personalData.recovery.score} / 100` : "기록 없음"}</td><td>{personalData?.recovery?.date || "—"}</td></tr>
              <tr><td>피로도</td><td>{personalData?.fatigue ? `${personalData.fatigue.score} / 100` : "기록 없음"}</td><td>{personalData?.fatigue?.date || "—"}</td></tr>
              <tr><td>재활 기록</td><td>{personalData ? `${personalData.rehabCount}건` : "연결된 기록 없음"}</td><td>—</td></tr>
              <tr><td>부상 기록</td><td>{personalData ? `${personalData.injuryCount}건` : "연결된 기록 없음"}</td><td>—</td></tr>
            </tbody>
          </table>
        </div>

        {personalData && (
          <div className="coach-table-wrap">
            <div className="coach-section-title">최근 측정 추이</div>
            <table>
              <thead><tr><th>지표</th><th>측정일</th><th>점수</th><th>이전 측정 대비</th></tr></thead>
              <tbody>
                {[
                  ...personalData.performanceTrend.map((r) => ({ label: "퍼포먼스", ...r })),
                  ...personalData.recoveryTrend.map((r) => ({ label: "회복", ...r })),
                  ...personalData.fatigueTrend.map((r) => ({ label: "피로도", ...r })),
                ]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((r, i) => (
                    <tr key={`${r.label}-${r.date}-${i}`}>
                      <td>{r.label}</td><td>{r.date}</td><td>{r.score} / 100</td>
                      <td>{r.delta === null ? "—" : `${r.delta > 0 ? "+" : ""}${r.delta}`}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="coach-detail-actions">
          <button type="button" onClick={() => window.print()}>프린트</button>
        </div>

        {personalData && (
          <>
            <div className="coach-table-wrap">
              <div className="coach-section-title">재활 현황</div>
              <table>
                <thead><tr><th>날짜</th><th>부위</th><th>운동</th><th>완료</th><th>메모</th></tr></thead>
                <tbody>
                  {readNovaAthleteData().rehabRecords.length
                    ? [...readNovaAthleteData().rehabRecords]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((r, i) => (
                          <tr key={`${r.date}-${r.area}-${i}`}>
                            <td>{r.date}</td><td>{r.area || "미분류"}</td><td>{r.exercise || "—"}</td>
                            <td>{r.completed ? "완료" : "미완료"}</td><td>{r.note || "—"}</td>
                          </tr>
                        ))
                    : <tr><td colSpan={5}>연결된 재활 기록이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="coach-table-wrap">
              <div className="coach-section-title">부상 및 복귀 현황</div>
              <table>
                <thead><tr><th>부위</th><th>부상일</th><th>복귀일</th><th>재부상일</th><th>메모</th></tr></thead>
                <tbody>
                  {readNovaAthleteData().injuryRecords.length
                    ? [...readNovaAthleteData().injuryRecords]
                        .sort((a, b) => b.injuryDate.localeCompare(a.injuryDate))
                        .map((r) => (
                          <tr key={r.id}>
                            <td>{r.area || "미분류"}</td><td>{r.injuryDate}</td><td>{r.returnDate || "미복귀"}</td>
                            <td>{r.reinjuryDate || "—"}</td><td>{r.note || "—"}</td>
                          </tr>
                        ))
                    : <tr><td colSpan={5}>연결된 부상 기록이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!personalData && (
          <p>현재 저장된 측정 데이터가 이 선수 계정과 연결되어 있지 않습니다. 다른 선수의 데이터를 대신 표시하지 않습니다.</p>
        )}

        <NovaFeedbackSurface placement="players" targetUserId={athleteId} />
      </section>
    </main>
  );
}
