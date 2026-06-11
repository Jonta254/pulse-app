// ── Data Oracle (zero-cost, no AI) ────────────────────────────────────────────
// Generates crypto price markets from Kraken's free public API and resolves
// them deterministically from historical 1-minute candles. Every market's
// resolution parameters are encoded in its id, so the auto-resolver can settle
// it without any human or AI input:
//
//   data-v1-above-<PAIR>-<threshold>-<closeSec>-<rand>
//   data-v1-move-<PAIR>-<pct>-<basePrice>-<closeSec>-<rand>
//
// Kraken is used because its public API is reachable from US serverless
// regions (Binance geo-blocks them) and needs no API key.

import type { VerdexMarket } from "@/types/verdex";

const KRAKEN = "https://api.kraken.com/0/public";

type CoinCfg = { name: string; pair: string; display: string; decimals: number };
const COINS: CoinCfg[] = [
  { name: "BTC", pair: "XBTUSD", display: "BTC/USD", decimals: 0 },
  { name: "ETH", pair: "ETHUSD", display: "ETH/USD", decimals: 0 },
  { name: "SOL", pair: "SOLUSD", display: "SOL/USD", decimals: 2 },
  { name: "WLD", pair: "WLDUSD", display: "WLD/USD", decimals: 4 },
  { name: "XRP", pair: "XRPUSD", display: "XRP/USD", decimals: 4 },
];

function coinByPair(pair: string): CoinCfg | undefined {
  return COINS.find((c) => c.pair === pair);
}

// ── Kraken data ───────────────────────────────────────────────────────────────

export async function getSpotPrices(): Promise<Map<string, number> | null> {
  try {
    const res = await fetch(`${KRAKEN}/Ticker?pair=${COINS.map((c) => c.pair).join(",")}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json() as { error: string[]; result?: Record<string, { c: string[] }> };
    if (!json.result || (json.error?.length ?? 0) > 0) return null;

    const prices = new Map<string, number>();
    // Kraken returns altname keys (e.g. XXBTZUSD for XBTUSD) — match loosely
    for (const coin of COINS) {
      const key = Object.keys(json.result).find((k) => k.replace(/^X|Z/g, "").includes(coin.pair.replace("XBT", "BT").slice(0, 5)) || k === coin.pair || k.includes(coin.name));
      const entry = key ? json.result[key] : undefined;
      const last = entry ? Number(entry.c?.[0]) : NaN;
      if (Number.isFinite(last) && last > 0) prices.set(coin.pair, last);
    }
    return prices.size > 0 ? prices : null;
  } catch {
    return null;
  }
}

// Open price of the 1-minute candle containing `tsSec` — deterministic and
// publicly auditable on Kraken's charts even long after the fact.
export async function getPriceAtMinute(pair: string, tsSec: number): Promise<number | null> {
  try {
    const minuteStart = Math.floor(tsSec / 60) * 60;
    const res = await fetch(`${KRAKEN}/OHLC?pair=${pair}&interval=1&since=${minuteStart - 120}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json() as { error: string[]; result?: Record<string, unknown> };
    if (!json.result) return null;

    const seriesKey = Object.keys(json.result).find((k) => k !== "last");
    const series = seriesKey ? (json.result[seriesKey] as Array<[number, string, string, string, string]>) : null;
    if (!series) return null;

    const candle = series.find((c) => Number(c[0]) === minuteStart)
      ?? series.find((c) => Number(c[0]) > minuteStart - 60 && Number(c[0]) <= minuteStart);
    if (!candle) return null;

    const open = Number(candle[1]);
    return Number.isFinite(open) && open > 0 ? open : null;
  } catch {
    return null;
  }
}

// ── Generation ────────────────────────────────────────────────────────────────

function fmtPrice(v: number, decimals: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUtc(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeId(parts: Array<string | number>): string {
  return ["data-v1", ...parts, Math.random().toString(36).slice(2, 6)].join("-");
}

function aboveMarket(coin: CoinCfg, last: number, minutesToClose: number, category: "crypto" | "micro", featured = false): VerdexMarket {
  // Threshold a hair above/below spot → genuinely uncertain by construction
  const offset = category === "micro" ? rand(-0.0025, 0.0025) : rand(-0.006, 0.006);
  const threshold = Number((last * (1 + offset)).toFixed(coin.decimals));
  const closes = new Date(Date.now() + minutesToClose * 60_000);
  const closeSec = Math.floor(closes.getTime() / 1000);

  return {
    id: makeId(["above", coin.pair, threshold, closeSec]),
    title: `Will ${coin.name} be above $${fmtPrice(threshold, coin.decimals)} at ${fmtUtc(closes)}?`,
    description: `Resolves YES if the Kraken ${coin.display} 1-minute candle opening at ${fmtUtc(closes)} opens above $${fmtPrice(threshold, coin.decimals)}. Source: Kraken ${coin.display} OHLC.`,
    category,
    closesAt: closes.toISOString(),
    resolvesAt: new Date(closes.getTime() + 2 * 60_000).toISOString(),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured, aiGenerated: false, totalBettors: 0,
  };
}

function moveMarket(coin: CoinCfg, last: number, minutesToClose: number, category: "crypto" | "micro"): VerdexMarket {
  const pct = Number(rand(category === "micro" ? 0.15 : 0.8, category === "micro" ? 0.5 : 2.0).toFixed(2));
  const base = Number(last.toFixed(Math.max(coin.decimals, 2)));
  const closes = new Date(Date.now() + minutesToClose * 60_000);
  const closeSec = Math.floor(closes.getTime() / 1000);

  return {
    id: makeId(["move", coin.pair, pct, base, closeSec]),
    title: `Will ${coin.name} move more than ${pct}% by ${fmtUtc(closes)}?`,
    description: `Resolves YES if Kraken ${coin.display} moves more than ${pct}% in either direction from $${fmtPrice(base, Math.max(coin.decimals, 2))} by ${fmtUtc(closes)} (1-minute candle open). Source: Kraken ${coin.display} OHLC.`,
    category,
    closesAt: closes.toISOString(),
    resolvesAt: new Date(closes.getTime() + 2 * 60_000).toISOString(),
    outcome: null, yesPool: 0, noPool: 0, status: "open",
    featured: false, aiGenerated: false, totalBettors: 0,
  };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function generateDataMarkets(opts: { flash: number; daily: number }): Promise<VerdexMarket[]> {
  const prices = await getSpotPrices();
  if (!prices) return [];

  const available = COINS.filter((c) => prices.has(c.pair));
  if (available.length === 0) return [];

  const markets: VerdexMarket[] = [];
  const flashCoins = shuffle(available);
  for (let i = 0; i < opts.flash; i++) {
    const coin = flashCoins[i % flashCoins.length];
    const last = prices.get(coin.pair) as number;
    const mins = Math.round(rand(25, 115));
    markets.push(i % 2 === 0 ? aboveMarket(coin, last, mins, "micro", i === 0) : moveMarket(coin, last, mins, "micro"));
  }

  const dailyCoins = shuffle(available);
  for (let i = 0; i < opts.daily; i++) {
    const coin = dailyCoins[i % dailyCoins.length];
    const last = prices.get(coin.pair) as number;
    const mins = Math.round(rand(6 * 60, 26 * 60));
    markets.push(i % 2 === 0 ? aboveMarket(coin, last, mins, "crypto") : moveMarket(coin, last, mins, "crypto"));
  }

  return markets;
}

// ── Resolution ────────────────────────────────────────────────────────────────

export type ParsedDataMarket =
  | { type: "above"; pair: string; threshold: number; closeSec: number }
  | { type: "move"; pair: string; pct: number; base: number; closeSec: number };

export function parseDataMarketId(id: string): ParsedDataMarket | null {
  if (!id.startsWith("data-v1-")) return null;
  const parts = id.split("-");
  // data,v1,type,pair,...nums,closeSec,rand
  if (parts[2] === "above" && parts.length === 7) {
    const threshold = Number(parts[4]);
    const closeSec = Number(parts[5]);
    if (!Number.isFinite(threshold) || !Number.isFinite(closeSec)) return null;
    return { type: "above", pair: parts[3], threshold, closeSec };
  }
  if (parts[2] === "move" && parts.length === 8) {
    const pct = Number(parts[4]);
    const base = Number(parts[5]);
    const closeSec = Number(parts[6]);
    if (!Number.isFinite(pct) || !Number.isFinite(base) || !Number.isFinite(closeSec)) return null;
    return { type: "move", pair: parts[3], pct, base, closeSec };
  }
  return null;
}

// Returns the outcome, or null when data isn't available (retry later)
export async function resolveDataMarketOutcome(parsed: ParsedDataMarket): Promise<"yes" | "no" | null> {
  if (!coinByPair(parsed.pair)) return null;
  const price = await getPriceAtMinute(parsed.pair, parsed.closeSec);
  if (price === null) return null;

  if (parsed.type === "above") {
    return price > parsed.threshold ? "yes" : "no";
  }
  const movedPct = Math.abs(price - parsed.base) / parsed.base * 100;
  return movedPct > parsed.pct ? "yes" : "no";
}
