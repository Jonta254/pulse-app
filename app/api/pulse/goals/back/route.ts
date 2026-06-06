// POST /api/pulse/goals/back — back (YES) or doubt (NO) someone's personal goal
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, noStoreJson, rateLimitResponse, readJsonBody } from "@/lib/serverApi";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type BackGoalBody = {
  goalId: string;
  worldNullifier: string;
  username: string;
  position: "yes" | "no";
  amountWld: number;
  txReference: string;
};

export async function POST(req: NextRequest) {
  if (isRateLimited(req, "pulse-goals-back", 8)) return rateLimitResponse();

  const body = await readJsonBody<BackGoalBody>(req);
  if (!body) return noStoreJson({ error: "Invalid body." }, { status: 400 });

  const { goalId, worldNullifier, position, amountWld, txReference, username } = body;

  if (!goalId || !worldNullifier || !position || !amountWld || !txReference) {
    return noStoreJson({ error: "Missing required fields." }, { status: 400 });
  }
  if (!["yes", "no"].includes(position)) {
    return noStoreJson({ error: "Position must be yes or no." }, { status: 400 });
  }
  if (amountWld < 0.1 || amountWld > 50) {
    return noStoreJson({ error: "Amount must be 0.1–50 WLD." }, { status: 400 });
  }

  const client = db();
  if (!client) return noStoreJson({ ok: true, pendingSetup: true });

  // Fetch goal to validate it's open
  const { data: goal, error: fetchErr } = await client
    .from("pulse_goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (fetchErr || !goal) {
    return noStoreJson({ ok: false, error: "Goal not found." }, { status: 404 });
  }
  if (goal.status !== "active") {
    return noStoreJson({ ok: false, error: "Goal is no longer active." }, { status: 409 });
  }
  // Creator cannot back their own goal
  if (goal.creator_nullifier === worldNullifier) {
    return noStoreJson({ ok: false, error: "You cannot back your own goal." }, { status: 409 });
  }

  // Insert backing record
  const { error: insertErr } = await client.from("pulse_goal_backs").insert({
    goal_id: goalId,
    backer_nullifier: worldNullifier,
    backer_username: username ?? "anonymous",
    position,
    amount_wld: amountWld,
    tx_reference: txReference,
    created_at: new Date().toISOString(),
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return noStoreJson({ ok: false, error: "You have already backed this goal." }, { status: 409 });
    }
    console.error("[pulse/goals/back]:", insertErr.message);
    return noStoreJson({ ok: false, error: "Failed to record backing." }, { status: 500 });
  }

  // Update pool totals atomically
  const poolField = position === "yes" ? "yes_pool" : "no_pool";
  await client.rpc("increment_goal_pool", {
    p_goal_id: goalId,
    p_field: poolField,
    p_amount: amountWld,
  });

  return noStoreJson({ ok: true });
}
