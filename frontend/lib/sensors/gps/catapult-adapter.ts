import type { GpsSensorAdapter, NormalizedGpsData } from "../types";

/** Placeholder only. */
export const catapultAdapter: GpsSensorAdapter = {
  source: "catapult",
  normalize(_input: unknown): NormalizedGpsData {
    void _input;
    throw new Error("Catapult adapter requires authorized API access.");
  },
};
