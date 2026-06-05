import { NextRequest } from "next/server";
import { acceptClash, getClash, isPulseDbReady } from "@/lib/pulse/db";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

type AcceptBody = {
  clashId?: string;
  challengerNullifier?: string;
  challengerUsername?: string;
  txRef?: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "pulse-clash-accept", 5)) {
    return rateLimitResponse();
  }

  const body = await readJsonBody<AcceptBody>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  const { clashId, challengerNullifier, challengerUsername, txRef } = body;

  if (!clashId || !challengerNullifier || !txRef) {
    return noStoreJson({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isPulseDbReady()) {
    return noStoreJson({ ok: true, pendingSetup: true });
  }

  const result = await acceptClash(clashId, challengerNullifier, challengerUsername, txRef);
  if (!result.ok) {
    return noStoreJson({ ok: false, error: result.error }, { status: 409 });
  }

  const clash = await getClash(clashId);
  return noStoreJson({ ok: true, clash });
}
