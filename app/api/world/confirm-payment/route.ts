import { NextRequest } from "next/server";
import { Tokens, tokenToDecimals } from "@worldcoin/minikit-js/commands";
import type { PayResult } from "@worldcoin/minikit-js/commands";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";
import { getWorldAppId, getWorldDevPortalApiKey, getVerdexTreasury } from "@/lib/worldConfig";

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "confirm-payment", 20)) return rateLimitResponse();

  const body = await readJsonBody<{ payload?: PayResult; reference?: string; feature?: string; amount?: number; token?: string }>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  const { payload, reference, amount } = body;
  const token = (body.token ?? "WLD").toUpperCase();

  const isValidRef = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference ?? "");
  if (!payload?.transactionId || !reference || payload.reference !== reference || !amount || !isValidRef) {
    return noStoreJson({ error: "Missing payment confirmation data." }, { status: 400 });
  }

  const appId = getWorldAppId();
  const apiKey = getWorldDevPortalApiKey();

  if (!appId || !apiKey) {
    return noStoreJson({ ok: false, pendingSetup: true, message: "Payment confirmation is being configured." });
  }

  const res = await fetch(`https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transactionId}?app_id=${appId}&type=payment`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const tx = await res.json() as Record<string, unknown>;

  // Auth/config problems (bad/missing API key) are real failures worth surfacing.
  if (res.status === 401 || res.status === 403) {
    return noStoreJson({ ok: false, error: "World payment lookup unauthorized.", tx }, { status: 502 });
  }
  // Anything else non-OK (e.g. 404 — tx not indexed yet) is transient: tell the
  // client to retry rather than hard-failing and dropping a paid bet.
  if (!res.ok) return noStoreJson({ ok: false, pending: true });

  const isMined = tx.transaction_status === "mined" || tx.status === "mined" || tx.transaction_status === "confirmed" || tx.status === "confirmed";
  if (!isMined) return noStoreJson({ ok: false, pending: true });

  const treasury = getVerdexTreasury().toLowerCase();
  const expectedAmounts = new Set([tokenToDecimals(amount, Tokens.WLD).toString(), Math.round(amount * 1_000_000).toString()]);
  const txRef = typeof tx.reference === "string" ? tx.reference : "";
  const txToken = typeof tx.token === "string" ? tx.token.toUpperCase() : "";
  const txAmount = typeof tx.token_amount === "string" ? tx.token_amount : "";
  const recipients = [tx.to, tx.recipient, tx.to_address, tx.recipient_address].filter((v): v is string => typeof v === "string").map((v) => v.toLowerCase());

  if (txRef && txRef !== reference) return noStoreJson({ ok: false, error: "Reference mismatch." }, { status: 400 });
  if (txToken && txToken !== token) return noStoreJson({ ok: false, error: "Token mismatch." }, { status: 400 });
  if (txAmount && !expectedAmounts.has(txAmount)) return noStoreJson({ ok: false, error: "Amount mismatch." }, { status: 400 });
  if (recipients.length > 0 && treasury && !recipients.includes(treasury)) return noStoreJson({ ok: false, error: "Recipient mismatch." }, { status: 400 });

  return noStoreJson({ ok: true, reference, amount, token, treasury });
}
