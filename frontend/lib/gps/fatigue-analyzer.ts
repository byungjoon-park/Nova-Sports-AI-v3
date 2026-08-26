import type { GpsSessionMetrics } from "./types";

export type GpsFatigueLevel = "normal" | "caution" | "high";

export type GpsFatigueResult = {
  level: GpsFatigueLevel;
  score: number;
  reasons: string[];
  recommendations: string[];
};

export type GpsFatigueBaseline = {
  typicalDistanceKm?: number;
  typicalHighSpeedDistanceKm?: number;
  typicalMaxSpeedKmh?: number;
  typicalSprintCount?: number;
  typicalActiveMinutes?: number;
};

/**
 * GPS-only fatigue screening.
 *
 * This is a training-load warning layer, not a medical diagnosis.
 * Baselines should eventually come from the athlete's historical sessions.
 */
export function analyzeGpsFatigue(
  metrics: GpsSessionMetrics,
  baseline: GpsFatigueBaseline = {},
): GpsFatigueResult {
  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];

  const distanceRatio =
    baseline.typicalDistanceKm && baseline.typicalDistanceKm > 0
      ? metrics.distanceKm / baseline.typicalDistanceKm
      : null;

  const highSpeedRatio =
    baseline.typicalHighSpeedDistanceKm &&
    baseline.typicalHighSpeedDistanceKm > 0
      ? metrics.highSpeedDistanceKm / baseline.typicalHighSpeedDistanceKm
      : null;

  const sprintRatio =
    baseline.typicalSprintCount && baseline.typicalSprintCount > 0
      ? metrics.sprintCount / baseline.typicalSprintCount
      : null;

  // Session-volume signals.
  if (distanceRatio !== null && distanceRatio >= 1.35) {
    score += 25;
    reasons.push("평소보다 총 이동거리가 크게 높습니다.");
  }

  if (highSpeedRatio !== null && highSpeedRatio >= 1.4) {
    score += 25;
    reasons.push("고속주행 부하가 평소보다 크게 높습니다.");
  }

  if (sprintRatio !== null && sprintRatio >= 1.5) {
    score += 20;
    reasons.push("스프린트 횟수가 평소보다 크게 높습니다.");
  }

  // Absolute session signals when a baseline is not yet available.
  if (metrics.distanceKm >= 8) {
    score += 15;
    reasons.push("이번 세션의 총 이동거리가 높습니다.");
  }

  if (metrics.highSpeedDistanceKm >= 1.5) {
    score += 15;
    reasons.push("고속주행 누적거리가 높습니다.");
  }

  if (metrics.sprintCount >= 12) {
    score += 15;
    reasons.push("스프린트 반복 횟수가 높습니다.");
  }

  if (metrics.maxAcceleration >= 4.0) {
    score += 10;
    reasons.push("높은 가속 부하가 기록되었습니다.");
  }

  if (Math.abs(metrics.maxDeceleration) >= 4.0) {
    score += 10;
    reasons.push("높은 감속 부하가 기록되었습니다.");
  }

  if (metrics.activeMinutes >= 90) {
    score += 10;
    reasons.push("활동 시간이 깁니다.");
  }

  score = Math.min(score, 100);

  let level: GpsFatigueLevel = "normal";

  if (score >= 60) {
    level = "high";
    recommendations.push("고강도 추가 훈련을 줄이고 회복 상태를 확인하세요.");
    recommendations.push("다음 훈련 전 점프/동작분석 결과와 함께 확인하세요.");
  } else if (score >= 30) {
    level = "caution";
    recommendations.push("다음 세션의 고강도 구간과 스프린트 볼륨을 주의해서 관리하세요.");
    recommendations.push("선수의 주관적 피로도와 재활 상태를 함께 확인하세요.");
  } else {
    recommendations.push("현재 GPS 기반 훈련부하 경고 기준에서는 큰 주의 신호가 없습니다.");
  }

  return {
    level,
    score,
    reasons,
    recommendations,
  };
}
