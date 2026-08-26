import type { NormalizedWearableData } from "../types";

export function createWearableSimulatorData(playerId = "TEST001"): NormalizedWearableData {
  return {
    source: "simulator", playerId, timestamp: new Date().toISOString(),
    heartRateBpm: 148, restingHeartRateBpm: 58, hrvMs: 62,
    sleepHours: 7.5, recoveryScore: 82,
  };
}
