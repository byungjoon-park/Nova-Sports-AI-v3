export type SensorSource =
  | "simulator" | "fitogether" | "garmin-gps" | "catapult" | "statsports"
  | "apple-health" | "samsung-health" | "garmin-watch" | "polar" | "fitbit";

export type NormalizedGpsData = {
  source: SensorSource; playerId: string; timestamp: string;
  distanceMeters: number; maxSpeedKmh: number; sprintCount: number;
  highSpeedRunningMeters: number; load: number;
};

export type NormalizedWearableData = {
  source: SensorSource; playerId: string; timestamp: string;
  heartRateBpm: number | null; restingHeartRateBpm: number | null;
  hrvMs: number | null; sleepHours: number | null; recoveryScore: number | null;
};

export interface GpsSensorAdapter {
  readonly source: SensorSource;
  normalize(input: unknown): NormalizedGpsData;
}

export interface WearableSensorAdapter {
  readonly source: SensorSource;
  normalize(input: unknown): NormalizedWearableData;
}
