import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

export async function GET(req: NextRequest) {
  if (isRateLimited(req, "nonce", 30)) return rateLimitResponse();
  const nonce = randomUUID().replace(/-/g, "");
  const res = noStoreJson({ nonce });
  res.cookies.set("verdex_siwe_nonce", nonce, {
    httpOnly: true, secure: true, sameSite: "none", maxAge: 600, path: "/",
  });
  return res;
}
