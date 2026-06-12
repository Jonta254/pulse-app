// ── Macro oracles: rocket launches, ECB FX, Fear & Greed ─────────────────────
// Three more free, keyless sources with deterministic auto-resolution:
//
//   Rockets (Launch Library 2): data-v1-rkt-<uuidNoDashes>-<closeSec>-<rand>
//   FX (Frankfurter / ECB):     data-v1-fx-<PAIR>-<threshold>-<yyyymmdd>-<closeSec>-<rand>
//   Fear & Greed (alternative.me): data-v1-fng-<threshold>-<yyyymmdd>-<closeSec>-<rand>

import type { VerdexMarket } from "@/types/verdex";

function dayKey(d: Date): string { return d.toISOString().slice(0, 10).replace(/-/g, ""); }
function dayIso(key: string): string { return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`; }
function rid(): string { return Math.random().toString(36).slice(2, 6); }

const baseRow = {
  outcome: null, yesPool: 0, noPool: 0, status: "open" as const,
  featured: false, aiGenerated: false, totalBettors: 0,
};

// ══ ROCKET LAUNCHES (Launch Library 2 — 15 req/hr is plenty) ═════════════════

type Launch = { id: string; name: string; net: string; status?: { id?: number; abbrev?: string } };

export async function generateRocketMarkets(opts: { need: number; excludeLaunchIds: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];
  try {
    const res = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&mode=list", {
      cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    const json = await res.json() as { results?: Launch[] };
    const now = Date.now();
    const markets: VerdexMarket[] = [];

    for (const l of json.results ?? []) {
      if (markets.length >= opts.need) break;
      const idKey = l.id.replace(/-/g, "");
      if (opts.excludeLaunchIds.has(idKey)) continue;
      const net = new Date(l.net);
      // 2h–72h out, still in a pending status (Go / TBC / TBD)
      if (net.getTime() - now < 2 * 3_600_000 || net.getTime() - now > 72 * 3_600_000) continue;
      if (![1, 2, 8].includes(l.status?.id ?? 0)) continue;

      const closes = new Date(net.getTime() - 60 * 60_000);
      const resolves = new Date(net.getTime() + 6 * 3_600_000);
      markets.push({
        ...baseRow,
        id: `data-v1-rkt-${idKey}-${Math.floor(closes.getTime() / 1000)}-${rid()}`,
        title: `Will "${l.name.slice(0, 80)}" launch successfully?`,
        description: `Resolves YES if the launch "${l.name}" (scheduled ${l.net.slice(0, 16).replace("T", " ")} UTC) is officially recorded as a successful launch. Failure or partial failure resolves NO; a delay simply waits. Source: Launch Library 2 (thespacedevs.com) official status.`,
        category: "world",
        closesAt: closes.toISOString(),
        resolvesAt: resolves.toISOString(),
        featured: markets.length === 0,
      });
    }
    return markets;
  } catch { return []; }
}

async function resolveRocket(uuidNoDashes: string): Promise<"yes" | "no" | null> {
  try {
    const uuid = `${uuidNoDashes.slice(0, 8)}-${uuidNoDashes.slice(8, 12)}-${uuidNoDashes.slice(12, 16)}-${uuidNoDashes.slice(16, 20)}-${uuidNoDashes.slice(20)}`;
    const res = await fetch(`https://ll.thespacedevs.com/2.2.0/launch/${uuid}/?mode=list`, {
      cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    const json = await res.json() as Launch;
    const status = json.status?.id ?? 0;
    if (status === 3) return "yes";                 // Launch Successful
    if (status === 4 || status === 7) return "no";  // Failure / Partial Failure
    return null;                                    // Go/TBD/Hold/In-Flight — wait
  } catch { return null; }
}

// ══ FX — ECB reference rates via Frankfurter ═════════════════════════════════

type FxPair = { code: string; base: string; quote: string; decimals: number };
const FX_PAIRS: FxPair[] = [
  { code: "EURUSD", base: "EUR", quote: "USD", decimals: 4 },
  { code: "GBPUSD", base: "GBP", quote: "USD", decimals: 4 },
  { code: "USDJPY", base: "USD", quote: "JPY", decimals: 2 },
];

async function fxRate(base: string, quote: string, dateIso?: string): Promise<{ rate: number; date: string } | null> {
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/${dateIso ?? "latest"}?base=${base}&symbols=${quote}`, {
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json() as { date?: string; rates?: Record<string, number> };
    const rate = json.rates?.[quote];
    return typeof rate === "number" && json.date ? { rate, date: json.date } : null;
  } catch { return null; }
}

function nextEcbBusinessDay(): Date {
  const d = new Date(Date.now() + 86_400_000);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

// excludeKeys: `${code}-${yyyymmdd}`
export async function generateFxMarkets(opts: { need: number; excludeKeys: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];

  const target = nextEcbBusinessDay();
  const date = dayKey(target);
  // ECB fix publishes ~14:15 UTC — close betting at 12:00 UTC that day
  const closes = new Date(`${dayIso(date)}T12:00:00Z`);
  const resolves = new Date(`${dayIso(date)}T15:30:00Z`);
  const markets: VerdexMarket[] = [];

  for (const pair of [...FX_PAIRS].sort(() => Math.random() - 0.5)) {
    if (markets.length >= opts.need) break;
    if (opts.excludeKeys.has(`${pair.code}-${date}`)) continue;
    const current = await fxRate(pair.base, pair.quote);
    if (!current) continue;

    const threshold = Number((current.rate * (1 + (Math.random() - 0.5) * 0.002)).toFixed(pair.decimals));
    markets.push({
      ...baseRow,
      id: `data-v1-fx-${pair.code}-${threshold}-${date}-${Math.floor(closes.getTime() / 1000)}-${rid()}`,
      title: `Will ${pair.base}/${pair.quote} fix above ${threshold} on ${dayIso(date)}?`,
      description: `Resolves YES if the official ECB reference rate for ${pair.base}/${pair.quote} on ${dayIso(date)} is above ${threshold}. Source: ECB reference rates (frankfurter.dev).`,
      category: "world",
      closesAt: closes.toISOString(),
      resolvesAt: resolves.toISOString(),
    });
  }
  return markets;
}

// ══ CRYPTO FEAR & GREED INDEX ═════════════════════════════════════════════════

async function fngValue(dateKey8?: string): Promise<number | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=12", {
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json() as { data?: Array<{ value: string; timestamp: string }> };
    if (!json.data?.length) return null;
    if (!dateKey8) return Number(json.data[0].value);
    const entry = json.data.find((d) => dayKey(new Date(Number(d.timestamp) * 1000)) === dateKey8);
    return entry ? Number(entry.value) : null;
  } catch { return null; }
}

// excludeKeys: `${yyyymmdd}`
export async function generateFngMarkets(opts: { need: number; excludeKeys: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];

  const target = new Date(Date.now() + 86_400_000);
  const date = dayKey(target);
  if (opts.excludeKeys.has(date)) return [];

  const today = await fngValue();
  if (today === null) return [];

  const closes = new Date(`${dayIso(date)}T00:00:00Z`);
  const resolves = new Date(closes.getTime() + 3 * 3_600_000);
  return [{
    ...baseRow,
    id: `data-v1-fng-${today}-${date}-${Math.floor(closes.getTime() / 1000)}-${rid()}`,
    title: `Will Crypto Fear & Greed read above ${today} tomorrow (${dayIso(date)})?`,
    description: `Resolves YES if the Crypto Fear & Greed Index value published for ${dayIso(date)} is strictly above ${today} (today's reading). Source: alternative.me Fear & Greed Index.`,
    category: "crypto",
    closesAt: closes.toISOString(),
    resolvesAt: resolves.toISOString(),
  }];
}

// ══ POLYMARKET MIRROR (gamma-api, free) ══════════════════════════════════════
// Mirrors the highest-volume binary Polymarket questions — live discovery of
// real-world events (elections, geopolitics, sports outrights, culture) with
// resolution delegated to Polymarket's official on-chain resolution.
//   id: data-v1-pm-<gammaId>-<closeSec>-<rand>

type GammaMarket = {
  id: string;
  question?: string;
  endDate?: string;
  closed?: boolean;
  outcomes?: string;       // JSON string '["Yes","No"]'
  outcomePrices?: string;  // JSON string '["1","0"]' once resolved
};

function isBinaryYesNo(m: GammaMarket): boolean {
  try {
    const o = JSON.parse(m.outcomes ?? "[]") as string[];
    return o.length === 2 && o[0] === "Yes" && o[1] === "No";
  } catch { return false; }
}

export async function generatePolymarketMirrors(opts: { need: number; excludeIds: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];
  try {
    const res = await fetch("https://gamma-api.polymarket.com/markets?closed=false&order=volumeNum&ascending=false&limit=30", {
      cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    const list = await res.json() as GammaMarket[];
    const now = Date.now();
    const markets: VerdexMarket[] = [];

    for (const m of list) {
      if (markets.length >= opts.need) break;
      if (!m.id || opts.excludeIds.has(m.id) || !m.question || !m.endDate) continue;
      if (!isBinaryYesNo(m)) continue;
      const end = new Date(m.endDate).getTime();
      // 12h–45d out, question must read as a clean binary
      if (end - now < 12 * 3_600_000 || end - now > 45 * 86_400_000) continue;
      if (!m.question.trim().endsWith("?") || m.question.length > 130) continue;

      const closes = new Date(end - 3_600_000);
      markets.push({
        ...baseRow,
        id: `data-v1-pm-${m.id}-${Math.floor(closes.getTime() / 1000)}-${rid()}`,
        title: m.question.trim(),
        description: `Resolves YES exactly as Polymarket officially resolves this question (market #${m.id}), expected by ${m.endDate.slice(0, 10)}. Source: Polymarket official resolution (gamma-api.polymarket.com).`,
        category: "world",
        closesAt: closes.toISOString(),
        resolvesAt: new Date(end + 3_600_000).toISOString(),
      });
    }
    return markets;
  } catch { return []; }
}

async function resolvePolymarket(gammaId: string): Promise<"yes" | "no" | null> {
  try {
    const res = await fetch(`https://gamma-api.polymarket.com/markets/${gammaId}`, {
      cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    const m = await res.json() as GammaMarket;
    if (!m.closed) return null;
    const prices = JSON.parse(m.outcomePrices ?? "[]") as string[];
    if (prices.length !== 2) return null;
    const yes = Number(prices[0]);
    if (yes > 0.99) return "yes";
    if (yes < 0.01) return "no";
    return null; // not conclusively resolved yet
  } catch { return null; }
}

// ══ RESOLUTION DISPATCH ═══════════════════════════════════════════════════════

export async function resolveMacroOutcome(id: string): Promise<"yes" | "no" | null | undefined> {
  const parts = id.split("-");

  if (id.startsWith("data-v1-rkt-") && parts.length === 6) {
    return resolveRocket(parts[3]);
  }

  if (id.startsWith("data-v1-pm-") && parts.length === 6) {
    return resolvePolymarket(parts[3]);
  }

  if (id.startsWith("data-v1-fx-") && parts.length === 8) {
    const pair = FX_PAIRS.find((p) => p.code === parts[3]);
    const threshold = Number(parts[4]);
    const date = parts[5];
    if (!pair || !Number.isFinite(threshold)) return null;
    const fix = await fxRate(pair.base, pair.quote, dayIso(date));
    if (!fix || fix.date !== dayIso(date)) return null; // fix not published yet
    return fix.rate > threshold ? "yes" : "no";
  }

  if (id.startsWith("data-v1-fng-") && parts.length === 7) {
    const threshold = Number(parts[3]);
    const date = parts[4];
    if (!Number.isFinite(threshold)) return null;
    const value = await fngValue(date);
    if (value === null) return null;
    return value > threshold ? "yes" : "no";
  }

  return undefined;
}
