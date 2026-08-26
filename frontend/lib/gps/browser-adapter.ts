import type {
  GpsAdapterCallbacks,
  GpsSessionMetrics,
} from "./types";

type Sample = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedKmh: number | null;
  timestamp: number;
};

const HIGH_SPEED_KMH = 15;
const SPRINT_KMH = 20;
const MAX_REASONABLE_SEGMENT_M = 250;

function haversineMeters(
  a: Sample,
  b: Sample,
): number {
  const earthRadius = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  );
}

function emptyMetrics(): GpsSessionMetrics {
  return {
    distanceKm: 0,
    highSpeedDistanceKm: 0,
    maxSpeedKmh: 0,
    sprintCount: 0,
    maxAcceleration: 0,
    maxDeceleration: 0,
    activeMinutes: 0,
  };
}

/**
 * Browser GPS adapter.
 *
 * This is deliberately provider-neutral: vendor devices can later implement
 * the same adapter contract and feed the same GpsSessionMetrics structure.
 */
export class BrowserGpsAdapter {
  private watchId: number | null = null;
  private previous: Sample | null = null;
  private metrics: GpsSessionMetrics = emptyMetrics();
  private sprintActive = false;
  private sessionStartedAt: number | null = null;
  private lastActiveAt: number | null = null;

  constructor(private readonly callbacks: GpsAdapterCallbacks = {}) {}

  async start(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.geolocation) {
      this.callbacks.onStatus?.("error");
      this.callbacks.onError?.(
        "이 브라우저는 GPS 위치 기능을 지원하지 않습니다.",
      );
      return false;
    }

    this.stop(false);
    this.metrics = emptyMetrics();
    this.previous = null;
    this.sprintActive = false;
    this.sessionStartedAt = Date.now();
    this.lastActiveAt = null;

    this.callbacks.onStatus?.("requesting");

    return await new Promise<boolean>((resolve) => {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.consume(position);
          this.callbacks.onStatus?.("tracking");
          resolve(true);
        },
        (error) => {
          this.callbacks.onStatus?.("error");

          const message =
            error.code === 1
              ? "위치 권한이 거부되었습니다."
              : error.code === 2
                ? "현재 GPS 위치를 확인할 수 없습니다."
                : "GPS 응답 시간이 초과되었습니다.";

          this.callbacks.onError?.(message);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15000,
        },
      );
    });
  }

  stop(notify = true): void {
    if (
      this.watchId !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = null;

    if (notify) {
      this.callbacks.onStatus?.("idle");
    }
  }

  private consume(position: GeolocationPosition): void {
    const next: Sample = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null,
      speedKmh:
        position.coords.speed !== null &&
        Number.isFinite(position.coords.speed)
          ? position.coords.speed * 3.6
          : null,
      timestamp: position.timestamp,
    };

    const previous = this.previous;

    if (previous) {
      const elapsedSeconds = Math.max(
        (next.timestamp - previous.timestamp) / 1000,
        0.1,
      );

      const segmentMeters = haversineMeters(previous, next);
      const accuracyLimit = Math.max(
        next.accuracy ?? 0,
        previous.accuracy ?? 0,
      );

      // Ignore implausible GPS jumps.
      if (
        segmentMeters <=
        Math.max(MAX_REASONABLE_SEGMENT_M, accuracyLimit * 4)
      ) {
        this.metrics.distanceKm += segmentMeters / 1000;

        const averageSpeed =
          segmentMeters / elapsedSeconds * 3.6;

        if (averageSpeed >= HIGH_SPEED_KMH) {
          this.metrics.highSpeedDistanceKm +=
            segmentMeters / 1000;
        }
      }

      const previousSpeed = previous.speedKmh;
      const currentSpeed = next.speedKmh;

      if (
        previousSpeed !== null &&
        currentSpeed !== null
      ) {
        const acceleration =
          (currentSpeed - previousSpeed) /
          elapsedSeconds;

        this.metrics.maxAcceleration = Math.max(
          this.metrics.maxAcceleration,
          acceleration,
        );

        this.metrics.maxDeceleration = Math.min(
          this.metrics.maxDeceleration,
          acceleration,
        );

        if (currentSpeed >= SPRINT_KMH) {
          if (!this.sprintActive) {
            this.metrics.sprintCount += 1;
            this.sprintActive = true;
          }
        } else if (currentSpeed < HIGH_SPEED_KMH) {
          this.sprintActive = false;
        }

        if (currentSpeed > 1) {
          this.lastActiveAt = next.timestamp;
        }
      }
    }

    const activeReference =
      this.lastActiveAt ?? this.sessionStartedAt;

    if (activeReference !== null) {
      this.metrics.activeMinutes = Math.max(
        0,
        (next.timestamp - activeReference) / 60000,
      );
    }

    if (next.speedKmh !== null) {
      this.metrics.maxSpeedKmh = Math.max(
        this.metrics.maxSpeedKmh,
        next.speedKmh,
      );
    }

    this.previous = next;
    this.callbacks.onMetrics?.({ ...this.metrics });
  }
}
