import type {
  GpsSensorAdapter, NormalizedGpsData,
  NormalizedWearableData, WearableSensorAdapter,
} from "./types";

export function normalizeGps(adapter: GpsSensorAdapter, input: unknown): NormalizedGpsData {
  return adapter.normalize(input);
}

export function normalizeWearable(
  adapter: WearableSensorAdapter, input: unknown,
): NormalizedWearableData {
  return adapter.normalize(input);
}
