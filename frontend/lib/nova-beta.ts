"use client";

export type NovaBetaConfig = {
  enabled: boolean;
  code: string;
  updatedAt: string;
};

const KEY = "nova-beta-config-v1";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getBetaConfig(): NovaBetaConfig {
  if (typeof window === "undefined") return { enabled: false, code: "", updatedAt: "" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { enabled: false, code: "", updatedAt: "" };
    const parsed = JSON.parse(raw) as Partial<NovaBetaConfig>;
    return {
      enabled: parsed.enabled === true,
      code: typeof parsed.code === "string" ? parsed.code : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { enabled: false, code: "", updatedAt: "" };
  }
}

export function saveBetaConfig(input: { enabled: boolean; code?: string }): NovaBetaConfig {
  const config: NovaBetaConfig = {
    enabled: input.enabled,
    code: input.code?.trim().toUpperCase() || randomCode(),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(config));
  return config;
}

export function regenerateBetaCode(): NovaBetaConfig {
  const current = getBetaConfig();
  return saveBetaConfig({ enabled: current.enabled, code: randomCode() });
}

export function isBetaCodeValid(code: string): boolean {
  const config = getBetaConfig();
  return config.enabled && Boolean(config.code) && code.trim().toUpperCase() === config.code;
}
