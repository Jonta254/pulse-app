/**
 * GET /api/verdex/flash-gen
 * Generates 6 fresh micro/flash markets (5 min – 2 hr) via Claude Haiku.
 * Called by Vercel cron every 30 min — ensures the flash ticker always has
 * live markets to bet on.
 */
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { upsertMarkets, isVerdexDbReady } from "@/lib/verdex/db";
import { noStoreJson, isRateLimited, rateLimitResponse } from "@/lib/serverApi";
import type { VerdexMarket } from "@/types/verdex";

function minsFromNow(mins: number) {
  return new Date(Date.now() + mins * 60_000).toISOString();
}

const FLASH_PROMPT = `You are the VeRdex Flash Oracle — you generate ultra-short prediction markets where verified humans stake real WLD. Every market must be objectively checkable by anyone, so use ONLY public market data — never news, never sports, never anything you can't verify.

Generate exactly 6 flash markets that close in 5 to 120 minutes from now.

Rules (strict):
- Binary YES/NO, ONE unambiguous outcome
- ONLY data-driven questions: crypto prices/moves (BTC, ETH, SOL, WLD, BNB), relative performance, ETH gas, BTC dominance
- Use exact thresholds and percentages — genuinely tricky, near coin-flip questions (no near-certain outcomes)
- description MUST follow: "Resolves YES if <exact condition> at close. Source: <Binance pair / Etherscan gas tracker / CoinGecko metric>."
- closeMinutes = minutes until close (5–120)
- Today: ${new Date().toUTCString()}

Return ONLY valid JSON, no markdown:
[
  {
    "title": "Will BTC move more than 0.4% in the next 30 minutes?",
    "description": "Resolves YES if Binance BTCUSDT spot price changes >0.4% in either direction between market open and close. Source: Binance BTCUSDT.",
    "category": "micro",
    "closeMinutes": 30
  }
]`;

// Fallback flash markets if AI is unavailable or DB not set up
function getFallbackFlashMarkets(): VerdexMarket[] {
  const now = Date.now();
  const add = (m: number) => new Date(now + m * 60_000).toISOString();
  return [
    {
      id: `flash-btc-${now}-1`,
      title: "Will BTC move >0.5% in the next 15 minutes?",
      description: "Binance BTCUSDT spot. Measured from market open to close.",
      category: "micro", closesAt: add(14), resolvesAt: add(15),
      outcome: null, yesPool: 0,
      noPool: 0, status: "open",
      featured: true, aiGenerated: false, totalBettors: 0,
    },
    {
      id: `flash-eth-${now}-2`,
      title: "Will ETH stay above $3,500 for the next 30 minutes?",
      description: "Binance ETHUSDT — must stay above $3,500 every minute during window.",
      category: "micro", closesAt: add(29), resolvesAt: add(30),
      outcome: null, yesPool: 0,
      noPool: 0, status: "open",
      featured: false, aiGenerated: false, totalBettors: 0,
    },
    {
      id: `flash-wld-${now}-3`,
      title: "Will WLD be up vs 1 hour ago at the top of the hour?",
      description: "Binance WLD/USDT. Compares current price to price exactly 1h prior.",
      category: "micro", closesAt: add(55), resolvesAt: add(60),
      outcome: null, yesPool: 0,
      noPool: 0, status: "open",
      featured: false, aiGenerated: false, totalBettors: 0,
    },
    {
      id: `flash-sol-${now}-4`,
      title: "Will SOL outperform BTC in the next hour?",
      description: "% price change comparison on Binance. SOL/USDT vs BTC/USDT from now.",
      category: "micro", closesAt: add(58), resolvesAt: add(60),
      outcome: null, yesPool: 0,
      noPool: 0, status: "open",
      featured: false, aiGenerated: false, totalBettors: 0,
    },
    {
      id: `flash-gas-${now}-5`,
      title: "Will ETH gas stay below 15 gwei for the next 20 minutes?",
      description: "Etherscan average gas tracker. Must stay below 15 gwei every minute.",
      category: "micro", closesAt: add(19), resolvesAt: add(20),
      outcome: null, yesPool: 0,
      noPool: 0, status: "open",
      featured: false, aiGenerated: false, totalBettors: 0,
    },
    {
      id: `flash-bnb-${now}-6`,
      title: "Will BNB hit a new 24h high in the next 2 hours?",
      description: "Binance BNB/USDT 24h high. Checks if a new high prints before close.",
      category: "micro", closesAt: add(118), resolvesAt: add(120),
      outcome: null, yesPool: 0,
      noPool: 0, status: "open",
      featured: false, aiGenerated: false, totalBettors: 0,
    },
  ];
}

export async function GET(req: NextRequest) {
  // Cron auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return noStoreJson({ error: "Unauthorized." }, { status: 401 });
    }
  }

  if (isRateLimited(req, "verdex-flash-gen", 5)) return rateLimitResponse();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  let markets: VerdexMarket[];

  if (!apiKey) {
    // No AI key — use high-quality fallback
    markets = getFallbackFlashMarkets();
  } else {
    const client = new Anthropic({ apiKey });
    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: FLASH_PROMPT }],
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array");

      type FlashItem = { title: string; description: string; category: string; closeMinutes: number };
      const items = JSON.parse(match[0]) as FlashItem[];
      const now = Date.now();

      markets = items.map((item, i) => {
        const mins = Math.max(5, Math.min(120, item.closeMinutes || 30));
        return {
          id: `flash-ai-${now}-${i}`,
          title: item.title,
          description: item.description,
          category: "micro" as const,
          closesAt: minsFromNow(mins),
          resolvesAt: minsFromNow(mins + 2),
          outcome: null,
          yesPool: 0,
          noPool: 0,
          status: "open" as const,
          featured: i === 0,
          aiGenerated: true,
          totalBettors: 0,
        };
      });
    } catch {
      markets = getFallbackFlashMarkets();
    }
  }

  if (isVerdexDbReady()) {
    await upsertMarkets(markets);
  }

  return noStoreJson({ ok: true, generated: markets.length, markets });
}
