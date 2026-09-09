"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../../../lib/nova-auth";
import { readNovaAthleteData, type NovaAthleteData, type NovaCameraAIResult } from "../../../lib/nova-data";

declare global {
  interface Window {
    Kakao?: {
      isInitialized?: () => boolean;
      init?: (key: string) => void;
      Share?: { sendDefault: (options: Record<string, unknown>) => void };
    };
  }
}

function latestScore(records: Array<{ score: number }>) {
  return records.length ? records[records.length - 1].score : null;
}

export default function MobileReport() {
  const [data, setData] = useState<NovaAthleteData | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role === "athlete") setData(readNovaAthleteData());

    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key || window.Kakao) return;
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.async = true;
    script.onload = () => {
      if (window.Kakao?.init && !window.Kakao.isInitialized?.()) window.Kakao.init(key);
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  const cameraResults = useMemo(
    () => data?.cameraAIResults ? [...data.cameraAIResults].sort((a,b) => b.completedAt.localeCompare(a.completedAt)) : [],
    [data],
  );
  const latestCamera: NovaCameraAIResult | null = cameraResults[0] ?? null;
  const performance = latestScore(data?.performanceRecords ?? []);
  const recovery = latestScore(data?.recoveryRecords ?? []);
  const fatigue = latestScore(data?.fatigueRecords ?? []);
  const body = data?.bodyRecords.at(-1);
  const reportDate = new Date().toLocaleDateString("ko-KR");

  const shareKakao = () => {
    setShareMessage("");
    const title = `${data?.athlete.name || "선수"} NOVA 스포츠 분석 리포트`;
    const description = [
      performance !== null ? `퍼포먼스 ${performance}/100` : "",
      recovery !== null ? `회복 ${recovery}/100` : "",
      fatigue !== null ? `피로도 ${fatigue}/100` : "",
      latestCamera ? `Camera AI ${latestCamera.title} ${latestCamera.score}/100` : "",
    ].filter(Boolean).join(" · ");

    if (window.Kakao?.Share && window.Kakao?.isInitialized?.()) {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: { title, description: description || "NOVA AI SPORTS PLATFORM 리포트", link: { mobileWebUrl: window.location.href, webUrl: window.location.href } },
        buttons: [{ title: "리포트 보기", link: { mobileWebUrl: window.location.href, webUrl: window.location.href } }],
      });
      return;
    }

    if (navigator.share) {
      navigator.share({ title, text: description || "NOVA AI SPORTS PLATFORM 리포트", url: window.location.href }).catch(() => {});
      setShareMessage("카카오 SDK가 연결되지 않아 기기 공유 화면을 열었습니다.");
      return;
    }
    setShareMessage("카카오톡 공유를 사용하려면 Kakao JavaScript 키를 연결해야 합니다.");
  };

  return <div className="mobile-page">
    <header className="mobile-subheader">
      <div className="mobile-desktop-header">
        <div className="mobile-desktop-header-left"><Link href="/mobile" aria-label="뒤로">←</Link><div className="mobile-desktop-brand"><strong>N O V A</strong><span>AI SPORTS PERFORMANCE PLATFORM</span></div></div>
        <div className="mobile-ai-status"><i></i> AI 시스템 준비</div>
      </div>
      <div className="mobile-page-title"><h1>리포트</h1><p>퍼포먼스·회복·피로·재활·Camera AI 종합 결과</p></div>
    </header>

    {data ? <>
      <section className="mobile-report-card mobile-report-profile">
        <div><span>PLAYER</span><h2>{data.athlete.name || "선수"}</h2><p>{data.athlete.position || "포지션 미등록"} · {data.athlete.sport || "종목 미등록"}</p></div>
        <div className="mobile-report-meta">
          <span>키 <b>{body?.heightCm ?? data.athlete.heightCm ?? "-"} cm</b></span>
          <span>몸무게 <b>{body?.weightKg ?? data.athlete.weightKg ?? "-"} kg</b></span>
          <span>소속 <b>{data.athlete.affiliation || "미등록"}</b></span>
          <span>리포트 <b>{reportDate}</b></span>
        </div>
      </section>

      <section className="mobile-report-section">
        <div className="mobile-card-heading"><span>SUMMARY</span><strong>종합 분석</strong></div>
        <div className="mobile-report-score-grid">
          <ReportScore label="퍼포먼스" value={performance} />
          <ReportScore label="회복" value={recovery} />
          <ReportScore label="피로도" value={fatigue} />
          <ReportScore label="재활" value={data.rehabRecords.length} unit="건" />
        </div>
        <div className="mobile-report-conclusion">
          <strong>종합 소견</strong>
          <p>{data.athlete.name || "선수"} 선수의 현재 저장 데이터를 기준으로 퍼포먼스, 회복, 피로도와 재활 기록을 종합합니다. Camera AI 측정 결과가 있는 경우 최근 동작 분석 결과와 자세 세부 지표를 함께 반영합니다. 훈련부하와 부상위험은 실제 입력 데이터가 연결되기 전까지 임의의 점수를 생성하지 않습니다.</p>
        </div>
      </section>

      <section className="mobile-report-section mobile-report-expanded">
        <div className="mobile-card-heading"><span>PERFORMANCE REPORT</span><strong>데스크 리포트 확장 항목</strong></div>
        <ReportRow label="신체 / 체성분" value={`${body?.heightCm ?? data.athlete.heightCm ?? "-"} cm · ${body?.weightKg ?? data.athlete.weightKg ?? "-"} kg`} />
        <ReportRow label="퍼포먼스" value={performance !== null ? `${performance}/100` : "데이터 없음"} />
        <ReportRow label="회복" value={recovery !== null ? `${recovery}/100` : "데이터 없음"} />
        <ReportRow label="피로도" value={fatigue !== null ? `${fatigue}/100` : "데이터 없음"} />
        <ReportRow label="훈련부하" value="GPS 세션 데이터 연결 후 산출" />
        <ReportRow label="부상위험" value="실제 부상위험 입력 데이터 연결 후 산출" />
        <ReportRow label="재활관리" value={`${data.rehabRecords.length}건`} />
        <ReportRow label="동작분석" value={latestCamera ? `${latestCamera.score}/100` : "데이터 없음"} />
      </section>

      <section className="mobile-report-section">
        <div className="mobile-card-heading"><span>ANALYSIS</span><strong>점수 계산 및 추이</strong></div>
        <ReportRow label="Performance Score" value={performance !== null ? `${performance}/100` : "기록 없음"} />
        <ReportRow label="Recovery Score" value={recovery !== null ? `${recovery}/100` : "기록 없음"} />
        <ReportRow label="Fatigue Score" value={fatigue !== null ? `${fatigue}/100` : "기록 없음"} />
        <ReportRow label="재활 관리" value={`${data.rehabRecords.length}건`} />
        <ReportRow label="Camera AI 측정" value={`${data.cameraAIResults.length}건`} />
      </section>

      <section className="mobile-report-section">
        <div className="mobile-card-heading"><span>CAMERA AI</span><strong>동작분석 결과</strong></div>
        {cameraResults.length ? cameraResults.slice(0,5).map((r) => <article className="mobile-camera-report" key={r.id}>
          <div className="mobile-camera-report-head"><div><span>{r.category}</span><strong>{r.title}</strong></div><b>{r.score}/100</b></div>
          <p>{r.summary}</p><div className="mobile-camera-posture-note"><strong>자세분석</strong><span>{r.metrics.filter(m => /무릎|고관절|팔꿈치|밸런스|자세|인식/.test(m.label)).map(m => `${m.label}: ${m.value}`).join(" · ") || "저장된 자세 세부 지표가 없습니다."}</span></div>
          <div className="mobile-report-metric-grid">{r.metrics.map(m => <div key={`${r.id}-${m.label}`}><span>{m.label}</span><strong>{m.value}</strong></div>)}</div>
          <small>{new Date(r.completedAt).toLocaleString("ko-KR")}</small>
        </article>) : <div className="mobile-empty-card">저장된 Camera AI 측정 결과가 없습니다.</div>}
      </section>

      <section className="mobile-report-section">
        <div className="mobile-card-heading"><span>REHABILITATION</span><strong>재활 관리</strong></div>
        {data.rehabRecords.length ? [...data.rehabRecords].reverse().slice(0,5).map((r,i)=><ReportRow key={`${r.date}-${i}`} label={`${r.date} · ${r.area}`} value={`${r.exercise} · ${r.completed ? "완료" : "진행"}`} />) : <div className="mobile-empty-card">재활 기록이 없습니다.</div>}
      </section>

      <section className="mobile-report-section mobile-medical-notice">
        <div className="mobile-card-heading"><span>NOTICE</span><strong>의료 고지</strong></div>
        <p>본 리포트의 정보와 분석 결과는 스포츠 퍼포먼스 및 선수 관리 지원을 위한 참고 자료이며, 의료진단·치료 또는 의학적 판단을 대체하지 않습니다.</p>
      </section>

      <div className="mobile-report-actions">
        <button className="mobile-action-button" type="button" onClick={shareKakao}>카카오톡 공유</button>
        {shareMessage && <p role="status">{shareMessage}</p>}
      </div>
    </> : <div className="mobile-empty-card">선수 데이터를 찾을 수 없습니다.</div>}
    <MobileNav />
  </div>;
}

function ReportScore({ label, value, unit="/100" }: { label:string; value:number|null; unit?:string }) {
  return <div className="mobile-report-score"><span>{label}</span><strong>{value ?? "-"}</strong><small>{unit}</small></div>;
}
function ReportRow({ label, value }: { label:string; value:string }) { return <div className="mobile-report-row"><span>{label}</span><b>{value}</b></div>; }
function MobileNav() { return <nav className="mobile-bottom-nav"><Link href="/mobile">홈</Link><Link href="/mobile/analysis">분석</Link><Link href="/mobile/training">훈련</Link><Link href="/mobile/rehab">재활</Link><Link className="active" href="/mobile/report">리포트</Link></nav>; }
