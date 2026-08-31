/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/refs */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import {
  FilesetResolver,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import "./camera-ai.css";
import NovaTopBar from "../../components/NovaTopBar";
import { getCurrentUser } from "../../lib/nova-auth";
import { getJumpFatigueRecord, upsertJumpFatigueRecord, readNovaAthleteData, writeNovaAthleteData } from "../../lib/nova-data";

type Chapter = {
  id: string;
  category: string;
  title: string;
  description: string;
  metrics: string[];
  fatigue?: boolean;
};

type Language = "ko" | "en";
type JointId = "head" | "shoulders" | "elbows" | "wrists" | "hips" | "knees" | "ankles" | "feet";

const JOINT_LANDMARKS: Record<JointId, number[]> = {
  head: [0],
  shoulders: [11, 12],
  elbows: [13, 14],
  wrists: [15, 16],
  hips: [23, 24],
  knees: [25, 26],
  ankles: [27, 28],
  feet: [31, 32],
};

const JOINT_LABELS = {
  ko: { head: "머리", shoulders: "어깨", elbows: "팔꿈치", wrists: "손목", hips: "골반", knees: "무릎", ankles: "발목", feet: "발", },
  en: { head: "Head", shoulders: "Shoulders", elbows: "Elbows", wrists: "Wrists", hips: "Hips", knees: "Knees", ankles: "Ankles", feet: "Feet", },
} as const;

const DEFAULT_JOINTS: Record<string, JointId[]> = {
  sprint: ["shoulders", "hips", "knees", "ankles", "feet"],
  running: ["head", "shoulders", "hips", "knees", "ankles", "feet"],
  jump: ["head", "shoulders", "hips", "knees", "ankles", "feet"],
  shooting: ["head", "shoulders", "elbows", "wrists", "hips", "knees", "ankles"],
  "change-direction": ["head", "shoulders", "hips", "knees", "ankles", "feet"],
  athletics: ["head", "shoulders", "hips", "knees", "ankles", "feet"],
  squat: ["head", "shoulders", "hips", "knees", "ankles", "feet"],
};

const CHAPTER_COPY = {
  ko: {
    sprint: { category: "달리기", title: "스프린트", description: "가속 구간과 보폭, 하지 움직임을 분석합니다.", metrics: ["가속도", "최고속도", "보폭", "보행 빈도"] },
    running: { category: "달리기", title: "달리기 동작", description: "러닝 자세와 좌우 움직임, 하체 정렬을 분석합니다.", metrics: ["러닝 자세", "좌우 밸런스", "무릎 각도", "발 착지"] },
    jump: { category: "점프", title: "점프", description: "점프와 착지 동작을 분석하고 반복 수행에 따른 피로도를 계산합니다.", metrics: ["점프 높이", "체공시간", "착지 안정성", "무릎 각도", "피로도"] },
    shooting: { category: "종목 특화", title: "슈팅 동작", description: "슈팅 동작의 준비, 회전, 임팩트, 팔로스루를 분석합니다.", metrics: ["접근 속도", "골반 회전", "무릎 각도", "임팩트 자세", "팔로스루"] },
    "change-direction": { category: "민첩성", title: "방향 전환", description: "감속과 방향 전환 과정의 자세 및 좌우 균형을 분석합니다.", metrics: ["감속 능력", "전환 시간", "무릎 정렬", "몸통 기울기"] },
    athletics: { category: "육상", title: "기본 육상 측정", description: "기본적인 스피드와 점프 측정 데이터를 기록합니다.", metrics: ["10m 기록", "20m 기록", "30m 기록", "수직점프", "반복점프"] },
    squat: { category: "근력", title: "스쿼트 자세평가", description: "스쿼트 하강, 최저점, 상승 구간과 전신 정렬을 분석합니다.", metrics: ["무릎 정렬", "고관절 깊이", "발목 가동성", "몸통 기울기", "좌우 균형"] },
  },
  en: {
    sprint: { category: "RUNNING", title: "Sprint", description: "Analyzes acceleration, stride length, and lower-body movement.", metrics: ["Acceleration", "Top Speed", "Stride Length", "Cadence"] },
    running: { category: "RUNNING", title: "Running Motion", description: "Analyzes running posture, left-right balance, and lower-body alignment.", metrics: ["Running Posture", "L/R Balance", "Knee Angle", "Foot Strike"] },
    jump: { category: "JUMP", title: "Jump", description: "Analyzes take-off and landing mechanics and estimates fatigue across repetitions.", metrics: ["Jump Height", "Flight Time", "Landing Stability", "Knee Angle", "Fatigue"] },
    shooting: { category: "SPORT SPECIFIC", title: "Shooting Motion", description: "Analyzes setup, rotation, impact position, and follow-through.", metrics: ["Approach Speed", "Pelvic Rotation", "Knee Angle", "Impact Position", "Follow-through"] },
    "change-direction": { category: "AGILITY", title: "Change of Direction", description: "Analyzes deceleration, cutting mechanics, posture, and left-right balance.", metrics: ["Deceleration", "Change Time", "Knee Alignment", "Trunk Lean"] },
    athletics: { category: "ATHLETICS", title: "Basic Athletics Testing", description: "Records baseline speed and jump performance data.", metrics: ["10m Time", "20m Time", "30m Time", "Vertical Jump", "Repeated Jump"] },
    squat: { category: "STRENGTH", title: "Squat Form Assessment", description: "Analyzes squat descent, bottom position, ascent, and full-body alignment.", metrics: ["Knee Alignment", "Hip Depth", "Ankle Mobility", "Trunk Lean", "L/R Balance"] },
  },
} as const;

const CAPTURE_GUIDES = {
  ko: {
    sprint: { view: "측면 촬영", distance: "8~12m", action: "최대 가속으로 10~20m 질주", tips: ["카메라를 허리 높이에 고정", "머리부터 발끝까지 프레임에 유지", "출발 전 2초 정지 후 질주"] },
    running: { view: "측면 또는 후면", distance: "6~10m", action: "자연스러운 속도로 10초 이상 달리기", tips: ["전신이 프레임 중앙에 오도록 배치", "발 착지가 가리지 않게 촬영", "가능하면 3회 이상 반복"] },
    jump: { view: "정면 또는 측면", distance: "3~5m", action: "제자리 최대 수직 점프 3~5회", tips: ["머리와 양발이 모두 보여야 함", "착지 후 2초간 자세 유지", "바닥과 카메라를 수평으로 맞춤"] },
    shooting: { view: "정면 + 측면 권장", distance: "4~7m", action: "준비→회전→임팩트→팔로스루를 3회 반복", tips: ["상체와 팔이 프레임 밖으로 나가지 않게 촬영", "공을 포함해 전체 동작을 확보", "가능하면 주 사용 손/발 쪽 측면도 촬영"] },
    "change-direction": { view: "정면 또는 45도", distance: "6~10m", action: "좌우 방향 전환을 3~5회 반복", tips: ["감속 구간과 전환 지점을 모두 프레임에 포함", "발목까지 가리지 않도록 촬영", "전환 전후 1초씩 여유를 둠"] },
    athletics: { view: "측면", distance: "10~15m", action: "측정 동작을 최대 강도로 2~3회 수행", tips: ["측정 구간 전체가 화면에 들어오게 설정", "카메라 높이는 허리~가슴 높이", "각 반복 사이 충분히 정지"] },
    squat: { view: "정면 + 측면 권장", distance: "2~3m", action: "서기→하강→최저점 유지→상승을 3~5회 반복", tips: ["머리부터 발끝까지 전신을 프레임에 포함", "발 전체와 무릎이 가려지지 않게 촬영", "가능하면 정면과 측면을 각각 촬영"] },
  },
  en: {
    sprint: { view: "Side view", distance: "8–12 m", action: "Sprint 10–20 m at maximal acceleration", tips: ["Fix the camera around waist height", "Keep the full body inside the frame", "Stand still for 2 seconds before sprinting"] },
    running: { view: "Side or rear view", distance: "6–10 m", action: "Run naturally for at least 10 seconds", tips: ["Keep the full body centered", "Make sure foot strikes are visible", "Repeat at least 3 trials when possible"] },
    jump: { view: "Front or side view", distance: "3–5 m", action: "Perform 3–5 maximal vertical jumps", tips: ["Keep the head and both feet visible", "Hold the landing position for 2 seconds", "Keep the camera level with the floor"] },
    shooting: { view: "Front + side recommended", distance: "4–7 m", action: "Repeat setup → rotation → impact → follow-through 3 times", tips: ["Keep the torso and arms inside the frame", "Include the ball and the full motion", "Capture the dominant side from the side when possible"] },
    "change-direction": { view: "Front or 45°", distance: "6–10 m", action: "Perform 3–5 left/right cuts", tips: ["Include the full deceleration and cutting zone", "Keep the ankles visible", "Leave about 1 second before and after each cut"] },
    athletics: { view: "Side view", distance: "10–15 m", action: "Perform each test at maximal effort for 2–3 trials", tips: ["Keep the full test zone in frame", "Set the camera around waist-to-chest height", "Stand still between trials"] },
    squat: { view: "Front + side recommended", distance: "2–3 m", action: "Stand → descend → hold bottom → rise for 3–5 reps", tips: ["Keep the full body from head to feet in frame", "Keep both feet and knees unobstructed", "If possible, record separate front and side views"] },
  },
} as const;

const SPEED_AGILITY_TESTS = [
  { id: "sprint-5m", label: "5m Sprint", distance: "5m", split: false },
  { id: "sprint-10m", label: "10m Sprint", distance: "10m", split: false },
  { id: "sprint-10-5", label: "10m + 5m Split", distance: "15m", split: true },
  { id: "sprint-20m", label: "20m Sprint", distance: "20m", split: false },
  { id: "sprint-20-10", label: "20m + 10m Split", distance: "30m", split: true },
  { id: "sprint-splits", label: "전체 Split 기록", distance: "전체", split: true },
] as const;

const AGILITY_TESTS = [
  { id: "agility-505", label: "5-0-5", distance: "5-0-5", split: false },
  { id: "agility-5105", label: "5-10-5 Pro Agility", distance: "5-10-5", split: false },
] as const;

const SHOOTING_SPORTS = {
  soccer: {
    ko: { name: "축구", details: ["인사이드 슈팅", "인스텝 슈팅", "감아차기", "발리 슈팅"] },
    en: { name: "Soccer", details: ["Inside Shot", "Instep Shot", "Curl Shot", "Volley"] },
    guide: { view: "정면 + 측면", distance: "5~8m", action: "접근→디딤발→임팩트→팔로스루", tips: ["공과 양발이 모두 보이게 촬영", "디딤발과 킥 순간이 프레임 중앙에 오도록 촬영", "가능하면 주발 측면을 추가 촬영"] },
    metrics: ["접근 속도", "디딤발 위치", "무릎 각도", "발목 각도", "임팩트 자세"],
  },
  basketball: {
    ko: { name: "농구", details: ["점프슛", "풀업 점퍼", "3점 슛", "레이업"] },
    en: { name: "Basketball", details: ["Jump Shot", "Pull-up Jumper", "3-Point Shot", "Layup"] },
    guide: { view: "정면 + 측면", distance: "4~6m", action: "준비→무릎 굴곡→점프→릴리스→착지", tips: ["공과 손목이 프레임 밖으로 나가지 않게 촬영", "점프 전후 발 위치를 모두 확보", "가능하면 정면과 측면을 각각 촬영"] },
    metrics: ["무릎 굴곡", "점프 높이", "팔꿈치 각도", "손목 각도", "착지 안정성"],
  },
  volleyball: {
    ko: { name: "배구", details: ["스파이크", "서브", "점프 플로터", "블로킹"] },
    en: { name: "Volleyball", details: ["Spike", "Serve", "Jump Float", "Blocking"] },
    guide: { view: "측면 + 정면", distance: "5~8m", action: "접근→도약→팔 젖힘→임팩트→착지", tips: ["도약부터 착지까지 전신을 확보", "공과 손이 겹치지 않도록 촬영", "네트 방향과 측면이 함께 보이게 배치"] },
    metrics: ["접근 속도", "도약 높이", "어깨 회전", "팔꿈치 각도", "착지 안정성"],
  },
  baseball: {
    ko: { name: "야구", details: ["타격", "투구", "송구", "수비 동작"] },
    en: { name: "Baseball", details: ["Batting", "Pitching", "Throwing", "Fielding"] },
    guide: { view: "정면 + 측면", distance: "5~10m", action: "준비→체중 이동→회전→임팩트/릴리스", tips: ["머리·어깨·팔·골반이 모두 보이게 촬영", "공과 배트/손이 프레임 안에 있어야 함", "가능하면 주손 방향 측면 촬영"] },
    metrics: ["체중 이동", "골반 회전", "어깨 회전", "팔꿈치 각도", "릴리스 자세"],
  },
  tennis: {
    ko: { name: "테니스", details: ["포핸드", "백핸드", "서브", "발리"] },
    en: { name: "Tennis", details: ["Forehand", "Backhand", "Serve", "Volley"] },
    guide: { view: "측면 + 대각선", distance: "5~8m", action: "준비→스텝→회전→임팩트→팔로스루", tips: ["라켓과 양발을 모두 프레임에 포함", "임팩트 위치가 선명하게 보이도록 촬영", "대각선 촬영으로 몸통 회전을 확보"] },
    metrics: ["스텝 속도", "골반 회전", "어깨 회전", "팔꿈치 각도", "임팩트 자세"],
  },
  golf: {
    ko: { name: "골프", details: ["드라이버", "아이언", "웨지", "퍼팅"] },
    en: { name: "Golf", details: ["Driver", "Iron", "Wedge", "Putting"] },
    guide: { view: "정면 + 다운더라인", distance: "3~5m", action: "어드레스→백스윙→다운스윙→임팩트→피니시", tips: ["클럽 헤드와 발 전체가 보이게 촬영", "카메라 높이를 허리 정도로 유지", "정면과 다운더라인을 각각 촬영하면 좋음"] },
    metrics: ["어드레스 자세", "골반 회전", "어깨 회전", "손목 각도", "피니시 안정성"],
  },
} as const;
type ShootingSportId = keyof typeof SHOOTING_SPORTS;

type GpsMetrics = {
  connected: boolean; provider: string; distanceKm: number | null; highSpeedDistanceKm: number | null; maxSpeedKmh: number | null; sprintCount: number | null; maxAcceleration: number | null; maxDeceleration: number | null; activeMinutes: number | null;
};

const CAMERA_COPY = {
  ko: {
    eyebrow: "CAMERA AI 분석", choose: "동작분석", chooseDesc: "분석할 동작을 선택하면 카메라 촬영 화면으로 전환됩니다.", back: "이전", ready: "AI 시스템 준비", online: "AI 시스템 온라인", analysis: "실시간 분석", calibration: "보정", athleteHeight: "선수 신장", usedForJump: "점프 높이 보정에 사용됩니다.", liveMeasurements: "실시간 측정", analysisResults: "분석 결과", display: "화면 표시", skeleton: "스켈레톤", angle: "관절 각도", startCamera: "카메라 시작", loading: "AI 모델 불러오는 중...", fullBody: "전신 촬영 준비", fullBodyDesc: "머리부터 양쪽 발목까지 화면 안에 들어오도록 촬영해주세요.", guide: "촬영 가이드", joints: "관절 설정", selectAll: "전체 선택", clear: "전체 해제", view: "권장 촬영 방향", distance: "권장 거리", action: "촬영 동작", tips: "촬영 팁", live: "LIVE AI", bodyMoveBack: "전신이 보이도록 뒤로 이동하세요", detected: "전신 인식 완료 — 분석 가능합니다", bodyFrame: "머리부터 양쪽 발목까지 화면에 넣어주세요", analyzing: "AI 분석 중", analyzingDesc: "신체 움직임과 관절 데이터를 분석하고 있습니다.", complete: "분석 완료", completeDesc: "동작 분석 결과가 생성되었습니다.", result: "결과 확인", cameraEnd: "카메라 종료", analysisStart: "분석 시작", needBody: "전신 인식 필요", caution: "주의", cautionText: "본 분석은 운동 수행 및 훈련 관리를 위한 참고 정보입니다. 의료적 진단 또는 진료 결과가 아닙니다.", kneeLeft: "왼쪽 무릎", kneeRight: "오른쪽 무릎", hipLeft: "왼쪽 고관절", hipRight: "오른쪽 고관절", jumpHeight: "점프 높이", flightTime: "체공시간", landing: "착지 안정성", confidence: "인식 신뢰도" },
  en: { eyebrow: "CAMERA AI ANALYSIS", choose: "Motion Analysis", chooseDesc: "Select an analysis to open the camera screen.", back: "Back", ready: "AI System Ready", online: "AI System Online", analysis: "LIVE ANALYSIS", calibration: "CALIBRATION", athleteHeight: "Athlete Height", usedForJump: "Used to calibrate jump height.", liveMeasurements: "LIVE MEASUREMENTS", analysisResults: "ANALYSIS RESULTS", display: "DISPLAY", skeleton: "Skeleton", angle: "Joint Angles", startCamera: "Start Camera", loading: "Loading AI model...", fullBody: "Full-body capture", fullBodyDesc: "Keep your head and both ankles inside the frame.", guide: "Capture Guide", joints: "Joint Settings", selectAll: "Select all", clear: "Clear all", view: "Recommended view", distance: "Recommended distance", action: "Capture action", tips: "Capture tips", live: "LIVE AI", bodyMoveBack: "Move back until your full body is visible", detected: "Full body detected — ready for analysis", bodyFrame: "Keep your head and both ankles inside the frame", analyzing: "AI analysis in progress", analyzingDesc: "Analyzing body movement and joint data.", complete: "Analysis complete", completeDesc: "Your motion analysis result is ready.", result: "View result", cameraEnd: "Stop Camera", analysisStart: "Start Analysis", needBody: "Full body required", caution: "Caution", cautionText: "This analysis is for sports performance and training management reference only. It is not a medical diagnosis or treatment result.", kneeLeft: "Left Knee", kneeRight: "Right Knee", hipLeft: "Left Hip", hipRight: "Right Hip", jumpHeight: "Jump Height", flightTime: "Flight Time", landing: "Landing Stability", confidence: "Detection Confidence" },
} as const;

type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

type JointAngles = {
  leftShoulder: number | null;
  rightShoulder: number | null;
  leftElbow: number | null;
  rightElbow: number | null;
  leftWrist: number | null;
  rightWrist: number | null;
  leftHip: number | null;
  rightHip: number | null;
  leftKnee: number | null;
  rightKnee: number | null;
  leftAnkle: number | null;
  rightAnkle: number | null;
};

type LiveMetrics = JointAngles & {
  kneeDifference: number | null;
  balance: number | null;
  confidence: number | null;
};

type PoseSample = {
  time: number;
  hipY: number;
  bodyHeight: number;
  leftKnee: number | null;
  rightKnee: number | null;
  kneeAngle: number | null;
  confidence: number;
};

type SquatAssessment = {
  score: number | null;
  phase: "stand" | "descent" | "bottom" | "ascent" | "waiting";
  kneeSymmetry: number | null;
  depth: number | null;
  hipSymmetry: number | null;
};

const calculateSquatAssessment = (
  leftKnee: number | null,
  rightKnee: number | null,
  leftHip: number | null,
  rightHip: number | null,
): SquatAssessment => {
  if (
    leftKnee === null ||
    rightKnee === null
  ) {
    return {
      score: null,
      phase: "waiting",
      kneeSymmetry: null,
      depth: null,
      hipSymmetry: null,
    };
  }

  const knee = (leftKnee + rightKnee) / 2;
  const kneeSymmetry = Math.max(0, Math.round(100 - Math.abs(leftKnee - rightKnee) * 5));
  const hipSymmetry =
    leftHip !== null && rightHip !== null
      ? Math.max(0, Math.round(100 - Math.abs(leftHip - rightHip) * 4))
      : null;

  const depth =
    Math.max(0, Math.min(100, Math.round(((155 - knee) / 75) * 100)));

  const phase =
    knee > 155
      ? "stand"
      : knee > 110
        ? "descent"
        : "bottom";

  const depthScore = knee >= 75 && knee <= 115 ? 100 : Math.max(0, 100 - Math.abs(knee - 95) * 2);
  const symmetryScore = kneeSymmetry;
  const hipScore = hipSymmetry ?? 80;
  const score = Math.round(depthScore * 0.5 + symmetryScore * 0.3 + hipScore * 0.2);

  return {
    score: Math.max(0, Math.min(100, score)),
    phase,
    kneeSymmetry,
    depth,
    hipSymmetry,
  };
};

type AnalysisResults = {
  jumpHeight: string;
  flightTime: string;
  landingStability: string;
  averageKnee: string;
  kneeDifference: string;
  confidence: string;
  fatigue: string;
  bodyControl: string;
};

const chapters: Chapter[] = [
  {
    id: "sprint",
    category: "RUNNING",
    title: "스프린트",
    description:
      "가속 구간과 보폭, 하지 움직임을 분석합니다.",
    metrics: [
      "가속도",
      "최고속도",
      "보폭",
      "보행 빈도",
    ],
  },
  {
    id: "running",
    category: "RUNNING",
    title: "달리기 동작",
    description:
      "러닝 자세와 좌우 움직임, 하체 정렬을 분석합니다.",
    metrics: [
      "러닝 자세",
      "좌우 밸런스",
      "무릎 각도",
      "발 착지",
    ],
  },
  {
    id: "jump",
    category: "JUMP",
    title: "점프",
    description:
      "점프와 착지 동작을 분석하고 반복 수행에 따른 피로도를 계산합니다.",
    metrics: [
      "점프 높이",
      "체공시간",
      "착지 안정성",
      "무릎 각도",
      "피로도",
    ],
    fatigue: true,
  },
  {
    id: "shooting",
    category: "SPORT SPECIFIC",
    title: "슈팅 동작",
    description:
      "슈팅 동작의 준비, 회전, 임팩트, 팔로스루를 분석합니다.",
    metrics: [
      "접근 속도",
      "골반 회전",
      "무릎 각도",
      "임팩트 자세",
      "팔로스루",
    ],
  },
  {
    id: "change-direction",
    category: "AGILITY",
    title: "방향 전환",
    description:
      "감속과 방향 전환 과정의 자세 및 좌우 균형을 분석합니다.",
    metrics: [
      "감속 능력",
      "전환 시간",
      "무릎 정렬",
      "몸통 기울기",
    ],
  },
  {
    id: "athletics",
    category: "ATHLETICS",
    title: "기본 육상 측정",
    description:
      "기본적인 스피드와 점프 측정 데이터를 기록합니다.",
    metrics: [
      "10m 기록",
      "20m 기록",
      "30m 기록",
      "수직점프",
      "반복점프",
    ],
  },
  {
    id: "squat",
    category: "STRENGTH",
    title: "스쿼트 자세평가",
    description:
      "스쿼트의 하강, 최저점, 상승 구간과 전신 관절 정렬을 분석합니다.",
    metrics: [
      "무릎 정렬",
      "고관절 깊이",
      "발목 가동성",
      "몸통 기울기",
      "좌우 균형",
    ],
  },
];

const CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];

function visible(
  landmark?: Landmark,
  threshold = 0.55,
) {
  return (
    !!landmark &&
    (landmark.visibility ?? 0) >= threshold
  );
}

function median(values: number[]) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const middle = Math.floor(
    sorted.length / 2,
  );

  if (sorted.length % 2) {
    return sorted[middle];
  }

  return (
    (sorted[middle - 1] +
      sorted[middle]) /
    2
  );
}

function calculateAngle(
  a?: Landmark,
  b?: Landmark,
  c?: Landmark,
) {
  if (
    !visible(a) ||
    !visible(b) ||
    !visible(c)
  ) {
    return null;
  }

  const abx = a!.x - b!.x;
  const aby = a!.y - b!.y;

  const cbx = c!.x - b!.x;
  const cby = c!.y - b!.y;

  const ab = Math.hypot(abx, aby);
  const cb = Math.hypot(cbx, cby);

  if (ab < 0.01 || cb < 0.01) {
    return null;
  }

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      (abx * cbx + aby * cby) /
        (ab * cb),
    ),
  );

  return Math.max(
    10,
    Math.min(
      170,
      Math.round(
        (Math.acos(cosine) * 180) /
          Math.PI,
      ),
    ),
  );
}

function calculateJointAngles(landmarks: Landmark[]): JointAngles {
  return {
    leftShoulder: calculateAngle(landmarks[13], landmarks[11], landmarks[23]),
    rightShoulder: calculateAngle(landmarks[14], landmarks[12], landmarks[24]),
    leftElbow: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
    rightElbow: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
    leftWrist: calculateAngle(landmarks[13], landmarks[15], landmarks[19]),
    rightWrist: calculateAngle(landmarks[14], landmarks[16], landmarks[20]),
    leftHip: calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
    rightHip: calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
    leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
    rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
    leftAnkle: calculateAngle(landmarks[25], landmarks[27], landmarks[31]),
    rightAnkle: calculateAngle(landmarks[26], landmarks[28], landmarks[32]),
  };
}

function emptyMetrics(): LiveMetrics {
  return {
    leftShoulder: null,
    rightShoulder: null,
    leftElbow: null,
    rightElbow: null,
    leftWrist: null,
    rightWrist: null,
    leftHip: null,
    rightHip: null,
    leftKnee: null,
    rightKnee: null,
    leftAnkle: null,
    rightAnkle: null,
    kneeDifference: null,
    balance: null,
    confidence: null,
  };
}

export default function CameraAIPage() {
  const router = useRouter();
  const { language, theme } = useNovaSettings();
  const [externalLanguage, setExternalLanguage] = useState<Language>(language === "en" ? "en" : "ko");
  const [externalTheme, setExternalTheme] = useState<"dark" | "white" | "ivory">(theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory");

  // Keep this page synchronized with the global settings even when the page
  // was opened directly or the settings UI lives in another route.
  useEffect(() => {
    const applyGlobalState = (nextLanguage: Language, nextTheme: "dark" | "white" | "ivory") => {
      setExternalLanguage(nextLanguage);
      setExternalTheme(nextTheme);
      document.documentElement.lang = nextLanguage;
      document.documentElement.dataset.novaTheme = nextTheme;
      document.body.dataset.novaTheme = nextTheme;
    };

    const sync = () => {
      try {
        const savedLanguage = localStorage.getItem("nova-language");
        const savedTheme = localStorage.getItem("nova-theme");
        const nextLanguage: Language = savedLanguage === "en" ? "en" : "ko";
        const nextTheme = savedTheme === "dark" || savedTheme === "white" || savedTheme === "ivory" ? savedTheme : "ivory";
        applyGlobalState(nextLanguage, nextTheme);
      } catch {
        applyGlobalState("ko", "ivory");
      }
    };

    const onSettingsChange = () => sync();
    const onLanguageChange = () => sync();
    const onThemeChange = () => sync();
    sync();
    window.addEventListener("nova-settings-change", onSettingsChange);
    window.addEventListener("nova-language-change", onLanguageChange);
    window.addEventListener("nova-theme-change", onThemeChange);
    window.addEventListener("storage", onSettingsChange);
    return () => {
      window.removeEventListener("nova-settings-change", onSettingsChange);
      window.removeEventListener("nova-language-change", onLanguageChange);
      window.removeEventListener("nova-theme-change", onThemeChange);
      window.removeEventListener("storage", onSettingsChange);
    };
  }, []);

  useEffect(() => {
    const next = language === "en" ? "en" : "ko";
    setExternalLanguage(next);
    document.documentElement.lang = next;
  }, [language]);

  useEffect(() => {
    const next = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";
    setExternalTheme(next);
    document.documentElement.dataset.novaTheme = next;
    document.body.dataset.novaTheme = next;
  }, [theme]);

  const lang = externalLanguage;
  const activeTheme = externalTheme;
  const copy = CAMERA_COPY[lang] ?? CAMERA_COPY.ko;
  const chapterText = CHAPTER_COPY[lang] ?? CHAPTER_COPY.ko;

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const poseRef =
    useRef<PoseLandmarker | null>(null);

  const animationRef =
    useRef<number | null>(null);

  const recordingTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const recordingStartRef =
    useRef<number | null>(null);

  const analysisTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const poseHistoryRef =
    useRef<PoseSample[]>([]);

  const [selectedChapter, setSelectedChapter] =
    useState<Chapter | null>(null);

  const [cameraActive, setCameraActive] =
    useState(false);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [aiReady, setAiReady] =
    useState(false);

  const [aiLoading, setAiLoading] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const [analyzing, setAnalyzing] =
    useState(false);

  const [analysisComplete, setAnalysisComplete] =
    useState(false);

  const [skeletonEnabled, setSkeletonEnabled] =
    useState(true);

  const [angleEnabled, setAngleEnabled] =
    useState(true);

  const [fullBodyDetected, setFullBodyDetected] =
    useState(false);

  const [bodyDetectionScore, setBodyDetectionScore] =
    useState(0);

  const [metrics, setMetrics] =
    useState<LiveMetrics>(
      emptyMetrics(),
    );

  const [analysisResults, setAnalysisResults] =
    useState<AnalysisResults | null>(
      null,
    );

  const [squatAssessment, setSquatAssessment] = useState<SquatAssessment>({
    score: null,
    phase: "waiting",
    kneeSymmetry: null,
    depth: null,
    hipSymmetry: null,
  });

  const [athleteHeight, setAthleteHeight] =
    useState("175");

  const [selectedJoints, setSelectedJoints] =
    useState<JointId[]>(DEFAULT_JOINTS.sprint);
  const [shootingSport, setShootingSport] = useState<ShootingSportId>("soccer");
  const [shootingDetail, setShootingDetail] = useState("");
  const [selectedSpeedTestId, setSelectedSpeedTestId] = useState("sprint-5m");
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [speedTestElapsed, setSpeedTestElapsed] = useState(0);
  const [speedTestSplits, setSpeedTestSplits] = useState<number[]>([]);
  const speedTestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedSpeedTest = [...SPEED_AGILITY_TESTS, ...AGILITY_TESTS].find((test) => test.id === selectedSpeedTestId) ?? SPEED_AGILITY_TESTS[0];
  const availableSpeedAgilityTests = selectedChapter?.id === "change-direction" ? AGILITY_TESTS : SPEED_AGILITY_TESTS;

  const startSpeedAgilityTest = () => {
    if (speedTestTimerRef.current) clearInterval(speedTestTimerRef.current);
    setSpeedTestElapsed(0);
    setSpeedTestSplits([]);
    setSpeedTestRunning(true);
    const startedAt = Date.now();
    speedTestTimerRef.current = setInterval(() => {
      setSpeedTestElapsed((Date.now() - startedAt) / 1000);
    }, 50);
  };

  const finishSpeedAgilityTest = () => {
    if (speedTestTimerRef.current) clearInterval(speedTestTimerRef.current);
    speedTestTimerRef.current = null;
    setSpeedTestRunning(false);
  };

  const recordSpeedAgilitySplit = () => {
    if (speedTestRunning) setSpeedTestSplits((current) => [...current, speedTestElapsed]);
  };

  useEffect(() => {
    if (selectedChapter?.id === "shooting") {
      const details = SHOOTING_SPORTS[shootingSport][lang === "en" ? "en" : "ko"].details;
      if (!details.includes(shootingDetail as never)) setShootingDetail(details[0]);
    }
    if (selectedChapter?.id === "change-direction") {
      setSelectedSpeedTestId((current) => AGILITY_TESTS.some((test) => test.id === current) ? current : AGILITY_TESTS[0].id);
    } else if (selectedChapter?.id === "sprint") {
      setSelectedSpeedTestId((current) => SPEED_AGILITY_TESTS.some((test) => test.id === current) ? current : SPEED_AGILITY_TESTS[0].id);
    }
  }, [lang, selectedChapter, shootingSport, shootingDetail]);

  const [gpsMetrics, setGpsMetrics] = useState<GpsMetrics>({
    connected: false, provider: "", distanceKm: null, highSpeedDistanceKm: null,
    maxSpeedKmh: null, sprintCount: null, maxAcceleration: null,
    maxDeceleration: null, activeMinutes: null,
  });
  const [gpsConnecting, setGpsConnecting] = useState(false);

  const connectGps = async () => {
    setGpsConnecting(true);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    setGpsMetrics({ connected: true, provider: "NOVA GPS", distanceKm: 0, highSpeedDistanceKm: 0, maxSpeedKmh: 0, sprintCount: 0, maxAcceleration: 0, maxDeceleration: 0, activeMinutes: 0 });
    setGpsConnecting(false);
  };

  const currentChapterCopy = selectedChapter
    ? chapterText[selectedChapter.id as keyof typeof chapterText]
    : null;

  const shootingData = SHOOTING_SPORTS[shootingSport];
  const shootingCopy = shootingData[lang === "en" ? "en" : "ko"];
  const currentGuide = selectedChapter
    ? selectedChapter.id === "shooting"
      ? shootingData?.guide
      : (CAPTURE_GUIDES[lang] ?? CAPTURE_GUIDES.ko)[selectedChapter.id as keyof typeof CAPTURE_GUIDES.ko]
    : null;

  const displayedMetrics = selectedChapter?.id === "shooting" && shootingData
    ? shootingData.metrics
    : currentChapterCopy?.metrics ?? [];

  const initializeAI = async () => {
    if (poseRef.current) {
      setAiReady(true);
      return;
    }

    try {
      setAiLoading(true);
      setCameraError("");

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        );

      poseRef.current =
        await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
              delegate: "GPU",
            },

            runningMode: "VIDEO",

            numPoses: 1,

            minPoseDetectionConfidence:
              0.55,

            minPosePresenceConfidence:
              0.55,

            minTrackingConfidence:
              0.55,
          },
        );

      setAiReady(true);
    } catch (error) {
      console.error(error);

      setCameraError(
        "AI 자세 분석 모델을 불러오지 못했습니다.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  /*
   * 핵심:
   * 점프 분석에 필요한 전신 랜드마크.
   *
   * 0  = 머리
   * 11 = 왼쪽 어깨
   * 12 = 오른쪽 어깨
   * 23 = 왼쪽 골반
   * 24 = 오른쪽 골반
   * 25 = 왼쪽 무릎
   * 26 = 오른쪽 무릎
   * 27 = 왼쪽 발목
   * 28 = 오른쪽 발목
   */
  const checkFullBody = (
    landmarks: Landmark[],
  ) => {
    const required = [
      0,
      11,
      12,
      23,
      24,
      25,
      26,
      27,
      28,
    ];

    const scores =
      required.map(
        (index) =>
          landmarks[index]
            ?.visibility ?? 0,
      );

    const average =
      scores.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / scores.length;

    /*
     * 모든 핵심 관절이 최소 45% 이상
     * 보여야 한다.
     */
    const minimumVisibility =
      Math.min(...scores);

    /*
     * 머리와 발목이 화면에 실제로
     * 들어와 있는지 확인한다.
     */
    const top =
      landmarks[0];

    const leftFoot =
      landmarks[27];

    const rightFoot =
      landmarks[28];

    const edgeMargin = 0.035;

    const headInFrame =
      !!top &&
      top.x >= edgeMargin &&
      top.x <=
        1 - edgeMargin &&
      top.y >= edgeMargin &&
      top.y <=
        1 - edgeMargin;

    const leftFootInFrame =
      !!leftFoot &&
      leftFoot.x >= edgeMargin &&
      leftFoot.x <=
        1 - edgeMargin &&
      leftFoot.y >= edgeMargin &&
      leftFoot.y <=
        1 - edgeMargin;

    const rightFootInFrame =
      !!rightFoot &&
      rightFoot.x >= edgeMargin &&
      rightFoot.x <=
        1 - edgeMargin &&
      rightFoot.y >= edgeMargin &&
      rightFoot.y <=
        1 - edgeMargin;

    /*
     * 실제 전신 세로 범위.
     */
    const bodySpan =
      Math.max(
        top?.y ?? 0,
        leftFoot?.y ?? 0,
        rightFoot?.y ?? 0,
      ) -
      Math.min(
        top?.y ?? 1,
        leftFoot?.y ?? 1,
        rightFoot?.y ?? 1,
      );

    /*
     * 전신이 너무 작게 잡힌 경우도
     * 정확도가 떨어지므로 차단.
     */
    const bodyLargeEnough =
      bodySpan >= 0.38;

    /*
     * 점프 분석은 더 엄격하게 한다.
     */
    const detected =
      average >= 0.70 &&
      minimumVisibility >= 0.45 &&
      headInFrame &&
      leftFootInFrame &&
      rightFootInFrame &&
      bodyLargeEnough;

    return {
      detected,
      score: Math.round(
        average * 100,
      ),
    };
  };

  const drawAngleLabel = (
    ctx: CanvasRenderingContext2D,
    point: Landmark,
    text: string,
    width: number,
    height: number,
  ) => {
    if (!visible(point)) {
      return;
    }

    const x =
      point.x * width;

    const y =
      point.y * height;

    ctx.font =
      "600 12px Arial";

    const textWidth =
      ctx.measureText(text).width;

    ctx.fillStyle =
      "rgba(5,12,23,.92)";

    ctx.beginPath();

    ctx.roundRect(
      x -
        textWidth / 2 -
        7,
      y - 30,
      textWidth + 14,
      23,
      5,
    );

    ctx.fill();

    ctx.strokeStyle =
      "#3d82ff";

    ctx.stroke();

    ctx.fillStyle =
      "#ffffff";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      text,
      x,
      y - 18,
    );
  };

  const drawPose = (
    result: PoseLandmarkerResult,
    width: number,
    height: number,
  ) => {
    const canvas =
      canvasRef.current;

    const ctx =
      canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(
      0,
      0,
      width,
      height,
    );

    const landmarks =
      result.landmarks?.[0] as
        | Landmark[]
        | undefined;

    if (!landmarks) {
      setFullBodyDetected(false);
      setBodyDetectionScore(0);
      return;
    }

    const bodyStatus =
      checkFullBody(
        landmarks,
      );

    setFullBodyDetected(
      bodyStatus.detected,
    );

    setBodyDetectionScore(
      bodyStatus.score,
    );

    const jointAngles =
      calculateJointAngles(landmarks);

    const {
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
    } = jointAngles;

    if (selectedChapter?.id === "squat") {
      setSquatAssessment(
        calculateSquatAssessment(
          leftKnee,
          rightKnee,
          leftHip,
          rightHip,
        ),
      );
    }

    if (skeletonEnabled) {
      ctx.lineWidth = 3;
      ctx.strokeStyle =
        "#3d82ff";

      CONNECTIONS.forEach(
        ([a, b]) => {
          const jointEnabled = (index: number) =>
            Object.entries(JOINT_LANDMARKS).some(
              ([joint, indices]) =>
                selectedJoints.includes(joint as JointId) &&
                indices.includes(index),
            );

          if (!jointEnabled(a) || !jointEnabled(b)) {
            return;
          }

          const start =
            landmarks[a];

          const end =
            landmarks[b];

          if (
            !visible(start) ||
            !visible(end)
          ) {
            return;
          }

          ctx.beginPath();

          ctx.moveTo(
            start!.x * width,
            start!.y * height,
          );

          ctx.lineTo(
            end!.x * width,
            end!.y * height,
          );

          ctx.stroke();
        },
      );

      landmarks.forEach(
        (point, index) => {
          const jointEnabled = Object.entries(JOINT_LANDMARKS).some(
            ([joint, indices]) =>
              selectedJoints.includes(joint as JointId) &&
              indices.includes(index),
          );

          if (!jointEnabled || !visible(point)) {
            return;
          }

          ctx.fillStyle =
            "#ffffff";

          ctx.beginPath();

          ctx.arc(
            point.x * width,
            point.y * height,
            4,
            0,
            Math.PI * 2,
          );

          ctx.fill();
        },
      );
    }

    /*
     * 각도 표시.
     *
     * 전신 전체가 프레임에 들어오지 않아도
     * 화면에 실제로 보이는 관절의 각도는 표시한다.
     */
    if (angleEnabled) {
      if (
        selectedJoints.includes("knees") &&
        leftKnee !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[25],
          `${lang === "en" ? "L KNEE" : "왼쪽 무릎"} ${leftKnee}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("knees") &&
        rightKnee !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[26],
          `${lang === "en" ? "R KNEE" : "오른쪽 무릎"} ${rightKnee}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("shoulders") &&
        leftShoulder !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[11],
          `${lang === "en" ? "L SHOULDER" : "왼쪽 어깨"} ${leftShoulder}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("shoulders") &&
        rightShoulder !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[12],
          `${lang === "en" ? "R SHOULDER" : "오른쪽 어깨"} ${rightShoulder}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("elbows") &&
        leftElbow !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[13],
          `${lang === "en" ? "L ELBOW" : "왼쪽 팔꿈치"} ${leftElbow}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("elbows") &&
        rightElbow !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[14],
          `${lang === "en" ? "R ELBOW" : "오른쪽 팔꿈치"} ${rightElbow}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("wrists") &&
        leftWrist !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[15],
          `${lang === "en" ? "L WRIST" : "왼쪽 손목"} ${leftWrist}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("wrists") &&
        rightWrist !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[16],
          `${lang === "en" ? "R WRIST" : "오른쪽 손목"} ${rightWrist}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("hips") &&
        leftHip !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[23],
          `${lang === "en" ? "L HIP" : "왼쪽 고관절"} ${leftHip}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("hips") &&
        rightHip !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[24],
          `${lang === "en" ? "R HIP" : "오른쪽 고관절"} ${rightHip}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("ankles") &&
        leftAnkle !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[27],
          `${lang === "en" ? "L ANKLE" : "왼쪽 발목"} ${leftAnkle}°`,
          width,
          height,
        );
      }

      if (
        selectedJoints.includes("ankles") &&
        rightAnkle !== null
      ) {
        drawAngleLabel(
          ctx,
          landmarks[28],
          `${lang === "en" ? "R ANKLE" : "오른쪽 발목"} ${rightAnkle}°`,
          width,
          height,
        );
      }
    }

    const visiblePoints =
      landmarks.filter(
        (point) =>
          (point.visibility ?? 0) >=
          0.45,
      );

    const confidence =
      visiblePoints.length
        ? Math.round(
            (visiblePoints.reduce(
              (sum, point) =>
                sum +
                (point.visibility ??
                  0),
              0,
            ) /
              visiblePoints.length) *
              100,
          )
        : 0;

    const kneeDifference =
      leftKnee !== null &&
      rightKnee !== null
        ? Math.abs(
            leftKnee -
              rightKnee,
          )
        : null;

    const shoulderDifference =
      Math.abs(
        (landmarks[11]?.y ?? 0) -
          (landmarks[12]?.y ?? 0),
      );

    const balance = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            shoulderDifference *
              250,
        ),
      ),
    );

    setMetrics({
      ...jointAngles,
      kneeDifference,
      balance,
      confidence,
    });

    /*
     * 전신이 제대로 잡힌 상태에서만
     * 분석 데이터를 축적한다.
     */
    if (!bodyStatus.detected) {
      return;
    }

    const headY =
      landmarks[0]?.y;

    const footYs = [
      landmarks[27]?.y,
      landmarks[28]?.y,
    ].filter(
      (
        value,
      ): value is number =>
        typeof value ===
        "number",
    );

    if (
      typeof headY !==
        "number" ||
      footYs.length < 2
    ) {
      return;
    }

    const bodyHeight =
      Math.max(
        0.05,
        Math.max(...footYs) -
          headY,
      );

    const hipValues = [
      landmarks[23]?.y,
      landmarks[24]?.y,
    ].filter(
      (
        value,
      ): value is number =>
        typeof value ===
        "number",
    );

    if (!hipValues.length) {
      return;
    }

    const hipY =
      hipValues.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) /
      hipValues.length;

    poseHistoryRef.current.push({
      time:
        performance.now(),
      hipY,
      bodyHeight,
      leftKnee,
      rightKnee,
      kneeAngle:
        leftKnee !== null &&
        rightKnee !== null
          ? (leftKnee +
              rightKnee) /
            2
          : null,
      confidence:
        bodyStatus.score,
    });

    const cutoff =
      performance.now() -
      20000;

    poseHistoryRef.current =
      poseHistoryRef.current.filter(
        (sample) =>
          sample.time >=
          cutoff,
      );
  };

  const detectPose = () => {
    const video =
      videoRef.current;

    const landmarker =
      poseRef.current;

    if (
      !video ||
      !landmarker
    ) {
      return;
    }

    if (
      video.readyState >= 2
    ) {
      try {
        const result =
          landmarker.detectForVideo(
            video,
            performance.now(),
          );

        drawPose(
          result,
          video.videoWidth ||
            1280,
          video.videoHeight ||
            720,
        );
      } catch (error) {
        console.error(error);
      }
    }

    animationRef.current =
      requestAnimationFrame(
        detectPose,
      );
  };

  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const startRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    const startedAt = Date.now();
    recordingStartRef.current = startedAt;
    setRecordingSeconds(0);

    recordingTimerRef.current = setInterval(() => {
      if (recordingStartRef.current !== null) {
        setRecordingSeconds(
          Math.floor((Date.now() - recordingStartRef.current) / 1000),
        );
      }
    }, 250);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingStartRef.current = null;
  };

  const startCamera =
    async () => {
      try {
        setCameraError("");

        await initializeAI();

        if (!poseRef.current) {
          return;
        }

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode:
                  "environment",

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },

              audio: false,
            },
          );

        streamRef.current =
          stream;

        poseHistoryRef.current =
          [];

        setAnalysisResults(
          null,
        );

        setAnalysisComplete(
          false,
        );

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          await videoRef.current.play();
        }

        setCameraActive(
          true,
        );

        startRecordingTimer();

        animationRef.current =
          requestAnimationFrame(
            detectPose,
          );
      } catch (error) {
        console.error(error);

        setCameraError(
          "카메라를 사용할 수 없습니다. 브라우저 카메라 권한을 확인해주세요.",
        );
      }
    };

  const stopCamera = () => {
    stopRecordingTimer();

    if (
      animationRef.current
    ) {
      cancelAnimationFrame(
        animationRef.current,
      );
    }

    animationRef.current =
      null;

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      );

    streamRef.current =
      null;

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    const ctx =
      canvasRef.current?.getContext(
        "2d",
      );

    if (
      ctx &&
      canvasRef.current
    ) {
      ctx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
    }

    setCameraActive(
      false,
    );

    setRecordingSeconds(0);

    setFullBodyDetected(
      false,
    );

    setBodyDetectionScore(
      0,
    );

    setMetrics(
      emptyMetrics(),
    );

    poseHistoryRef.current =
      [];
  };

  const goBack = () => {
    stopCamera();

    if (selectedChapter) {
      if (window.history.state?.novaCameraAISelection) {
        window.history.back();
        return;
      }

      setSelectedChapter(
        null,
      );

      setAnalysisResults(
        null,
      );

      return;
    }

    router.push(
      "/dashboard",
    );
  };

  const selectChapter = (
    chapter: Chapter,
  ) => {
    stopCamera();

    window.history.pushState(
      { novaCameraAISelection: true },
      "",
      window.location.href,
    );

    setSelectedChapter(
      chapter,
    );

    setSelectedJoints(
      DEFAULT_JOINTS[chapter.id] ?? DEFAULT_JOINTS.sprint,
    );

    if (chapter.id === "shooting") {
      setShootingSport("soccer");
      setShootingDetail(SHOOTING_SPORTS.soccer[lang === "en" ? "en" : "ko"].details[0]);
    }

    setAnalysisComplete(
      false,
    );

    setAnalysisResults(
      null,
    );
  };

  useEffect(() => {
    if (!selectedChapter) return;

    const handlePopState = () => {
      stopCamera();
      setSelectedChapter(null);
      setAnalysisComplete(false);
      setAnalysisResults(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter]);

  /*
   * 분석 시작 전 최종 안전 검사.
   */
  const canAnalyze =
    cameraActive &&
    aiReady &&
    fullBodyDetected &&
    bodyDetectionScore >= 70 &&
    poseHistoryRef.current.length >=
      10;

  const calculateAnalysis =
    (): AnalysisResults => {
      const samples =
        poseHistoryRef.current;

      const heightCm =
        Math.max(
          100,
          Math.min(
            230,
            Number(
              athleteHeight,
            ) || 175,
          ),
        );

      if (
        samples.length < 10
      ) {
        return {
          jumpHeight:
            "측정 부족",
          flightTime:
            "측정 부족",
          landingStability:
            "측정 부족",
          averageKnee:
            "측정 부족",
          kneeDifference:
            "측정 부족",
          confidence:
            `${bodyDetectionScore}%`,
          fatigue: "--",
          bodyControl:
            "--",
        };
      }

      const valid =
        samples.filter(
          (sample) =>
            sample.confidence >=
            70,
        );

      if (
        valid.length < 10
      ) {
        return {
          jumpHeight:
            "전신 인식 부족",
          flightTime:
            "전신 인식 부족",
          landingStability:
            "전신 인식 부족",
          averageKnee:
            "전신 인식 부족",
          kneeDifference:
            "전신 인식 부족",
          confidence:
            `${bodyDetectionScore}%`,
          fatigue: "--",
          bodyControl:
            "--",
        };
      }

      const baselineCount =
        Math.min(
          30,
          valid.length,
        );

      const baseline =
        valid.slice(
          0,
          baselineCount,
        );

      const baselineHip =
        median(
          baseline.map(
            (sample) =>
              sample.hipY,
          ),
        ) ?? 0.5;

      const baselineBodyHeight =
        median(
          baseline.map(
            (sample) =>
              sample.bodyHeight,
          ),
        ) ?? 0.7;

      let peakIndex = 0;
      let peakDisplacement = 0;

      valid.forEach(
        (sample, index) => {
          const displacement =
            baselineHip -
            sample.hipY;

          if (
            displacement >
            peakDisplacement
          ) {
            peakDisplacement =
              displacement;

            peakIndex =
              index;
          }
        },
      );

      /*
       * 최소한 기준 자세보다
       * 3% 이상 올라가야 점프로 인정.
       */
      const jumpDetected =
        peakDisplacement /
          baselineBodyHeight >=
        0.03;

      if (!jumpDetected) {
        return {
          jumpHeight:
            "점프 동작 미검출",
          flightTime:
            "점프 동작 미검출",
          landingStability:
            "측정 대기",
          averageKnee:
            "측정 대기",
          kneeDifference:
            "측정 대기",
          confidence:
            `${bodyDetectionScore}%`,
          fatigue: "0",
          bodyControl:
            "측정 대기",
        };
      }

      const normalizedJump =
        peakDisplacement /
        baselineBodyHeight;

      /*
       * 실제 신장 대비 비율로 환산.
       */
      const jumpCm =
        Math.max(
          0,
          Math.min(
            120,
            normalizedJump *
              heightCm,
          ),
        );

      let startIndex =
        peakIndex;

      while (
        startIndex > 0
      ) {
        const displacement =
          baselineHip -
          valid[startIndex].hipY;

        if (
          displacement /
            baselineBodyHeight >
          0.02
        ) {
          startIndex--;
        } else {
          break;
        }
      }

      let endIndex =
        peakIndex;

      while (
        endIndex <
        valid.length - 1
      ) {
        const displacement =
          baselineHip -
          valid[endIndex].hipY;

        if (
          displacement /
            baselineBodyHeight >
          0.02
        ) {
          endIndex++;
        } else {
          break;
        }
      }

      let flightTime =
        0;

      if (
        endIndex >
        startIndex
      ) {
        flightTime =
          (
            valid[endIndex].time -
            valid[startIndex].time
          ) / 1000;
      }

      if (
        flightTime < 0.08 ||
        flightTime > 2
      ) {
        flightTime = 0;
      }

      const kneeAngles =
        valid
          .map(
            (sample) =>
              sample.kneeAngle,
          )
          .filter(
            (
              value,
            ): value is number =>
              value !== null &&
              value >= 20 &&
              value <= 170,
          );

      const averageKnee =
        median(kneeAngles);

      const kneeDifferences =
        valid
          .filter(
            (sample) =>
              sample.leftKnee !==
                null &&
              sample.rightKnee !==
                null,
          )
          .map(
            (sample) =>
              Math.abs(
                sample.leftKnee! -
                  sample.rightKnee!,
              ),
          );

      const kneeDifference =
        median(
          kneeDifferences,
        ) ?? 0;

      const landingWindow =
        valid.slice(
          Math.max(
            0,
            endIndex - 10,
          ),
          Math.min(
            valid.length,
            endIndex + 6,
          ),
        );

      let landingMovement = 0;

      if (
        landingWindow.length >
        1
      ) {
        for (
          let i = 1;
          i <
          landingWindow.length;
          i++
        ) {
          landingMovement +=
            Math.abs(
              landingWindow[i]
                .hipY -
                landingWindow[
                  i - 1
                ].hipY,
            );
        }

        landingMovement /=
          landingWindow.length;
      }

      const landingStability =
        Math.round(
          Math.max(
            0,
            Math.min(
              100,
              100 -
                kneeDifference *
                  1.4 -
                landingMovement *
                  700,
            ),
          ),
        );

      const bodyControl =
        Math.round(
          Math.max(
            0,
            Math.min(
              100,
              100 -
                kneeDifference *
                  1.1,
            ),
          ),
        );

      const first =
        valid.slice(
          0,
          Math.max(
            5,
            Math.floor(
              valid.length *
                0.4,
            ),
          ),
        );

      const last =
        valid.slice(
          Math.floor(
            valid.length *
              0.6,
          ),
        );

      const movement =
        (
          list: PoseSample[],
        ) => {
          if (
            list.length < 2
          ) {
            return 0;
          }

          let total = 0;

          for (
            let i = 1;
            i <
            list.length;
            i++
          ) {
            total +=
              Math.abs(
                list[i].hipY -
                  list[
                    i - 1
                  ].hipY,
              );
          }

          return (
            total /
            (list.length - 1)
          );
        };

      const firstMovement =
        movement(first);

      const lastMovement =
        movement(last);

      let fatigue = 0;

      if (
        firstMovement > 0.0001
      ) {
        fatigue =
          Math.round(
            Math.max(
              0,
              Math.min(
                100,
                (1 -
                  lastMovement /
                    firstMovement) *
                  100,
              ),
            ),
          );
      }

      return {
        jumpHeight:
          `${jumpCm.toFixed(1)} cm`,

        flightTime:
          flightTime > 0
            ? `${flightTime.toFixed(
                2,
              )} s`
            : "측정 부족",

        landingStability:
          `${landingStability}%`,

        averageKnee:
          averageKnee !== null
            ? `${Math.round(
                averageKnee,
              )}°`
            : "측정 부족",

        kneeDifference:
          `${Math.round(
            kneeDifference,
          )}°`,

        confidence:
          `${bodyDetectionScore}%`,

        fatigue:
          `${fatigue}`,

        bodyControl:
          `${bodyControl}%`,
      };
    };

  const saveJumpFatigueFromResult = (result: AnalysisResults) => {
    if (selectedChapter?.id !== "jump") return;
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "athlete") return;

    const currentJumpMatch = result.jumpHeight.match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (!currentJumpMatch) return;

    const currentJumpCm = Number(currentJumpMatch[1]);
    if (!Number.isFinite(currentJumpCm) || currentJumpCm <= 0) return;

    const athleteId = currentUser.id;
    const today = new Date();
    const currentDate = today.toISOString().slice(0, 10);
    const previousDate = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const previousRecord = getJumpFatigueRecord(athleteId, previousDate);
    const previousJumpCm = previousRecord?.currentJumpCm ?? 0;
    const fatiguePercent =
      previousJumpCm > 0
        ? Math.max(
            0,
            Math.min(100, ((previousJumpCm - currentJumpCm) / previousJumpCm) * 100),
          )
        : 0;

    upsertJumpFatigueRecord({
      athleteId,
      date: currentDate,
      previousJumpCm,
      currentJumpCm,
      fatiguePercent: Math.round(fatiguePercent * 10) / 10,
    });
  };

  const runAnalysis = () => {
    /*
     * 전신 인식이 안 되면 절대 분석하지 않는다.
     */
    if (!canAnalyze) {
      setCameraError(
        "전신이 제대로 인식되지 않았습니다. 머리부터 양쪽 발목까지 화면에 들어오도록 뒤로 이동해주세요.",
      );

      return;
    }

    setCameraError("");

    setAnalyzing(true);
    setAnalysisComplete(
      false,
    );

    /*
     * 1.8초 동안 현재 움직임을
     * 추가 확보한 뒤 계산.
     */
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      analysisTimeoutRef.current = null;
      const result =
        calculateAnalysis();

      setAnalysisResults(
        result,
      );

      const currentUser = getCurrentUser();
      if (currentUser?.role === "athlete") {
        const currentData = readNovaAthleteData();
        writeNovaAthleteData({
          ...currentData,
          cameraAIResults: [
            ...currentData.cameraAIResults,
            {
              id: `camera-${selectedChapter?.id || "analysis"}-${Date.now()}`,
              title: selectedChapter?.title || "Camera AI",
              category: selectedChapter?.category || "Camera AI",
              score: Math.max(0, Math.min(100, Number(result.bodyControl.replace(/[^0-9.]/g, "")) || 0)),
              status: "양호" as const,
              summary: `${selectedChapter?.title || "동작"} 분석이 완료되었습니다.`,
              recommendation: "동일한 촬영 조건으로 반복 측정하여 변화 추이를 확인하세요.",
              metrics: Object.entries(result).map(([label, value]) => ({ label, value })),
              completedAt: new Date().toISOString(),
              source: "camera-ai" as const,
            },
          ],
        });
      }
      saveJumpFatigueFromResult(result);

      setAnalyzing(false);

      setAnalysisComplete(
        true,
      );
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }

      stopRecordingTimer();

      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current,
        );
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );

      poseRef.current?.close();
      if (speedTestTimerRef.current) clearInterval(speedTestTimerRef.current);
    };
  }, []);

  return (
    <main className={`camera-ai-page theme-${activeTheme}`} data-theme={activeTheme}>
      <NovaTopBar statusText={aiReady ? copy.online : copy.ready} />

      {!selectedChapter ? (
        <section className="chapter-page">
          <div className="chapter-intro">
            <span>
              {copy.eyebrow}
            </span>

            <h1>
              {copy.choose}
            </h1>

            <p>
              {copy.chooseDesc}
            </p>
          </div>

          <div className="chapter-grid">
            {chapters.map(
              (
                chapter,
                index,
              ) => (
                <button
                  key={
                    chapter.id
                  }
                  className="chapter-card"
                  onClick={() =>
                    selectChapter(
                      chapter,
                    )
                  }
                >
                  <div className="chapter-number">
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </div>

                  <div className="chapter-card-content">
                    <span>
                      {chapterText[chapter.id as keyof typeof chapterText].category}
                    </span>

                    <h2>
                      {chapterText[chapter.id as keyof typeof chapterText].title}
                    </h2>

                    <p>
                      {chapterText[chapter.id as keyof typeof chapterText].description}
                    </p>

                    <div className="metric-tags">
                      {chapterText[chapter.id as keyof typeof chapterText].metrics.map(
                        (
                          metric,
                        ) => (
                          <span
                            key={
                              metric
                            }
                          >
                            {
                              metric
                            }
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="chapter-arrow">
                    →
                  </div>
                </button>
              ),
            )}
          </div>
        </section>
      ) : (
        <section className="camera-workspace">
          <div className="camera-workspace-header">
            <div>
              <span>
                {
                  currentChapterCopy?.category
                }
              </span>

              <h1>
                {
                  currentChapterCopy?.title
                }
              </h1>

              <p>
                {
                  currentChapterCopy?.description
                }
              </p>
            </div>

            <div className="selected-metrics">
              {displayedMetrics.map(
                (
                  metric,
                ) => (
                  <span
                    key={
                      metric
                    }
                  >
                    {metric}
                  </span>
                ),
              )}
            </div>
          </div>

          {selectedChapter?.id === "shooting" && (
            <section className="shooting-selection-card setup-card">
              <div className="setup-card-header">
                <div>
                  <span className="panel-label">{lang === "en" ? "SPORT / SUB-MOTION" : "종목 / 세부동작"}</span>
                  <p>{lang === "en" ? "Select the sport and sub-motion to apply sport-specific capture and analysis targets." : "종목과 세부 동작을 선택하면 해당 종목에 맞는 촬영 가이드와 분석 항목을 적용합니다."}</p>
                </div>
              </div>
              <div className="shooting-select-grid">
                <label>
                  <span>{lang === "en" ? "Sport" : "종목"}</span>
                  <select value={shootingSport} onChange={(e) => {
                    const next = e.target.value as ShootingSportId;
                    setShootingSport(next);
                    setShootingDetail(SHOOTING_SPORTS[next][lang === "en" ? "en" : "ko"].details[0]);
                    setSelectedJoints(DEFAULT_JOINTS.shooting);
                  }}>
                    {(Object.keys(SHOOTING_SPORTS) as ShootingSportId[]).map((id) => (
                      <option key={id} value={id}>{SHOOTING_SPORTS[id][lang === "en" ? "en" : "ko"].name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{lang === "en" ? "Sub-motion" : "세부동작"}</span>
                  <select value={shootingDetail} onChange={(e) => setShootingDetail(e.target.value)}>
                    {shootingData[lang === "en" ? "en" : "ko"].details.map((detail) => (
                      <option key={detail} value={detail}>{detail}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="shooting-analysis-targets">
                <span>{lang === "en" ? "Applied analysis" : "적용 분석"}</span>
                <div>{shootingData.metrics.map((metric) => <b key={metric}>{metric}</b>)}</div>
              </div>
            </section>
          )}

          {selectedChapter?.id === "squat" && (
            <section className="setup-card squat-assessment-card">
              <div className="setup-card-header">
                <div>
                  <span className="panel-label">{lang === "en" ? "SQUAT ASSESSMENT" : "스쿼트 자세평가"}</span>
                  <h3>{lang === "en" ? "Live full-body squat check" : "실시간 전신 스쿼트 평가"}</h3>
                </div>
                <strong style={{ fontSize: 22 }}>
                  {squatAssessment.score !== null ? `${squatAssessment.score}/100` : "--"}
                </strong>
              </div>
              <div className="guide-summary">
                <div>
                  <span>{lang === "en" ? "Phase" : "현재 구간"}</span>
                  <strong>
                    {lang === "en"
                      ? ({ stand: "Stand", descent: "Descent", bottom: "Bottom", ascent: "Ascent", waiting: "Waiting" } as const)[squatAssessment.phase]
                      : ({ stand: "서있는 자세", descent: "하강", bottom: "최저점", ascent: "상승", waiting: "측정 대기" } as const)[squatAssessment.phase]}
                  </strong>
                </div>
                <div>
                  <span>{lang === "en" ? "Knee symmetry" : "무릎 좌우 대칭"}</span>
                  <strong>{squatAssessment.kneeSymmetry !== null ? `${squatAssessment.kneeSymmetry}%` : "--"}</strong>
                </div>
                <div>
                  <span>{lang === "en" ? "Depth" : "하강 깊이"}</span>
                  <strong>{squatAssessment.depth !== null ? `${squatAssessment.depth}%` : "--"}</strong>
                </div>
                <div>
                  <span>{lang === "en" ? "Hip symmetry" : "고관절 좌우 대칭"}</span>
                  <strong>{squatAssessment.hipSymmetry !== null ? `${squatAssessment.hipSymmetry}%` : "--"}</strong>
                </div>
              </div>
            </section>
          )}

          <div className="analysis-setup-grid">
            <section className="setup-card joint-settings-card">
              <div className="setup-card-header">
                <div>
                  <span className="panel-label">{copy.joints}</span>
                  <p>{lang === "en" ? "Choose the body regions emphasized during pose display." : "자세 표시와 각도 분석에 사용할 관절을 선택합니다."}</p>
                </div>
                <div className="setup-actions">
                  <button type="button" onClick={() => setSelectedJoints(Object.keys(JOINT_LANDMARKS) as JointId[])}>{copy.selectAll}</button>
                  <button type="button" onClick={() => setSelectedJoints([])}>{copy.clear}</button>
                </div>
              </div>
              <div className="joint-selector">
                {(Object.keys(JOINT_LANDMARKS) as JointId[]).map((joint) => {
                  const checked = selectedJoints.includes(joint);
                  return (
                    <label key={joint} className={`joint-option ${checked ? "selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedJoints((current) =>
                            current.includes(joint)
                              ? current.filter((item) => item !== joint)
                              : [...current, joint],
                          )
                        }
                      />
                      <span>{JOINT_LABELS[lang][joint]}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {currentGuide && (
              <section className="setup-card capture-guide-card">
                <div className="setup-card-header">
                  <div>
                    <span className="panel-label">{copy.guide}</span>
                    <h3>{selectedChapter?.id === "shooting" ? `${shootingCopy.name} · ${shootingDetail}` : currentGuide.action}</h3>
                  </div>
                </div>
                <div className="guide-summary">
                  <div><span>{copy.view}</span><strong>{currentGuide.view}</strong></div>
                  <div><span>{copy.distance}</span><strong>{currentGuide.distance}</strong></div>
                </div>
                <ul>
                  {currentGuide.tips.map((tip) => <li key={tip}>{tip}</li>)}
                </ul>
              </section>
            )}
          </div>

          {(selectedChapter?.id === "sprint" || selectedChapter?.id === "change-direction") && (
            <section className="setup-card speed-agility-test-card">
              <div className="setup-card-header">
                <div>
                  <span className="panel-label">{selectedChapter.id === "change-direction" ? "AGILITY TEST" : "SPRINT TEST"}</span>
                  <h3>{selectedChapter.id === "change-direction" ? "민첩성 측정" : "스프린트 측정"}</h3>
                </div>
                <strong className="speed-test-clock">{speedTestElapsed.toFixed(2)}s</strong>
              </div>
              <div className="speed-test-select-row">
                <label>
                  <span>측정 항목</span>
                  <select value={selectedSpeedTest.id} onChange={(event) => { setSelectedSpeedTestId(event.target.value); setSpeedTestRunning(false); setSpeedTestElapsed(0); setSpeedTestSplits([]); }} disabled={speedTestRunning}>
                    {availableSpeedAgilityTests.map((test) => <option key={test.id} value={test.id}>{test.label}</option>)}
                  </select>
                </label>
              </div>
              <p className="speed-test-note">{selectedSpeedTest.distance} · 전신을 화면에 유지 · 자세분석 LIVE</p>
              <div className="speed-test-actions">
                {!speedTestRunning ? <button type="button" onClick={startSpeedAgilityTest}>측정 시작</button> : <button type="button" onClick={finishSpeedAgilityTest}>측정 종료</button>}
                {speedTestRunning && selectedSpeedTest.split && <button type="button" onClick={recordSpeedAgilitySplit}>구간 기록</button>}
              </div>
              <div className="speed-test-splits">{speedTestSplits.length ? speedTestSplits.map((value, index) => <span key={`${value}-${index}`}>{index + 1}구간 <b>{value.toFixed(2)}s</b></span>) : <span>Split 테스트는 구간 기록 버튼으로 기록합니다.</span>}</div>
            </section>
          )}

          <div className="camera-layout">
            <div className="camera-preview-card">
              <div className="camera-preview">
                {!cameraActive && (
                  <div className="camera-placeholder">
                    <div className="camera-placeholder-icon">
                      ◎
                    </div>

                    <h2>
                      {aiLoading
                        ? copy.loading
                        : copy.fullBody}
                    </h2>

                    <p>
                      {copy.fullBodyDesc}
                    </p>

                    <button
                      className="start-camera-button"
                      onClick={
                        startCamera
                      }
                      disabled={
                        aiLoading
                      }
                    >
                      {aiLoading
                        ? copy.loading
                        : copy.startCamera}
                    </button>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className={`camera-video ${
                    cameraActive
                      ? "visible"
                      : ""
                  }`}
                  style={{ zIndex: 1 }}
                  autoPlay
                  muted
                  playsInline
                />

                <canvas
                  ref={canvasRef}
                  className={`pose-canvas ${
                    cameraActive
                      ? "visible"
                      : ""
                  }`}
                />

                {cameraActive && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        zIndex: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "7px 10px",
                        borderRadius: 5,
                        background: "rgba(0,0,0,.72)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".04em",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#ff4f5f",
                          display: "inline-block",
                        }}
                      />
                      REC {formatRecordingTime(recordingSeconds)}
                    </div>

                    <div className="camera-toolbar">
                      <button
                        className={
                          skeletonEnabled
                            ? "tool-active"
                            : ""
                        }
                        style={{ color: "#fff" }}
                        onClick={() =>
                          setSkeletonEnabled(
                            (
                              value,
                            ) =>
                              !value,
                          )
                        }
                      >
                        SKELETON{" "}
                        {skeletonEnabled
                          ? "ON"
                          : "OFF"}
                      </button>

                      <button
                        className={
                          angleEnabled
                            ? "tool-active"
                            : ""
                        }
                        style={{ color: "#fff" }}
                        onClick={() =>
                          setAngleEnabled(
                            (
                              value,
                            ) =>
                              !value,
                          )
                        }
                      >
                        ANGLE{" "}
                        {angleEnabled
                          ? "ON"
                          : "OFF"}
                      </button>
                    </div>

                    <div className="camera-status">
                      <i />
                      LIVE AI
                    </div>

                    <div
                      className={`pose-detected ${
                        fullBodyDetected
                          ? "detected"
                          : "warning"
                      }`}
                    >
                      {fullBodyDetected
                        ? `FULL BODY ${bodyDetectionScore}%`
                        : copy.bodyMoveBack}
                    </div>

                    <div className="camera-guide">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <div
                      className={`body-message ${
                        fullBodyDetected
                          ? "ok"
                          : ""
                      }`}
                    >
                      {fullBodyDetected
                        ? copy.detected
                        : copy.bodyFrame}
                    </div>
                  </>
                )}

                {analyzing && (
                  <div className="analysis-overlay">
                    <div className="analysis-spinner" />

                    <strong>
                      {copy.analyzing}
                    </strong>

                    <span>
                      {copy.analyzingDesc}
                    </span>
                  </div>
                )}

                {analysisComplete &&
                  analysisResults && (
                    <div className="analysis-complete">
                      <div className="analysis-check">
                        ✓
                      </div>

                      <h2>
                        {copy.complete}
                      </h2>

                      <p>
                        {copy.completeDesc}
                      </p>

                      <button
                        onClick={() =>
                          setAnalysisComplete(
                            false,
                          )
                        }
                      >
                        {copy.result}
                      </button>
                    </div>
                  )}
              </div>

              {cameraError && (
                <div className="camera-error">
                  {cameraError}
                </div>
              )}

              <div className="camera-controls">
                <button
                  className="secondary-camera-button"
                  onClick={goBack}
                >
                  ← {copy.back}
                </button>

                {cameraActive ? (
                  <>
                    <button
                      className="capture-button"
                      onClick={
                        runAnalysis
                      }
                      disabled={
                        analyzing ||
                        !canAnalyze
                      }
                    >
                      {analyzing
                        ? copy.analyzing
                        : fullBodyDetected
                          ? copy.analysisStart
                          : copy.needBody}
                    </button>

                    <button
                      className="secondary-camera-button"
                      onClick={
                        stopCamera
                      }
                    >
                      {copy.cameraEnd}
                    </button>
                  </>
                ) : (
                  <button
                    className="primary-camera-button"
                    onClick={
                      startCamera
                    }
                  >
                    {copy.startCamera}
                  </button>
                )}
              </div>
            {selectedChapter && (
              <section className="desktop-live-analysis-card">
                <div className="desktop-live-analysis-heading"><span className="panel-label">LIVE ANALYSIS</span><h2>분석 결과</h2></div>
                <div className="desktop-result-grid">
                  <div><span>신체 인식</span><strong>{bodyDetectionScore > 0 ? `${bodyDetectionScore}%` : "대기"}</strong></div>
                  <div><span>평균 무릎 각도</span><strong>{analysisResults?.averageKnee ?? "-"}</strong></div>
                  <div><span>왼쪽 무릎</span><strong>{metrics.leftKnee != null ? `${metrics.leftKnee}°` : "-"}</strong></div>
                  <div><span>오른쪽 무릎</span><strong>{metrics.rightKnee != null ? `${metrics.rightKnee}°` : "-"}</strong></div>
                  <div><span>평균 고관절</span><strong>{metrics.leftHip != null && metrics.rightHip != null ? `${Math.round((metrics.leftHip + metrics.rightHip) / 2)}°` : "-"}</strong></div>
                  <div><span>평균 팔꿈치</span><strong>{metrics.leftElbow != null && metrics.rightElbow != null ? `${Math.round((metrics.leftElbow + metrics.rightElbow) / 2)}°` : "-"}</strong></div>
                  <div><span>좌우 밸런스</span><strong>{analysisResults?.bodyControl ?? "-"}</strong></div>
                  <div><span>자세 상태</span><strong>{analysisResults ? "분석 완료" : "측정 대기"}</strong></div>
                </div>
                <div className="desktop-result-detail">
                  <div><span>자세분석</span><strong>{analysisResults ? "분석 완료" : "측정 대기"}</strong></div>
                  <div><span>신체 인식</span><strong>{bodyDetectionScore}%</strong></div>
                  <div><span>좌우 밸런스</span><strong>{analysisResults?.bodyControl ?? "-"}</strong></div>
                </div>
                <p className="desktop-result-note">카메라 하단에서 관절 각도, 전신 인식, 좌우 균형을 함께 확인합니다.</p>
                <div className="desktop-result-rows">
                  <div><span>{displayedMetrics[0] ?? "측정 항목 1"}</span><strong>{analysisResults ? "분석 완료" : "대기"}</strong><span>{displayedMetrics[1] ?? "측정 항목 2"}</span><strong>{analysisResults ? "분석 완료" : "대기"}</strong></div>
                  <div><span>{displayedMetrics[2] ?? "측정 항목 3"}</span><strong>{analysisResults ? "분석 완료" : "대기"}</strong><span>{displayedMetrics[3] ?? "측정 항목 4"}</span><strong>{analysisResults ? "분석 완료" : "대기"}</strong></div>
                </div>
              </section>
            )}

            {selectedChapter && currentGuide && (
              <section className="desktop-bottom-guide">
                <div className="desktop-bottom-guide-head"><span className="panel-label">GUIDE</span><h2>측정 데이터 대기</h2></div>
                <p>전신 인식이 완료되면 관절 각도와 좌우 밸런스를 함께 해석해 현재 자세 특성과 보강 운동을 제안합니다.</p>
                <div className="desktop-bottom-guide-divider" />
                <strong>추천 보강 운동</strong>
                <button type="button" disabled={!analysisResults}>측정 후 자동 추천</button>
              </section>
            )}

            </div>

            <aside className="camera-info-panel">
              <div className="info-panel-section">
                <span className="panel-label">
                  {copy.analysis}
                </span>

                <h2>
                  {currentChapterCopy?.title}
                </h2>

                <p>
                  {copy.analysis === "LIVE ANALYSIS"
                    ? "Live body tracking information is shown here."
                    : "카메라에서 인식된 신체 정보를 실시간으로 표시합니다."}
                </p>
              </div>

              <div className="calibration-panel">
                <span className="panel-label">
                  {copy.calibration}
                </span>

                <label>
                  {copy.athleteHeight}
                </label>

                <div className="height-input">
                  <input
                    type="number"
                    min="100"
                    max="230"
                    value={
                      athleteHeight
                    }
                    onChange={(event) =>
                      setAthleteHeight(
                        event.target
                          .value,
                      )
                    }
                  />

                  <span>
                    cm
                  </span>
                </div>

                <small>
                  {copy.usedForJump}
                </small>
              </div>

              <div className="info-panel-section">
                <span className="panel-label">
                  {analysisResults
                    ? "ANALYSIS RESULTS"
                    : "LIVE MEASUREMENTS"}
                </span>

                <div className="live-measurement-grid">
                  <LiveMetric
                    label={copy.kneeLeft}
                    value={
                      metrics.leftKnee !==
                      null
                        ? `${metrics.leftKnee}°`
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={copy.kneeRight}
                    value={
                      metrics.rightKnee !==
                      null
                        ? `${metrics.rightKnee}°`
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={copy.hipLeft}
                    value={
                      metrics.leftHip !==
                      null
                        ? `${metrics.leftHip}°`
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={copy.hipRight}
                    value={
                      metrics.rightHip !==
                      null
                        ? `${metrics.rightHip}°`
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={lang === "en" ? "L Shoulder" : "왼쪽 어깨"}
                    value={metrics.leftShoulder !== null ? `${metrics.leftShoulder}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "R Shoulder" : "오른쪽 어깨"}
                    value={metrics.rightShoulder !== null ? `${metrics.rightShoulder}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "L Elbow" : "왼쪽 팔꿈치"}
                    value={metrics.leftElbow !== null ? `${metrics.leftElbow}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "R Elbow" : "오른쪽 팔꿈치"}
                    value={metrics.rightElbow !== null ? `${metrics.rightElbow}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "L Wrist" : "왼쪽 손목"}
                    value={metrics.leftWrist !== null ? `${metrics.leftWrist}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "R Wrist" : "오른쪽 손목"}
                    value={metrics.rightWrist !== null ? `${metrics.rightWrist}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "L Ankle" : "왼쪽 발목"}
                    value={metrics.leftAnkle !== null ? `${metrics.leftAnkle}°` : "--"}
                  />

                  <LiveMetric
                    label={lang === "en" ? "R Ankle" : "오른쪽 발목"}
                    value={metrics.rightAnkle !== null ? `${metrics.rightAnkle}°` : "--"}
                  />

                  <LiveMetric
                    label={copy.jumpHeight}
                    value={
                      analysisResults
                        ? analysisResults.jumpHeight
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={copy.flightTime}
                    value={
                      analysisResults
                        ? analysisResults.flightTime
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={copy.landing}
                    value={
                      analysisResults
                        ? analysisResults.landingStability
                        : "--"
                    }
                  />

                  <LiveMetric
                    label={copy.confidence}
                    value={
                      metrics.confidence !==
                      null
                        ? `${metrics.confidence}%`
                        : "--"
                    }
                  />
                </div>
              </div>

              {analysisResults && (
                <div className="analysis-result-card">
                  <span>
                    ANALYSIS RESULT
                  </span>

                  <h3>
                    점프 분석 결과
                  </h3>

                  <div className="result-row">
                    <span>
                      점프 높이
                    </span>

                    <strong>
                      {
                        analysisResults.jumpHeight
                      }
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>
                      체공시간
                    </span>

                    <strong>
                      {
                        analysisResults.flightTime
                      }
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>
                      평균 무릎 각도
                    </span>

                    <strong>
                      {
                        analysisResults.averageKnee
                      }
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>
                      좌우 무릎 차이
                    </span>

                    <strong>
                      {
                        analysisResults.kneeDifference
                      }
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>
                      착지 안정성
                    </span>

                    <strong>
                      {
                        analysisResults.landingStability
                      }
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>
                      신체 제어
                    </span>

                    <strong>
                      {
                        analysisResults.bodyControl
                      }
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>
                      피로도
                    </span>

                    <strong>
                      {
                        analysisResults.fatigue
                      }
                    </strong>
                  </div>
                </div>
              )}

              <div className="gps-panel">
                <div className="gps-panel-header">
                  <div>
                    <span className="panel-label">GPS PERFORMANCE</span>
                    <h3>{gpsMetrics.connected ? (lang === "en" ? "GPS Connected" : "GPS 데이터 연결됨") : (lang === "en" ? "Connect Athlete GPS" : "선수 GPS 연동")}</h3>
                    <p>{lang === "en" ? "Combine GPS movement data with camera motion analysis." : "GPS 이동 데이터를 카메라 동작 분석과 함께 기록합니다."}</p>
                  </div>
                  <button type="button" className="gps-connect-button" onClick={connectGps} disabled={gpsConnecting}>{gpsConnecting ? (lang === "en" ? "Connecting..." : "연결 중...") : gpsMetrics.connected ? (lang === "en" ? "Connected" : "연결됨") : (lang === "en" ? "Connect GPS" : "GPS 연결")}</button>
                </div>
                <div className="gps-metric-grid">
                  <LiveMetric label={lang === "en" ? "Distance" : "총 이동거리"} value={gpsMetrics.distanceKm !== null ? `${gpsMetrics.distanceKm} km` : "--"} />
                  <LiveMetric label={lang === "en" ? "High-speed Distance" : "고속주행 거리"} value={gpsMetrics.highSpeedDistanceKm !== null ? `${gpsMetrics.highSpeedDistanceKm} km` : "--"} />
                  <LiveMetric label={lang === "en" ? "Max Speed" : "최고 속도"} value={gpsMetrics.maxSpeedKmh !== null ? `${gpsMetrics.maxSpeedKmh} km/h` : "--"} />
                  <LiveMetric label={lang === "en" ? "Sprints" : "스프린트 횟수"} value={gpsMetrics.sprintCount !== null ? `${gpsMetrics.sprintCount}` : "--"} />
                </div>
              </div>

              <div className="info-panel-section">
                <span className="panel-label">
                  DISPLAY
                </span>

                <div className="display-controls">
                  <button
                    className={`display-control ${
                      skeletonEnabled
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setSkeletonEnabled(
                        (
                          value,
                        ) =>
                          !value,
                      )
                    }
                  >
                    <span>
                      Skeleton
                    </span>

                    <strong>
                      {skeletonEnabled
                        ? "ON"
                        : "OFF"}
                    </strong>
                  </button>

                  <button
                    className={`display-control ${
                      angleEnabled
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setAngleEnabled(
                        (
                          value,
                        ) =>
                          !value,
                      )
                    }
                  >
                    <span>
                      Angle
                    </span>

                    <strong>
                      {angleEnabled
                        ? "ON"
                        : "OFF"}
                    </strong>
                  </button>
                </div>
              </div>

              {selectedChapter.fatigue && (
                <div className="fatigue-panel">
                  <span>
                    {lang === "en" ? "JUMP FATIGUE ANALYSIS" : "점프 피로도 분석"}
                  </span>

                  <h3>
                    {lang === "en" ? "Jump Fatigue" : "점프 피로도"}
                  </h3>

                  <p>
                    {lang === "en"
                      ? "Calculates a fatigue indicator from repeated movement data."
                        : "반복 동작 데이터를 기반으로 피로도 지표를 계산합니다."}
                  </p>

                  <div className="fatigue-score">
                    <strong>
                      {analysisResults
                        ? analysisResults.fatigue
                        : "--"}
                    </strong>

                    <span>
                      / 100
                    </span>
                  </div>
                </div>
              )}

              <div className="medical-warning">
                <strong>
                  {copy.caution}
                </strong>

                <p>
                  {copy.cautionText}
                </p>
              </div>
            </aside>
          </div>

        </section>
      )}
    </main>
  );
}

function LiveMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="live-metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}