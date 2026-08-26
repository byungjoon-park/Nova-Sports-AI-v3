"use client";

import { useMemo, useState } from "react";
import { readNovaAthleteData, upsertInjuryEpisode } from "../../lib/nova-data";
import { getBodyRecordsWithBmi } from "../../lib/player-profile";
import { descriptiveStats, formatNumber, pearsonCorrelation, qualityStats, reliabilityStats, blandAltman, rmse, mae, normalityTest, independentTTest, oneWayAnova, linearRegression, powerAnalysisTwoGroup, pairedTTest, rehabDailyStats, rehabSummary, injuryRecoverySummary, gPowerSetupLabel } from "../../lib/research-statistics";

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: Array<Record<string, string | number>>, filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map((row) => headers.map((key) => row[key] ?? ""))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}


function printSection(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const popup = window.open("", "_blank", "width=1200,height=800");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#222}h1{font-size:20px;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d9d9d9;padding:8px;text-align:left}th{background:#f3f1eb}p{font-size:12px;color:#666}@media print{body{margin:12mm}}</style></head><body><h1>${title}</h1><p>출력일: ${new Date().toLocaleString("ko-KR")}</p>${element.innerHTML}</body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  popup.close();
}

function pseudoParticipantId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `P-${String(hash % 1000000).padStart(6, "0")}`;
}

export default function ResearchPanel() {
  const [refresh, setRefresh] = useState(0);
  const [powerEffectSize, setPowerEffectSize] = useState(0.5);
  const [powerAlpha, setPowerAlpha] = useState(0.05);
  const [powerTarget, setPowerTarget] = useState(0.8);
  const [gPowerFamily, setGPowerFamily] = useState<"t" | "f" | "correlation">("t");
  const [gPowerTest, setGPowerTest] = useState("Means: Difference between two independent means (two groups)");
  const [gPowerTail, setGPowerTail] = useState<"two" | "one">("two");
  const [gPowerGroups, setGPowerGroups] = useState(2);
  const [injuryArea, setInjuryArea] = useState("");
  const [injuryDate, setInjuryDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [reinjuryDate, setReinjuryDate] = useState("");
  const data = useMemo(() => readNovaAthleteData(), [refresh]);
  const body = getBodyRecordsWithBmi(data.bodyRecords).sort((a, b) => a.date.localeCompare(b.date));
  const performance = data.performanceRecords.slice().sort((a, b) => a.date.localeCompare(b.date));
  const recovery = data.recoveryRecords.slice().sort((a, b) => a.date.localeCompare(b.date));
  const fatigue = data.fatigueRecords.slice().sort((a, b) => a.date.localeCompare(b.date));
  const jump = data.jumpFatigueRecords.slice().sort((a, b) => a.date.localeCompare(b.date));
  const rehab = data.rehabRecords.slice().sort((a, b) => a.date.localeCompare(b.date));
  const rehabDays = useMemo(() => rehabDailyStats(rehab), [rehab]);
  const rehabOverview = useMemo(() => rehabSummary(rehab), [rehab]);
  const injuryOverview = useMemo(() => injuryRecoverySummary(data.injuryRecords), [data.injuryRecords]);

  const variables = useMemo(() => {
    const rows = [
      { key: "height_cm", label: "키 (cm)", values: body.map((r) => r.heightCm).filter((v): v is number => Number.isFinite(v)) , total: body.length },
      { key: "weight_kg", label: "체중 (kg)", values: body.map((r) => r.weightKg).filter((v): v is number => Number.isFinite(v)), total: body.length },
      { key: "bmi", label: "BMI", values: body.map((r) => r.bmi).filter((v): v is number => Number.isFinite(v)), total: body.length },
      { key: "performance_score", label: "퍼포먼스", values: performance.map((r) => r.score).filter(Number.isFinite), total: performance.length },
      { key: "recovery_score", label: "회복", values: recovery.map((r) => r.score).filter(Number.isFinite), total: recovery.length },
      { key: "fatigue_score", label: "피로", values: fatigue.map((r) => r.score).filter(Number.isFinite), total: fatigue.length },
      { key: "jump_current_cm", label: "점프 현재값 (cm)", values: jump.map((r) => r.currentJumpCm).filter(Number.isFinite), total: jump.length },
      { key: "jump_fatigue_percent", label: "점프 기반 피로 (%)", values: jump.map((r) => r.fatiguePercent).filter(Number.isFinite), total: jump.length },
      { key: "camera_ai_score", label: "Camera AI 점수", values: data.cameraAIResults.map((r) => r.score).filter(Number.isFinite), total: data.cameraAIResults.length },
    ];
    return rows.map((row) => ({ ...row, stats: descriptiveStats(row.values, row.total) }));
  }, [body, performance, recovery, fatigue, jump, data.cameraAIResults]);

  const dateMap = useMemo(() => {
    const map = new Map<string, { performance?: number; recovery?: number; fatigue?: number }>();
    performance.forEach((r) => map.set(r.date, { ...map.get(r.date), performance: r.score }));
    recovery.forEach((r) => map.set(r.date, { ...map.get(r.date), recovery: r.score }));
    fatigue.forEach((r) => map.set(r.date, { ...map.get(r.date), fatigue: r.score }));
    return map;
  }, [performance, recovery, fatigue]);

  const pairs = useMemo(() => {
    const build = (a: "performance" | "recovery" | "fatigue", b: "performance" | "recovery" | "fatigue") => {
      const x: number[] = [];
      const y: number[] = [];
      dateMap.forEach((row) => {
        if (row[a] !== undefined && row[b] !== undefined) {
          x.push(row[a]!);
          y.push(row[b]!);
        }
      });
      return pearsonCorrelation(x, y);
    };
    return [
      { label: "퍼포먼스 ↔ 회복", result: build("performance", "recovery") },
      { label: "퍼포먼스 ↔ 피로", result: build("performance", "fatigue") },
      { label: "회복 ↔ 피로", result: build("recovery", "fatigue") },
    ];
  }, [dateMap]);

  const exportRows = useMemo(() => {
    const dates = new Set<string>();
    body.forEach((r) => dates.add(r.date));
    performance.forEach((r) => dates.add(r.date));
    recovery.forEach((r) => dates.add(r.date));
    fatigue.forEach((r) => dates.add(r.date));
    jump.forEach((r) => dates.add(r.date));
    data.cameraAIResults.forEach((r) => dates.add(r.completedAt.slice(0, 10)));
    const bodyByDate = new Map(body.map((r) => [r.date, r]));
    const perfByDate = new Map(performance.map((r) => [r.date, r.score]));
    const recoveryByDate = new Map(recovery.map((r) => [r.date, r.score]));
    const fatigueByDate = new Map(fatigue.map((r) => [r.date, r.score]));
    const jumpByDate = new Map(jump.map((r) => [r.date, r]));
    const cameraByDate = new Map<string, number[]>();
    data.cameraAIResults.forEach((r) => {
      const date = r.completedAt.slice(0, 10);
      cameraByDate.set(date, [...(cameraByDate.get(date) || []), r.score]);
    });
    const participantId = pseudoParticipantId(data.athlete.id);
    return Array.from(dates).sort().map((date) => {
      const cameraScores = cameraByDate.get(date) || [];
      const cameraMean = cameraScores.length ? cameraScores.reduce((sum, value) => sum + value, 0) / cameraScores.length : "";
      const b = bodyByDate.get(date);
      const j = jumpByDate.get(date);
      return {
        participant_id: participantId,
        date,
        height_cm: b?.heightCm ?? "",
        weight_kg: b?.weightKg ?? "",
        bmi: b?.bmi ?? "",
        performance_score: perfByDate.get(date) ?? "",
        recovery_score: recoveryByDate.get(date) ?? "",
        fatigue_score: fatigueByDate.get(date) ?? "",
        jump_current_cm: j?.currentJumpCm ?? "",
        jump_fatigue_percent: j?.fatiguePercent ?? "",
        camera_ai_score_mean: typeof cameraMean === "number" ? Number(cameraMean.toFixed(2)) : "",
      };
    });
  }, [body, performance, recovery, fatigue, jump, data]);

  const exportSummary = variables.map((item) => ({
    variable: item.key,
    label: item.label,
    n: item.stats.n,
    missing: item.stats.missing,
    mean: formatNumber(item.stats.mean),
    sd: formatNumber(item.stats.sd),
    median: formatNumber(item.stats.median),
    q1: formatNumber(item.stats.q1),
    q3: formatNumber(item.stats.q3),
    min: formatNumber(item.stats.min),
    max: formatNumber(item.stats.max),
    ci95_low: formatNumber(item.stats.ci95Low),
    ci95_high: formatNumber(item.stats.ci95High),
  }));

  const qualityRows = variables.map((item) => ({
    variable: item.key,
    label: item.label,
    ...qualityStats(item.values, item.total),
  }));

  const codebookRows = [
    { variable: "participant_id", label: "비식별 참가자 ID", type: "string", unit: "—", definition: "원자료에서 직접 식별자를 제거한 연구용 ID" },
    { variable: "date", label: "측정일", type: "date", unit: "YYYY-MM-DD", definition: "측정 또는 분석 완료 날짜" },
    ...variables.map((item) => ({
      variable: item.key,
      label: item.label,
      type: "numeric",
      unit: item.key.includes("height") ? "cm" : item.key.includes("weight") ? "kg" : item.key.includes("jump") ? (item.key.includes("percent") ? "%" : "cm") : "score/—",
      definition: "프로젝트에 저장된 원자료 변수; 결측값은 임의 대체하지 않음",
    })),
  ];

  // Reliability is intentionally conservative: the current local dataset must contain repeated
  // measurements from at least two participants before ICC is reported. We do not treat different
  // constructs (e.g. Camera AI vs performance) as interchangeable reference standards.
  const reliabilityMatrix = useMemo(() => {
    const byParticipant = new Map<string, number[]>();
    exportRows.forEach((row) => {
      const value = row.performance_score;
      if (typeof value === "number" && Number.isFinite(value)) {
        const current = byParticipant.get(row.participant_id) || [];
        current.push(value);
        byParticipant.set(row.participant_id, current);
      }
    });
    return Array.from(byParticipant.values()).filter((values) => values.length >= 2);
  }, [exportRows]);
  const reliability = reliabilityStats(reliabilityMatrix);

  // Agreement metrics require an explicit reference measurement. They are not inferred from
  // unrelated project variables. This keeps the research output methodologically defensible.
  const referencePairs: { reference: number[]; measurement: number[] } = { reference: [], measurement: [] };
  const agreement = blandAltman(referencePairs.reference, referencePairs.measurement);
  const agreementRmse = rmse(referencePairs.reference, referencePairs.measurement);
  const agreementMae = mae(referencePairs.reference, referencePairs.measurement);

  const reliabilityExport = [{
    analysis: "ICC(2,1)", n_subjects: reliability.nSubjects, n_ratings: reliability.nRatings,
    value: formatNumber(reliability.icc21, 3), sem: formatNumber(reliability.sem, 3),
    mdc95: formatNumber(reliability.mdc95, 3), cv_percent: formatNumber(reliability.cvPercent, 2),
    rmse: formatNumber(agreementRmse, 3), mae: formatNumber(agreementMae, 3),
    bias: formatNumber(agreement.bias, 3), loa_low: formatNumber(agreement.loaLow, 3), loa_high: formatNumber(agreement.loaHigh, 3),
  }];

  const hasData = exportRows.length > 0;
  const inferentialReady = exportRows.length >= 2;
  const normalityRows = variables.map((item) => ({ ...item, normality: normalityTest(item.values) }));
  const pairedPerformanceRecovery = (() => { const before:number[]=[]; const after:number[]=[]; dateMap.forEach((row)=>{ if(row.performance!==undefined&&row.recovery!==undefined){before.push(row.performance);after.push(row.recovery);} }); return pairedTTest(before, after); })();
  const performanceRecoveryRegression = (() => { const x:number[]=[]; const y:number[]=[]; dateMap.forEach((row)=>{ if(row.recovery!==undefined&&row.performance!==undefined){x.push(row.recovery);y.push(row.performance);} }); return linearRegression(x,y); })();
  const plannedPower = powerAnalysisTwoGroup(powerEffectSize, powerAlpha, powerTarget);
  const rehabOutcomePairs = useMemo(() => {
    const rehabByDate = new Map(rehabDays.map((row) => [row.date, row.completionRate]));
    const build = (key: "performance" | "recovery" | "fatigue") => {
      const x: number[] = [];
      const y: number[] = [];
      dateMap.forEach((row, date) => {
        const rehabRate = rehabByDate.get(date);
        const outcome = row[key];
        if (typeof rehabRate === "number" && typeof outcome === "number") { x.push(rehabRate); y.push(outcome); }
      });
      return pearsonCorrelation(x, y);
    };
    return [
      { label: "재활 수행률 ↔ 퍼포먼스", result: build("performance") },
      { label: "재활 수행률 ↔ 회복", result: build("recovery") },
      { label: "재활 수행률 ↔ 피로", result: build("fatigue") },
    ];
  }, [rehabDays, dateMap]);
  const gPowerPlan = {
    family: gPowerFamily === "t" ? "t tests" : gPowerFamily === "f" ? "F tests" : "Correlation and Regression",
    test: gPowerTest,
    analysisType: "A priori" as const,
    tail: gPowerTail,
    effectSize: powerEffectSize,
    alpha: powerAlpha,
    power: powerTarget,
    groups: gPowerGroups,
    allocationRatio: 1,
  };

  const independentComparison = independentTTest([], []);
  const anova = oneWayAnova([]);

  return <section className="admin-panel">
    <div className="admin-panel-head">
      <div><span>RESEARCH DATASET</span><h2>논문용 통계 분석</h2><p className="admin-header p">비식별 원자료와 기술통계·상관분석을 함께 생성합니다.</p></div>
      <div className="admin-actions">
        <button onClick={() => setRefresh((v) => v + 1)}>새로고침</button>
        <button className="primary" disabled={!hasData} onClick={() => downloadCsv(exportRows, `nova-research-dataset-${new Date().toISOString().slice(0, 10)}.csv`)}>원자료 CSV</button>
        <button className="primary" disabled={!variables.length} onClick={() => downloadCsv(exportSummary, `nova-research-statistics-${new Date().toISOString().slice(0, 10)}.csv`)}>통계 CSV</button>
        <button disabled={!variables.length} onClick={() => downloadCsv(codebookRows, `nova-research-codebook-${new Date().toISOString().slice(0, 10)}.csv`)}>코드북 CSV</button>
        <button disabled={!variables.length} onClick={() => downloadCsv(reliabilityExport, `nova-research-reliability-${new Date().toISOString().slice(0, 10)}.csv`)}>신뢰도 CSV</button>
      </div>
    </div>

    <div className="admin-note">
      <strong>연구 데이터 주의:</strong> 현재 프로젝트의 연구 원자료는 브라우저 로컬 저장소에 기록된 현재 선수 데이터 기준입니다. 현재처럼 단일 참가자 데이터만 존재하면 기술통계와 탐색적 상관분석까지만 의미가 있으며, SCI급 논문의 추론통계·집단비교를 위해서는 다수 참가자의 동의된 비식별 원자료와 연구 설계가 필요합니다.
    </div>

    <section className="admin-kpis inner" style={{ marginTop: 18 }}>
      <article><span>원자료 행</span><strong>{exportRows.length}</strong><small>날짜 기준</small></article>
      <article><span>변수</span><strong>{variables.length}</strong><small>정량 변수</small></article>
      <article><span>관측 기간</span><strong>{exportRows[0]?.date || "—"}</strong><small>시작일</small></article>
      <article><span>추론통계 상태</span><strong>{inferentialReady ? "가능" : "대기"}</strong><small>{inferentialReady ? "표본 확인 필요" : "참가자 데이터 부족"}</small></article>
    </section>

    <div id="research-descriptive-print">
    <div className="admin-panel-head" style={{ marginTop: 18 }}><div><span>DESCRIPTIVE STATISTICS</span><h2>논문용 기술통계</h2></div><button onClick={() => printSection("research-descriptive-print", "NOVA Sports AI 논문용 기술통계")}>프린트</button></div>
    <div className="admin-table-wrap">
      <table>
        <thead><tr><th>변수</th><th>n</th><th>결측</th><th>평균</th><th>SD</th><th>중앙값</th><th>IQR</th><th>최소</th><th>최대</th><th>95% CI</th></tr></thead>
        <tbody>{variables.map((item) => <tr key={item.key}><td>{item.label}</td><td>{item.stats.n}</td><td>{item.stats.missing}</td><td>{formatNumber(item.stats.mean)}</td><td>{formatNumber(item.stats.sd)}</td><td>{formatNumber(item.stats.median)}</td><td>{item.stats.q1 === null || item.stats.q3 === null ? "—" : `${formatNumber(item.stats.q1)}–${formatNumber(item.stats.q3)}`}</td><td>{formatNumber(item.stats.min)}</td><td>{formatNumber(item.stats.max)}</td><td>{item.stats.ci95Low === null ? "—" : `${formatNumber(item.stats.ci95Low)}–${formatNumber(item.stats.ci95High)}`}</td></tr>)}</tbody>
      </table>
    </div>
    </div>

    <div id="research-quality-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>DATA QUALITY</span><h2>연구 데이터 품질 점검</h2><p className="admin-header p">결측률과 IQR 기준 이상치 후보를 확인합니다. 이상치는 자동 삭제하거나 수정하지 않습니다.</p></div><button onClick={() => printSection("research-quality-print", "NOVA Sports AI 연구 데이터 품질 점검")}>프린트</button></div>
    <div className="admin-table-wrap">
      <table>
        <thead><tr><th>변수</th><th>전체</th><th>유효</th><th>결측</th><th>결측률</th><th>이상치 후보</th></tr></thead>
        <tbody>{qualityRows.map((row) => <tr key={row.variable}><td>{row.label}</td><td>{row.total}</td><td>{row.valid}</td><td>{row.missing}</td><td>{row.missingRate.toFixed(1)}%</td><td>{row.outliers}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="admin-note" style={{ marginTop: 14 }}>IQR 1.5× 기준은 이상치 후보 탐색용입니다. 실제 연구 분석에서는 원자료와 측정 오류 여부를 확인한 뒤 사전 정의된 제외 기준을 적용해야 합니다.</div>
    </div>

    <div id="research-reliability-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>RELIABILITY & VALIDITY</span><h2>신뢰도 · 타당도 검증</h2><p className="admin-header p">반복측정 자료가 충분할 때 ICC, SEM, MDC95, CV를 계산합니다. 기준측정값이 별도로 입력되기 전에는 RMSE·MAE·Bland–Altman을 임의 계산하지 않습니다.</p></div><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}><button style={{ minWidth: 72, whiteSpace: "nowrap" }} onClick={() => printSection("research-reliability-print", "NOVA Sports AI 신뢰도·타당도 검증")}>프린트</button></div></div>
    <div className="admin-table-wrap">
      <table style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup><col style={{ width: "18%" }} /><col style={{ width: "17%" }} /><col style={{ width: "25%" }} /><col style={{ width: "40%" }} /></colgroup>
        <thead><tr><th>검증지표</th><th>값</th><th>현재 상태</th><th>연구적 의미</th></tr></thead>
        <tbody>
          <tr><td>ICC(2,1)</td><td>{formatNumber(reliability.icc21, 3)}</td><td>{reliability.icc21 === null ? "반복측정 데이터 부족" : "계산 완료"}</td><td>반복 측정의 절대적 일치도</td></tr>
          <tr><td>SEM</td><td>{formatNumber(reliability.sem, 3)}</td><td>{reliability.sem === null ? "ICC 산출 필요" : "계산 완료"}</td><td>측정의 표준오차</td></tr>
          <tr><td>MDC95</td><td>{formatNumber(reliability.mdc95, 3)}</td><td>{reliability.mdc95 === null ? "ICC 산출 필요" : "계산 완료"}</td><td>95% 신뢰수준 최소 검출가능 변화</td></tr>
          <tr><td>CV%</td><td>{formatNumber(reliability.cvPercent, 2)}</td><td>{reliability.cvPercent === null ? "반복측정 데이터 부족" : "계산 완료"}</td><td>변동계수</td></tr>
          <tr><td>RMSE / MAE</td><td>{formatNumber(agreementRmse, 3)} / {formatNumber(agreementMae, 3)}</td><td>{agreementRmse === null ? "기준측정값 필요" : "계산 완료"}</td><td>기준측정값 대비 오차</td></tr>
          <tr><td>Bland–Altman</td><td>{agreement.bias === null ? "—" : `${formatNumber(agreement.bias, 3)} (${formatNumber(agreement.loaLow, 3)} ~ ${formatNumber(agreement.loaHigh, 3)})`}</td><td>{agreement.bias === null ? "기준측정값 필요" : "계산 완료"}</td><td>측정값과 기준값의 일치 한계</td></tr>
        </tbody>
      </table>
    </div>
    <div className="admin-note" style={{ marginTop: 14 }}>현재 데이터에서는 서로 다른 지표를 기준값으로 간주하지 않습니다. 실제 검증 연구에서는 동일 선수의 반복측정값과 전문가 평가 또는 검증 장비의 기준값을 별도로 수집해야 합니다. 이 조건이 충족되면 같은 모듈에서 ICC, SEM, MDC95, CV%, RMSE, MAE, Bland–Altman 결과를 산출할 수 있습니다.</div>
    </div>

    <div id="research-injury-recovery-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>INJURY & RETURN-TO-PLAY RESEARCH</span><h2>부상 · 복귀 · 재부상 통계</h2><p className="admin-header p">부상일을 기준으로 실제 복귀일까지의 기간과 복귀 후 재부상까지의 기간을 계산합니다. 날짜가 없는 사건은 평균 계산에서 제외합니다.</p></div><button onClick={() => printSection("research-injury-recovery-print", "NOVA Sports AI 부상·복귀·재부상 연구통계")}>프린트</button></div>
    <div className="admin-panel" style={{ marginTop: 14, padding: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 5, minWidth: 150 }}><span>부상 부위</span><input value={injuryArea} onChange={(e) => setInjuryArea(e.target.value)} placeholder="예: 무릎" /></label>
        <label style={{ display: "grid", gap: 5, minWidth: 150 }}><span>부상일</span><input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 5, minWidth: 150 }}><span>복귀일</span><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 5, minWidth: 150 }}><span>재부상일</span><input type="date" value={reinjuryDate} onChange={(e) => setReinjuryDate(e.target.value)} /></label>
        <button className="primary" disabled={!injuryArea.trim() || !injuryDate} onClick={() => { upsertInjuryEpisode({ id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${injuryDate}-${injuryArea}-${Date.now()}`, area: injuryArea.trim(), injuryDate, returnDate: returnDate || undefined, reinjuryDate: reinjuryDate || undefined }); setInjuryArea(""); setInjuryDate(""); setReturnDate(""); setReinjuryDate(""); setRefresh((v) => v + 1); }}>부상 사건 저장</button>
      </div>
      <div className="admin-note" style={{ marginTop: 10 }}>복귀 후 재부상까지의 평균은 <strong>복귀일 → 재부상일</strong> 차이로 정의합니다. 복귀일이 없거나 재부상일이 없는 사건은 해당 평균에서 제외하며, 임의로 추정하지 않습니다.</div>
    </div>
    <section className="admin-kpis inner" style={{ marginTop: 14 }}>
      <article><span>부상 사건</span><strong>{injuryOverview.nEpisodes}</strong><small>기록된 사건</small></article>
      <article><span>평균 복귀 기간</span><strong>{injuryOverview.meanDaysToReturn === null ? "—" : `${injuryOverview.meanDaysToReturn.toFixed(1)}일`}</strong><small>부상일 → 복귀일</small></article>
      <article><span>평균 재부상 기간</span><strong>{injuryOverview.meanDaysToReinjury === null ? "—" : `${injuryOverview.meanDaysToReinjury.toFixed(1)}일`}</strong><small>복귀일 → 재부상일</small></article>
      <article><span>재부상률</span><strong>{injuryOverview.reinjuryRateAmongReturned === null ? "—" : `${injuryOverview.reinjuryRateAmongReturned.toFixed(1)}%`}</strong><small>복귀 완료 사건 기준</small></article>
    </section>
    <div className="admin-table-wrap" style={{ marginTop: 14 }}><table style={{ width: "100%", tableLayout: "fixed" }}><colgroup><col style={{ width: "18%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: "18%" }} /><col style={{ width: "18%" }} /><col style={{ width: "20%" }} /></colgroup><thead><tr><th>부상 부위</th><th>사건 수</th><th>복귀 수</th><th>평균 복귀(일)</th><th>평균 재부상(일)</th><th>해석</th></tr></thead><tbody>{injuryOverview.byArea.length ? injuryOverview.byArea.map((row) => <tr key={row.area}><td>{row.area}</td><td>{row.nEpisodes}</td><td>{row.nReturned}</td><td>{row.meanDaysToReturn === null ? "—" : row.meanDaysToReturn.toFixed(1)}</td><td>{row.meanDaysToReinjury === null ? "—" : row.meanDaysToReinjury.toFixed(1)}</td><td>실제 날짜 기반</td></tr>) : <tr><td colSpan={6}>부상 사건 데이터가 없습니다.</td></tr>}</tbody></table></div>
    <div className="admin-note" style={{ marginTop: 14 }}>평균 복귀 기간은 부상일과 복귀일이 모두 있는 사건만 포함합니다. 평균 재부상 기간은 복귀일과 재부상일이 모두 있는 사건만 포함합니다. 이 통계는 사건 기록의 기술통계이며, 재부상 위험의 인과적 예측을 의미하지 않습니다.</div>
    </div>

    <div id="research-rehab-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>REHABILITATION RESEARCH</span><h2>재활관리 연계 연구통계</h2><p className="admin-header p">재활 세션의 수행 여부를 날짜별 수행률로 정리하고, 같은 날짜의 퍼포먼스·회복·피로도와 탐색적으로 연결합니다.</p></div><button onClick={() => printSection("research-rehab-print", "NOVA Sports AI 재활관리 연계 연구통계")}>프린트</button></div>
    <section className="admin-kpis inner" style={{ marginTop: 14 }}>
      <article><span>재활 세션</span><strong>{rehabOverview.totalSessions}</strong><small>전체 기록</small></article>
      <article><span>완료 세션</span><strong>{rehabOverview.completedSessions}</strong><small>수행 완료</small></article>
      <article><span>수행률</span><strong>{rehabOverview.completionRate === null ? "—" : `${rehabOverview.completionRate.toFixed(1)}%`}</strong><small>완료 / 전체</small></article>
      <article><span>활동일</span><strong>{rehabOverview.activeDays}</strong><small>재활 기록이 있는 날짜</small></article>
    </section>
    <div className="admin-table-wrap" style={{ marginTop: 14 }}><table style={{ width: "100%", tableLayout: "fixed" }}><colgroup><col style={{ width: "22%" }} /><col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "30%" }} /></colgroup><thead><tr><th>재활 부위</th><th>세션</th><th>완료</th><th>수행률</th><th>연구 해석</th></tr></thead><tbody>{rehabOverview.areaCounts.length ? rehabOverview.areaCounts.map((row) => <tr key={row.area}><td>{row.area}</td><td>{row.total}</td><td>{row.completed}</td><td>{row.completionRate === null ? "—" : `${row.completionRate.toFixed(1)}%`}</td><td>부위별 재활 수행 현황</td></tr>) : <tr><td colSpan={5}>재활 데이터가 없습니다.</td></tr>}</tbody></table></div>
    <div className="admin-table-wrap" style={{ marginTop: 14 }}><table style={{ width: "100%", tableLayout: "fixed" }}><colgroup><col style={{ width: "28%" }} /><col style={{ width: "16%" }} /><col style={{ width: "18%" }} /><col style={{ width: "38%" }} /></colgroup><thead><tr><th>연계 분석</th><th>매칭 n</th><th>Pearson r</th><th>상태</th></tr></thead><tbody>{rehabOutcomePairs.map((pair) => <tr key={pair.label}><td>{pair.label}</td><td>{pair.result.n}</td><td>{formatNumber(pair.result.r, 3)}</td><td>{pair.result.r === null ? "동일 날짜의 재활·결과 데이터 부족" : "탐색적 연관성"}</td></tr>)}</tbody></table></div>
    <div className="admin-note" style={{ marginTop: 14 }}>재활 수행률은 같은 날짜의 재활 기록 중 완료된 세션의 비율입니다. 상관분석은 인과관계를 의미하지 않으며, SCI 논문에서는 부상 중증도·재활 단계·훈련량·공변량 등을 포함한 사전 분석계획이 필요합니다.</div>
    </div>

    <div id="research-correlation-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>EXPLORATORY ASSOCIATION</span><h2>변수 간 상관분석</h2></div><button onClick={() => printSection("research-correlation-print", "NOVA Sports AI 변수 간 상관분석")}>프린트</button></div>
    <div className="admin-table-wrap">
      <table>
        <thead><tr><th>변수쌍</th><th>매칭 관측치 n</th><th>Pearson r</th><th>판정</th></tr></thead>
        <tbody>{pairs.map((pair) => <tr key={pair.label}><td>{pair.label}</td><td>{pair.result.n}</td><td>{formatNumber(pair.result.r, 3)}</td><td>{pair.result.r === null ? "데이터 부족" : "탐색적 분석"}</td></tr>)}</tbody>
      </table>
    </div>
    </div>

    <div className="admin-note" style={{ marginTop: 14 }}>
      통계 계산은 표본표준편차, 중앙값/IQR, 평균의 95% 신뢰구간을 사용합니다. 상관분석은 동일 날짜에 매칭된 관측치만 사용합니다. 결측값은 임의로 대체하지 않습니다. 논문 제출 전에는 연구 질문에 맞는 사전 분석계획, 표본수 산출(power analysis), 적절한 검정 선택, 효과크기와 다중비교 보정, 기관 승인 및 데이터 관리 절차를 별도로 확정해야 합니다.
    </div>

    <div id="research-inferential-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>INFERENTIAL ANALYSIS</span><h2>정규성 · 그룹비교 · 효과크기</h2><p className="admin-header p">실제 데이터가 충분할 때만 추론통계를 계산합니다.</p></div><button onClick={() => printSection("research-inferential-print", "NOVA Sports AI 추론통계")}>프린트</button></div>
    <div className="admin-table-wrap"><table><thead><tr><th>변수</th><th>n</th><th>정규성 통계</th><th>근사 p</th><th>판정</th></tr></thead><tbody>{normalityRows.map((item)=><tr key={item.key}><td>{item.label}</td><td>{item.normality.n}</td><td>{formatNumber(item.normality.jb,3)}</td><td>{formatNumber(item.normality.pApprox,3)}</td><td>{item.normality.interpretation}</td></tr>)}</tbody></table></div>
    <div className="admin-table-wrap" style={{marginTop:14}}><table><thead><tr><th>분석</th><th>n</th><th>통계량</th><th>p</th><th>효과크기</th><th>상태</th></tr></thead><tbody><tr><td>독립표본 t-test</td><td>{independentComparison.n1+independentComparison.n2}</td><td>{formatNumber(independentComparison.statistic,3)}</td><td>{formatNumber(independentComparison.pApprox,3)}</td><td>{formatNumber(independentComparison.effectSize,3)}</td><td>{independentComparison.interpretation}</td></tr><tr><td>일원 ANOVA</td><td>{anova.n}</td><td>{formatNumber(anova.f,3)}</td><td>{formatNumber(anova.pApprox,3)}</td><td>{formatNumber(anova.etaSquared,3)}</td><td>{anova.k<2?"그룹 데이터 필요":"탐색적 분석"}</td></tr></tbody></table></div>
    </div>

    <div id="research-regression-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>REGRESSION / LONGITUDINAL</span><h2>회귀 · 종단 변화</h2><p className="admin-header p">동일 날짜에 매칭된 실제 관측값을 사용합니다.</p></div><button onClick={() => printSection("research-regression-print", "NOVA Sports AI 회귀·종단 분석")}>프린트</button></div>
    <div className="admin-table-wrap"><table><thead><tr><th>분석</th><th>n</th><th>주요 결과</th><th>상태</th></tr></thead><tbody><tr><td>회복 → 퍼포먼스 선형회귀</td><td>{performanceRecoveryRegression.n}</td><td>{performanceRecoveryRegression.r2===null?"—":`R² ${formatNumber(performanceRecoveryRegression.r2,3)} / β ${formatNumber(performanceRecoveryRegression.slope,3)} / RMSE ${formatNumber(performanceRecoveryRegression.rmse,3)}`}</td><td>{performanceRecoveryRegression.n<3?"관측치 부족":"탐색적 분석"}</td></tr><tr><td>퍼포먼스 ↔ 회복 paired 변화</td><td>{pairedPerformanceRecovery.n}</td><td>{pairedPerformanceRecovery.meanChange===null?"—":`평균 변화 ${formatNumber(pairedPerformanceRecovery.meanChange,2)} / p ${formatNumber(pairedPerformanceRecovery.pApprox,3)}`}</td><td>{pairedPerformanceRecovery.n<2?"반복측정 부족":"탐색적 분석"}</td></tr></tbody></table></div>
    </div>

    <div id="research-power-print">
    <div className="admin-panel-head" style={{ marginTop: 24 }}><div><span>G*POWER A PRIORI</span><h2>표본수 계획</h2><p className="admin-header p">G*Power의 A priori 분석 방식에 맞춰 검정 종류와 효과크기·α·검정력을 설정합니다. G*Power는 별도 데스크톱 프로그램이므로 이 화면에서는 입력값을 정리하고 참고 표본수를 보여주며, 최종 표본수는 공식 G*Power에서 재계산합니다.</p></div><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexShrink: 0, flexWrap: "nowrap" }}><button style={{ minWidth: 72, whiteSpace: "nowrap" }} onClick={() => printSection("research-power-print", "NOVA Sports AI G*Power 표본수 계획")}>프린트</button><button style={{ minWidth: 96, whiteSpace: "nowrap" }} onClick={() => window.open("https://www.psychologie.hhu.de/en/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower", "_blank", "noopener,noreferrer")}>G*Power 열기</button></div></div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0" }}>
      <label style={{ display: "grid", gap: 5, minWidth: 180 }}><span>검정 계열</span><select value={gPowerFamily} onChange={(e) => { const value = e.target.value as "t" | "f" | "correlation"; setGPowerFamily(value); setGPowerTest(value === "t" ? "Means: Difference between two independent means (two groups)" : value === "f" ? "ANOVA: Fixed effects, omnibus, one-way" : "Correlation: Bivariate normal model" ); }}><option value="t">t tests</option><option value="f">F tests</option><option value="correlation">Correlation and Regression</option></select></label>
      <label style={{ display: "grid", gap: 5, minWidth: 300 }}><span>통계 검정</span><select value={gPowerTest} onChange={(e) => setGPowerTest(e.target.value)}>{gPowerFamily === "t" ? <><option>Means: Difference between two independent means (two groups)</option><option>Means: Difference between two dependent means (matched pairs)</option></> : gPowerFamily === "f" ? <><option>ANOVA: Fixed effects, omnibus, one-way</option><option>ANOVA: Repeated measures, within factors</option></> : <><option>Correlation: Bivariate normal model</option><option>Linear multiple regression: Fixed model, R² increase</option></>}</select></label>
      <label style={{ display: "grid", gap: 5, minWidth: 130 }}><span>Tail(s)</span><select value={gPowerTail} onChange={(e) => setGPowerTail(e.target.value as "two" | "one")}><option value="two">Two-tailed</option><option value="one">One-tailed</option></select></label>
      <label style={{ display: "grid", gap: 5, minWidth: 150 }}><span>효과크기</span><input type="number" min="0.01" step="0.01" value={powerEffectSize} onChange={(e) => setPowerEffectSize(Math.max(0.01, Number(e.target.value) || 0.01))} /></label>
      <label style={{ display: "grid", gap: 5, minWidth: 130 }}><span>α</span><input type="number" min="0.001" max="0.2" step="0.01" value={powerAlpha} onChange={(e) => setPowerAlpha(Math.min(0.2, Math.max(0.001, Number(e.target.value) || 0.05)))} /></label>
      <label style={{ display: "grid", gap: 5, minWidth: 150 }}><span>검정력 1−β</span><input type="number" min="0.5" max="0.99" step="0.01" value={powerTarget} onChange={(e) => setPowerTarget(Math.min(0.99, Math.max(0.5, Number(e.target.value) || 0.8)))} /></label>
      <label style={{ display: "grid", gap: 5, minWidth: 130 }}><span>그룹 수</span><input type="number" min="2" step="1" value={gPowerGroups} onChange={(e) => setGPowerGroups(Math.max(2, Number(e.target.value) || 2))} /></label>
    </div>
    <div className="admin-table-wrap"><table style={{ width: "100%", tableLayout: "fixed" }}><colgroup><col style={{ width: "34%" }} /><col style={{ width: "16%" }} /><col style={{ width: "18%" }} /><col style={{ width: "32%" }} /></colgroup><thead><tr><th style={{ whiteSpace: "normal" }}>G*Power 설정</th><th>효과크기</th><th>α / 검정력</th><th style={{ whiteSpace: "normal" }}>참고 표본수</th></tr></thead><tbody><tr><td style={{ whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.5 }}>{gPowerSetupLabel(gPowerPlan)}</td><td>{plannedPower.effectSize}</td><td>{plannedPower.alpha} / {plannedPower.power}</td><td>{gPowerFamily === "t" && gPowerTest.includes("independent") ? `${plannedPower.requiredPerGroup ?? "—"}명/그룹 (참고)` : "공식 G*Power에서 최종 계산"}</td></tr></tbody></table></div>
    <div className="admin-note" style={{ marginTop: 14 }}>권장 절차: G*Power에서 <strong>A priori: Compute required sample size</strong>를 선택하고 위 설정을 동일하게 입력한 뒤 나온 Total sample size를 연구계획서에 기록하세요. 이 앱의 참고 표본수는 G*Power의 공식 계산 결과를 대체하지 않습니다. G*Power는 t, F, χ², z 및 일부 exact test의 power analysis를 지원합니다.</div>
    </div>
  </section>;
}
