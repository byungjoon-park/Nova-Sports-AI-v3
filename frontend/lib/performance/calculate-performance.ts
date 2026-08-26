import type {
  PerformanceInputs,
  PerformanceResult,
  PerformanceWeights,
} from "./types";

export const DEFAULT_PERFORMANCE_WEIGHTS: PerformanceWeights = {
  gps: 0.30,
  movementAnalysis: 0.25,
  jump: 0.15,
  trainingExecution: 0.15,
  recovery: 0.10,
  condition: 0.05,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function calculatePerformanceScore(
  inputs: PerformanceInputs,
  weights: PerformanceWeights = DEFAULT_PERFORMANCE_WEIGHTS,
): PerformanceResult {
  const keys = Object.keys(weights) as Array<keyof PerformanceInputs>;

  const breakdown = keys.map((key) => {
    const score = clampScore(inputs[key]);
    const weight = weights[key];
    const contribution = score * weight;

    return {
      key,
      score,
      weight,
      contribution,
    };
  });

  const score = Math.round(
    breakdown.reduce((total, item) => total + item.contribution, 0),
  );

  return { score, breakdown };
}
