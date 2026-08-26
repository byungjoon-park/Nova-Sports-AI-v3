import type { NormalizedGpsData } from "../types";

export function createGpsSimulatorData(playerId = "TEST001"): NormalizedGpsData {
  return {
    source: "simulator", playerId, timestamp: new Date().toISOString(),
    distanceMeters: 8200, maxSpeedKmh: 28.4, sprintCount: 14,
    highSpeedRunningMeters: 620, load: 720,
  };
}
