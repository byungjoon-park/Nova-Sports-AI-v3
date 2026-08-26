"use client";

type Language = "ko" | "en";
type ChapterId =
  | "sprint"
  | "running"
  | "jump"
  | "shooting"
  | "change-direction"
  | "athletics"
  | "squat";

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

type Props = {
  lang: Language;
  chapterId: ChapterId;
  results: AnalysisResults;
  shootingSport?: string;
  shootingDetail?: string;
};

type Recommendation = {
  title: string;
  reason: string;
  exercises: string[];
  priority: "high" | "medium" | "normal";
};

const numberValue = (value: string) => {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

function buildRecommendations({
  lang,
  chapterId,
  results,
  shootingSport,
}: Props): Recommendation[] {
  const kneeDifference = numberValue(results.kneeDifference);
  const fatigue = numberValue(results.fatigue);
  const bodyControl = numberValue(results.bodyControl);
  const landing = numberValue(results.landingStability);

  const recommendations: Recommendation[] = [];

  if (fatigue !== null && fatigue >= 70) {
    recommendations.push(
      lang === "en"
        ? {
            title: "Reduce load and recover",
            reason: "The current fatigue indicator is high. Prioritize recovery before high-intensity repetitions.",
            exercises: ["Low-intensity walking", "Breathing + trunk reset", "Gentle ankle/hip mobility"],
            priority: "high",
          }
        : {
            title: "훈련 부하를 낮추고 회복",
            reason: "현재 피로도 지표가 높습니다. 고강도 반복보다 회복을 우선하세요.",
            exercises: ["저강도 걷기", "호흡 + 몸통 리셋", "가벼운 발목·고관절 가동성"],
            priority: "high",
          },
    );
  }

  if (kneeDifference !== null && kneeDifference >= 8) {
    recommendations.push(
      lang === "en"
        ? {
            title: "Improve left-right control",
            reason: `The knee-angle difference is ${kneeDifference}°. Add unilateral control work and re-test symmetry.`,
            exercises: ["Single-leg balance", "Split squat", "Lateral step-down"],
            priority: "high",
          }
        : {
            title: "좌우 움직임 제어 개선",
            reason: `좌우 무릎 각도 차이가 ${kneeDifference}°입니다. 편측 제어 운동 후 대칭성을 다시 측정하세요.`,
            exercises: ["한발 균형", "스플릿 스쿼트", "사이드 스텝다운"],
            priority: "high",
          },
    );
  }

  if (landing !== null && landing < 80) {
    recommendations.push(
      lang === "en"
        ? {
            title: "Landing mechanics",
            reason: "Landing stability is below the target reference. Practice controlled deceleration and quiet landings.",
            exercises: ["Snap-down", "Low box landing", "Stick landing + hold"],
            priority: "medium",
          }
        : {
            title: "착지 동작 안정화",
            reason: "착지 안정성 지표가 기준보다 낮습니다. 감속과 안정된 착지 동작을 반복하세요.",
            exercises: ["스냅다운", "낮은 박스 착지", "착지 후 정지 유지"],
            priority: "medium",
          },
    );
  }

  if (bodyControl !== null && bodyControl < 80) {
    recommendations.push(
      lang === "en"
        ? {
            title: "Improve movement control",
            reason: "Body-control score is below the target reference. Use slower, controlled repetitions before adding speed.",
            exercises: ["Tempo squat", "Dead bug", "Single-leg reach"],
            priority: "medium",
          }
        : {
            title: "동작 제어 능력 개선",
            reason: "신체 제어 지표가 기준보다 낮습니다. 속도를 높이기 전에 느리고 정확한 반복을 진행하세요.",
            exercises: ["템포 스쿼트", "데드버그", "한발 리치"],
            priority: "medium",
          },
    );
  }

  const chapterDefaults: Record<ChapterId, Recommendation> = {
    sprint: {
      title: lang === "en" ? "Acceleration mechanics" : "가속 동작 강화",
      reason: lang === "en" ? "Build acceleration quality with controlled sprint drills." : "가속 구간의 움직임 품질을 높이는 기본 드릴입니다.",
      exercises: lang === "en" ? ["Wall acceleration drill", "A-skip", "10 m acceleration repeats"] : ["월 가속 드릴", "A-스킵", "10m 가속 반복"],
      priority: "normal",
    },
    running: {
      title: lang === "en" ? "Running control" : "러닝 동작 제어",
      reason: lang === "en" ? "Reinforce stable single-leg support and running posture." : "한발 지지와 러닝 자세의 안정성을 강화합니다.",
      exercises: lang === "en" ? ["Single-leg balance", "Marching drill", "Calf raise"] : ["한발 균형", "마칭 드릴", "카프 레이즈"],
      priority: "normal",
    },
    jump: {
      title: lang === "en" ? "Jump and landing quality" : "점프·착지 품질 강화",
      reason: lang === "en" ? "Build repeatable take-off and landing mechanics." : "반복 가능한 도약과 착지 동작을 만드는 기본 운동입니다.",
      exercises: lang === "en" ? ["Countermovement jump", "Snap-down", "Stick landing"] : ["카운터무브먼트 점프", "스냅다운", "착지 후 정지"],
      priority: "normal",
    },
    shooting: {
      title: lang === "en" ? `${shootingSport ?? "Sport"} shooting control` : `${shootingSport ?? "종목"} 슈팅 동작 제어`,
      reason: lang === "en" ? "Use the selected sport movement as the primary practice pattern and re-check the measured joints." : "선택한 종목의 동작 패턴을 중심으로 연습하고 측정 관절을 다시 확인합니다.",
      exercises: lang === "en" ? ["Approach-to-stop drill", "Single-leg stability", "Hip rotation control"] : ["접근→정지 드릴", "한발 안정화", "고관절 회전 제어"],
      priority: "normal",
    },
    "change-direction": {
      title: lang === "en" ? "Deceleration and cutting" : "감속·방향 전환 강화",
      reason: lang === "en" ? "Improve braking control before increasing change-of-direction speed." : "방향 전환 속도를 높이기 전에 감속 제어를 우선합니다.",
      exercises: lang === "en" ? ["Deceleration drill", "Lateral lunge", "5-5 shuttle at controlled speed"] : ["감속 드릴", "사이드 런지", "통제된 속도의 5-5 셔틀"],
      priority: "normal",
    },
    athletics: {
      title: lang === "en" ? "Baseline athletic movement" : "기초 체력 동작 강화",
      reason: lang === "en" ? "Build a repeatable baseline before increasing testing intensity." : "측정 강도를 높이기 전에 반복 가능한 기본 동작을 만듭니다.",
      exercises: lang === "en" ? ["A-skip", "Squat pattern", "Low-volume repeated jumps"] : ["A-스킵", "스쿼트 패턴", "저볼륨 반복 점프"],
      priority: "normal",
    },
    squat: {
      title: lang === "en" ? "Squat movement quality" : "스쿼트 동작 품질 강화",
      reason: lang === "en" ? "Use controlled tempo and alignment-focused repetitions." : "속도보다 정렬과 제어를 우선한 반복을 진행합니다.",
      exercises: lang === "en" ? ["Tempo squat", "Box squat", "Ankle mobility drill"] : ["템포 스쿼트", "박스 스쿼트", "발목 가동성 드릴"],
      priority: "normal",
    },
  };

  if (recommendations.length < 3) recommendations.push(chapterDefaults[chapterId]);
  return recommendations.slice(0, 3);
}

export default function ExerciseRecommendation(props: Props) {
  const recommendations = buildRecommendations(props);
  const title = props.lang === "en" ? "EXERCISE RECOMMENDATION" : "운동 추천";
  const description =
    props.lang === "en"
      ? "Recommendations are generated from the current motion-analysis indicators for training reference."
      : "현재 동작분석 지표를 바탕으로 훈련 참고용 운동을 추천합니다.";
  const note =
    props.lang === "en"
      ? "Training reference only. This is not a medical diagnosis or treatment plan."
      : "훈련 참고용 기능입니다. 의료적 진단이나 치료 계획이 아닙니다.";

  return (
    <section
      className="exercise-recommendation-card"
      style={{
        marginTop: 16,
        padding: 20,
        borderRadius: 14,
        border: "1px solid var(--nova-border, rgba(20,30,45,.10))",
        background: "var(--nova-surface, #fffaf0)",
        color: "var(--nova-text, #101828)",
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: ".12em", opacity: .65 }}>{title}</span>
      <h3 style={{ margin: "7px 0 5px", fontSize: 18 }}>{props.lang === "en" ? "Personalized training suggestions" : "개인별 운동추천"}</h3>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, opacity: .7 }}>{description}</p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {recommendations.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            style={{
              padding: 14,
              borderRadius: 11,
              background: "var(--nova-soft-surface, rgba(20,30,45,.035))",
              border: "1px solid var(--nova-border, rgba(20,30,45,.07))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <strong style={{ fontSize: 13 }}>{item.title}</strong>
              <span style={{ fontSize: 9, letterSpacing: ".08em", opacity: .65 }}>
                {props.lang === "en" ? item.priority.toUpperCase() : item.priority === "high" ? "우선" : item.priority === "medium" ? "권장" : "기본"}
              </span>
            </div>
            <p style={{ margin: "7px 0 9px", fontSize: 11, lineHeight: 1.55, opacity: .72 }}>{item.reason}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {item.exercises.map((exercise) => (
                <span
                  key={exercise}
                  style={{
                    padding: "6px 9px",
                    borderRadius: 999,
                    fontSize: 10,
                    background: "var(--nova-surface-strong, rgba(30,90,210,.08))",
                    border: "1px solid var(--nova-border, rgba(30,90,210,.10))",
                  }}
                >
                  {exercise}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p style={{ margin: "13px 0 0", fontSize: 10, lineHeight: 1.5, opacity: .55 }}>{note}</p>
    </section>
  );
}
