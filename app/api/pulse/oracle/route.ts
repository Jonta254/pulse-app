import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { upsertMarkets, isPulseDbReady } from "@/lib/pulse/db";
import { noStoreJson, rateLimitResponse, isRateLimited } from "@/lib/serverApi";
import type { PulseMarket } from "@/types/pulse";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function hoursFromNow(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

const ORACLE_PROMPT = `You are the PULSE Oracle — an AI that generates prediction market questions for a verified-human prediction network on World App.

Generate exactly 8 fresh, timely prediction market questions. Mix categories: crypto (2), sports (2), world events (2), culture (1), micro/short-term (1).

Rules:
- Each question must be clearly binary (YES or NO)
- Include specific, verifiable resolution criteria
- Micro markets close in 1-4 hours; others close in 2-90 days
- Questions should be interesting, shareable, and non-trivial
- Do NOT repeat markets from the past week
- Today's date: ${new Date().toDateString()}

Return ONLY a JSON array with this exact shape — no markdown, no explanation:
[
  {
    "title": "Will X happen?",
    "description": "Resolution: measured by [source] at [specific time/condition].",
    "category": "crypto|sports|world|culture|micro",
    "closeDays": 3,
    "closeHours": 0,
    "featured": false
  }
]

For micro markets, use closeHours (e.g. 2) and set closeDays to 0.
For all others, use closeDays and set closeHours to 0.
Mark one market as featured: true (the most interesting one).`;

export async function GET(req: NextRequest) {
  // Vercel cron injects Authorization: Bearer {CRON_SECRET} automatically.
  // Manual calls must also provide this header.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return noStoreJson({ error: "Unauthorized." }, { status: 401 });
    }
  }

  if (isRateLimited(req, "pulse-oracle", 5)) {
    return rateLimitResponse();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return noStoreJson({ ok: false, error: "ANTHROPIC_API_KEY not configured." }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });

  let raw: string;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: ORACLE_PROMPT }],
    });
    raw = message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err) {
    console.error("[pulse/oracle] Anthropic error:", err);
    return noStoreJson({ ok: false, error: "Oracle generation failed." }, { status: 500 });
  }

  // Parse the JSON array from Claude's response
  let generated: Array<{
    title: string;
    description: string;
    category: string;
    closeDays: number;
    closeHours: number;
    featured: boolean;
  }>;

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");
    generated = JSON.parse(jsonMatch[0]) as typeof generated;
  } catch (err) {
    console.error("[pulse/oracle] Parse error:", err, "\nRaw:", raw.slice(0, 500));
    return noStoreJson({ ok: false, error: "Failed to parse oracle output." }, { status: 500 });
  }

  const now = Date.now();
  const markets: PulseMarket[] = generated.map((item, i) => {
    const closesAt = item.closeHours > 0
      ? hoursFromNow(item.closeHours)
      : daysFromNow(item.closeDays || 7);
    const resolvesAt = item.closeHours > 0
      ? hoursFromNow(item.closeHours + 1)
      : daysFromNow((item.closeDays || 7) + 1);

    return {
      id: `oracle-${now}-${i}`,
      title: item.title,
      description: item.description,
      category: (["crypto", "sports", "world", "culture", "micro"].includes(item.category)
        ? item.category
        : "world") as PulseMarket["category"],
      closesAt,
      resolvesAt,
      outcome: null,
      yesPool: 0,
      noPool: 0,
      status: "open",
      featured: item.featured ?? false,
      aiGenerated: true,
      totalBettors: 0,
    };
  });

  if (isPulseDbReady()) {
    const saved = await upsertMarkets(markets);
    if (!saved) {
      return noStoreJson({ ok: false, error: "Failed to save oracle markets." }, { status: 500 });
    }
  }

  return noStoreJson({ ok: true, generated: markets.length, markets });
}
