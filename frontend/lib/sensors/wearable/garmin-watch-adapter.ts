import type { NormalizedWearableData, WearableSensorAdapter } from "../types";

/** Placeholder only. */
export const garminWatchAdapter: WearableSensorAdapter = {
  source: "garmin-watch",
  normalize(_input: unknown): NormalizedWearableData {
    void _input;
    throw new Error("Garmin wearable adapter requires authorized API access.");
  },
};
