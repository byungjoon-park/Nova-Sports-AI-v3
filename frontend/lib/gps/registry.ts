import type {
  GpsProvider,
  GpsProviderId,
} from "./provider";

export class GpsProviderRegistry {
  private readonly providers = new Map<GpsProviderId, GpsProvider>();

  register(provider: GpsProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: GpsProviderId): GpsProvider | undefined {
    return this.providers.get(id);
  }

  list(): GpsProvider[] {
    return Array.from(this.providers.values());
  }
}
