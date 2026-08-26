export type PerformanceHistoryPoint = {
  date: string;
  score: number;
  gps: number;
  movementAnalysis: number;
  jump: number;
  trainingExecution: number;
  recovery: number;
  condition: number;
};

export function sortPerformanceHistory(
  points: PerformanceHistoryPoint[],
): PerformanceHistoryPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}
