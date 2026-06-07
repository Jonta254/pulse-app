import { NextRequest } from "next/server";
import { createClash, isVerdexDbReady } from "@/lib/verdex/db";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";
import type { VerdexClash } from "@/types/verdex";

type CreateClashBody = {
  id?: string;
  marketId?: string;
  marketTitle?: string;
  creatorNullifier?: string;
  creatorUsername?: string;
  creatorPosition?: "yes" | "no";
  stakeWld?: number;
  creatorTxRef?: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-clash-create", 5)) {
    return rateLimitResponse();
  }

  const body = await readJsonBody<CreateClashBody>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  const { id, marketId, marketTitle, creatorNullifier, creatorUsername, creatorPosition, stakeWld, creatorTxRef } = body;

  if (!id || !marketId || !marketTitle || !creatorNullifier || !creatorPosition || !stakeWld || !creatorTxRef) {
    return noStoreJson({ error: "Missing required clash fields." }, { status: 400 });
  }

  if (!["yes", "no"].includes(creatorPosition)) {
    return noStoreJson({ error: "Position must be yes or no." }, { status: 400 });
  }

  if (stakeWld <= 0 || stakeWld > 100) {
    return noStoreJson({ error: "Stake must be between 0.1 and 100 WLD." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const clash: VerdexClash = {
    id,
    marketId,
    marketTitle,
    creatorNullifier,
    creatorUsername,
    creatorPosition,
    challengerPosition: creatorPosition === "yes" ? "no" : "yes",
    stakeWld,
    creatorTxRef,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  if (!isVerdexDbReady()) {
    return noStoreJson({ ok: true, clash, pendingSetup: true });
  }

  const saved = await createClash(clash);
  if (!saved) {
    return noStoreJson({ ok: false, error: "Failed to create clash." }, { status: 500 });
  }

  return noStoreJson({ ok: true, clash });
}
