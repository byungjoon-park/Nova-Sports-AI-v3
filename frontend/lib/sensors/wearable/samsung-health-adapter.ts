import type { NormalizedWearableData, WearableSensorAdapter } from "../types";

/** Placeholder only. */
export const samsungHealthAdapter: WearableSensorAdapter = {
  source: "samsung-health",
  normalize(_input: unknown): NormalizedWearableData {
    throw new Error("Samsung Health adapter requires user authorization.");
  },
};
