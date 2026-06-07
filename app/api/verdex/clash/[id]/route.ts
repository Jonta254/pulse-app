import { NextRequest } from "next/server";
import { getClash, getClashesByNullifier, isVerdexDbReady } from "@/lib/verdex/db";
import { isRateLimited, noStoreJson, rateLimitResponse } from "@/lib/serverApi";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isRateLimited(req, "verdex-clash-get", 30)) {
    return rateLimitResponse();
  }

  const { id } = await params;

  if (!isVerdexDbReady()) {
    return noStoreJson({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  // `mine` param returns all clashes for a nullifier
  if (id === "mine") {
    const nullifier = req.nextUrl.searchParams.get("nullifier");
    if (!nullifier) return noStoreJson({ error: "nullifier required." }, { status: 400 });
    const clashes = await getClashesByNullifier(nullifier);
    return noStoreJson({ ok: true, clashes: clashes ?? [] });
  }

  const clash = await getClash(id);
  if (!clash) {
    return noStoreJson({ ok: false, error: "Clash not found." }, { status: 404 });
  }

  return noStoreJson({ ok: true, clash });
}
