import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { upsertMarkets, isVerdexDbReady } from "@/lib/verdex/db";
import { noStoreJson, rateLimitResponse, isRateLimited } from "@/lib/serverApi";
import type { VerdexMarket } from "@/types/verdex";

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

const ORACLE_PROMPT = `You are the VeRdex Oracle — an AI that generates prediction market questions for a verified-human prediction network on World App.

Generate exactly 12 fresh, timely prediction market questions. Mix categories:
- crypto: 3 (Bitcoin, Ethereum, altcoins, DeFi, NFT — price/event driven)
- sports: 3 (football/soccer, NBA, boxing, F1, tennis, cricket — specific match outcomes)
- world: 2 (geopolitics, economy, science, elections, climate)
- culture: 1 (movies, music, viral trends, celebrities)
- micro: 3 (short-term 2-8 hour markets on crypto moves, news events, sports scores)

Rules:
- Each question must be clearly binary (YES or NO answer only)
- Include SPECIFIC verifiable resolution criteria with named source
- Micro markets close in 2-8 hours; others close in 1-90 days
- Questions should be controversial, interesting, and non-trivial — avoid obvious outcomes
- Use current events and real team/player names
- Do NOT repeat common generic questions
- Today's date: ${new Date().toUTCString()}

Return ONLY a JSON array — no markdown, no explanation:
[
  {
    "title": "Will X happen?",
    "description": "Resolution: measured by [specific source] at [exact time/condition].",
    "category": "crypto|sports|world|culture|micro",
    "closeDays": 3,
    "closeHours": 0,
    "featured": false
  }
]

For micro markets use closeHours (2–8), set closeDays to 0.
For all others use closeDays (1–90), set closeHours to 0.
Mark exactly 1 market as featured: true — choose the most exciting one.`;

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

  if (isRateLimited(req, "verdex-oracle", 5)) {
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
    console.error("[verdex/oracle] Anthropic error:", err);
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
    console.error("[verdex/oracle] Parse error:", err, "\nRaw:", raw.slice(0, 500));
    return noStoreJson({ ok: false, error: "Failed to parse oracle output." }, { status: 500 });
  }

  const now = Date.now();
  const markets: VerdexMarket[] = generated.map((item, i) => {
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
        : "world") as VerdexMarket["category"],
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

  if (isVerdexDbReady()) {
    const saved = await upsertMarkets(markets);
    if (!saved) {
      return noStoreJson({ ok: false, error: "Failed to save oracle markets." }, { status: 500 });
    }
  }

  return noStoreJson({ ok: true, generated: markets.length, markets });
}
