export type GpsAdapterStatus =
  | "idle"
  | "requesting"
  | "tracking"
  | "error";

export type GpsSessionMetrics = {
  distanceKm: number;
  highSpeedDistanceKm: number;
  maxSpeedKmh: number;
  sprintCount: number;
  maxAcceleration: number;
  maxDeceleration: number;
  activeMinutes: number;
};

export type GpsAdapterCallbacks = {
  onStatus?: (status: GpsAdapterStatus) => void;
  onMetrics?: (metrics: GpsSessionMetrics) => void;
  onError?: (message: string) => void;
};
