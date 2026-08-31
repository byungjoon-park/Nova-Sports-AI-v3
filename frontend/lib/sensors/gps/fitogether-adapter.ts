import type { GpsSensorAdapter, NormalizedGpsData } from "../types";

/** Placeholder only. No Fitogether service is accessed before authorization. */
export const fitogetherAdapter: GpsSensorAdapter = {
  source: "fitogether",
  normalize(_input: unknown): NormalizedGpsData {
    void _input;
    throw new Error("Fitogether adapter requires authorized API access.");
  },
};
