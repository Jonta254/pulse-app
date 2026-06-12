// ── Football Oracle (zero-cost, no AI) ────────────────────────────────────────
// Real FIFA World Cup markets from ESPN's free public scoreboard API — no key,
// no signup. Markets are generated from confirmed fixtures and auto-resolved
// from the official final result, so the whole football loop costs nothing.
//
// Market id encodes everything the resolver needs:
//   data-v1-fb-<eventId>-<yyyymmdd>-<type>-<closeSec>-<rand>
//   types: hwin (home wins; draw=NO) | g3 (3+ total goals) | btts (both score)

import type { VerdexMarket } from "@/types/verdex";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

type EspnCompetitor = {
  homeAway: "home" | "away";
  winner?: boolean;
  score?: string;
  team?: { displayName?: string };
};

type EspnEvent = {
  id: string;
  date: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: { type?: { completed?: boolean } };
  }>;
};

async function fetchScoreboard(yyyymmdd?: string): Promise<EspnEvent[]> {
  try {
    const url = yyyymmdd ? `${ESPN}/scoreboard?dates=${yyyymmdd}` : `${ESPN}/scoreboard`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const json = await res.json() as { events?: EspnEvent[] };
    return json.events ?? [];
  } catch {
    return [];
  }
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function fmtKickoff(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function teams(ev: EspnEvent): { home: string; away: string } | null {
  const comps = ev.competitions?.[0]?.competitors ?? [];
  const home = comps.find((c) => c.homeAway === "home")?.team?.displayName;
  const away = comps.find((c) => c.homeAway === "away")?.team?.displayName;
  return home && away ? { home, away } : null;
}

// ── Generation ────────────────────────────────────────────────────────────────

export async function generateFootballMarkets(opts: { need: number; excludeEventIds: Set<string> }): Promise<VerdexMarket[]> {
  if (opts.need <= 0) return [];

  // Fixtures for today + next 2 days
  const days = [0, 1, 2].map((o) => dateKey(new Date(Date.now() + o * 86_400_000)));
  const seen = new Set<string>();
  const events: EspnEvent[] = [];
  for (const day of days) {
    for (const ev of await fetchScoreboard(day)) {
      if (!seen.has(ev.id)) { seen.add(ev.id); events.push(ev); }
    }
  }

  const now = Date.now();
  const markets: VerdexMarket[] = [];

  for (const ev of events) {
    if (markets.length >= opts.need) break;
    if (opts.excludeEventIds.has(ev.id)) continue;
    if (ev.competitions?.[0]?.status?.type?.completed) continue;

    const kickoff = new Date(ev.date);
    if (kickoff.getTime() - now < 30 * 60_000) continue; // too close to start

    const t = teams(ev);
    if (!t) continue;

    const closes = new Date(kickoff.getTime() - 10 * 60_000); // betting closes 10 min before kickoff
    const resolves = new Date(kickoff.getTime() + 150 * 60_000); // ~full match + ET buffer
    const closeSec = Math.floor(closes.getTime() / 1000);
    const day = dateKey(kickoff);
    const rand = () => Math.random().toString(36).slice(2, 6);
    const base = {
      category: "sports" as const,
      closesAt: closes.toISOString(),
      resolvesAt: resolves.toISOString(),
      outcome: null, yesPool: 0, noPool: 0, status: "open" as const,
      aiGenerated: false, totalBettors: 0,
    };
    const match = `${t.home} vs ${t.away} (FIFA World Cup, kickoff ${fmtKickoff(kickoff)})`;

    markets.push({
      ...base,
      id: `data-v1-fb-${ev.id}-${day}-hwin-${closeSec}-${rand()}`,
      title: `Will ${t.home} beat ${t.away}?`,
      description: `Resolves YES if ${t.home} is the official winner of ${match}. A draw resolves NO. Extra time and penalties count in knockout rounds. Source: ESPN final result.`,
      featured: markets.length === 0,
    });
    if (markets.length >= opts.need) break;

    markets.push({
      ...base,
      id: `data-v1-fb-${ev.id}-${day}-g3-${closeSec}-${rand()}`,
      title: `Will ${t.home} vs ${t.away} have 3+ goals?`,
      description: `Resolves YES if the final score of ${match} totals 3 or more goals (extra time included, penalty shootouts excluded). Source: ESPN final score.`,
      featured: false,
    });
    if (markets.length >= opts.need) break;

    markets.push({
      ...base,
      id: `data-v1-fb-${ev.id}-${day}-btts-${closeSec}-${rand()}`,
      title: `Will both ${t.home} and ${t.away} score?`,
      description: `Resolves YES if both teams score at least one goal in ${match} (extra time included, penalty shootouts excluded). Source: ESPN final score.`,
      featured: false,
    });
  }

  return markets;
}

// ── Resolution ────────────────────────────────────────────────────────────────

export type ParsedFootballMarket = { eventId: string; day: string; type: "hwin" | "g3" | "btts" };

export function parseFootballMarketId(id: string): ParsedFootballMarket | null {
  if (!id.startsWith("data-v1-fb-")) return null;
  const parts = id.split("-");
  if (parts.length !== 8) return null;
  const type = parts[5];
  if (type !== "hwin" && type !== "g3" && type !== "btts") return null;
  return { eventId: parts[3], day: parts[4], type };
}

function shiftDay(yyyymmdd: string, delta: number): string {
  const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dateKey(d);
}

// Returns outcome, or null while the match isn't finished / data unavailable
export async function resolveFootballOutcome(parsed: ParsedFootballMarket): Promise<"yes" | "no" | null> {
  // ESPN's dates param is US Eastern — a 02:00 UTC kickoff lists under the
  // previous ESPN date, so search the stored day and both neighbours
  let ev: EspnEvent | undefined;
  for (const day of [parsed.day, shiftDay(parsed.day, -1), shiftDay(parsed.day, 1)]) {
    ev = (await fetchScoreboard(day)).find((e) => e.id === parsed.eventId);
    if (ev) break;
  }
  const comp = ev?.competitions?.[0];
  if (!comp?.status?.type?.completed) return null;

  const comps = comp.competitors ?? [];
  const home = comps.find((c) => c.homeAway === "home");
  const away = comps.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  if (parsed.type === "hwin") {
    return home.winner === true ? "yes" : "no";
  }

  const hs = Number(home.score);
  const as = Number(away.score);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;

  if (parsed.type === "g3") return hs + as >= 3 ? "yes" : "no";
  return hs >= 1 && as >= 1 ? "yes" : "no"; // btts
}
