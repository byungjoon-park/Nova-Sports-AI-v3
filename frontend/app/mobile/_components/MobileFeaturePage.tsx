/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/immutability */
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { getCurrentUser, type NovaUserRole } from "../../../lib/nova-auth";
import { readNovaAthleteData, writeNovaAthleteData, type NovaAthleteData } from "../../../lib/nova-data";
import { useNovaSettings } from "../../settings-context";

export type MobileSection =
  | "dashboard" | "camera-ai" | "players" | "analysis" | "growth-analysis" | "measurements"
  | "medical" | "report" | "team" | "player-profile" | "gps-test";

type SectionConfig = { title: string; subtitle: string; roles?: NovaUserRole[] };

const CONFIG: Record<MobileSection, SectionConfig> = {
  dashboard: { title: "대시보드", subtitle: "퍼포먼스·회복·훈련 현황" },
  "camera-ai": { title: "카메라 AI", subtitle: "동작 촬영과 AI 분석" },
  players: { title: "선수 관리", subtitle: "선수 프로필과 선수 목록", roles: ["admin", "director", "coach"] },
  analysis: { title: "AI 분석", subtitle: "퍼포먼스·회복·피로도 분석" },
  "growth-analysis": { title: "성장·체력", subtitle: "신체와 체력 측정" },
  measurements: { title: "측정 기록", subtitle: "측정값과 변화 이력" },
  medical: { title: "의료·재활", subtitle: "부상·진료·재활 기록" },
  report: { title: "리포트", subtitle: "선수 데이터 요약과 보고서" },
  team: { title: "팀 관리", subtitle: "팀·선수 구성과 운영", roles: ["admin", "director", "coach"] },
  "player-profile": { title: "선수 프로필", subtitle: "내 선수 정보" },
  "gps-test": { title: "GPS", subtitle: "GPS 데이터와 활동 분석" },
};

const roleLabel = (role: NovaUserRole) =>
  role === "director" ? "감독" : role === "coach" ? "코치" : role === "athlete" ? "선수" : role === "parent" ? "학부모" : "관리자";

const MOBILE_SPEED_AGILITY_TESTS = {
  sprint: [
    { id: "sprint-5m", label: "5m Sprint", distance: "5m", split: false },
    { id: "sprint-10m", label: "10m Sprint", distance: "10m", split: false },
    { id: "sprint-10-5", label: "10m + 5m Split", distance: "15m", split: true },
    { id: "sprint-20m", label: "20m Sprint", distance: "20m", split: false },
    { id: "sprint-20-10", label: "20m + 10m Split", distance: "30m", split: true },
    { id: "sprint-splits", label: "전체 Split 기록", distance: "전체", split: true },
  ],
  agility: [
    { id: "agility-505", label: "5-0-5 Agility", distance: "5-0-5", split: false },
    { id: "agility-5105", label: "5-10-5 Pro Agility", distance: "5-10-5", split: false },
  ],
} as const;

const DEFAULT_JOINTS: Record<string, string[]> = {
    sprint: ["shoulders","hips","knees","ankles","feet"],
    running: ["head","shoulders","hips","knees","ankles","feet"],
    jump: ["head","shoulders","hips","knees","ankles","feet"],
    shooting: ["head","shoulders","elbows","wrists","hips","knees","ankles"],
    "change-direction": ["head","shoulders","hips","knees","ankles","feet"],
    athletics: ["head","shoulders","hips","knees","ankles","feet"],
    squat: ["head","shoulders","hips","knees","ankles","feet"],
  };

function last<T>(items: T[]) { return items.length ? items[items.length - 1] : null; }

export default function MobileFeaturePage({ section }: { section: MobileSection }) {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [data, setData] = useState<NovaAthleteData | null>(null);
  const [gpsConnected, setGpsConnected] = useState(false);
  const [gpsMetrics, setGpsMetrics] = useState({ distance: "-- km", highSpeed: "-- km", maxSpeed: "-- km/h", sprints: "--" });

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/mobile/login"); return; }
    setUser(current);
    setData(readNovaAthleteData());
  }, [router]);

  useEffect(() => {
    const connect = () => {
      setGpsConnected(true);
      setGpsMetrics({ distance: "0.00 km", highSpeed: "0.00 km", maxSpeed: "0.0 km/h", sprints: "0" });
    };
    window.addEventListener("nova:gps-connect", connect);
    return () => window.removeEventListener("nova:gps-connect", connect);
  }, []);


  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";
  const config = CONFIG[section];
  const forbidden = Boolean(config.roles && user && !config.roles.includes(user.role));
  const latest = useMemo(() => ({
    body: data ? last(data.bodyRecords) : null,
    performance: data ? last(data.performanceRecords) : null,
    recovery: data ? last(data.recoveryRecords) : null,
    fatigue: data ? last(data.fatigueRecords) : null,
    rehab: data ? [...data.rehabRecords].reverse().slice(0, 5) : [],
  }), [data]);

  if (!user) return <main className={`mobile-page theme-${activeTheme}`}><div className="mobile-loading">로그인 확인 중...</div></main>;
  if (forbidden) return <MobileShell title="접근 제한" subtitle="현재 계정에서 사용할 수 없는 기능입니다." active="dashboard"><div className="mobile-empty-card">{roleLabel(user.role)} 계정에는 이 메뉴의 권한이 없습니다.</div></MobileShell>;

  return (
    <MobileShell title={config.title} subtitle={config.subtitle} active={section === "dashboard" ? "dashboard" : section}>
      {section === "dashboard" && (
        <>
          <StatusCard user={user} />
          <MetricGrid latest={latest} />
          <SectionCard eyebrow="AI INSIGHT" title="오늘의 상태">
            <p>{latest.fatigue ? `최근 피로도 ${latest.fatigue.score}/100 기록이 있습니다.` : "측정 기록이 없습니다."}</p>
            <Link href="/mobile/analysis">분석 상세 보기 ›</Link>
          </SectionCard>
          <TwoColumnCards>
            <SectionCard eyebrow="PERFORMANCE" title="최근 추이"><p>{data?.performanceRecords.length ? `${data.performanceRecords.length}건의 퍼포먼스 기록` : "퍼포먼스 측정 기록이 없습니다."}</p><Link href="/mobile/training">훈련 기록 ›</Link></SectionCard>
            <SectionCard eyebrow="HEALTH" title="의료·재활"><p>{data?.rehabRecords.length ? `최근 재활 기록 ${data.rehabRecords.length}건` : "재활 기록이 없습니다."}</p><Link href="/mobile/rehab">재활 보기 ›</Link></SectionCard>
          </TwoColumnCards>
        </>
      )}

      {section === "camera-ai" && (
        <MobileCameraPanel />
      )}

      {section === "players" && (
        <TwoColumnCards>
          <SectionCard eyebrow="TEAM" title="선수 목록"><p>담당 선수의 프로필과 기록을 모바일 카드로 확인합니다.</p><Link href="/mobile/players">선수 관리 ›</Link></SectionCard>
          <SectionCard eyebrow="PROFILE" title="선수 프로필"><p>선수 상세 정보와 최근 상태를 확인합니다.</p><Link href="/mobile/player-profile">프로필 보기 ›</Link></SectionCard>
        </TwoColumnCards>
      )}

      {section === "analysis" && (
        <>
          <MetricGrid latest={latest} />
          <SectionCard eyebrow="AI ANALYSIS" title="분석 요약">
            <div className="mobile-analysis-list">
              <Row label="퍼포먼스" value={latest.performance ? `${latest.performance.score}/100` : "기록 없음"} />
              <Row label="회복" value={latest.recovery ? `${latest.recovery.score}/100` : "기록 없음"} />
              <Row label="피로도" value={latest.fatigue ? `${latest.fatigue.score}/100` : "기록 없음"} />
            </div>
          </SectionCard>
        </>
      )}

      {section === "growth-analysis" && (
        <SectionCard eyebrow="BODY" title="성장·체력">
          <div className="mobile-analysis-list">
            <Row label="키" value={latest.body?.heightCm ? `${latest.body.heightCm} cm` : "기록 없음"} />
            <Row label="체중" value={latest.body?.weightKg ? `${latest.body.weightKg} kg` : "기록 없음"} />
            <Row label="체지방" value="기록 없음" />
          </div>
          <Link href="/mobile/measurements">측정 기록 보기 ›</Link>
        </SectionCard>
      )}

      {section === "measurements" && (
        <SectionCard eyebrow="MEASUREMENTS" title="측정 기록">
          <RecordSummary data={data} />
          <Link href="/mobile/growth-analysis">성장·체력 분석 ›</Link>
        </SectionCard>
      )}

      {section === "medical" && (
        <>
          <SectionCard eyebrow="HEALTH" title="의료·재활 상태">
            <p>{data?.rehabRecords.length ? `저장된 재활 기록 ${data.rehabRecords.length}건` : "저장된 재활 기록이 없습니다."}</p>
            <Link href="/mobile/rehab">재활 기록 보기 ›</Link>
          </SectionCard>
          <RecordList title="최근 재활 기록" records={latest.rehab.map(r => ({ title: `${r.date} · ${r.area}`, text: `${r.exercise}${r.note ? ` · ${r.note}` : ""}`, status: r.completed ? "완료" : "진행" }))} />
        </>
      )}

      {section === "report" && (
        <SectionCard eyebrow="REPORT" title="선수 리포트">
          <div className="mobile-analysis-list">
            <Row label="퍼포먼스" value={`${data?.performanceRecords.length ?? 0}건`} />
            <Row label="회복" value={`${data?.recoveryRecords.length ?? 0}건`} />
            <Row label="피로도" value={`${data?.fatigueRecords.length ?? 0}건`} />
            <Row label="재활" value={`${data?.rehabRecords.length ?? 0}건`} />
          </div>
          <button className="mobile-action-button" type="button" onClick={() => window.print()}>리포트 프린트</button>
        </SectionCard>
      )}

      {section === "team" && (
        <TwoColumnCards>
          <SectionCard eyebrow="TEAM" title="팀 운영"><p>팀 구성과 담당 선수를 관리합니다.</p><Link href="/mobile/players">선수 관리 ›</Link></SectionCard>
          <SectionCard eyebrow="TRAINING" title="훈련 현황"><p>선수의 훈련 기록과 분석 결과를 확인합니다.</p><Link href="/mobile/training">훈련 기록 ›</Link></SectionCard>
        </TwoColumnCards>
      )}

      {section === "player-profile" && (
        <SectionCard eyebrow="PROFILE" title={data?.athlete?.name || user.name}>
          <div className="mobile-analysis-list">
            <Row label="역할" value={roleLabel(user.role)} />
            <Row label="종목" value={data?.athlete?.sport || "미등록"} />
            <Row label="포지션" value={data?.athlete?.position || "미등록"} />
            <Row label="생년" value={data?.athlete?.birthDate || "미등록"} />
          </div>
        </SectionCard>
      )}

      {section === "gps-test" && (
        <TwoColumnCards>
          <SectionCard eyebrow="GPS" title="활동 데이터">
            <p>GPS 이동·활동 데이터를 카메라 동작 분석과 함께 확인합니다.</p>
            <div className="mobile-gps-actions">
              <button type="button" className="mobile-action-button" onClick={() => window.dispatchEvent(new CustomEvent("nova:gps-connect"))}>{gpsConnected ? "GPS 연결됨" : "GPS 연결"}</button>
              <Link href="/mobile/analysis">피로 분석 ›</Link>
            </div>
            <div className="mobile-gps-metrics">
              <Row label="총 이동거리" value={gpsMetrics.distance} />
              <Row label="고속주행 거리" value={gpsMetrics.highSpeed} />
              <Row label="최고 속도" value={gpsMetrics.maxSpeed} />
              <Row label="스프린트 횟수" value={gpsMetrics.sprints} />
            </div>
          </SectionCard>
          <SectionCard eyebrow="FATIGUE" title="피로 분석"><p>{latest.fatigue ? `최근 피로도 ${latest.fatigue.score}/100` : "피로도 측정 기록 없음"}</p><Link href="/mobile/analysis">분석 보기 ›</Link></SectionCard>
        </TwoColumnCards>
      )}
    </MobileShell>
  );
}

function MobileShell({ title, subtitle, active, children }: { title: string; subtitle: string; active: string; children: ReactNode }) {
  return <div className="mobile-page"><header className="mobile-subheader"><div className="mobile-desktop-header"><div className="mobile-desktop-header-left"><Link href="/mobile" aria-label="모바일 홈" onClick={active === "camera-ai" ? (event) => { event.preventDefault(); window.history.back(); } : undefined}>←</Link><div className="mobile-desktop-brand"><strong>N O V A</strong><span>AI SPORTS PERFORMANCE PLATFORM</span></div></div><div className="mobile-ai-status"><i></i> AI 시스템 준비</div></div><div className="mobile-page-title"><h1>{title}</h1><p>{subtitle}</p></div></header>{children}<nav className="mobile-bottom-nav"><Link className={active === "dashboard" ? "active" : ""} href="/mobile">홈</Link><Link className={active === "analysis" ? "active" : ""} href="/mobile/analysis">분석</Link><Link className={active === "training" ? "active" : ""} href="/mobile/training">훈련</Link><Link className={active === "rehab" ? "active" : ""} href="/mobile/rehab">재활</Link><Link className={active === "report" ? "active" : ""} href="/mobile/report">리포트</Link></nav></div>;
}


function MobileCameraPanel() {
  const JOINT_LABELS: Record<string, string> = {
    head: "머리", shoulders: "어깨", elbows: "팔꿈치", wrists: "손목",
    hips: "골반", knees: "무릎", ankles: "발목", feet: "발",
  };

  const CAPTURE_GUIDES: Record<string, { view:string; distance:string; action:string; tips:string[] }> = {
    sprint:{view:"측면 촬영",distance:"8~12m",action:"최대 가속으로 10~20m 질주",tips:["카메라를 허리 높이에 고정","머리부터 발끝까지 프레임에 유지","출발 전 2초 정지 후 질주"]},
    running:{view:"측면 또는 후면",distance:"6~10m",action:"자연스러운 속도로 10초 이상 달리기",tips:["전신이 프레임 중앙에 오도록 배치","발 착지가 가리지 않게 촬영","가능하면 3회 이상 반복"]},
    jump:{view:"정면 또는 측면",distance:"3~5m",action:"제자리 최대 수직 점프 3~5회",tips:["머리와 양발이 모두 보여야 함","착지 후 2초간 자세 유지","바닥과 카메라를 수평으로 맞춤"]},
    shooting:{view:"정면 + 측면 권장",distance:"4~7m",action:"준비→회전→임팩트→팔로스루를 3회 반복",tips:["상체와 팔이 프레임 밖으로 나가지 않게 촬영","공을 포함해 전체 동작을 확보","가능하면 주 사용 손/발 쪽 측면도 촬영"]},
    "change-direction":{view:"정면 또는 45도",distance:"6~10m",action:"좌우 방향 전환을 3~5회 반복",tips:["감속 구간과 전환 지점을 모두 프레임에 포함","발목까지 가리지 않도록 촬영","전환 전후 1초씩 여유를 둠"]},
    athletics:{view:"측면",distance:"10~15m",action:"측정 동작을 최대 강도로 2~3회 수행",tips:["측정 구간 전체가 화면에 들어오게 설정","카메라 높이는 허리~가슴 높이","각 반복 사이 충분히 정지"]},
    squat:{view:"정면 + 측면 권장",distance:"2~3m",action:"서기→하강→최저점 유지→상승을 3~5회 반복",tips:["머리부터 발끝까지 전신을 프레임에 포함","발 전체와 무릎이 가려지지 않게 촬영","가능하면 정면과 측면을 각각 촬영"]},
  };

  const chapters = [
    { id: "sprint", category: "달리기", title: "스프린트", description: "가속 구간과 보폭, 하지 움직임을 분석합니다.", metrics: ["가속도", "최고속도", "보폭", "보행 빈도"] },
    { id: "running", category: "달리기", title: "달리기 동작", description: "러닝 자세와 좌우 움직임, 하체 정렬을 분석합니다.", metrics: ["러닝 자세", "좌우 밸런스", "무릎 각도", "발 착지"] },
    { id: "jump", category: "점프", title: "점프", description: "점프와 착지 동작을 분석하고 반복 수행에 따른 피로도를 계산합니다.", metrics: ["점프 높이", "체공시간", "착지 안정성", "무릎 각도", "피로도"] },
    { id: "shooting", category: "종목 특화", title: "슈팅 동작", description: "슈팅 동작의 준비, 회전, 임팩트, 팔로스루를 분석합니다.", metrics: ["접근 속도", "골반 회전", "무릎 각도", "임팩트 자세", "팔로스루"] },
    { id: "change-direction", category: "민첩성", title: "방향 전환", description: "감속과 방향 전환 과정의 자세 및 좌우 균형을 분석합니다.", metrics: ["감속 능력", "전환 시간", "무릎 정렬", "몸통 기울기"] },
    { id: "athletics", category: "육상", title: "기본 육상 측정", description: "기본적인 스피드와 점프 측정 데이터를 기록합니다.", metrics: ["10m 기록", "20m 기록", "30m 기록", "수직점프", "반복점프"] },
    { id: "squat", category: "근력", title: "스쿼트 자세평가", description: "스쿼트의 하강, 최저점, 상승 구간과 전신 관절 정렬을 분석합니다.", metrics: ["무릎 정렬", "고관절 깊이", "발목 가동성", "몸통 기울기", "좌우 균형"] },
  ] as const;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedJoints, setSelectedJoints] = useState<string[]>([]);


  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState({
    detected: false,
    confidence: 0,
    knee: "-",
    leftKnee: "-",
    rightKnee: "-",
    hip: "-",
    leftHip: "-",
    rightHip: "-",
    elbow: "-",
    leftElbow: "-",
    rightElbow: "-",
    balance: "-",
    posture: "측정 대기",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const speedTestStartRef = useRef<number | null>(null);
  const [selectedSpeedTestId, setSelectedSpeedTestId] = useState<string>(MOBILE_SPEED_AGILITY_TESTS.sprint[0].id);
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [speedTestElapsed, setSpeedTestElapsed] = useState(0);
  const [speedTestSplits, setSpeedTestSplits] = useState<number[]>([]);

  const selected = chapters.find(c => c.id === selectedId) ?? null;
  const speedAgilityGroup = selected?.id === "change-direction" ? "agility" : "sprint";
  const speedAgilityTests = MOBILE_SPEED_AGILITY_TESTS[speedAgilityGroup];
  const selectedSpeedTest = speedAgilityTests.find((test) => test.id === selectedSpeedTestId) ?? speedAgilityTests[0];

  useEffect(() => {
    window.history.replaceState({ ...(window.history.state || {}), novaMobileCamera: "list" }, "", window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.novaMobileCamera === "selected") {
        setSelectedId(event.state.selectedId || null);
        return;
      }

      if (event.state?.novaMobileCamera === "list" || !event.state?.novaMobileCamera) {
        stopCamera();
        setSelectedId(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // stopCamera is captured intentionally by this mount-only browser subscription.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCameraChapter = (id: string) => {
    window.history.pushState({ ...(window.history.state || {}), novaMobileCamera: "selected", selectedId: id }, "", window.location.href);
    setSelectedId(id);
  };
  useEffect(() => {
    if (selectedId) setSelectedJoints(DEFAULT_JOINTS[selectedId] ?? []);
  }, [selectedId]);
  useEffect(() => {
    if (!speedTestRunning) return;
    const id = window.setInterval(() => {
      if (speedTestStartRef.current !== null) setSpeedTestElapsed((Date.now() - speedTestStartRef.current) / 1000);
    }, 50);
    return () => window.clearInterval(id);
  }, [speedTestRunning]);

  useEffect(() => {
    const group = selectedId === "change-direction" ? "agility" : "sprint";
    setSelectedSpeedTestId(MOBILE_SPEED_AGILITY_TESTS[group][0].id);
    setSpeedTestRunning(false); setSpeedTestElapsed(0); setSpeedTestSplits([]);
  }, [selectedId]);


  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      if (startedAtRef.current) setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [recording]);

  const drawPreview = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = poseRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(drawPreview);
      return;
    }
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const pose: PoseLandmarkerResult = landmarker.detectForVideo(video, performance.now());
      ctx.clearRect(0, 0, w, h);
      const landmarks = pose.landmarks[0];
      if (landmarks?.length) {
        const xy = landmarks.map(p => [p.x * w, p.y * h] as const);
        const links = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28]];
        ctx.strokeStyle = "rgba(45,110,240,.9)";
        ctx.lineWidth = Math.max(2, w / 360);
        for (const [a,b] of links) {
          const pa=xy[a], pb=xy[b];
          if (!pa || !pb) continue;
          ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]); ctx.stroke();
        }
        ctx.fillStyle = "#fff";
        for (const idx of [0,11,12,13,14,15,16,23,24,25,26,27,28]) {
          const pt=xy[idx]; if (!pt) continue;
          ctx.beginPath(); ctx.arc(pt[0],pt[1],Math.max(3,w/180),0,Math.PI*2); ctx.fill();
        }

        const confidence = Math.round(Math.min(99, Math.max(0, (landmarks.reduce((s,p)=>s+p.visibility,0)/landmarks.length)*100)));
        const angle = (a:readonly [number,number],b:readonly [number,number],c:readonly [number,number]) => {
          const ab=[a[0]-b[0],a[1]-b[1]], cb=[c[0]-b[0],c[1]-b[1]];
          const dot=ab[0]*cb[0]+ab[1]*cb[1];
          const den=Math.hypot(...ab)*Math.hypot(...cb);
          return den ? Math.round(Math.acos(Math.max(-1,Math.min(1,dot/den)))*180/Math.PI) : 0;
        };
        const lk=xy[25]&&xy[23]&&xy[27] ? angle(xy[23],xy[25],xy[27]) : 0;
        const rk=xy[26]&&xy[24]&&xy[28] ? angle(xy[24],xy[26],xy[28]) : 0;
        const lh=xy[11]&&xy[23]&&xy[25] ? angle(xy[11],xy[23],xy[25]) : 0;
        const rh=xy[12]&&xy[24]&&xy[26] ? angle(xy[12],xy[24],xy[26]) : 0;
        const le=xy[11]&&xy[13]&&xy[15] ? angle(xy[11],xy[13],xy[15]) : 0;
        const re=xy[12]&&xy[14]&&xy[16] ? angle(xy[12],xy[14],xy[16]) : 0;
        const knee = Math.round((lk+rk)/2);
        const hip = Math.round((lh+rh)/2);
        const elbow = Math.round((le+re)/2);
        const balance = Math.max(0, Math.round(100-Math.abs(lk-rk)*2));

        const drawAngle = (pt: readonly [number, number] | undefined, value: number) => {
          if (!pt || !value) return;
          ctx.font = `600 ${Math.max(11, w / 75)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = `${value}°`;
          const tw = ctx.measureText(label).width + 10;
          const th = Math.max(18, w / 48);
          ctx.fillStyle = "rgba(0,0,0,.72)";
          ctx.fillRect(pt[0] - tw / 2, pt[1] - th - 8, tw, th);
          ctx.fillStyle = "#fff";
          ctx.fillText(label, pt[0], pt[1] - th / 2 - 8);
        };

        // Show the measured joint angles directly over the live camera skeleton.
        drawAngle(xy[25], lk);
        drawAngle(xy[26], rk);

        setResult({
          detected:true,
          confidence,
          knee:`${knee}°`,
          leftKnee:`${lk}°`,
          rightKnee:`${rk}°`,
          hip:`${hip}°`,
          leftHip:`${lh}°`,
          rightHip:`${rh}°`,
          elbow:`${elbow}°`,
          leftElbow:`${le}°`,
          rightElbow:`${re}°`,
          balance:`${balance}%`,
          posture: confidence >= 70 ? "정상 범위" : "인식 확인"
        });
      } else {
        ctx.clearRect(0,0,w,h);
        setResult(r => ({...r, detected:false, posture:"전신 인식 대기"}));
      }
    } catch (e) {
      console.error(e);
    }
    animationRef.current = requestAnimationFrame(drawPreview);
  };

  const saveSpeedTestResult = (elapsed: number, splits: number[]) => {
    const user = getCurrentUser();
    if (user?.role !== "athlete") return;
    const current = readNovaAthleteData();
    const postureScore = Math.max(0, Math.min(100, result.confidence));
    const splitText = splits.map((value, index) => `${index + 1}구간 ${value.toFixed(2)}s`).join(" · ");
    const cameraResult = {
      id: `camera-${selectedSpeedTest.id}-${Date.now()}`,
      title: selectedSpeedTest.label,
      category: speedAgilityGroup === "agility" ? "AGILITY" : "SPRINT",
      score: postureScore,
      status: postureScore >= 70 ? "양호" as const : "주의" as const,
      summary: `${selectedSpeedTest.label} 카메라 측정이 완료되었습니다. 자세 인식 신뢰도 ${postureScore}%.`,
      recommendation: "동일한 카메라 위치와 측정 구간을 유지해 반복 측정하세요.",
      metrics: [
        { label: "테스트", value: selectedSpeedTest.label },
        { label: "기록", value: `${elapsed.toFixed(2)} s` },
        ...(splits.length > 1 ? [{ label: "Split", value: splitText }] : []),
        { label: "자세 인식", value: `${postureScore}%` },
        { label: "무릎 좌우 차이", value: result.knee !== "-" ? `${result.knee}` : "--" },
        { label: "좌우 밸런스", value: result.balance },
      ],
      completedAt: new Date().toISOString(),
      source: "camera-ai" as const,
    };
    writeNovaAthleteData({ ...current, cameraAIResults: [...current.cameraAIResults, cameraResult] });
  };

  const startSpeedAgilityTest = () => {
    if (!cameraOn || !result.detected) { setError("카메라와 전신 인식이 준비된 후 측정을 시작해주세요."); return; }
    setError(""); setSpeedTestSplits([]); setSpeedTestElapsed(0); speedTestStartRef.current = Date.now(); setSpeedTestRunning(true);
  };

  const recordSpeedAgilitySplit = () => {
    if (!speedTestRunning || speedTestStartRef.current === null) return;
    setSpeedTestSplits(current => [...current, (Date.now() - speedTestStartRef.current!) / 1000]);
  };

  const finishSpeedAgilityTest = () => {
    if (!speedTestRunning || speedTestStartRef.current === null) return;
    const elapsed = (Date.now() - speedTestStartRef.current) / 1000;
    const splits = [...speedTestSplits, elapsed];
    speedTestStartRef.current = null; setSpeedTestElapsed(elapsed); setSpeedTestSplits(splits); setSpeedTestRunning(false); saveSpeedTestResult(elapsed, splits);
  };

  const startCamera = async () => {
    setError("");
    try {
      if (!selected) { setError("먼저 분석 항목을 선택하세요."); return; }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      setAiLoading(true);
      if (!poseRef.current) {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
        poseRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
      setAiLoading(false);
      setResult({
        detected:false, confidence:0, knee:"-", leftKnee:"-", rightKnee:"-",
        hip:"-", leftHip:"-", rightHip:"-", elbow:"-", leftElbow:"-", rightElbow:"-",
        balance:"-", posture:"분석 시작"
      });
      setSeconds(0);
      startedAtRef.current = Date.now();
      animationRef.current = requestAnimationFrame(drawPreview);
    } catch (e) {
      setAiLoading(false);
      const name = e instanceof DOMException ? e.name : "";
      setError(name === "NotAllowedError" ? "카메라와 마이크 권한을 허용해 주세요." : "카메라를 연결하지 못했습니다. 브라우저 권한과 장치를 확인해 주세요.");
    }
  };

  const stopCamera = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    if (recording) stopRecording();
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) { setError("먼저 카메라를 시작하세요."); return; }
    if (!("MediaRecorder" in window)) { setError("이 브라우저에서는 영상 저장을 지원하지 않습니다."); return; }
    chunksRef.current = [];
    const mime = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x => MediaRecorder.isTypeSupported(x));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-camera-${selectedId || "analysis"}-${new Date().toISOString().slice(0,19).replaceAll(":","-")}.webm`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    recorderRef.current = recorder;
    recorder.start(250);
    startedAtRef.current = Date.now();
    setSeconds(0);
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
    const user = getCurrentUser();
    if (user?.role === "athlete" && selected && result.detected && selected.id !== "sprint" && selected.id !== "change-direction") {
      const current = readNovaAthleteData();
      const cameraResult = {
        id: `camera-${selected.id}-${Date.now()}`,
        title: selected.title, category: selected.category, score: Math.max(0, Math.min(100, result.confidence)),
        status: result.confidence >= 70 ? "양호" as const : "주의" as const,
        summary: `${selected.title} 분석이 완료되었습니다.`, recommendation: "동일한 촬영 조건으로 반복 측정하여 변화 추이를 확인하세요.",
        metrics: [{ label: "평균 무릎 각도", value: result.knee }, { label: "평균 고관절", value: result.hip }, { label: "평균 팔꿈치", value: result.elbow }, { label: "좌우 밸런스", value: result.balance }, { label: "신체 인식", value: `${result.confidence}%` }],
        completedAt: new Date().toISOString(), source: "camera-ai" as const,
      };
      writeNovaAthleteData({ ...current, cameraAIResults: [...current.cameraAIResults, cameraResult] });
    }
  };

  if (!selected) {
    return (
      <div className="mobile-camera-stack">
        <section className="mobile-camera-intro mobile-content-card">
          <div className="mobile-card-heading"><span>CAMERA AI 분석</span><strong>동작분석</strong></div>
          <p className="mobile-note">데스크톱 CAMERA AI와 동일한 7개 분석 항목을 모바일 카드 구조로 제공합니다.</p>
        </section>
        <div className="mobile-camera-chapter-grid">
          {chapters.map((c, i) => (
            <button key={c.id} className="mobile-camera-chapter" type="button" onClick={() => selectCameraChapter(c.id)}>
              <span className="chapter-number">{String(i+1).padStart(2,"0")}</span>
              <span className="chapter-category">{c.category}</span>
              <strong>{c.title}</strong>
              <small>{c.description}</small>
              <span className="chapter-metrics">{c.metrics.map(m => <i key={m}>{m}</i>)}</span>
              <b>›</b>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-camera-stack">
      <section className="mobile-content-card mobile-camera-setup">
        <div className="mobile-camera-setup-grid">
          <div>
            <div className="mobile-card-heading"><span>JOINT SETTINGS</span><strong>측정할 관절 선택</strong></div>
            <p className="mobile-note">선택한 관절만 카메라 화면의 자세선과 각도 측정에 사용합니다.</p>
            <div className="mobile-joint-actions">
              <button type="button" onClick={() => setSelectedJoints(Object.keys(JOINT_LABELS))}>전체 선택</button>
              <button type="button" onClick={() => setSelectedJoints([])}>전체 해제</button>
            </div>
            <div className="mobile-joint-selector">
              {Object.entries(JOINT_LABELS).map(([id,label]) => {
                const checked = selectedJoints.includes(id);
                return <label key={id} className={checked ? "selected" : ""}>
                  <input type="checkbox" checked={checked} onChange={() => setSelectedJoints(current => checked ? current.filter(v=>v!==id) : [...current,id])}/>
                  <span>{label}</span>
                </label>;
              })}
            </div>
          </div>
          <div className="mobile-capture-guide">
            <div className="mobile-card-heading"><span>CAPTURE GUIDE</span><strong>촬영 가이드</strong></div>
            <h3>{CAPTURE_GUIDES[selected.id]?.action}</h3>
            <div className="mobile-guide-summary">
              <div><span>권장 촬영 방향</span><strong>{CAPTURE_GUIDES[selected.id]?.view}</strong></div>
              <div><span>권장 거리</span><strong>{CAPTURE_GUIDES[selected.id]?.distance}</strong></div>
            </div>
            <ul>{CAPTURE_GUIDES[selected.id]?.tips.map(t => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
      </section>

      {(selected.id === "sprint" || selected.id === "change-direction") && (
        <section className="mobile-content-card mobile-speed-test-card">
          <div className="mobile-card-heading"><span>{speedAgilityGroup === "agility" ? "AGILITY TEST" : "SPRINT TEST"}</span><strong>스프린트 / 민첩성 측정</strong></div>
          <div className="mobile-speed-test-row">
            <select value={selectedSpeedTest.id} onChange={e => { setSelectedSpeedTestId(e.target.value); setSpeedTestRunning(false); setSpeedTestElapsed(0); setSpeedTestSplits([]); }} disabled={speedTestRunning}>{speedAgilityTests.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
            <strong>{speedTestElapsed.toFixed(2)}s</strong>
          </div>
          <p className="mobile-note">{selectedSpeedTest.distance} · 전신을 화면에 유지 · 자세분석 LIVE</p>
          <div className="mobile-camera-actions">
            {!speedTestRunning ? <button className="mobile-action-button" type="button" onClick={startSpeedAgilityTest}>측정 시작</button> : <button className="mobile-action-button" type="button" onClick={finishSpeedAgilityTest}>측정 종료</button>}
            {speedTestRunning && selectedSpeedTest.split && <button className="mobile-secondary-button" type="button" onClick={recordSpeedAgilitySplit}>구간 기록</button>}
          </div>
          <div className="mobile-speed-splits">{speedTestSplits.length ? speedTestSplits.map((v,i)=><span key={`${v}-${i}`}>{i+1}구간 <b>{v.toFixed(2)}s</b></span>) : <span>Split 테스트는 구간 기록 버튼으로 기록합니다.</span>}</div>
        </section>
      )}

      <section className="mobile-content-card mobile-camera-card">
        <div className="mobile-camera-selected-head">
          <button type="button" className="mobile-back-small" onClick={() => { stopCamera(); if (window.history.state?.novaMobileCamera === "selected") window.history.back(); else setSelectedId(null); }}>← 분석 목록</button>
          <span>{selected.category}</span>
          <strong>{selected.title}</strong>
          <p>{selected.description}</p>
        </div>
        <div className="mobile-camera-preview">
          <video ref={videoRef} playsInline muted autoPlay aria-label="카메라 영상" />
          <canvas ref={canvasRef} className="mobile-camera-overlay" aria-hidden="true" />
          {!cameraOn && <div className="mobile-camera-placeholder">카메라 준비 완료<br /><small>카메라 시작 후 실시간 분석이 표시됩니다.</small></div>}
          {cameraOn && <div className="mobile-camera-live">LIVE · {recording ? `REC ${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}` : "분석 중"}</div>}
          {(selected.id === "sprint" || selected.id === "change-direction") && cameraOn && <div className="mobile-speed-overlay"><b>{selectedSpeedTest.label}</b><span>{speedTestRunning ? `MEASURING ${speedTestElapsed.toFixed(2)}s` : `${selectedSpeedTest.distance} · 측정 준비`}</span><small>전신 자세분석 LIVE</small></div>}
        </div>
        {error && <p className="mobile-camera-error" role="alert">{error}</p>}
        <div className="mobile-camera-actions">
          {!cameraOn ? <button className="mobile-action-button" type="button" onClick={startCamera} disabled={aiLoading}>{aiLoading ? "AI 준비 중..." : "카메라 시작"}</button> : <button className="mobile-secondary-button" type="button" onClick={stopCamera}>카메라 중지</button>}
          {cameraOn && !recording && <button className="mobile-action-button" type="button" onClick={startRecording}>영상 녹화</button>}
          {recording && <button className="mobile-action-button" type="button" onClick={stopRecording}>녹화 종료 · 저장</button>}
        </div>
      </section>

      <section className="mobile-result-card">
        <div className="mobile-card-heading"><span>LIVE ANALYSIS</span><strong>분석 결과</strong></div>
        <div className="mobile-result-grid">
          <div><span>신체 인식</span><strong>{result.detected ? `${result.confidence}%` : "대기"}</strong></div>
          <div><span>평균 무릎 각도</span><strong>{result.knee}</strong></div>
          <div><span>왼쪽 무릎</span><strong>{result.leftKnee}</strong></div>
          <div><span>오른쪽 무릎</span><strong>{result.rightKnee}</strong></div>
          <div><span>평균 고관절</span><strong>{result.hip}</strong></div>
          <div><span>평균 팔꿈치</span><strong>{result.elbow}</strong></div>
          <div><span>좌우 밸런스</span><strong>{result.balance}</strong></div>
          <div><span>자세 상태</span><strong>{result.posture}</strong></div>
        </div>
        <div className="mobile-posture-detail">
          <div><span>자세분석</span><strong>{result.posture}</strong></div>
          <div><span>신체 인식</span><strong>{result.confidence}%</strong></div>
          <div><span>좌우 밸런스</span><strong>{result.balance}</strong></div>
          <p>카메라 하단에서 관절 각도, 전신 인식, 좌우 균형을 함께 확인합니다.</p>
        </div>

        <div className="mobile-selected-metrics">
          {selected.metrics.map(m => {
            const value =
              m.includes("무릎") || m.includes("착지") ? result.knee :
              m.includes("골반") || m.includes("고관절") ? result.hip :
              m.includes("팔") || m.includes("임팩트") || m.includes("팔로스루") ? result.elbow :
              m.includes("좌우") ? result.balance :
              cameraOn && result.detected ? "분석 중" : "대기";
            return <span key={m}>{m}<b>{value}</b></span>;
          })}
        </div>
      </section>

      <section className="mobile-content-card">
        <div className="mobile-card-heading"><span>GUIDE</span><strong>측정 데이터 대기</strong></div>
        <p className="mobile-note">전신 인식이 완료되면 관절 각도와 좌우 밸런스를 함께 해석해 현재 자세 특성과 보강 운동을 제안합니다.</p>
        <div className="mobile-guide-divider" />
        <strong>추천 보강 운동</strong>
        <div>
          <button type="button" disabled={!result.detected}>측정 후 자동 추천</button>
        </div>
      </section>
    </div>
  );
}

function StatusCard({ user }: { user: NonNullable<ReturnType<typeof getCurrentUser>> }) {
  return <section className="mobile-status-card"><div><span>현재 사용자</span><strong>{user.name}</strong></div><p>{roleLabel(user.role)} 계정으로 로그인되어 있습니다.</p></section>;
}
function MetricGrid({ latest }: { latest: { performance: any; recovery: any; fatigue: any } }) {
  return <div className="mobile-metric-grid"><Metric label="퍼포먼스" value={latest.performance?.score} /><Metric label="회복" value={latest.recovery?.score} /><Metric label="피로도" value={latest.fatigue?.score} /></div>;
}
function Metric({ label, value }: { label: string; value?: number }) { return <div className="mobile-metric-card"><span>{label}</span><strong>{value ?? "-"}</strong><small>/100</small></div>; }
function SectionCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="mobile-content-card"><div className="mobile-card-heading"><span>{eyebrow}</span><strong>{title}</strong></div>{children}</section>;
}
function TwoColumnCards({ children }: { children: ReactNode }) { return <div className="mobile-content-grid">{children}</div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="mobile-analysis-row"><span>{label}</span><strong>{value}</strong></div>; }
function RecordSummary({ data }: { data: NovaAthleteData | null }) {
  return <div className="mobile-analysis-list"><Row label="신체 측정" value={`${data?.bodyRecords.length ?? 0}건`} /><Row label="퍼포먼스" value={`${data?.performanceRecords.length ?? 0}건`} /><Row label="회복" value={`${data?.recoveryRecords.length ?? 0}건`} /><Row label="피로도" value={`${data?.fatigueRecords.length ?? 0}건`} /></div>;
}
function RecordList({ title, records }: { title: string; records: Array<{ title: string; text: string; status: string }> }) {
  return <section className="mobile-list"><h2 className="mobile-section-title">{title}</h2>{records.length ? records.map((r, i) => <article className="mobile-list-row" key={`${r.title}-${i}`}><div><strong>{r.title}</strong><span>{r.text}</span></div><b>{r.status}</b></article>) : <div className="mobile-empty-card">기록이 없습니다.</div>}</section>;
}
