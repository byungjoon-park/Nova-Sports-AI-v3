/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import "./medical.css";
import NovaTopBar from "../../components/NovaTopBar";
import { getAuthStore, getCurrentUser, getUserTeams } from "../../lib/nova-auth";
import { readNovaAthleteData, writeNovaAthleteData, type NovaAthleteData } from "../../lib/nova-data";

type Injury = {
  id: number;
  athlete: string;
  athleteUserId?: string;
  injuryDate: string;
  returnDate: string;
  diagnosis: string;
  surgery: "Yes" | "No";
  bodyPart: string;
  otherBodyPart?: string;
  injurySeverity: "Mild" | "Moderate" | "Severe" | "Critical";
  status: "Rehab" | "Returned" | "Scheduled";
  rehabStage: "Early" | "Progress" | "Return";
  lastEvaluation: string;
  nextEvaluation: string;
};

const injuries: Injury[] = [
  { id: 1, athlete: "John Kim", injuryDate: "2026-01-18", returnDate: "2026-02-22", diagnosis: "Hamstring strain", surgery: "No", bodyPart: "Hamstring", injurySeverity: "Moderate", status: "Returned", rehabStage: "Return", lastEvaluation: "2026-02-15", nextEvaluation: "" },
  { id: 2, athlete: "John Kim", injuryDate: "2026-03-07", returnDate: "2026-04-11", diagnosis: "Ankle sprain", surgery: "No", bodyPart: "Ankle", injurySeverity: "Mild", status: "Returned", rehabStage: "Return", lastEvaluation: "2026-04-04", nextEvaluation: "" },
  { id: 3, athlete: "John Kim", injuryDate: "2026-05-14", returnDate: "2026-06-28", diagnosis: "Knee pain", surgery: "No", bodyPart: "Knee", injurySeverity: "Moderate", status: "Rehab", rehabStage: "Progress", lastEvaluation: "2026-08-10", nextEvaluation: "2026-08-18" },
  { id: 4, athlete: "Alex Lee", injuryDate: "2026-05-21", returnDate: "2026-07-02", diagnosis: "Shoulder impingement", surgery: "No", bodyPart: "Shoulder", injurySeverity: "Moderate", status: "Rehab", rehabStage: "Progress", lastEvaluation: "2026-08-10", nextEvaluation: "2026-08-18" },
  { id: 5, athlete: "Min Park", injuryDate: "2026-07-09", returnDate: "2026-08-20", diagnosis: "ACL injury", surgery: "Yes", bodyPart: "Knee", injurySeverity: "Moderate", status: "Scheduled", rehabStage: "Return", lastEvaluation: "2026-08-12", nextEvaluation: "2026-08-19" },
];

const monthNames = {
  ko: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
} as const;

export default function MedicalPage() {
  const router = useRouter();
  const { language, theme } = useNovaSettings();
  const currentLang = (language === "en" ? "en" : "ko") as "ko" | "en";
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [authStore, setAuthStore] = useState<ReturnType<typeof getAuthStore> | null>(null);
  const [patternOpen, setPatternOpen] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setAuthStore(getAuthStore());
    if (!user) router.replace("/login");
  }, [router]);

  const visibleAthletes = useMemo(() => {
    if (!currentUser || !authStore) return [];

    if (currentUser.role === "admin") {
      return authStore.users.filter((u) => u.role === "athlete");
    }

    if (currentUser.role === "athlete") {
      return authStore.users.filter((u) => u.id === currentUser.id && u.role === "athlete");
    }

    if (currentUser.role === "parent") {
      const linkedIds = new Set(
        authStore.guardianLinks
          .filter((link) => link.guardianUserId === currentUser.id && link.status === "active")
          .map((link) => link.athleteUserId),
      );
      return authStore.users.filter((u) => u.role === "athlete" && linkedIds.has(u.id));
    }

    const teamIds = new Set(getUserTeams(currentUser.id).map((team) => team.id));
    const athleteIds = new Set(
      authStore.members
        .filter((m) => teamIds.has(m.teamId) && m.role === "athlete" && m.status === "active")
        .map((m) => m.userId),
    );
    return authStore.users.filter((u) => u.role === "athlete" && athleteIds.has(u.id));
  }, [currentUser, authStore]);

  const visibleAthleteIds = useMemo(() => new Set(visibleAthletes.map((athlete) => athlete.id)), [visibleAthletes]);

  const resolveLegacyAthleteUserId = (name: string) => {
    if (!authStore) return undefined;
    const matches = authStore.users.filter((user) => user.role === "athlete" && user.name === name);
    return matches.length === 1 ? matches[0].id : undefined;
  };

  const [year, setYear] = useState(2026);
  const [records, setRecords] = useState<Injury[]>(injuries);

  const visibleRecords = useMemo(
    () => records.filter((record) => {
      // 선수는 반드시 자신의 userId에 연결된 기록만 볼 수 있습니다.
      // 기존 이름 기반 기록은 아래 로딩 단계에서 본인 기록에만 userId를 보정합니다.
      if (currentUser?.role === "athlete") {
        return record.athleteUserId === currentUser.id;
      }

      if (currentUser?.role === "admin" && !record.athleteUserId) return true;
      if (record.athleteUserId) return visibleAthleteIds.has(record.athleteUserId);
      const resolvedId = resolveLegacyAthleteUserId(record.athlete);
      return Boolean(resolvedId && visibleAthleteIds.has(resolvedId));
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, visibleAthleteIds, authStore, currentUser],
  );

  const canManageMedical = currentUser?.role === "admin" || currentUser?.role === "director" || currentUser?.role === "coach";
  const canAddMedical = canManageMedical || currentUser?.role === "athlete";
  const canEditMedical = canManageMedical || currentUser?.role === "athlete";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Injury, "id">>({
    athlete: visibleAthletes[0]?.name ?? "John Kim",
    athleteUserId: visibleAthletes[0]?.id,
    injuryDate: "",
    returnDate: "",
    diagnosis: "",
    surgery: "No",
    bodyPart: "",
    otherBodyPart: "",
    injurySeverity: "Moderate",
    status: "Rehab",
    rehabStage: "Early",
    lastEvaluation: "",
    nextEvaluation: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [rehabData, setRehabData] = useState<NovaAthleteData | null>(null);
  const [rehabArea, setRehabArea] = useState("");
  const [rehabExercise, setRehabExercise] = useState("");
  const [rehabNote, setRehabNote] = useState("");
  const [rehabCompleted, setRehabCompleted] = useState(false);

  useEffect(() => {
    try {
      const current = getCurrentUser();
      if (current?.role === "athlete") setRehabData(readNovaAthleteData());
      const saved = localStorage.getItem("nova-medical-injuries");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Injury>[];
        if (Array.isArray(parsed)) {
          setRecords(
            parsed.map((row, index) => ({
              id: Number(row.id ?? Date.now() + index),
              athlete: row.athlete ?? "John Kim",
              athleteUserId:
                typeof row.athleteUserId === "string"
                  ? row.athleteUserId
                  : currentUser?.role === "athlete" && row.athlete === currentUser.name
                    ? currentUser.id
                    : undefined,
              injuryDate: row.injuryDate ?? "",
              returnDate: row.returnDate ?? "",
              diagnosis: row.diagnosis ?? "",
              surgery: row.surgery === "Yes" ? "Yes" : "No",
              bodyPart: row.bodyPart ?? "",
              otherBodyPart: row.otherBodyPart ?? "",
              injurySeverity:
                row.injurySeverity === "Mild"
                  ? "Mild"
                  : row.injurySeverity === "Severe"
                    ? "Severe"
                    : row.injurySeverity === "Critical"
                      ? "Critical"
                      : "Moderate",
              status:
                row.status === "Returned"
                  ? "Returned"
                  : row.status === "Scheduled"
                    ? "Scheduled"
                    : "Rehab",
              rehabStage:
                row.rehabStage === "Progress"
                  ? "Progress"
                  : row.rehabStage === "Return"
                    ? "Return"
                    : "Early",
              lastEvaluation: row.lastEvaluation ?? "",
              nextEvaluation: row.nextEvaluation ?? "",
            }))
          );
        }
      }
    } catch {
      // Keep built-in records if saved data is unavailable.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("nova-medical-injuries", JSON.stringify(records));
    } catch {
      // Ignore storage failures; the page still works in memory.
    }
  }, [records]);

  const copy = {
    ko: {
      eyebrow:"건강 및 재활", title:"재활관리", subtitle:"선수 부상과 복귀 과정을 관리하고 월·년 단위 부상 패턴을 분석합니다.",
      add:"부상 기록 추가", total:"연간 부상 건수", rehab:"재활 진행", returned:"복귀 완료", surgery:"수술 건수",
      monthly:"월별 부상 통계", annual:"연간 통계", pattern:"부상 발생 패턴", records:"부상 기록",
      athlete:"선수", injuryDate:"부상일자", returnDate:"복귀일자", diagnosis:"진단명", surgeryLabel:"수술 유무", bodyPart:"부상 부위",
      otherBodyPart:"기타 부위 상세", injurySeverity:"손상도", mild:"경미", moderate:"중등도", severe:"중증", critical:"심각",
      otherParts:"기타 부위", severityPattern:"손상도 분포",
      status:"상태", yes:"있음", no:"없음", rehabStatus:"재활 중", returnedStatus:"복귀", scheduled:"복귀 예정",
      peak:"가장 많이 다치는 월", close:"닫기", save:"저장", edit:"수정", remove:"삭제", cases:"건", active:"진행", completed:"완료",
      injuryCases:"부상 건수", surgicalCases:"수술 건수", currentRehab:"현재 재활 중", returnScheduled:"복귀 예정", management:"관리",
      knee:"무릎", hamstring:"햄스트링", ankle:"발목", shoulder:"어깨", hip:"고관절",
      neck:"목", spine:"척추", elbow:"팔꿈치", wrist:"손목", hand:"손", foot:"발",
      face:"얼굴/턱", chest:"가슴", abdomen:"복부", pelvis:"골반", ribs:"갈비뼈", other:"기타",
      quadriceps:"대퇴사두근", calf:"종아리", groin:"사타구니", adductor:"내전근",
      hipFlexor:"고관절 굴곡근", glute:"둔근", backMuscle:"등/허리 근육",
      editTitle:"부상 기록 수정",
      diagnosisPlaceholder:"예: 무릎 통증", bodyPartPlaceholder:"예: 무릎",
      rehabStage:"재활 단계", earlyStage:"초기", progressStage:"회복 진행", returnStage:"복귀 준비",
      lastEvaluation:"최근 평가일", nextEvaluation:"다음 평가일"
    },
    en: {
      eyebrow:"HEALTH & REHABILITATION", title:"Rehabilitation Management", subtitle:"Manage injuries and return-to-play status with monthly and annual injury trends.",
      add:"Add Injury Record", total:"Annual Injuries", rehab:"In Rehab", returned:"Returned", surgery:"Surgeries",
      monthly:"Monthly Injury Statistics", annual:"Annual Statistics", pattern:"Injury Pattern", records:"Injury Records",
      athlete:"Athlete", injuryDate:"Injury Date", returnDate:"Return Date", diagnosis:"Diagnosis", surgeryLabel:"Surgery", bodyPart:"Body Part",
      otherBodyPart:"Other body part detail", injurySeverity:"Severity", mild:"Mild", moderate:"Moderate", severe:"Severe", critical:"Critical",
      otherParts:"Other Body Parts", severityPattern:"Severity Distribution",
      status:"Status", yes:"Yes", no:"No", rehabStatus:"Rehab", returnedStatus:"Returned", scheduled:"Scheduled",
      peak:"Peak injury month", close:"Close", save:"Save", edit:"Edit", remove:"Delete", cases:"cases", active:"active", completed:"completed",
      injuryCases:"Injury cases", surgicalCases:"Surgical cases", currentRehab:"Currently in rehab", returnScheduled:"Return scheduled", management:"Manage",
      knee:"Knee", hamstring:"Hamstring", ankle:"Ankle", shoulder:"Shoulder", hip:"Hip",
      neck:"Neck", spine:"Spine", elbow:"Elbow", wrist:"Wrist", hand:"Hand", foot:"Foot",
      face:"Face/Jaw", chest:"Chest", abdomen:"Abdomen", pelvis:"Pelvis", ribs:"Ribs", other:"Other",
      quadriceps:"Quadriceps", calf:"Calf", groin:"Groin", adductor:"Adductor",
      hipFlexor:"Hip Flexor", glute:"Glute", backMuscle:"Back Muscles",
      editTitle:"Edit Injury Record",
      diagnosisPlaceholder:"e.g. Knee pain", bodyPartPlaceholder:"e.g. Knee",
      rehabStage:"Rehab Stage", earlyStage:"Early", progressStage:"Progress", returnStage:"Return",
      lastEvaluation:"Last Evaluation", nextEvaluation:"Next Evaluation"
    }
  } as const;

  const localizedLabels = copy[currentLang];

  const bodyPartLabels = {
    Neck: localizedLabels.neck,
    Spine: localizedLabels.spine,
    Shoulder: localizedLabels.shoulder,
    Elbow: localizedLabels.elbow,
    Wrist: localizedLabels.wrist,
    Hand: localizedLabels.hand,
    Hip: localizedLabels.hip,
    Knee: localizedLabels.knee,
    Ankle: localizedLabels.ankle,
    Foot: localizedLabels.foot,
    Face: localizedLabels.face,
    Chest: localizedLabels.chest,
    Abdomen: localizedLabels.abdomen,
    Pelvis: localizedLabels.pelvis,
    Ribs: localizedLabels.ribs,
    Other: localizedLabels.other,
    Hamstring: localizedLabels.hamstring,
    Quadriceps: localizedLabels.quadriceps,
    Calf: localizedLabels.calf,
    Groin: localizedLabels.groin,
    Adductor: localizedLabels.adductor,
    HipFlexor: localizedLabels.hipFlexor,
    Glute: localizedLabels.glute,
    BackMuscle: localizedLabels.backMuscle,
  } as const;

  const annualStatLabels = [
    localizedLabels.injuryCases,
    localizedLabels.surgicalCases,
    localizedLabels.currentRehab,
    localizedLabels.returnScheduled,
  ];

  const resetForm = () => {
    setEditingId(null);
    setForm({
      athlete: visibleAthletes[0]?.name ?? "John Kim",
      athleteUserId: visibleAthletes[0]?.id,
      injuryDate: "",
      returnDate: "",
      diagnosis: "",
      surgery: "No",
      bodyPart: "",
      otherBodyPart: "",
      injurySeverity: "Moderate",
      status: "Rehab",
      rehabStage: "Early",
      lastEvaluation: "",
      nextEvaluation: "",
    });
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row: Injury) => {
    if (!canEditMedical) return;
    if (currentUser?.role === "athlete" && row.athleteUserId !== currentUser.id) return;
    setEditingId(row.id);
    setForm({
      athlete: row.athlete,
      athleteUserId: row.athleteUserId ?? resolveLegacyAthleteUserId(row.athlete),
      injuryDate: row.injuryDate,
      returnDate: row.returnDate,
      diagnosis: row.diagnosis,
      surgery: row.surgery,
      bodyPart: row.bodyPart,
      otherBodyPart: row.otherBodyPart ?? "",
      injurySeverity: row.injurySeverity ?? "Moderate",
      status: row.status,
      rehabStage: row.rehabStage ?? "Early",
      lastEvaluation: row.lastEvaluation ?? "",
      nextEvaluation: row.nextEvaluation ?? "",
    });
    setShowForm(true);
  };

  const saveRecord = () => {
    if (!canEditMedical) return;
    if (!form.athlete || !form.injuryDate || !form.diagnosis || !form.bodyPart) return;

    const athleteUserId = form.athleteUserId ?? resolveLegacyAthleteUserId(form.athlete);
    if (!athleteUserId || !visibleAthleteIds.has(athleteUserId)) return;
    if (currentUser?.role === "athlete" && athleteUserId !== currentUser.id) return;

    const nextRecord = { ...form, athleteUserId };

    if (editingId !== null) {
      setRecords(prev => prev.map(row => row.id === editingId ? { ...nextRecord, id: editingId } : row));
    } else {
      setRecords(prev => [...prev, { ...nextRecord, id: Date.now() }]);
    }

    setShowForm(false);
    resetForm();
  };

  const saveRehabRecord = () => {
    if (!rehabData || !rehabArea.trim() || !rehabExercise.trim()) return;
    const next = {
      ...rehabData,
      rehabRecords: [...rehabData.rehabRecords, { date: new Date().toISOString().slice(0, 10), area: rehabArea.trim(), exercise: rehabExercise.trim(), completed: rehabCompleted, note: rehabNote.trim() || undefined }],
    };
    writeNovaAthleteData(next);
    setRehabData(next);
    setRehabArea(""); setRehabExercise(""); setRehabNote(""); setRehabCompleted(false);
  };

  const deleteRecord = (id: number) => {
    if (!canManageMedical) return;
    if (!window.confirm(currentLang === "en" ? "Delete this injury record?" : "이 부상 기록을 삭제할까요?")) return;
    setRecords(prev => prev.filter(row => row.id !== id));
  };

  const yearRows = visibleRecords.filter((x) => x.injuryDate.startsWith(String(year)));
  const monthCounts = useMemo(
    () => monthNames[currentLang].map((_, i) => yearRows.filter(x => Number(x.injuryDate.slice(5, 7)) === i + 1).length),
    [yearRows, currentLang]
  );
  const maxMonth = Math.max(1, ...monthCounts);
  const peakIndex = monthCounts.indexOf(Math.max(...monthCounts));

  const patternParts = [
    "Neck", "Spine", "Shoulder", "Elbow", "Wrist", "Hand", "Hip", "Knee", "Ankle", "Foot",
    "Hamstring", "Quadriceps", "Calf", "Groin", "Adductor", "HipFlexor", "Glute", "BackMuscle",
    "Face", "Chest", "Abdomen", "Pelvis", "Ribs", "Other",
  ] as const;

  const patternRanked = patternParts
    .map((part, index) => ({
      part,
      index,
      count: yearRows.filter(x => {
        const raw = String(x.bodyPart ?? "").trim();
        const normalized =
          raw === "목" ? "Neck" :
          raw === "척추" ? "Spine" :
          raw === "어깨" ? "Shoulder" :
          raw === "팔꿈치" ? "Elbow" :
          raw === "손목" ? "Wrist" :
          raw === "손" ? "Hand" :
          raw === "고관절" ? "Hip" :
          raw === "무릎" ? "Knee" :
          raw === "발목" ? "Ankle" :
          raw === "발" ? "Foot" :
          raw === "햄스트링" ? "Hamstring" :
          raw === "대퇴사두근" ? "Quadriceps" :
          raw === "종아리" ? "Calf" :
          raw === "사타구니" ? "Groin" :
          raw === "내전근" ? "Adductor" :
          raw === "고관절 굴곡근" ? "HipFlexor" :
          raw === "둔근" ? "Glute" :
          raw === "등/허리 근육" ? "BackMuscle" :
          raw === "얼굴/턱" || raw === "얼굴" ? "Face" :
          raw === "가슴" ? "Chest" :
          raw === "복부" ? "Abdomen" :
          raw === "골반" ? "Pelvis" :
          raw === "갈비뼈" ? "Ribs" :
          raw === "기타" || raw === "기타 부위" ? "Other" :
          raw;
        return normalized === part;
      }).length,
    }))
    .sort((a, b) => b.count - a.count || a.index - b.index);

  return (
    <main className="medical-page" data-theme={theme}>
      <NovaTopBar statusText={currentLang === "en" ? "AI system ready" : "AI 시스템 준비"} />

      <header className="medical-header">
        <div>
          <div className="medical-eyebrow">{localizedLabels.eyebrow}</div>
          <h1>{localizedLabels.title}</h1>
          <p>{localizedLabels.subtitle}</p>
        </div>
        <div className="medical-actions">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          {canAddMedical && (
            <button className="primary" onClick={openNew}>+ {localizedLabels.add}</button>
          )}
        </div>
      </header>

      <section className="medical-kpis">
        <article><span>{localizedLabels.total}</span><strong>{yearRows.length}</strong><small>{localizedLabels.cases}</small></article>
        <article><span>{localizedLabels.rehab}</span><strong>{yearRows.filter(x => x.status === "Rehab").length}</strong><small>{localizedLabels.active}</small></article>
        <article><span>{localizedLabels.returned}</span><strong>{yearRows.filter(x => x.status === "Returned").length}</strong><small>{localizedLabels.completed}</small></article>
        <article><span>{localizedLabels.surgery}</span><strong>{yearRows.filter(x => x.surgery === "Yes").length}</strong><small>{localizedLabels.cases}</small></article>
      </section>

      <section className="medical-grid">
        <article className="panel">
          <div className="panel-head">
            <div><span className="eyebrow">{localizedLabels.monthly}</span><h2>{localizedLabels.monthly}</h2></div>
            <span className="peak">{localizedLabels.peak}: {monthNames[currentLang][peakIndex]}</span>
          </div>
          <div className="chart">
            {monthCounts.map((count, i) => (
              <div className="bar-item" key={i}>
                <div className="bar-track"><div className="bar" style={{ height: `${Math.max(5, (count / maxMonth) * 100)}%` }} /></div>
                <b>{count}</b>
                <span>{monthNames[currentLang][i]}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">{localizedLabels.annual}</span><h2>{year} {localizedLabels.annual}</h2></div></div>
          <div className="annual-list">
            {[
              yearRows.length,
              yearRows.filter(x => x.surgery === "Yes").length,
              yearRows.filter(x => x.status === "Rehab").length,
              yearRows.filter(x => x.status === "Scheduled").length,
            ].map((value, i) => (
              <div className="annual-row" key={annualStatLabels[i]}><span>{annualStatLabels[i]}</span><strong>{value}</strong></div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel pattern">
        <div className="panel-head">
          <div>
            <span className="eyebrow">{localizedLabels.pattern}</span>
            <h2>{localizedLabels.pattern}</h2>
          </div>
          <button
            type="button"
            onClick={() => setPatternOpen(value => !value)}
            aria-expanded={patternOpen}
          >
            {patternOpen ? "▲" : "▼"} {patternOpen ? (currentLang === "en" ? "Collapse" : "접기") : (currentLang === "en" ? "Expand" : "펼치기")}
          </button>
        </div>

        {patternOpen && (
          <>
            <div className="pattern-grid">
              {patternRanked.map(({ part, count }) => (
                <div className="pattern-card" key={part}>
                  <span>{bodyPartLabels[part as keyof typeof bodyPartLabels]}</span>
                  <strong>{count}</strong>
                  <small>{year}</small>
                </div>
              ))}
            </div>

            <div>
              <span className="eyebrow">{localizedLabels.severityPattern}</span>
            </div>
            <div className="pattern-grid">
              {[
                ["Mild", localizedLabels.mild],
                ["Moderate", localizedLabels.moderate],
                ["Severe", localizedLabels.severe],
                ["Critical", localizedLabels.critical],
              ].map(([severity, label]) => {
                const n = yearRows.filter(x => x.injurySeverity === severity).length;
                return (
                  <div className="pattern-card" key={severity}>
                    <span>{label}</span>
                    <strong>{n}</strong>
                    <small>{year}</small>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {currentUser?.role === "athlete" && rehabData && (
        <section className="panel rehab-record-panel">
          <div className="panel-head"><div><span className="eyebrow">REHABILITATION</span><h2>재활 기록 등록</h2></div><span>{rehabData.rehabRecords.length}건 저장</span></div>
          <div className="rehab-form-grid">
            <label>부위<input value={rehabArea} onChange={(e) => setRehabArea(e.target.value)} placeholder="예: 무릎" /></label>
            <label>운동/치료 내용<input value={rehabExercise} onChange={(e) => setRehabExercise(e.target.value)} placeholder="예: 하체 안정화 운동" /></label>
            <label className="rehab-form-wide">메모<input value={rehabNote} onChange={(e) => setRehabNote(e.target.value)} placeholder="진행 내용을 입력하세요." /></label>
            <label className="rehab-check"><input type="checkbox" checked={rehabCompleted} onChange={(e) => setRehabCompleted(e.target.checked)} /> 완료된 재활</label>
            <button type="button" className="primary rehab-save-button" onClick={saveRehabRecord}>재활 기록 저장</button>
          </div>
        </section>
      )}

      <section className="panel records">
        <div className="panel-head">
          <div><span className="eyebrow">{localizedLabels.records}</span><h2>{localizedLabels.records}</h2></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{localizedLabels.athlete}</th><th>{localizedLabels.injuryDate}</th><th>{localizedLabels.returnDate}</th><th>{localizedLabels.diagnosis}</th><th>{localizedLabels.bodyPart}</th><th>{localizedLabels.otherBodyPart}</th><th>{localizedLabels.injurySeverity}</th><th>{localizedLabels.surgeryLabel}</th><th>{localizedLabels.status}</th><th>{localizedLabels.rehabStage}</th><th>{localizedLabels.lastEvaluation}</th><th>{localizedLabels.nextEvaluation}</th><th>{localizedLabels.management}</th></tr></thead>
            <tbody>
              {yearRows.map(row => (
                <tr key={row.id}>
                  <td>{row.athlete}</td><td>{row.injuryDate}</td><td>{row.returnDate}</td><td>{row.diagnosis}</td><td>{bodyPartLabels[row.bodyPart as keyof typeof bodyPartLabels] ?? row.bodyPart}</td><td>{row.otherBodyPart || "—"}</td><td>{localizedLabels[row.injurySeverity === "Mild" ? "mild" : row.injurySeverity === "Severe" ? "severe" : row.injurySeverity === "Critical" ? "critical" : "moderate"]}</td>
                  <td><span className="tag">{row.surgery === "Yes" ? localizedLabels.yes : localizedLabels.no}</span></td>
                  <td><span className={`status ${row.status.toLowerCase()}`}>{row.status === "Rehab" ? localizedLabels.rehabStatus : row.status === "Returned" ? localizedLabels.returnedStatus : localizedLabels.scheduled}</span></td>
                  <td><span className="tag">{row.rehabStage === "Early" ? localizedLabels.earlyStage : row.rehabStage === "Progress" ? localizedLabels.progressStage : localizedLabels.returnStage}</span></td>
                  <td>{row.lastEvaluation || "—"}</td>
                  <td>{row.nextEvaluation || "—"}</td>
                  <td>
                    {canEditMedical && (
                      <div className="row-actions"><button type="button" onClick={() => openEdit(row)}>{localizedLabels.edit}</button>{canManageMedical && <button type="button" className="danger" onClick={() => deleteRecord(row.id)}>{localizedLabels.remove}</button>}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal" onSubmit={(e) => { e.preventDefault(); saveRecord(); }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <div><span className="eyebrow">{localizedLabels.records}</span><h2>{editingId ? localizedLabels.editTitle : localizedLabels.add}</h2></div>
              <button type="button" className="modal-x" onClick={() => { setShowForm(false); resetForm(); }}>×</button>
            </div>

            <label>{localizedLabels.athlete}
              <select value={form.athlete} onChange={e => {
                const athlete = visibleAthletes.find((item) => item.name === e.target.value);
                setForm({ ...form, athlete: e.target.value, athleteUserId: athlete?.id });
              }}>
                {visibleAthletes.map((athlete) => <option key={athlete.id} value={athlete.name}>{athlete.name}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label>{localizedLabels.injuryDate}<input required type="date" value={form.injuryDate} onChange={e => setForm({...form, injuryDate: e.target.value})} /></label>
              <label>{localizedLabels.returnDate}<input type="date" value={form.returnDate} onChange={e => setForm({...form, returnDate: e.target.value})} /></label>
            </div>
            <label>{localizedLabels.diagnosis}<input required value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder={localizedLabels.diagnosisPlaceholder} /></label>
            <label>{localizedLabels.bodyPart}
              <select required value={form.bodyPart} onChange={e => setForm({...form, bodyPart: e.target.value})}>
                <option value="">—</option>
                <optgroup label={currentLang === "en" ? "Joints" : "관절"}>
                  <option value="Neck">{localizedLabels.neck}</option>
                  <option value="Spine">{localizedLabels.spine}</option>
                  <option value="Shoulder">{localizedLabels.shoulder}</option>
                  <option value="Elbow">{localizedLabels.elbow}</option>
                  <option value="Wrist">{localizedLabels.wrist}</option>
                  <option value="Hand">{localizedLabels.hand}</option>
                  <option value="Hip">{localizedLabels.hip}</option>
                  <option value="Knee">{localizedLabels.knee}</option>
                  <option value="Ankle">{localizedLabels.ankle}</option>
                  <option value="Foot">{localizedLabels.foot}</option>
                </optgroup>
                <optgroup label={localizedLabels.otherParts}>
                  <option value="Face">{localizedLabels.face}</option>
                  <option value="Chest">{localizedLabels.chest}</option>
                  <option value="Abdomen">{localizedLabels.abdomen}</option>
                  <option value="Pelvis">{localizedLabels.pelvis}</option>
                  <option value="Ribs">{localizedLabels.ribs}</option>
                  <option value="Other">{localizedLabels.other}</option>
                </optgroup>
                <optgroup label={currentLang === "en" ? "Muscle Injury" : "근육 손상"}>
                  <option value="Hamstring">{localizedLabels.hamstring}</option>
                  <option value="Quadriceps">{localizedLabels.quadriceps}</option>
                  <option value="Calf">{localizedLabels.calf}</option>
                  <option value="Groin">{localizedLabels.groin}</option>
                  <option value="Adductor">{localizedLabels.adductor}</option>
                  <option value="HipFlexor">{localizedLabels.hipFlexor}</option>
                  <option value="Glute">{localizedLabels.glute}</option>
                  <option value="BackMuscle">{localizedLabels.backMuscle}</option>
                </optgroup>
              </select>
            </label>
            {form.bodyPart === "Other" && (
              <label>{localizedLabels.otherBodyPart}
                <input value={form.otherBodyPart} onChange={e => setForm({...form, otherBodyPart: e.target.value})} placeholder={currentLang === "en" ? "e.g. Nose" : "예: 코"} />
              </label>
            )}
            <label>{localizedLabels.injurySeverity}
              <select value={form.injurySeverity} onChange={e => setForm({...form, injurySeverity: e.target.value as Injury["injurySeverity"]})}>
                <option value="Mild">{localizedLabels.mild}</option>
                <option value="Moderate">{localizedLabels.moderate}</option>
                <option value="Severe">{localizedLabels.severe}</option>
                <option value="Critical">{localizedLabels.critical}</option>
              </select>
            </label>
            <div className="form-row">
              <label>{localizedLabels.surgeryLabel}
                <select value={form.surgery} onChange={e => setForm({...form, surgery: e.target.value as Injury["surgery"]})}>
                  <option value="No">{localizedLabels.no}</option><option value="Yes">{localizedLabels.yes}</option>
                </select>
              </label>
              <label>{localizedLabels.status}
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Injury["status"]})}>
                  <option value="Rehab">{localizedLabels.rehabStatus}</option>
                  <option value="Returned">{localizedLabels.returnedStatus}</option>
                  <option value="Scheduled">{localizedLabels.scheduled}</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>{localizedLabels.rehabStage}
                <select value={form.rehabStage} onChange={e => setForm({...form, rehabStage: e.target.value as Injury["rehabStage"]})}>
                  <option value="Early">{localizedLabels.earlyStage}</option>
                  <option value="Progress">{localizedLabels.progressStage}</option>
                  <option value="Return">{localizedLabels.returnStage}</option>
                </select>
              </label>
              <label>{localizedLabels.lastEvaluation}
                <input type="date" value={form.lastEvaluation} onChange={e => setForm({...form, lastEvaluation: e.target.value})} />
              </label>
            </div>
            <label>{localizedLabels.nextEvaluation}
              <input type="date" value={form.nextEvaluation} onChange={e => setForm({...form, nextEvaluation: e.target.value})} />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>{localizedLabels.close}</button>
              <button type="submit" className="primary">{localizedLabels.save}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}