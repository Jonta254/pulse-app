import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

// tip-verdex allows variable amounts 0.1–100 WLD for bets and clash stakes
function isValidPulsePayment(feature: string, amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (feature === "tip-verdex") return amount >= 0.1 && amount <= 100 && Number(amount.toFixed(2)) === amount;
  return false;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "payment-reference", 20)) return rateLimitResponse();

  const body = await readJsonBody<{ feature?: string; amount?: number; token?: string }>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  const { feature, amount } = body;
  const token = (body.token ?? "WLD").toUpperCase();

  if (!feature || !amount || !isValidPulsePayment(feature, amount) || token !== "WLD") {
    return noStoreJson({ error: "Invalid payment feature or amount." }, { status: 400 });
  }

  return noStoreJson({ reference: randomUUID(), feature, token });
}
