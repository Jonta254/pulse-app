import { NextRequest, NextResponse } from "next/server";

type RateLimitBucket = { count: number; resetAt: number };
const buckets = new Map<string, RateLimitBucket>();

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function readJsonBody<T>(req: NextRequest): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}

export function isRateLimited(req: NextRequest, key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bk = `${key}:${ip}`;
  const b = buckets.get(bk);
  if (!b || b.resetAt <= now) { buckets.set(bk, { count: 1, resetAt: now + windowMs }); return false; }
  b.count++;
  return b.count > limit;
}

export function rateLimitResponse() {
  const r = noStoreJson({ error: "Too many requests. Try again shortly." }, { status: 429 });
  r.headers.set("Retry-After", "60");
  return r;
}

export function isSafeMiniAppPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && path.length <= 120;
}

export function isWalletAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
