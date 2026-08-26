 "use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./report.css";
import { calculateAge, getBodyRecordsWithBmi, getLatestBodyRecord, playerProfile } from "../../lib/player-profile";
import { readNovaAthleteData } from "../../lib/nova-data";
import { getMeasurementRange } from "../../lib/nova-measurements";
import { getCameraAIResultsInRange, type NovaCameraAIResult } from "../../lib/nova-data";

const printRequester = "John Kim";


function PrintMetadata() {
  useEffect(() => {
    const now = new Date();
    const dateEl = document.querySelector(".print-date");
    const timeEl = document.querySelector(".print-time");
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
  }, []);

  return null;
}


function isGrowthRecordInRange(recordDate: string, startDate: string, endDate: string) {
  return recordDate >= startDate && recordDate <= endDate;
}

function normalizeSeries(values: number[]) {
  if (values.length === 0) return [];
  if (values.length === 1) return [50];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((value) => 12 + ((value - min) / (max - min)) * 76);
}

function formatGrowthDate(date: string) {
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}

function makePolyline(values: number[]) {
  if (!values.length) return "";
  const normalized = normalizeSeries(values);
  const width = 700;
  const height = 190;
  return normalized.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (value / 100) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

type CameraReportResult = NovaCameraAIResult;

const CAMERA_AI_DEFAULTS: CameraReportResult[] = [];

function loadCameraAIResults(startDate?: string, endDate?: string): CameraReportResult[] {
  return getCameraAIResultsInRange(startDate, endDate);
}


function PrintResultFooter({ page, showLogo }: { page: string; showLogo: boolean }) {
  return (
    <footer className="print-result-footer">
      {showLogo ? <img src="/report-print-logo.png" alt="NOVA" /> : <span className="print-result-footer-spacer" />}
      <div className="print-result-footer-center">NOVA AI SPORTS PLATFORM</div>
      <div className="print-result-footer-meta">
        <span>프린트 요청자: {printRequester}</span>
        <span>프린트 날짜: <span className="print-date" /></span>
        <span>프린트 시간: <span className="print-time" /></span>
        <span>{page} / 3</span>
      </div>
    </footer>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("2025-05-14");
  const [endDate, setEndDate] = useState("2025-05-20");
  const [cameraAIResults, setCameraAIResults] = useState<CameraReportResult[]>([]);
  const [profile, setProfile] = useState(playerProfile);
  const [bodyRecords, setBodyRecords] = useState(playerProfile.bodyRecords);
  const [measurementHistory, setMeasurementHistory] = useState<ReturnType<typeof getMeasurementRange>>({
    bodyRecords: [],
    fatigueRecords: [],
    performanceRecords: [],
    recoveryRecords: [],
  });

  useEffect(() => {
    try {
      const data = readNovaAthleteData();
      const athlete = data.athlete;
      setProfile({
        ...playerProfile,
        id: athlete.id || playerProfile.id,
        name: athlete.name || playerProfile.name,
        position: athlete.position || playerProfile.position,
        team: athlete.affiliation || playerProfile.team,
        birthDate: athlete.birthDate || playerProfile.birthDate,
      });
      if (data.bodyRecords.length) setBodyRecords(data.bodyRecords);

      const dates = [
        ...data.bodyRecords.map((item) => item.date),
        ...data.fatigueRecords.map((item) => item.date),
        ...data.performanceRecords.map((item) => item.date),
        ...data.recoveryRecords.map((item) => item.date),
        ...data.rehabRecords.map((item) => item.date),
        ...data.cameraAIResults.map((item) => item.completedAt.slice(0, 10)),
      ].filter(Boolean).sort();
      if (dates.length) {
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }
    } catch {
      // Keep the safe fallback profile and default report period.
    }
  }, []);

  useEffect(() => {
    setCameraAIResults(loadCameraAIResults(startDate, endDate));
    try {
      setMeasurementHistory(getMeasurementRange(startDate, endDate));
    } catch {
      setMeasurementHistory({
        bodyRecords: [],
        fatigueRecords: [],
        performanceRecords: [],
        recoveryRecords: [],
      });
    }
  }, [startDate, endDate]);

  const reportPeriod = `${startDate} ~ ${endDate}`;
  const cameraCount = cameraAIResults.length;
  const cameraDensityClass = cameraCount <= 1 ? "camera-count-1" : cameraCount <= 3 ? "camera-count-3" : "camera-count-7";
  const averageScore = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

  const fatigueScore = averageScore(measurementHistory.fatigueRecords.map((item) => item.score));
  const performanceScore = averageScore(measurementHistory.performanceRecords.map((item) => item.score));
  const recoveryScore = averageScore(measurementHistory.recoveryRecords.map((item) => item.score));
  const scores = [
    { name: "Performance Score", value: performanceScore, basis: "선택 기간 퍼포먼스 측정값 평균" },
    { name: "Recovery Score", value: recoveryScore, basis: "선택 기간 회복 측정값 평균" },
    { name: "Training Load", value: null, basis: "GPS load · Jump load · Session volume 데이터 필요" },
    { name: "Injury Risk", value: null, basis: "부상위험 산출 데이터 필요" },
  ];
  const hasCoreScores = performanceScore !== null && recoveryScore !== null && fatigueScore !== null;

  const fatigueLevel = fatigueScore === null
    ? "데이터 부족"
    : fatigueScore >= 80 ? "낮은 피로 수준"
    : fatigueScore >= 60 ? "중간 수준의 피로" : "높은 피로 수준";
  const performanceLevel = performanceScore === null
    ? "데이터 부족"
    : performanceScore >= 80 ? "우수한 경기 수행 상태"
    : performanceScore >= 60 ? "보통 수준의 경기 수행 상태" : "경기 수행 보완이 필요한 상태";
  const recoveryLevel = recoveryScore === null
    ? "데이터 부족"
    : recoveryScore >= 80 ? "회복 상태가 양호한 수준"
    : recoveryScore >= 60 ? "회복 상태를 지속 관찰할 수준" : "회복 관리가 필요한 수준";

  const overallStatus = !hasCoreScores
    ? "데이터 부족"
    : performanceScore >= 80 && recoveryScore >= 80 && fatigueScore >= 70
      ? "정상 범위"
      : performanceScore < 50 || recoveryScore < 50 || fatigueScore < 40
        ? "집중 관리 필요"
        : "관리 필요";

  const improvementPoints = [
    fatigueScore !== null && fatigueScore < 70 ? "훈련 강도와 휴식 간격을 조절해 피로 누적을 관리하는 것" : "",
    performanceScore !== null && performanceScore < 80 ? "경기 수행과 움직임 효율을 높이기 위한 세부 훈련을 보완하는 것" : "",
    recoveryScore !== null && recoveryScore < 80 ? "수면·회복 루틴과 훈련 후 회복 시간을 안정적으로 확보하는 것" : "",
    cameraAIResults.some((item) => item.status === "주의" || item.status === "관리")
      ? "Camera AI에서 관리 또는 주의로 확인된 동작 항목을 반복 점검하는 것"
      : "",
  ].filter(Boolean);

  const overallOpinion = !hasCoreScores
    ? `${profile.name || "해당 선수"} 선수의 선택 기간에 퍼포먼스·회복·피로도 중 일부 측정 데이터가 없어 종합 상태를 산출할 수 없습니다. 측정값을 저장한 후 동일 기간을 다시 조회해 주세요.`
    : `${profile.name || "해당 선수"} 선수는 선택 기간 동안 퍼포먼스 ${performanceScore}점으로 ${performanceLevel}, 회복 ${recoveryScore}점으로 ${recoveryLevel}이며 피로도는 ${fatigueScore}점으로 ${fatigueLevel}로 확인됩니다. 종합 상태는 ${overallStatus}로 판단됩니다. ${
        improvementPoints.length
          ? `${improvementPoints.join(", ")}을(를) 중심으로 관리하면 현재 상태를 보다 안정적으로 유지하고 경기 수행을 높이는 데 도움이 될 것으로 판단됩니다.`
          : "현재 주요 지표가 비교적 안정적인 범위에 있어 현재 훈련 및 회복 루틴을 유지하면서 지속적으로 변화를 확인하는 것이 좋겠습니다."
      }`;
  const cameraAverage = cameraCount
    ? Math.round(cameraAIResults.reduce((sum, item) => sum + item.score, 0) / cameraCount)
    : 0;
  const cameraGood = cameraAIResults.filter((item) => item.status === "양호");
  const cameraNeedsAttention = cameraAIResults.filter((item) => item.status !== "양호");
  const cameraStrongest = cameraAIResults.length ? [...cameraAIResults].sort((a, b) => b.score - a.score)[0] : null;
  const cameraWeakest = cameraAIResults.length ? [...cameraAIResults].sort((a, b) => a.score - b.score)[0] : null;
  const cameraAttentionText = cameraNeedsAttention.length
    ? cameraNeedsAttention.map((item) => `${item.title}(${item.score}점, ${item.status})`).join(", ")
    : "관리 또는 주의로 표시된 항목이 없습니다.";
  const cameraRecommendationText = cameraNeedsAttention.map((item) => item.recommendation).filter(Boolean).slice(0, 3).join(" ");
  const cameraDetailedOpinion = cameraCount
    ? `${cameraCount}종 Camera AI 분석 평균은 ${cameraAverage}점이며, ${cameraGood.length}개 항목은 양호, ${cameraNeedsAttention.length}개 항목은 추가 관리가 필요한 상태로 확인됩니다. 가장 높은 결과는 ${cameraStrongest?.title}(${cameraStrongest?.score}점), 가장 낮은 결과는 ${cameraWeakest?.title}(${cameraWeakest?.score}점)입니다. ${
        cameraNeedsAttention.length
          ? `특히 ${cameraAttentionText} 항목을 우선적으로 확인하는 것이 좋겠습니다. ${cameraRecommendationText}`
          : "현재 선택된 분석 항목에서 뚜렷한 관리·주의 항목은 확인되지 않아 현재의 훈련 패턴을 유지하면서 추이를 관찰하는 것이 좋겠습니다."
      }`
    : "선택된 Camera AI 분석 결과가 없어 동작분석에 대한 세부 종합 평가는 생성되지 않습니다.";
  const radarDimensions = [
    { label: "지지력", keywords: ["지지", "support"] },
    { label: "유연성", keywords: ["유연", "flex", "mobility"] },
    { label: "균형", keywords: ["균형", "balance"] },
    { label: "순간력", keywords: ["순간", "폭발", "power", "jump", "speed"] },
    { label: "안정성", keywords: ["안정", "stability", "control"] },
  ].map((dimension) => {
    const matched = cameraAIResults.filter((item) => {
      const haystack = `${item.title} ${item.category}`.toLowerCase();
      return dimension.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });
    const values = matched.length ? matched.map((item) => item.score) : cameraAIResults.map((item) => item.score);
    const value = values.length ? Math.round(values.reduce((sum, n) => sum + n, 0) / values.length) : 0;
    return { ...dimension, value };
  });

  const radarPoints = radarDimensions.map((item, index) => {
    const angles = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI / 5), -Math.PI / 2 + (4 * Math.PI / 5), -Math.PI / 2 + (6 * Math.PI / 5), -Math.PI / 2 + (8 * Math.PI / 5)];
    const radius = 75 * (item.value / 100);
    return `${(100 + Math.cos(angles[index]) * radius).toFixed(1)},${(100 + Math.sin(angles[index]) * radius).toFixed(1)}`;
  }).join(" ");

  const sourceBodyRecords = measurementHistory.bodyRecords.length
    ? measurementHistory.bodyRecords
    : bodyRecords;
  const growthTrendSource = getBodyRecordsWithBmi(sourceBodyRecords).map((record) => ({
    date: record.date,
    height: record.heightCm,
    weight: record.weightKg,
    bmi: record.bmi,
  }));
  const latestBody = getLatestBodyRecord(sourceBodyRecords);
  const filteredGrowthTrend = growthTrendSource.filter((record) =>
    isGrowthRecordInRange(record.date, startDate, endDate)
  );
  const growthTrend = filteredGrowthTrend.length ? filteredGrowthTrend : growthTrendSource;
  const latestGrowth = growthTrend[growthTrend.length - 1];
  const firstGrowth = growthTrend[0];
  const heightPoints = makePolyline(growthTrend.map((item) => item.height));
  const weightPoints = makePolyline(growthTrend.map((item) => item.weight));
  const bmiPoints = makePolyline(growthTrend.map((item) => item.bmi));
  const heightNormalized = normalizeSeries(growthTrend.map((item) => item.height));
  const weightNormalized = normalizeSeries(growthTrend.map((item) => item.weight));
  const bmiNormalized = normalizeSeries(growthTrend.map((item) => item.bmi));
  const age = calculateAge(profile.birthDate, new Date(`${endDate}T00:00:00`));

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };

  PrintMetadata();

  return (
    <main className="nova-report">
      <header className="report-header">
        <div className="report-header-left">
          <button className="report-back" type="button" aria-label="뒤로 가기" onClick={goBack}>
            ←
          </button>
          <button className="report-brand" type="button" onClick={() => router.push("/")}>
            <strong>NOVA</strong>
            <span>AI SPORTS PLATFORM</span>
          </button>
        </div>

        <div className="report-system-status">
          <span className="report-status-dot" />
          <span>AI 시스템 준비</span>
        </div>
      </header>

      <section className="report-content">
        <div className="report-actions">
            <button type="button" className="print-button" onClick={() => window.print()}>
              프린트
            </button>
          </div>
          <div className="report-heading">
          <div className="report-print-brand">
            <img className="report-print-logo" src="/report-print-logo.png" alt="NOVA" />
            <span className="report-print-platform">NOVA AI SPORTS PLATFORM</span>
          </div>
          <div>
            <span className="report-platform-title">NOVA AI SPORTS PLATFORM</span>
            <span className="eyebrow">REPORT</span>
            <h1>리포트</h1>
            <p>선택한 기간의 퍼포먼스, 회복, 피로도 및 재활 관리 결과를 한눈에 확인합니다.</p>
          </div>
          <button type="button" className="dashboard-link" onClick={() => router.push("/dashboard")}>
            대시보드
          </button>
        </div>

        <section className="player-profile">
          <div className="player-avatar">{profile.jerseyNumber}</div>
          <div className="player-main">
            <strong>{profile.name}</strong>
            <span>{profile.position} · {profile.team}</span>
          </div>
          <div className="player-meta">
            <div><small>선수 번호</small><b>#{profile.jerseyNumber}</b></div>
            <div><small>포지션</small><b>{profile.position}</b></div>
            <div><small>나이</small><b>{age}세</b></div>
            <div><small>키</small><b>{latestGrowth?.height ?? latestBody?.heightCm ?? "-"} cm</b></div>
            <div><small>몸무게</small><b>{latestGrowth?.weight ?? latestBody?.weightKg ?? "-"} kg</b></div>
            <div><small>소속</small><b>{profile.team}</b></div>
            <div><small>리포트 기간</small><b>{reportPeriod}</b></div>
            <div><small>상태</small><b className="player-status">정상</b></div>
          </div>
        </section>

        <section className="report-filter">
          <div className="report-filter-title">
            <strong>리포트 기간 설정</strong>
            <span>조회할 기간을 선택한 후 리포트를 확인하거나 프린트하세요.</span>
          </div>
          <div className="date-controls">
            <label>
              <span>시작일</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <span className="date-separator">~</span>
            <label>
              <span>종료일</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="apply-date"
              onClick={() => window.print()}
            >
              이 기간으로 리포트 출력
            </button>
          </div>
        </section>

        <section className="report-card growth-card">
          <div className="section-title">
            <div>
              <h2>신체 성장 및 체성분 변화</h2>
              <p className="section-caption">키 · 몸무게 · BMI 변화 추이</p>
            </div>
            <span>{reportPeriod}</span>
          </div>

          <div className="growth-summary">
            <div><small>현재 키</small><strong>{latestGrowth.height.toFixed(1)} <em>cm</em></strong><span>{(latestGrowth.height - firstGrowth.height >= 0 ? "+" : "")}{(latestGrowth.height - firstGrowth.height).toFixed(1)} cm</span></div>
            <div><small>현재 몸무게</small><strong>{latestGrowth.weight.toFixed(1)} <em>kg</em></strong><span>{(latestGrowth.weight - firstGrowth.weight >= 0 ? "+" : "")}{(latestGrowth.weight - firstGrowth.weight).toFixed(1)} kg</span></div>
            <div><small>현재 BMI</small><strong>{latestGrowth.bmi.toFixed(1)}</strong><span>{(latestGrowth.bmi - firstGrowth.bmi >= 0 ? "+" : "")}{(latestGrowth.bmi - firstGrowth.bmi).toFixed(1)}</span></div>
          </div>

          <div className="growth-trend-chart" aria-label="키, 몸무게, BMI 변화 추이">
            <div className="growth-trend-head">
              <span className="growth-axis-title">상대 변화</span>
              <div className="growth-legend">
                <span><i className="legend-height" /> 키</span>
                <span><i className="legend-weight" /> 몸무게</span>
                <span><i className="legend-bmi" /> BMI</span>
              </div>
            </div>

            <div className="growth-plot">
              <div className="growth-y-axis">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>

              <div className="growth-plot-area">
                <div className="growth-grid-line line-100" />
                <div className="growth-grid-line line-75" />
                <div className="growth-grid-line line-50" />
                <div className="growth-grid-line line-25" />
                <div className="growth-grid-line line-0" />

                <svg className="growth-svg" viewBox="0 0 700 190" preserveAspectRatio="none" role="img">
                  <polyline
                    className="growth-svg-line height-stroke"
                    points={heightPoints}
                  />
                  <polyline
                    className="growth-svg-line weight-stroke"
                    points={weightPoints}
                  />
                  <polyline
                    className="growth-svg-line bmi-stroke"
                    points={bmiPoints}
                  />

                  <g className="height-points">
                    {heightNormalized.map((value, index) => {
                      const x = heightNormalized.length === 1 ? 350 : (index / (heightNormalized.length - 1)) * 700;
                      const y = 190 - (value / 100) * 190;
                      return <circle key={`height-${growthTrend[index].date}`} cx={x} cy={y} r="4" />;
                    })}
                  </g>
                  <g className="weight-points">
                    {weightNormalized.map((value, index) => {
                      const x = weightNormalized.length === 1 ? 350 : (index / (weightNormalized.length - 1)) * 700;
                      const y = 190 - (value / 100) * 190;
                      return <circle key={`weight-${growthTrend[index].date}`} cx={x} cy={y} r="4" />;
                    })}
                  </g>
                  <g className="bmi-points">
                    {bmiNormalized.map((value, index) => {
                      const x = bmiNormalized.length === 1 ? 350 : (index / (bmiNormalized.length - 1)) * 700;
                      const y = 190 - (value / 100) * 190;
                      return <circle key={`bmi-${growthTrend[index].date}`} cx={x} cy={y} r="4" />;
                    })}
                  </g>
                </svg>

                <div className="growth-value-row height-values">
                  {growthTrend.map((item) => <span key={`hv-${item.date}`}>{item.height}</span>)}
                </div>
              </div>
            </div>

            <div className="growth-dates">
              {growthTrend.map((item) => <span key={item.date}>{formatGrowthDate(item.date)}</span>)}
            </div>

            <div className="growth-current-values">
              <span>키 <b>{latestGrowth.height.toFixed(1)} cm</b></span>
              <span>몸무게 <b>{latestGrowth.weight.toFixed(1)} kg</b></span>
              <span>BMI <b>{latestGrowth.bmi.toFixed(1)}</b></span>
            </div>
          </div>

        </section>

        <section className="report-card report-analysis-card">
          <div className="section-title">
            <div>
              <h2>종합 분석</h2>
              <p className="section-caption">선택한 기간의 퍼포먼스 · 회복 · 훈련부하 · 피로도 데이터를 종합한 요약</p>
            </div>
            <span>{reportPeriod}</span>
          </div>

          <div className="analysis-status">
            <div className="analysis-status-badge">종합 상태</div>
            <strong>{overallStatus}</strong>
            <span className="analysis-status-period">{reportPeriod}</span>
          </div>

          <div className="analysis-grid">
            <div className="analysis-item">
              <div className="analysis-item-head"><h3>퍼포먼스</h3><strong>{performanceScore === null ? "—" : performanceScore}<small>{performanceScore === null ? "" : "/100"}</small></strong></div>
              <div className="analysis-meter"><span style={{ width: `${performanceScore ?? 0}%` }} /></div>
              <p>현재 기록 기준 경기력 상태입니다.</p>
            </div>
            <div className="analysis-item">
              <div className="analysis-item-head"><h3>회복</h3><strong>{recoveryScore === null ? "—" : recoveryScore}<small>{recoveryScore === null ? "" : "/100"}</small></strong></div>
              <div className="analysis-meter"><span style={{ width: `${recoveryScore ?? 0}%` }} /></div>
              <p>훈련 이후 회복 상태를 확인합니다.</p>
            </div>
            <div className="analysis-item">
              <div className="analysis-item-head"><h3>피로도</h3><strong>{fatigueScore === null ? "—" : fatigueScore}<small>{fatigueScore === null ? "" : "/100"}</small></strong></div>
              <div className="analysis-meter"><span style={{ width: `${fatigueScore ?? 0}%` }} /></div>
              <p>최근 피로 누적과 훈련 조절 필요성을 확인합니다.</p>
            </div>
            <div className="analysis-item">
              <div className="analysis-item-head"><h3>재활 관리</h3><span className="analysis-tag">기간 기록</span></div>
              <p>선택 기간의 재활 관리 기록과 훈련 상태를 함께 검토합니다.</p>
              <div className="analysis-link">관리 항목 우선 확인</div>
            </div>
          </div>

          <div className="analysis-note">
            <strong>권장사항</strong>
            <span>
              {fatigueScore === null || recoveryScore === null
                ? "선택 기간의 퍼포먼스·회복·피로도 측정값을 모두 입력하면 종합 권장사항을 산출할 수 있습니다."
                : fatigueScore < 50
                ? "피로도가 높은 구간입니다. 훈련 강도와 회복 상태를 함께 확인하세요."
                : recoveryScore < 60
                ? "회복 점수가 낮은 구간입니다. 다음 훈련 전 회복 상태를 확인하세요."
                : "현재 점수 흐름을 유지하면서 퍼포먼스와 회복 추이를 지속적으로 확인하세요."}
            </span>
          </div>
        </section>

        <section className="report-card motion-analysis-card">
          <div className="section-title">
            <div>
              <h2>동작분석 결과</h2>
              <p className="section-caption">선택 기간의 동작분석 결과와 주요 움직임 지표를 요약합니다.</p>
            </div>
            <span>{reportPeriod}</span>
          </div>

          <div className="motion-summary-grid">
            <div className="motion-summary-item">
              <span>동작분석 점수</span>
              <strong>84<small>/100</small></strong>
              <div className="motion-meter"><i style={{ width: "84%" }} /></div>
            </div>
            <div className="motion-summary-item">
              <span>분석 완료</span>
              <strong>12<small>회</small></strong>
              <p>선택 기간 분석 영상 기준</p>
            </div>
            <div className="motion-summary-item">
              <span>주요 이상</span>
              <strong>1<small>건</small></strong>
              <p>추가 확인이 필요한 동작 패턴</p>
            </div>
          </div>

          <div className="motion-results">
            <div className="motion-result">
              <div className="motion-result-head">
                <div>
                  <h3>하체 정렬</h3>
                  <p>착지 및 방향 전환 시 좌우 정렬 상태</p>
                </div>
                <b className="motion-good">양호</b>
              </div>
              <div className="motion-result-bar"><i style={{ width: "88%" }} /></div>
            </div>

            <div className="motion-result">
              <div className="motion-result-head">
                <div>
                  <h3>무릎 움직임</h3>
                  <p>착지 구간의 무릎 굴곡과 안정성</p>
                </div>
                <b className="motion-watch">주의</b>
              </div>
              <div className="motion-result-bar"><i style={{ width: "68%" }} /></div>
            </div>

            <div className="motion-result">
              <div className="motion-result-head">
                <div>
                  <h3>체간 안정성</h3>
                  <p>가속·감속 및 방향 전환 시 중심 유지</p>
                </div>
                <b className="motion-good">양호</b>
              </div>
              <div className="motion-result-bar"><i style={{ width: "82%" }} /></div>
            </div>

            <div className="motion-result">
              <div className="motion-result-head">
                <div>
                  <h3>좌우 균형</h3>
                  <p>좌우 움직임의 편차와 반복 동작 일관성</p>
                </div>
                <b className="motion-good">양호</b>
              </div>
              <div className="motion-result-bar"><i style={{ width: "86%" }} /></div>
            </div>
          </div>

          <div className="motion-note">
            <strong>분석 요약</strong>
            <span>전반적인 동작 안정성은 양호합니다. 착지 구간의 무릎 움직임은 다음 분석에서 우선 확인하는 것을 권장합니다.</span>
          </div>
        </section>

        <section className="report-card camera-ai-result-card">
          <div className="section-title">
            <div><h2>Camera AI 7종 종합 분석 결과</h2><p className="section-caption">완료된 Camera AI 분석 결과를 한 번에 확인합니다.</p></div>
            <span>{cameraAIResults.length}개 분석</span>
          </div>
          <div className="camera-ai-report-grid">
            {cameraAIResults.map((result) => (
              <article className="camera-ai-report-item" key={result.id}>
                <div className="camera-ai-report-item-head">
                  <div><span>{result.category}</span><h3>{result.title}</h3></div>
                  <strong>{result.score}<small>/100</small></strong>
                </div>
                <div className="camera-ai-report-status">
                  <b className={result.status === "양호" ? "metric-good" : "metric-watch"}>{result.status}</b>
                  <span>{result.summary}</span>
                </div>
                <div className="camera-ai-report-metrics">
                  {result.metrics.slice(0, 4).map((metric) => <div key={metric.label}><small>{metric.label}</small><b>{metric.value}</b></div>)}
                </div>
                <p className="camera-ai-report-recommendation">{result.recommendation}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="report-card">
          <div className="section-title">
            <h2>점수 계산 및 추이</h2>
            <span>현재 기준</span>
          </div>

          <div className="score-list">
            {scores.map((score) => (
              <article className="score-row" key={score.name}>
                <div className="score-name">
                  <strong>{score.name}</strong>
                  <span>{score.basis}</span>
                </div>
                <div className="score-number">{score.value === null ? "—" : score.value}<small>{score.value === null ? "" : "/100"}</small></div>
                <div className="score-bar">
                  <span style={{ width: `${score.value ?? 0}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="report-grid">
          <article className="report-card">
            <div className="section-title">
              <h2>피로도 계산 추이</h2>
              <span>{reportPeriod}</span>
            </div>
            <div className="trend">
              {measurementHistory.fatigueRecords.length ? measurementHistory.fatigueRecords.map((item) => (
                <div className="trend-point" key={item.date}>
                  <span>{item.score}</span>
                  <i style={{ height: `${item.score}%` }} />
                  <small>{formatGrowthDate(item.date)}</small>
                </div>
              )) : (
                <div className="trend-empty">선택 기간의 피로도 측정 기록이 없습니다.</div>
              )}
            </div>
          </article>

          <article className="report-card">
            <div className="section-title">
              <h2>점수 해석</h2>
            </div>
            <div className="interpretation">
              <p><b>80–100</b> 정상 · 최적의 상태</p>
              <p><b>50–79</b> 주의 · 컨디션 관리 필요</p>
              <p><b>0–49</b> 높은 피로 · 회복 우선</p>
            </div>
          </article>
        </section>

        <footer className="report-disclaimer">
          <strong>의료 고지</strong>
          <p>
            본 리포트의 모든 정보와 분석 결과는 스포츠 퍼포먼스 및 선수 관리 지원을 위한 참고 자료이며,
            의료진단, 의학적 진찰, 치료 또는 의료적 판단을 대신하지 않습니다.
            리포트의 내용을 의료적 진단이나 치료를 위한 근거로 사용해서는 안 됩니다.
          </p>
          <p>
            선수의 상태에 대해 진료 또는 검사가 필요하다고 판단되는 경우에는
            전문 의료기관을 방문하여 적절한 검사와 전문 의료진의 진찰 및 상담을 받으시기 바랍니다.
          </p>
        </footer>
      </section>
      <section className="print-result-sheet" aria-label="프린트용 리포트 결과지">
        <div className="print-result-page print-result-page-1">
          <header className="print-result-header">
            <div className="print-result-brand">
              <img src="/report-print-logo.png" alt="NOVA" />
              <strong>NOVA AI SPORTS PLATFORM</strong>
            </div>
            <div className="print-result-title">
              <span>REPORT</span>
              <h1>리포트</h1>
              <p>선택한 기간의 퍼포먼스, 회복, 피로도 및 재활 관리 결과를 한눈에 확인합니다.</p>
            </div>
          </header>

          <section className="print-result-profile">
            <div className="print-result-avatar">{profile.jerseyNumber}</div>
            <div className="print-result-player"><strong>{profile.name}</strong><span>{profile.position} · {profile.team}</span></div>
            <div className="print-result-meta">
              <div><small>선수 번호</small><b>#{profile.jerseyNumber}</b></div>
              <div><small>포지션</small><b>{profile.position}</b></div>
              <div><small>담당 코치</small><b>{printRequester}</b></div>
              <div><small>소속 팀</small><b>{profile.team}</b></div>
              <div><small>생년월일</small><b>{profile.birthDate} ({age}세)</b></div>
              <div><small>키</small><b>{latestGrowth?.height ?? "-"} cm</b></div>
              <div><small>몸무게</small><b>{latestGrowth?.weight ?? "-"} kg</b></div>
              <div><small>BMI</small><b>{latestGrowth?.bmi?.toFixed(1) ?? "-"}</b></div>
              <div><small>리포트 기간</small><b>{reportPeriod}</b></div>
              <div><small>상태</small><b className="print-green">정상</b></div>
            </div>
          </section>

          <section className="print-result-card print-growth-result">
            <div className="print-result-card-head"><div><h2>신체 성장 및 체성분 변화</h2><p>키 · 몸무게 · BMI 변화 추이</p></div><span>{reportPeriod}</span></div>
            <div className="print-growth-summary">
              <div><small>현재 키</small><strong>{latestGrowth.height.toFixed(1)} <em>cm</em></strong><b>+{(latestGrowth.height-firstGrowth.height).toFixed(1)} cm</b></div>
              <div><small>현재 몸무게</small><strong>{latestGrowth.weight.toFixed(1)} <em>kg</em></strong><b>+{(latestGrowth.weight-firstGrowth.weight).toFixed(1)} kg</b></div>
              <div><small>현재 BMI</small><strong>{latestGrowth.bmi.toFixed(1)}</strong><b>+{(latestGrowth.bmi-firstGrowth.bmi).toFixed(1)}</b></div>
            </div>
            <div className="print-growth-graph">
              <div className="print-growth-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
              <div className="print-growth-graph-area">
                <div className="print-growth-grid"><i/><i/><i/><i/><i/></div>
                <svg viewBox="0 0 700 180" preserveAspectRatio="none">
                  <polyline points={heightPoints} fill="none" stroke="#2d9b58" strokeWidth="3"/>
                  <polyline points={weightPoints} fill="none" stroke="#f28b1f" strokeWidth="3"/>
                  <polyline points={bmiPoints} fill="none" stroke="#e63d32" strokeWidth="3"/>
                  {heightNormalized.map((value,index)=><circle key={`ph-${index}`} cx={growthTrend.length===1?350:(index/(growthTrend.length-1))*700} cy={180-(value/100)*180} r="4" fill="#2d9b58" stroke="#fff" strokeWidth="2"/>)}
                  {weightNormalized.map((value,index)=><circle key={`pw-${index}`} cx={growthTrend.length===1?350:(index/(growthTrend.length-1))*700} cy={180-(value/100)*180} r="4" fill="#f28b1f" stroke="#fff" strokeWidth="2"/>)}
                  {bmiNormalized.map((value,index)=><circle key={`pb-${index}`} cx={growthTrend.length===1?350:(index/(growthTrend.length-1))*700} cy={180-(value/100)*180} r="4" fill="#e63d32" stroke="#fff" strokeWidth="2"/>)}
                </svg>
                <div className="print-growth-dates">{growthTrend.map(item=><span key={item.date}>{formatGrowthDate(item.date)}</span>)}</div>
              </div>
            </div>
            <div className="print-growth-legend"><span><i className="g-height"/>키</span><span><i className="g-weight"/>몸무게</span><span><i className="g-bmi"/>BMI</span></div>
          </section>

          <section className="print-result-card print-first-summary">
            <div className="print-result-card-head">
              <div><h2>종합 상태 요약</h2><p>선택 기간의 주요 선수관리 지표를 한눈에 확인합니다.</p></div>
              <span>{reportPeriod}</span>
            </div>
            <div className="print-first-summary-grid">
              <div className="first-summary-blue"><small>퍼포먼스</small><strong>{performanceScore === null ? "—" : performanceScore}<em>{performanceScore === null ? "" : "/100"}</em></strong><span>경기력 및 움직임 상태</span></div>
              <div className="first-summary-green"><small>회복</small><strong>{recoveryScore === null ? "—" : recoveryScore}<em>{recoveryScore === null ? "" : "/100"}</em></strong><span>훈련 이후 회복 상태</span></div>
              <div className="first-summary-orange"><small>피로도</small><strong>{fatigueScore === null ? "—" : fatigueScore}<em>{fatigueScore === null ? "" : "/100"}</em></strong><span>최근 피로 누적 수준</span></div>
              <div className="first-summary-purple"><small>재활 관리</small><strong>기간 기록</strong><span>선택 기간 재활 상태 확인</span></div>
            </div>
            <div className="print-first-status">
              <span>종합 상태</span>
              <strong>{overallStatus}</strong>
              <small>퍼포먼스·회복·피로·재활 데이터를 종합한 현재 관리 상태</small>
            </div>
          </section>
          <PrintResultFooter page="1" showLogo={true}/>
        </div>

        <div className="print-result-page print-result-page-2">
          <div className="print-page2-top-grid">
            <section className="print-result-card print-score-card">
              <div className="print-result-card-head"><h2>점수 계산 및 추이</h2><span>현재 기준</span></div>
              <div className="print-score-list">
                {scores.map(score=><div className="print-score-row" key={score.name}>
                  <div><strong>{score.name}</strong><small>{score.basis}</small></div>
                  <b>{score.value}<em>/100</em></b>
                  <div className="print-score-bar"><i style={{width:`${score.value ?? 0}%`}}/></div>
                </div>)}
              </div>
            </section>
            <section className="print-result-card print-interpretation-card print-page2-interpretation">
              <div className="print-result-card-head"><h2>점수 해석</h2><span>현재 기준</span></div>
              <div className="print-interpretation">
                <p className="good"><b>80–100</b><strong>정상 · 최적의 상태</strong><span>현재 컨디션과 수행 수준이 안정적입니다.</span></p>
                <p className="watch"><b>50–79</b><strong>주의 · 컨디션 관리 필요</strong><span>훈련 강도와 회복을 조절합니다.</span></p>
                <p className="high"><b>0–49</b><strong>높은 피로 · 회복 우선</strong><span>회복을 우선하고 훈련 강도를 낮춥니다.</span></p>
              </div>
            </section>
          </div>

          <section className={`print-result-card print-camera-seven ${cameraDensityClass}`}>
            <div className="print-result-card-head">
              <div><h2>{cameraCount > 0 ? `${cameraCount}종 Camera AI 분석 결과` : "Camera AI 분석 결과"}</h2><p>{cameraCount > 0 ? `선택된 ${cameraCount}개 분석 결과를 분석 개수에 맞춰 구성합니다.` : "Camera AI 분석을 완료하면 결과가 이 영역에 자동 반영됩니다."}</p></div>
              <span>{cameraCount}개 분석</span>
            </div>
            {cameraCount <= 3 ? (
              <div className="print-camera-detail-grid">
                {cameraAIResults.map((result, index) => (
                  <article className="print-camera-detail-card" key={result.id}>
                    <div className="print-camera-detail-head"><div><b>{index + 1}</b><strong>{result.title}</strong><small>{result.category}</small></div><em className={result.status === "양호" ? "camera-seven-good" : "camera-seven-watch"}>{result.score}/100 · {result.status}</em></div>
                    <p>{result.summary}</p>
                    <div className="print-camera-detail-metrics">{result.metrics.map(metric => <span key={metric.label}><small>{metric.label}</small><b>{metric.value}</b></span>)}</div>
                    <div className="print-camera-detail-recommendation"><strong>보완 포인트</strong><span>{result.recommendation}</span></div>
                  </article>
                ))}
                {cameraCount === 0 && <div className="print-camera-empty">Camera AI 분석을 선택하고 완료하면 이 영역이 실제 분석 결과로 채워집니다.</div>}
              </div>
            ) : (
              <div className="print-camera-seven-table">
                <div className="camera-seven-row camera-seven-head"><span>분석 항목</span><span>점수</span><span>상태</span><span>주요 결과 요약</span><span>보완 포인트</span></div>
                {cameraAIResults.map((result, index) => (
                  <div className="camera-seven-row" key={result.id}>
                    <span><b>{index + 1}</b>{result.title}<small>{result.category}</small></span><strong>{result.score}<em>/100</em></strong><b className={result.status === "양호" ? "camera-seven-good" : "camera-seven-watch"}>{result.status}</b><span>{result.summary}</span><span>{result.recommendation}</span>
                  </div>
                ))}
              </div>
            )}
            {cameraCount > 0 && <div className="print-camera-seven-summary"><strong>Camera AI 종합 소견</strong><span>{cameraDetailedOpinion}</span></div>}
          </section>
          <PrintResultFooter page="2" showLogo={true}/>
        </div>

        <div className={`print-result-page print-result-page-3 ${cameraDensityClass}`}>
          <div className="print-page3-motion-grid">
            <section className="print-result-card print-motion-analysis">
              <div className="print-result-card-head"><div><h2>동작분석 종합</h2><p>Camera AI 7종 분석 결과를 기반으로 한 주요 움직임 지표</p></div><span>{endDate} 기준</span></div>
              <div className="motion-analysis-layout">
                <div className="motion-radar">
                  <div className="motion-radar-ring ring-1"></div>
                  <div className="motion-radar-ring ring-2"></div>
                  <div className="motion-radar-ring ring-3"></div>
                  <div className="motion-radar-ring ring-4"></div>
                  <div className="motion-radar-axis axis-v"></div>
                  <div className="motion-radar-axis axis-h"></div>
                  <div className="motion-radar-axis axis-d1"></div>
                  <div className="motion-radar-axis axis-d2"></div>
                  <svg viewBox="0 0 200 200" aria-label="동작분석 레이더">
                    <polygon points={radarPoints || "100,100 100,100 100,100 100,100 100,100"} fill="#2d6cdf" fillOpacity=".16" stroke="#2d6cdf" strokeWidth="2"/>
                   {radarPoints.split(" ").map((point, index) => {
                     const [cx, cy] = point.split(",");
                     return <circle key={index} cx={cx} cy={cy} r="3" fill="#2d6cdf"/>;
                   })}
                  </svg>
                  <span className="radar-label radar-top">지지력</span>
                  <span className="radar-label radar-right-top">유연성</span>
                  <span className="radar-label radar-right-bottom">균형</span>
                  <span className="radar-label radar-left-bottom">순간력</span>
                  <span className="radar-label radar-left-top">안정성</span>
                </div>
                <div className="motion-analysis-text">
                  <div><b>분석 결과 요약</b><p>{cameraDetailedOpinion}</p></div>
                  <div className="motion-analysis-points">
                    <span><i></i>선택 분석 <b>{cameraCount}종</b></span>
                    <span><i></i>양호 항목 <b>{cameraGood.length}개</b></span>
                    <span><i></i>관리 항목 <b>{cameraNeedsAttention.length}개</b></span>
                    <span><i></i>최고 점수 <b>{cameraStrongest ? `${cameraStrongest.score}점` : "-"}</b></span>
                    <span><i></i>보완 우선 <b>{cameraWeakest ? cameraWeakest.title : "-"}</b></span>
                  </div>
                </div>
              </div>
            </section>
            <section className="print-result-card print-motion-summary">
              <div className="print-result-card-head"><h2>분석 결과 요약</h2></div>
              <p><strong>{profile.name} 선수의 동작분석 결과</strong></p>
              <p>{cameraDetailedOpinion}</p>
              {cameraRecommendationText && <p><strong>우선 보완 포인트</strong> {cameraRecommendationText}</p>}
              <div className="motion-summary-badge"><b>종합 상태</b><strong>양호한 수준</strong></div>
            </section>
          </div>

          {cameraCount > 0 && cameraCount <= 3 && (
            <section className="print-result-card print-selected-ai-detail">
              <div className="print-result-card-head"><div><h2>선택 분석 상세</h2><p>선택된 Camera AI 분석을 리포트 앞뒤 콘텐츠에 맞춰 상세 표시합니다.</p></div><span>{cameraCount}개 항목</span></div>
              <div className="print-selected-ai-detail-grid">
                {cameraAIResults.map((result) => <div key={result.id}><strong>{result.title}</strong><p>{result.summary}</p><span>{result.recommendation}</span></div>)}
              </div>
            </section>
          )}

          <section className="print-result-card print-fatigue-full">
            <div className="print-result-card-head"><div><h2>피로도 계산 추이</h2><p>선택 기간 피로도 변화</p></div><span>{reportPeriod}</span></div>
            <div className="print-fatigue-chart">{[72,68,65,70,61,58,63].map((value,index)=><div className="print-fatigue-bar" key={index}><b>{value}</b><i style={{height:`${value}%`}}/><small>D-{6-index}<br/>{formatGrowthDate(growthTrend[Math.min(index,growthTrend.length-1)]?.date || startDate)}</small></div>)}</div>
          </section>

          <section className="print-result-card print-conclusion">
            <div className="print-result-card-head"><div><h2>종합 소견</h2><p>{profile.name} 선수의 선택 기간 분석 결과를 종합한 스포츠 컨디션 소견</p></div><span>{reportPeriod}</span></div>
            <p>{overallOpinion}</p>
            <p>{cameraCount > 0 ? `선택된 Camera AI ${cameraCount}종의 결과를 함께 고려하여, 분석에서 관리 또는 주의로 표시된 항목은 반복 측정과 훈련 과정에서 지속적으로 확인하는 것이 좋습니다.` : "Camera AI 분석 결과가 없는 경우에는 현재의 신체·컨디션 지표를 기준으로 판단하며, 이후 분석 결과가 추가되면 종합 소견도 함께 업데이트됩니다."}</p>
            <div className="print-recommendation"><strong>보완 권장 사항</strong><span>하체 정렬 및 무릎 안정성 강화 · 코어/체간 안정성 훈련 · 훈련 후 회복 루틴 강화 · 피로도 변화에 따른 훈련 강도 조절 · 선택된 Camera AI 항목의 반복 측정으로 변화 추이 확인</span></div>
          </section>

          <section className="print-result-card print-medical-result">
            <div className="print-result-card-head"><h2>의료 고지</h2></div>
            <p>본 리포트의 모든 정보와 분석 결과는 스포츠 퍼포먼스 및 선수 관리 지원을 위한 참고 자료이며, 의료진단, 의학적 진찰, 치료 또는 의학적 판단을 대체하지 않습니다.</p>
            <p>리포트의 내용을 의료적 진단이나 치료를 위한 근거로 사용해서는 안 됩니다. 진료 및 검사가 필요하다고 판단되는 경우 전문 의료기관을 방문하여 적절한 검사와 전문 의료진의 진찰 및 상담을 받으시기 바랍니다.</p>
          </section>
          <PrintResultFooter page="3" showLogo={true}/>
        </div>
      </section>
</main>
  );
}
