"use client";

import { useEffect, useMemo, useState } from "react";
import { useNovaSettings } from "../settings-context";
import "./medical.css";
import NovaPageHeader from "../../../components/NovaPageHeader";

type Injury = {
  id: number;
  athlete: string;
  injuryDate: string;
  returnDate: string;
  diagnosis: string;
  surgery: "Yes" | "No";
  bodyPart: string;
  status: "Rehab" | "Returned" | "Scheduled";
};

const injuries: Injury[] = [
  { id: 1, athlete: "John Kim", injuryDate: "2026-01-18", returnDate: "2026-02-22", diagnosis: "Hamstring strain", surgery: "No", bodyPart: "Hamstring", status: "Returned" },
  { id: 2, athlete: "John Kim", injuryDate: "2026-03-07", returnDate: "2026-04-11", diagnosis: "Ankle sprain", surgery: "No", bodyPart: "Ankle", status: "Returned" },
  { id: 3, athlete: "John Kim", injuryDate: "2026-05-14", returnDate: "2026-06-28", diagnosis: "Knee pain", surgery: "No", bodyPart: "Knee", status: "Rehab" },
  { id: 4, athlete: "Alex Lee", injuryDate: "2026-05-21", returnDate: "2026-07-02", diagnosis: "Shoulder impingement", surgery: "No", bodyPart: "Shoulder", status: "Rehab" },
  { id: 5, athlete: "Min Park", injuryDate: "2026-07-09", returnDate: "2026-08-20", diagnosis: "ACL injury", surgery: "Yes", bodyPart: "Knee", status: "Scheduled" },
];

const monthNames: Record<"ko" | "en", string[]> = {
  ko: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
};

export default function MedicalPage() {
  const { language, theme } = useNovaSettings();
  const [year, setYear] = useState(2026);
  const [records, setRecords] = useState<Injury[]>(injuries);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Injury, "id">>({
    athlete: "John Kim",
    injuryDate: "",
    returnDate: "",
    diagnosis: "",
    surgery: "No",
    bodyPart: "",
    status: "Rehab",
  });

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nova-medical-injuries");
      if (saved) {
        const parsed = JSON.parse(saved) as Injury[];
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecords(parsed);
        }
      }
    } catch {
      // Keep built-in records if saved data is unavailable.
    }
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
      status:"상태", yes:"있음", no:"없음", rehabStatus:"재활 중", returnedStatus:"복귀", scheduled:"복귀 예정",
      peak:"가장 많이 다치는 월", close:"닫기", save:"저장", edit:"수정", remove:"삭제", cases:"건", active:"진행", completed:"완료",
      injuryCases:"부상 건수", surgicalCases:"수술 건수", currentRehab:"현재 재활 중", returnScheduled:"복귀 예정", management:"관리",
      knee:"무릎", hamstring:"햄스트링", ankle:"발목", shoulder:"어깨", hip:"고관절", editTitle:"부상 기록 수정",
      diagnosisPlaceholder:"예: 무릎 통증", bodyPartPlaceholder:"예: 무릎"
    },
    en: {
      eyebrow:"HEALTH & REHABILITATION", title:"Rehabilitation Management", subtitle:"Manage injuries and return-to-play status with monthly and annual injury trends.",
      add:"Add Injury Record", total:"Annual Injuries", rehab:"In Rehab", returned:"Returned", surgery:"Surgeries",
      monthly:"Monthly Injury Statistics", annual:"Annual Statistics", pattern:"Injury Pattern", records:"Injury Records",
      athlete:"Athlete", injuryDate:"Injury Date", returnDate:"Return Date", diagnosis:"Diagnosis", surgeryLabel:"Surgery", bodyPart:"Body Part",
      status:"Status", yes:"Yes", no:"No", rehabStatus:"Rehab", returnedStatus:"Returned", scheduled:"Scheduled",
      peak:"Peak injury month", close:"Close", save:"Save", edit:"Edit", remove:"Delete", cases:"cases", active:"active", completed:"completed",
      injuryCases:"Injury cases", surgicalCases:"Surgical cases", currentRehab:"Currently in rehab", returnScheduled:"Return scheduled", management:"Manage",
      knee:"Knee", hamstring:"Hamstring", ankle:"Ankle", shoulder:"Shoulder", hip:"Hip", editTitle:"Edit Injury Record",
      diagnosisPlaceholder:"e.g. Knee pain", bodyPartPlaceholder:"e.g. Knee"
    },
    ja: {
      eyebrow:"健康・リハビリ", title:"リハビリ管理", subtitle:"選手の負傷と復帰を管理し、月別・年間の負傷傾向を分析します。",
      add:"負傷記録を追加", total:"年間負傷件数", rehab:"リハビリ中", returned:"復帰完了", surgery:"手術件数",
      monthly:"月別負傷統計", annual:"年間統計", pattern:"負傷発生パターン", records:"負傷記録",
      athlete:"選手", injuryDate:"負傷日", returnDate:"復帰日", diagnosis:"診断名", surgeryLabel:"手術", bodyPart:"負傷部位",
      status:"状態", yes:"あり", no:"なし", rehabStatus:"リハビリ中", returnedStatus:"復帰", scheduled:"復帰予定",
      peak:"負傷が最も多い月", close:"閉じる", save:"保存", edit:"編集", remove:"削除", cases:"件", active:"進行中", completed:"完了",
      injuryCases:"負傷件数", surgicalCases:"手術件数", currentRehab:"リハビリ中", returnScheduled:"復帰予定", management:"管理",
      knee:"膝", hamstring:"ハムストリング", ankle:"足首", shoulder:"肩", hip:"股関節", editTitle:"負傷記録を編集",
      diagnosisPlaceholder:"例: 膝痛", bodyPartPlaceholder:"例: 膝"
    }
  } as const;

  const localizedLabels = copy[language];

  const bodyPartLabels = {
    Knee: localizedLabels.knee,
    Hamstring: localizedLabels.hamstring,
    Ankle: localizedLabels.ankle,
    Shoulder: localizedLabels.shoulder,
    Hip: localizedLabels.hip,
  } as const;

  const currentMonthNames: string[] = monthNames[language];

  const annualStatLabels = [
    localizedLabels.injuryCases,
    localizedLabels.surgicalCases,
    localizedLabels.currentRehab,
    localizedLabels.returnScheduled,
  ];

  const resetForm = () => {
    setEditingId(null);
    setForm({
      athlete: "John Kim",
      injuryDate: "",
      returnDate: "",
      diagnosis: "",
      surgery: "No",
      bodyPart: "",
      status: "Rehab",
    });
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row: Injury) => {
    setEditingId(row.id);
    setForm({
      athlete: row.athlete,
      injuryDate: row.injuryDate,
      returnDate: row.returnDate,
      diagnosis: row.diagnosis,
      surgery: row.surgery,
      bodyPart: row.bodyPart,
      status: row.status,
    });
    setShowForm(true);
  };

  const saveRecord = () => {
    if (!form.athlete || !form.injuryDate || !form.diagnosis || !form.bodyPart) return;

    if (editingId !== null) {
      setRecords(prev => prev.map(row => row.id === editingId ? { ...form, id: editingId } : row));
    } else {
      setRecords(prev => [...prev, { ...form, id: Date.now() }]);
    }

    setShowForm(false);
    resetForm();
  };

  const deleteRecord = (id: number) => {
    if (!window.confirm(language === "en" ? "Delete this injury record?" : "이 부상 기록을 삭제할까요?")) return;
    setRecords(prev => prev.filter(row => row.id !== id));
  };

  const yearRows = records.filter((x) => x.injuryDate.startsWith(String(year)));
  const monthCounts = useMemo(
    () => currentMonthNames.map((_, i) => yearRows.filter(x => Number(x.injuryDate.slice(5, 7)) === i + 1).length),
    [yearRows, currentMonthNames]
  );
  const maxMonth = Math.max(1, ...monthCounts);
  const peakIndex = monthCounts.indexOf(Math.max(...monthCounts));

  return (
    <main className="medical-page" data-theme={theme}>
      <NovaPageHeader />

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
          <button className="primary" onClick={openNew}>+ {localizedLabels.add}</button>
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
            <span className="peak">{localizedLabels.peak}: {currentMonthNames[peakIndex]}</span>
          </div>
          <div className="chart">
            {monthCounts.map((count, i) => (
              <div className="bar-item" key={i}>
                <div className="bar-track"><div className="bar" style={{ height: `${Math.max(5, (count / maxMonth) * 100)}%` }} /></div>
                <b>{count}</b>
                <span>{currentMonthNames[i]}</span>
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
        <div className="panel-head"><div><span className="eyebrow">{localizedLabels.pattern}</span><h2>{localizedLabels.pattern}</h2></div></div>
        <div className="pattern-grid">
          {["Knee", "Hamstring", "Ankle", "Shoulder", "Hip"].map(part => {
            const n = yearRows.filter(x => x.bodyPart === part).length;
            return (
              <div className="pattern-card" key={part}>
                <span>{bodyPartLabels[part as keyof typeof bodyPartLabels]}</span>
                <strong>{n}</strong>
                <small>{year}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel records">
        <div className="panel-head">
          <div><span className="eyebrow">{localizedLabels.records}</span><h2>{localizedLabels.records}</h2></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{localizedLabels.athlete}</th><th>{localizedLabels.injuryDate}</th><th>{localizedLabels.returnDate}</th><th>{localizedLabels.diagnosis}</th><th>{localizedLabels.bodyPart}</th><th>{localizedLabels.surgeryLabel}</th><th>{localizedLabels.status}</th><th>{localizedLabels.management}</th></tr></thead>
            <tbody>
              {yearRows.map(row => (
                <tr key={row.id}>
                  <td>{row.athlete}</td><td>{row.injuryDate}</td><td>{row.returnDate}</td><td>{row.diagnosis}</td><td>{bodyPartLabels[row.bodyPart as keyof typeof bodyPartLabels] ?? row.bodyPart}</td>
                  <td><span className="tag">{row.surgery === "Yes" ? localizedLabels.yes : localizedLabels.no}</span></td>
                  <td><span className={`status ${row.status.toLowerCase()}`}>{row.status === "Rehab" ? localizedLabels.rehabStatus : row.status === "Returned" ? localizedLabels.returnedStatus : localizedLabels.scheduled}</span></td>
                  <td><div className="row-actions"><button type="button" onClick={() => openEdit(row)}>{localizedLabels.edit}</button><button type="button" className="danger" onClick={() => deleteRecord(row.id)}>{localizedLabels.remove}</button></div></td>
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
              <select value={form.athlete} onChange={e => setForm({...form, athlete: e.target.value})}>
                <option>John Kim</option><option>Alex Lee</option><option>Min Park</option>
              </select>
            </label>
            <div className="form-row">
              <label>{localizedLabels.injuryDate}<input required type="date" value={form.injuryDate} onChange={e => setForm({...form, injuryDate: e.target.value})} /></label>
              <label>{localizedLabels.returnDate}<input type="date" value={form.returnDate} onChange={e => setForm({...form, returnDate: e.target.value})} /></label>
            </div>
            <label>{localizedLabels.diagnosis}<input required value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder={localizedLabels.diagnosisPlaceholder} /></label>
            <label>{localizedLabels.bodyPart}<input required value={form.bodyPart} onChange={e => setForm({...form, bodyPart: e.target.value})} placeholder={localizedLabels.bodyPartPlaceholder} /></label>
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
