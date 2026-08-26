import type { PerformanceResult } from "./types";

export type PerformanceReportRow = {
  label: string;
  score: number;
  weightPercent: number;
  contribution: number;
};

export function createPerformanceReportRows(
  result: PerformanceResult,
  labels: Record<PerformanceResult["breakdown"][number]["key"], string>,
): PerformanceReportRow[] {
  return result.breakdown.map((item) => ({
    label: labels[item.key],
    score: item.score,
    weightPercent: Math.round(item.weight * 100),
    contribution: Math.round(item.contribution * 10) / 10,
  }));
}
