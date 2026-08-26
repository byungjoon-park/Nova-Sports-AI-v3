import type { GpsSessionMetrics } from "./types";

export type GpsProviderId =
  | "browser"
  | "garmin_connect"
  | "garmin_health_sdk"
  | "catapult_openfield"
  | "file_import";

export type GpsProviderCapabilities = {
  realtime: boolean;
  historical: boolean;
  position: boolean;
  speed: boolean;
  acceleration: boolean;
  heartRate: boolean;
  deviceIdentity: boolean;
};

export type GpsConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type GpsProviderContext = {
  athleteId?: string;
  accessToken?: string;
  externalAthleteId?: string;
};

export interface GpsProvider {
  readonly id: GpsProviderId;
  readonly name: string;
  readonly capabilities: GpsProviderCapabilities;

  connect(context?: GpsProviderContext): Promise<void>;
  disconnect(): Promise<void>;

  getState(): GpsConnectionState;

  onMetrics(listener: (metrics: GpsSessionMetrics) => void): () => void;

  onStateChange(
    listener: (state: GpsConnectionState) => void,
  ): () => void;
}
