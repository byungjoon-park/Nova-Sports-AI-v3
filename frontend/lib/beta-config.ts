export const betaConfig = {
  enabled: process.env.NEXT_PUBLIC_BETA_ENABLED === "true",
  version: process.env.NEXT_PUBLIC_BETA_VERSION || "0.1.0",
  publicUrl: process.env.NEXT_PUBLIC_BETA_URL || "",
};
