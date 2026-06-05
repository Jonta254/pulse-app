export const PULSE_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "app_staging_placeholder";

export function getWorldAppId() {
  return process.env.NEXT_PUBLIC_WORLD_APP_ID ?? PULSE_APP_ID;
}

export function getWorldDevPortalApiKey() {
  return process.env.DEV_PORTAL_API_KEY ?? "";
}

export function getPulseTreasury() {
  return process.env.NEXT_PUBLIC_PULSE_TREASURY ?? "";
}
