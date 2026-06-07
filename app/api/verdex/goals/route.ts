import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";
import { PLATFORM_FEE_BPS } from "@/lib/verdex/data";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── GET /api/verdex/goals — list open goals ────────────────────────────────────
export async function GET(req: NextRequest) {
  if (isRateLimited(req, "verdex-goals-get", 30)) return rateLimitResponse();

  const client = db();
  if (!client) return noStoreJson({ ok: true, goals: [], source: "no-db" });

  const { data, error } = await client
    .from("verdex_goals")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[verdex/goals] GET error:", error.message);
    return noStoreJson({ ok: false, error: "Failed to fetch goals." }, { status: 500 });
  }

  return noStoreJson({ ok: true, goals: data ?? [], source: "db" });
}

// ── POST /api/verdex/goals — create a goal ─────────────────────────────────────
type CreateGoalBody = {
  id: string;
  worldNullifier: string;
  username: string;
  title: string;
  stakeWld: number;
  deadlineDays: number;
  txReference: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "verdex-goals-create", 5)) return rateLimitResponse();

  const body = await readJsonBody<CreateGoalBody>(req);
  if (!body) return noStoreJson({ error: "Invalid body." }, { status: 400 });

  const { id, worldNullifier, username, title, stakeWld, deadlineDays, txReference } = body;

  if (!id || !worldNullifier || !title || !stakeWld || !txReference) {
    return noStoreJson({ error: "Missing required fields." }, { status: 400 });
  }
  if (stakeWld < 0.1 || stakeWld > 100) {
    return noStoreJson({ error: "Stake must be 0.1–100 WLD." }, { status: 400 });
  }
  if (title.trim().length < 10 || title.trim().length > 120) {
    return noStoreJson({ error: "Title must be 10–120 characters." }, { status: 400 });
  }

  const client = db();
  if (!client) return noStoreJson({ ok: true, pendingSetup: true });

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + Math.min(Math.max(deadlineDays ?? 30, 1), 365));

  const fee = stakeWld * (PLATFORM_FEE_BPS / 10000);
  const netPool = stakeWld - fee;

  const { error } = await client.from("verdex_goals").insert({
    id,
    creator_nullifier: worldNullifier,
    creator_username: username ?? "anonymous",
    title: title.trim(),
    stake_wld: stakeWld,
    yes_pool: netPool,
    no_pool: 0,
    status: "active",
    deadline: deadline.toISOString(),
    tx_reference: txReference,
    created_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return noStoreJson({ ok: false, error: "Duplicate goal or transaction." }, { status: 409 });
    }
    console.error("[verdex/goals] insert error:", error.message);
    return noStoreJson({ ok: false, error: "Failed to create goal." }, { status: 500 });
  }

  return noStoreJson({ ok: true, goalId: id });
}
