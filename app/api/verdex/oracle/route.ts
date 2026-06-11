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

const ORACLE_PROMPT = `You are the VeRdex Oracle — you create REAL prediction markets for a verified-human prediction network where people stake real WLD. Fairness is everything: every market must be objectively resolvable by anyone checking a public source.

FIRST: use web search to find real upcoming events — confirmed sports fixtures, scheduled economic data releases (CPI, Fed/ECB decisions, jobs reports), confirmed launches (rockets, products, games, films), elections, court rulings with dates. NEVER invent an event, fixture, or date. If you did not verify it via search, do not use it.

Generate exactly 14 markets. Category mix:
- sports: 6 — FOOTBALL FIRST. Search for the current FIFA World Cup 2026 schedule (running June 11 – July 19, 2026 in USA/Mexico/Canada) and build markets on real upcoming matches: match winners, "will both teams score", "will there be 3+ goals", group qualification, star players scoring. Also check Copa América/EPL transfers/NBA finals if relevant. ONLY fixtures you verified via search — real teams, real kickoff dates.
- crypto: 3 (price thresholds / ETF flows / protocol events — exact numbers)
- world: 2 (scheduled econ releases, elections, science/space events you verified)
- culture: 1 (verified release/event — box office, charts, awards with dates)
- micro: 2 (2–8 hour crypto/data questions — exact price levels)

FAIRNESS RULES (strict — a market violating any rule is invalid):
1. Binary YES/NO with ONE unambiguous outcome. No "and" conditions joining unrelated things.
2. description MUST follow exactly this template:
   "Resolves YES if <precise condition with exact threshold/score/value> by <exact UTC date+time>. Source: <one named public source, e.g. Binance BTCUSDT spot, ESPN final score, bls.gov release>."
3. The outcome must NOT already be decided or near-certain. Target genuinely tricky questions a sharp person could argue either way (roughly 35–65% likely). Close calls make the game fair AND exciting.
4. No subjective judgement ("best", "popular", "successful"), no insider info, nothing depending on an individual's private choice.
5. The deadline in the description must match the market close time you set.
6. Today's date: ${new Date().toUTCString()}

Return ONLY a JSON array — no markdown, no explanation:
[
  {
    "title": "Will X happen?",
    "description": "Resolves YES if ... by ... UTC. Source: ...",
    "category": "crypto|sports|world|culture|micro",
    "closeDays": 3,
    "closeHours": 0,
    "featured": false
  }
]

For micro markets use closeHours (2–8), set closeDays to 0.
For all others use closeDays (1–90), set closeHours to 0.
Mark exactly 1 market as featured: true — the most exciting genuinely-uncertain one.`;

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
    // Web search grounds every market in a real, verifiable event
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 7 }],
      messages: [{ role: "user", content: ORACLE_PROMPT }],
    });
    raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  } catch (err) {
    console.error("[verdex/oracle] Anthropic error (with search), retrying without:", err);
    try {
      // Fallback: no web search — restrict to data-driven markets that need no news
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: ORACLE_PROMPT + "\n\nIMPORTANT OVERRIDE: web search is unavailable. Generate ONLY data-driven markets (crypto prices, ETH gas, BTC dominance, on-chain stats) with exact thresholds and Binance/Etherscan/CoinGecko sources. Use categories crypto and micro only. Do NOT reference any news event, fixture, or release.",
        }],
      });
      raw = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    } catch (err2) {
      console.error("[verdex/oracle] Anthropic error:", err2);
      return noStoreJson({ ok: false, error: "Oracle generation failed." }, { status: 500 });
    }
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

  // Fairness gate: drop any market without a binary question and a precise,
  // sourced resolution rule — bettors must be able to verify outcomes themselves.
  const rejected: string[] = [];
  generated = generated.filter((item) => {
    const okShape =
      typeof item.title === "string" && item.title.trim().endsWith("?") && item.title.length <= 140 &&
      typeof item.description === "string" && item.description.length <= 400 &&
      /resolves yes if/i.test(item.description) &&
      /source:/i.test(item.description);
    if (!okShape) rejected.push(item?.title ?? "(untitled)");
    return okShape;
  });

  if (generated.length === 0) {
    return noStoreJson({ ok: false, error: "Oracle produced no valid markets.", rejected }, { status: 500 });
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

  return noStoreJson({ ok: true, generated: markets.length, rejected, markets });
}
