import type { GpsSessionMetrics } from "./types";
import type {
  GpsConnectionState,
  GpsProvider,
  GpsProviderCapabilities,
  GpsProviderContext,
} from "./provider";
import { BrowserGpsAdapter } from "./browser-adapter";

export class BrowserGpsProvider implements GpsProvider {
  readonly id = "browser" as const;
  readonly name = "Browser GPS";

  readonly capabilities: GpsProviderCapabilities = {
    realtime: true,
    historical: false,
    position: true,
    speed: true,
    acceleration: true,
    heartRate: false,
    deviceIdentity: false,
  };

  private state: GpsConnectionState = "disconnected";
  private readonly metricsListeners = new Set<
    (metrics: GpsSessionMetrics) => void
  >();
  private readonly stateListeners = new Set<
    (state: GpsConnectionState) => void
  >();
  private adapter: BrowserGpsAdapter | null = null;

  async connect(_context?: GpsProviderContext): Promise<void> {
    this.setState("connecting");

    this.adapter = new BrowserGpsAdapter({
      onStatus: (status) => {
        if (status === "requesting") this.setState("connecting");
        if (status === "tracking") this.setState("connected");
        if (status === "idle") this.setState("disconnected");
        if (status === "error") this.setState("error");
      },
      onMetrics: (metrics) => {
        this.metricsListeners.forEach((listener) => listener(metrics));
      },
    });

    const started = await this.adapter.start();

    if (!started) {
      this.setState("error");
    }
  }

  async disconnect(): Promise<void> {
    this.adapter?.stop();
    this.adapter = null;
    this.setState("disconnected");
  }

  getState(): GpsConnectionState {
    return this.state;
  }

  onMetrics(listener: (metrics: GpsSessionMetrics) => void): () => void {
    this.metricsListeners.add(listener);
    return () => this.metricsListeners.delete(listener);
  }

  onStateChange(
    listener: (state: GpsConnectionState) => void,
  ): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(state: GpsConnectionState): void {
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }
}
