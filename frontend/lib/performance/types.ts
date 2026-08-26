export type PerformanceInputs = {
  gps: number;
  movementAnalysis: number;
  jump: number;
  trainingExecution: number;
  recovery: number;
  condition: number;
};

export type PerformanceWeights = {
  gps: number;
  movementAnalysis: number;
  jump: number;
  trainingExecution: number;
  recovery: number;
  condition: number;
};

export type PerformanceBreakdown = {
  key: keyof PerformanceInputs;
  score: number;
  weight: number;
  contribution: number;
};

export type PerformanceResult = {
  score: number;
  breakdown: PerformanceBreakdown[];
};
