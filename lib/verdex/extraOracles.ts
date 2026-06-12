// ── Extra zero-cost oracles: Weather, NBA, Wikipedia duels ────────────────────
// Three more free, keyless data sources that generate AND auto-resolve
// markets deterministically:
//
//   Weather (Open-Meteo):    data-v1-wx-<cityIdx>-<rain|tmax>-<threshold>-<yyyymmdd>-<closeSec>-<rand>
//   NBA (ESPN):              data-v1-nba-<eventId>-<yyyymmdd>-<hwin|tp>-<param>-<closeSec>-<rand>
//   Wiki duels (Wikimedia):  data-v1-wiki-<aIdx>-<bIdx>-<yyyymmdd>-<closeSec>-<rand>

import type { VerdexMarket } from "@/types/verdex";

const UA = { "User-Agent": "VerdexApp/1.0 (prediction market resolution)" };

function dayKey(d: Date): string { return d.toISOString().slice(0, 10).replace(/-/g, ""); }
function dayIso(key: string): string { return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`; }
function rid(): string { return Math.random().toString(36).slice(2, 6); }

const baseRow = {
  outcome: null, yesPool: 0, noPool: 0, status: "open" as const,
  featured: false, aiGenerated: false, totalBettors: 0,
};

// ══ WEATHER ═══════════════════════════════════════════════════════════════════

type City = { name: string; lat: number; lon: number };
// Append-only — indexes are encoded in live market ids
const CITIES: City[] = [
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
];

type DailyWeather = { time: string[]; precipitation_sum: number[]; temperature_2m_max: number[]; precipitation_probability_max?: number[] };

async function fetchDaily(city: City, pastDays: number): Promise<DailyWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=precipitation_sum,temperature_2m_max,precipitation_probability_max&forecast_days=3&past_days=${pastDays}&timezone=UTC`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const json = await res.json() as { daily?: DailyWeather };
    return json.daily ?? null;
  } catch { return null; }
}

// excludeKeys: `${cityIdx}-${metric}-${yyyymmdd}`
export async function generateWeatherMarkets(opts: { need: number; excludeKeys: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];

  const tomorrow = new Date(Date.now() + 86_400_000);
  const date = dayKey(tomorrow);
  const dayStart = new Date(`${dayIso(date)}T00:00:00Z`);
  const closes = dayStart.toISOString(); // betting closes when the target day begins
  const resolves = new Date(dayStart.getTime() + 30 * 3_600_000).toISOString(); // day end + 6h
  const markets: VerdexMarket[] = [];

  const order = [...CITIES.keys()].sort(() => Math.random() - 0.5);
  for (const cityIdx of order) {
    if (markets.length >= opts.need) break;
    const city = CITIES[cityIdx];
    const daily = await fetchDaily(city, 0);
    if (!daily) continue;

    const di = daily.time.indexOf(dayIso(date));
    if (di < 0) continue;

    const rainProb = daily.precipitation_probability_max?.[di] ?? 50;
    const fcMax = daily.temperature_2m_max[di];

    // Rain market — only where the forecast itself is genuinely uncertain
    const rainKey = `${cityIdx}-rain-${date}`;
    if (rainProb >= 25 && rainProb <= 75 && !opts.excludeKeys.has(rainKey)) {
      markets.push({
        ...baseRow,
        id: `data-v1-wx-${cityIdx}-rain-1.0-${date}-${Math.floor(dayStart.getTime() / 1000)}-${rid()}`,
        title: `Will it rain in ${city.name} on ${dayIso(date)}?`,
        description: `Resolves YES if ${city.name} records 1.0 mm or more total precipitation on ${dayIso(date)} (UTC day). Source: Open-Meteo daily precipitation data.`,
        category: "world", closesAt: closes, resolvesAt: resolves,
      });
      if (markets.length >= opts.need) break;
    }

    // Max-temperature market — threshold at the forecast = near coin-flip
    const t = Math.round(fcMax);
    const tKey = `${cityIdx}-tmax-${date}`;
    if (Number.isFinite(t) && !opts.excludeKeys.has(tKey)) {
      markets.push({
        ...baseRow,
        id: `data-v1-wx-${cityIdx}-tmax-${t}-${date}-${Math.floor(dayStart.getTime() / 1000)}-${rid()}`,
        title: `Will ${city.name} top ${t}°C on ${dayIso(date)}?`,
        description: `Resolves YES if ${city.name}'s maximum temperature on ${dayIso(date)} (UTC day) exceeds ${t}.0°C. Source: Open-Meteo daily temperature data.`,
        category: "world", closesAt: closes, resolvesAt: resolves,
      });
    }
  }
  return markets;
}

// ══ NBA ═══════════════════════════════════════════════════════════════════════

type EspnEvent = {
  id: string;
  date: string;
  competitions?: Array<{
    competitors?: Array<{ homeAway: "home" | "away"; winner?: boolean; score?: string; team?: { displayName?: string } }>;
    status?: { type?: { completed?: boolean } };
  }>;
};

async function fetchNba(yyyymmdd?: string): Promise<EspnEvent[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard${yyyymmdd ? `?dates=${yyyymmdd}` : ""}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const json = await res.json() as { events?: EspnEvent[] };
    return json.events ?? [];
  } catch { return []; }
}

export async function generateNbaMarkets(opts: { need: number; excludeEventIds: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];

  const seen = new Set<string>();
  const events: EspnEvent[] = [];
  for (const off of [0, 1, 2]) {
    for (const ev of await fetchNba(dayKey(new Date(Date.now() + off * 86_400_000)))) {
      if (!seen.has(ev.id)) { seen.add(ev.id); events.push(ev); }
    }
  }

  const now = Date.now();
  const markets: VerdexMarket[] = [];
  for (const ev of events) {
    if (markets.length >= opts.need) break;
    if (opts.excludeEventIds.has(ev.id)) continue;
    if (ev.competitions?.[0]?.status?.type?.completed) continue;

    const tip = new Date(ev.date);
    if (tip.getTime() - now < 30 * 60_000) continue;
    const comps = ev.competitions?.[0]?.competitors ?? [];
    const home = comps.find((c) => c.homeAway === "home")?.team?.displayName;
    const away = comps.find((c) => c.homeAway === "away")?.team?.displayName;
    if (!home || !away) continue;

    const closes = new Date(tip.getTime() - 10 * 60_000);
    const resolves = new Date(tip.getTime() + 200 * 60_000);
    const closeSec = Math.floor(closes.getTime() / 1000);
    const day = dayKey(tip);
    const game = `${away} at ${home} (NBA, tip-off ${tip.toISOString().slice(0, 16).replace("T", " ")} UTC)`;
    const common = { ...baseRow, category: "sports" as const, closesAt: closes.toISOString(), resolvesAt: resolves.toISOString() };

    markets.push({
      ...common,
      id: `data-v1-nba-${ev.id}-${day}-hwin-0-${closeSec}-${rid()}`,
      title: `Will the ${home} beat the ${away}?`,
      description: `Resolves YES if ${home} wins ${game}, overtime included. Source: ESPN final result.`,
    });
    if (markets.length >= opts.need) break;

    const line = 215 + Math.floor(Math.random() * 16); // 215–230, near typical NBA totals
    markets.push({
      ...common,
      id: `data-v1-nba-${ev.id}-${day}-tp-${line}-${closeSec}-${rid()}`,
      title: `Will ${away} at ${home} total more than ${line} points?`,
      description: `Resolves YES if the combined final score of ${game} exceeds ${line} points, overtime included. Source: ESPN final score.`,
    });
  }
  return markets;
}

// ══ WIKIPEDIA DUELS ═══════════════════════════════════════════════════════════

type Topic = { name: string; article: string };
// Append-only — indexes are encoded in live market ids
const TOPICS: Topic[] = [
  { name: "Lionel Messi", article: "Lionel_Messi" },
  { name: "Cristiano Ronaldo", article: "Cristiano_Ronaldo" },
  { name: "Taylor Swift", article: "Taylor_Swift" },
  { name: "Drake", article: "Drake_(musician)" },
  { name: "Bitcoin", article: "Bitcoin" },
  { name: "Ethereum", article: "Ethereum" },
  { name: "Elon Musk", article: "Elon_Musk" },
  { name: "MrBeast", article: "MrBeast" },
  { name: "Burna Boy", article: "Burna_Boy" },
  { name: "Rihanna", article: "Rihanna" },
  { name: "LeBron James", article: "LeBron_James" },
  { name: "Kylian Mbappé", article: "Kylian_Mbappé" },
];

const DUELS: Array<[number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [0, 11], [2, 9], [4, 6],
];

async function wikiViews(article: string, yyyymmdd: string): Promise<number | null> {
  try {
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${yyyymmdd}00/${yyyymmdd}00`;
    const res = await fetch(url, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const json = await res.json() as { items?: Array<{ views?: number }> };
    const v = json.items?.[0]?.views;
    return typeof v === "number" ? v : null;
  } catch { return null; }
}

// excludeKeys: `${aIdx}-${bIdx}-${yyyymmdd}` (both orders checked by caller)
export function generateWikiDuels(opts: { need: number; excludeKeys: Set<string> }): VerdexMarket[] {
  if (opts.need <= 0) return [];

  // Target tomorrow's UTC day so nobody has partial information at bet time
  const target = new Date(Date.now() + 86_400_000);
  const date = dayKey(target);
  const dayStart = new Date(`${dayIso(date)}T00:00:00Z`);
  const closes = dayStart.toISOString();
  const resolves = new Date(dayStart.getTime() + 38 * 3_600_000).toISOString(); // day end + 14h publish lag

  const markets: VerdexMarket[] = [];
  for (const [a, b] of [...DUELS].sort(() => Math.random() - 0.5)) {
    if (markets.length >= opts.need) break;
    if (opts.excludeKeys.has(`${a}-${b}-${date}`) || opts.excludeKeys.has(`${b}-${a}-${date}`)) continue;
    const A = TOPICS[a], B = TOPICS[b];
    markets.push({
      ...baseRow,
      id: `data-v1-wiki-${a}-${b}-${date}-${Math.floor(dayStart.getTime() / 1000)}-${rid()}`,
      title: `Will ${A.name} beat ${B.name} in Wikipedia views on ${dayIso(date)}?`,
      description: `Resolves YES if ${A.name}'s English Wikipedia article records strictly more pageviews than ${B.name}'s on ${dayIso(date)} (UTC day). A tie resolves NO. Source: Wikimedia official pageview statistics.`,
      category: "culture", closesAt: closes, resolvesAt: resolves,
    });
  }
  return markets;
}

// ══ RESOLUTION DISPATCH ═══════════════════════════════════════════════════════

// Returns "yes"/"no", null (data not ready — retry later), or undefined (not ours)
export async function resolveExtraOutcome(id: string): Promise<"yes" | "no" | null | undefined> {
  const parts = id.split("-");

  if (id.startsWith("data-v1-wx-") && parts.length === 9) {
    const city = CITIES[Number(parts[3])];
    const metric = parts[4];
    const threshold = Number(parts[5]);
    const date = parts[6];
    if (!city || !Number.isFinite(threshold)) return null;
    const daily = await fetchDaily(city, 3);
    if (!daily) return null;
    const di = daily.time.indexOf(dayIso(date));
    if (di < 0) return null;
    if (metric === "rain") {
      const sum = daily.precipitation_sum[di];
      return Number.isFinite(sum) ? (sum >= threshold ? "yes" : "no") : null;
    }
    if (metric === "tmax") {
      const max = daily.temperature_2m_max[di];
      return Number.isFinite(max) ? (max > threshold ? "yes" : "no") : null;
    }
    return null;
  }

  if (id.startsWith("data-v1-nba-") && parts.length === 9) {
    const eventId = parts[3], day = parts[4], type = parts[5], param = Number(parts[6]);
    // ESPN's dates param is US Eastern — search the stored day and neighbours
    let comp: NonNullable<EspnEvent["competitions"]>[0] | undefined;
    for (const delta of [0, -1, 1]) {
      const d = new Date(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + delta);
      const events = await fetchNba(dayKey(d));
      comp = events.find((e) => e.id === eventId)?.competitions?.[0];
      if (comp) break;
    }
    if (!comp?.status?.type?.completed) return null;
    const comps = comp.competitors ?? [];
    const home = comps.find((c) => c.homeAway === "home");
    const away = comps.find((c) => c.homeAway === "away");
    if (!home || !away) return null;
    if (type === "hwin") return home.winner === true ? "yes" : "no";
    if (type === "tp") {
      const total = Number(home.score) + Number(away.score);
      return Number.isFinite(total) ? (total > param ? "yes" : "no") : null;
    }
    return null;
  }

  if (id.startsWith("data-v1-wiki-") && parts.length === 8) {
    const A = TOPICS[Number(parts[3])], B = TOPICS[Number(parts[4])];
    const date = parts[5];
    if (!A || !B) return null;
    const [va, vb] = await Promise.all([wikiViews(A.article, date), wikiViews(B.article, date)]);
    if (va === null || vb === null) return null; // stats not published yet
    return va > vb ? "yes" : "no";
  }

  return undefined;
}
