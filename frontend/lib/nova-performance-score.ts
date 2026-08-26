export type NovaPerformanceScoreInputs = {
  gpsPerformance: number;
  movementAnalysis: number;
  jumpExplosiveness: number;
  trainingResponse: number;
  recoveryStatus: number;
  condition: number;
};

export type NovaPerformanceScoreBreakdown = {
  key: keyof NovaPerformanceScoreInputs;
  score: number;
  weight: number;
  contribution: number;
};

export type NovaPerformanceScoreResult = {
  score: number;
  breakdown: NovaPerformanceScoreBreakdown[];
};

const WEIGHTS: Record<keyof NovaPerformanceScoreInputs, number> = {
  gpsPerformance: 0.30,
  movementAnalysis: 0.25,
  jumpExplosiveness: 0.15,
  trainingResponse: 0.15,
  recoveryStatus: 0.10,
  condition: 0.05,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function calculateNovaPerformanceScore(
  inputs: NovaPerformanceScoreInputs,
): NovaPerformanceScoreResult {
  const breakdown = (Object.keys(WEIGHTS) as Array<keyof NovaPerformanceScoreInputs>).map((key) => {
    const score = clampScore(inputs[key]);
    const weight = WEIGHTS[key];
    return {
      key,
      score,
      weight,
      contribution: Number((score * weight).toFixed(2)),
    };
  });

  return {
    score: Math.round(breakdown.reduce((sum, item) => sum + item.contribution, 0)),
    breakdown,
  };
}

export function hasCompleteNovaPerformanceScoreInputs(
  inputs: Partial<NovaPerformanceScoreInputs>,
): inputs is NovaPerformanceScoreInputs {
  return (Object.keys(WEIGHTS) as Array<keyof NovaPerformanceScoreInputs>)
    .every((key) => typeof inputs[key] === "number" && Number.isFinite(inputs[key]));
}

export const NOVA_PERFORMANCE_SCORE_WEIGHTS = { ...WEIGHTS } as const;
