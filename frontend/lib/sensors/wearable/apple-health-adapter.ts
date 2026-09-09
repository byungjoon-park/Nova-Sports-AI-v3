import type { NormalizedWearableData, WearableSensorAdapter } from "../types";

/** Placeholder only. Real HealthKit authorization is required. */
export const appleHealthAdapter: WearableSensorAdapter = {
  source: "apple-health",
  normalize(_input: unknown): NormalizedWearableData {
    void _input;
    throw new Error("Apple Health adapter requires user authorization.");
  },
};
