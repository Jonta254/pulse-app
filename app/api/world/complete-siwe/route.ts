import { NextRequest } from "next/server";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "complete-siwe", 12)) return rateLimitResponse();

  const body = await readJsonBody<{ nonce?: string; payload?: Parameters<typeof verifySiweMessage>[0] }>(req);
  if (!body) return noStoreJson({ error: "Invalid request body." }, { status: 400 });

  const { nonce, payload } = body;
  const storedNonce = req.cookies.get("verdex_siwe_nonce")?.value;

  if (!nonce || !payload) return noStoreJson({ error: "Missing SIWE nonce or payload." }, { status: 400 });
  if (!storedNonce || storedNonce !== nonce) return noStoreJson({ ok: false, error: "Expired or mismatched nonce." }, { status: 401 });

  try {
    const verification = await verifySiweMessage(payload, nonce, "Sign in to VeRdex — Human Prediction Network.");
    if (!verification.isValid) return noStoreJson({ ok: false, error: "Invalid wallet signature." }, { status: 401 });

    const res = noStoreJson({ ok: true, address: verification.siweMessageData.address });
    res.cookies.delete("verdex_siwe_nonce");
    return res;
  } catch (err) {
    return noStoreJson({ ok: false, error: err instanceof Error ? err.message : "Auth failed." }, { status: 400 });
  }
}
