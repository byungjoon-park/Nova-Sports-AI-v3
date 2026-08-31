import type { GpsSensorAdapter, NormalizedGpsData } from "../types";

/** Placeholder only. No live Garmin data is accessed. */
export const garminGpsAdapter: GpsSensorAdapter = {
  source: "garmin-gps",
  normalize(_input: unknown): NormalizedGpsData {
    void _input;
    throw new Error("Garmin GPS adapter requires authorized API access.");
  },
};
