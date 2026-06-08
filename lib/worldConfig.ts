export const VERDEX_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "app_staging_placeholder";

export function getWorldAppId() {
  return process.env.NEXT_PUBLIC_WORLD_APP_ID ?? VERDEX_APP_ID;
}

export function getWorldDevPortalApiKey() {
  return process.env.DEV_PORTAL_API_KEY ?? "";
}

export function getVerdexTreasury() {
  // Accept either name — old deployments may still have PULSE_TREASURY set
  return process.env.NEXT_PUBLIC_VERDEX_TREASURY ?? process.env.NEXT_PUBLIC_PULSE_TREASURY ?? "";
}
