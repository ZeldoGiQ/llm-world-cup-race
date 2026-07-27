/**
 * Feed "football-data.org" → Kategorie football-leagues.
 *
 * Nutzt den bereits vorhandenen FOOTBALL_DATA_API_KEY (Free Tier). Ein Aufruf je
 * Wettbewerb pro Lauf – das Rate-Limit von 10 Anfragen/Minute wird durch eine
 * kurze Pause zwischen den Wettbewerben eingehalten.
 *
 * Wichtig für die Vergleichbarkeit: getippt wird der Stand nach 90 Minuten
 * (fullTime im Feed). Verlängerung/Elfmeter kommen in Ligaspielen nicht vor;
 * in Pokal-/CL-Runden wird ausdrücklich der reguläre Stand gewertet.
 */
import { getJson, type DraftEvent, type FeedSource, type ResolvedEvent } from './types.mts';
import { requireSecret } from '../lib/env.mts';

const CATEGORY = 'football-leagues';
const BASE = 'https://api.football-data.org/v4';

/** Wettbewerbe des Free Tiers, nach Relevanz sortiert (Sommer trägt BSA). */
const COMPETITIONS = [
  { code: 'CL', name: 'UEFA Champions League' },
  { code: 'PL', name: 'Premier League' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'PD', name: 'La Liga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'BSA', name: 'Brasileirão' },
  { code: 'DED', name: 'Eredivisie' },
  { code: 'PPL', name: 'Primeira Liga' },
  { code: 'ELC', name: 'Championship' },
];

interface FdTeam {
  name?: string;
  shortName?: string;
  tla?: string;
}

type FdScorePair = { home: number | null; away: number | null } | null;

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  homeTeam?: FdTeam;
  awayTeam?: FdTeam;
  score?: {
    /** REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT */
    duration?: string;
    fullTime?: FdScorePair;
    regularTime?: FdScorePair;
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Stand nach 90 Minuten – genau das, was im Prompt gefragt wird.
 *
 * Wichtig: `fullTime` ist NICHT der 90-Minuten-Stand, sobald verlängert wurde.
 * Bei EXTRA_TIME enthält es den 120-Minuten-Stand, bei PENALTY_SHOOTOUT laut
 * API-Doku sogar die Elfmetertore obendrauf (1:1 n. V., 6:5 i. E. -> 7:6).
 * Der reguläre Stand steht dann in `regularTime`. Fehlt er, wird NICHT geraten –
 * null führt zu VOID, was folgenlos ist, während ein falsches Ergebnis jeden
 * korrekten Tipp entwerten würde.
 *
 * (Die WM-Kategorie wertet bewusst 120 Minuten; deren Logik liegt unangetastet
 * in scripts/fetch-results.mjs.)
 *
 * Exportiert für football-data.test.mts.
 */
export function scoreAfter90(score: FdMatch['score']): { home: number; away: number } | null {
  const duration = score?.duration ?? 'REGULAR';
  const pair = duration === 'REGULAR' ? score?.fullTime : score?.regularTime;
  if (isNumber(pair?.home) && isNumber(pair?.away)) return { home: pair.home, away: pair.away };
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function teamLabel(team: FdTeam | undefined): string {
  return team?.shortName ?? team?.name ?? 'TBD';
}

async function competitionMatches(code: string, from: string, to: string): Promise<FdMatch[]> {
  const url = `${BASE}/competitions/${code}/matches?dateFrom=${from}&dateTo=${to}`;
  const raw = (await getJson(url, { 'X-Auth-Token': requireSecret('FOOTBALL_DATA_API_KEY') })) as {
    matches?: FdMatch[];
  };
  return Array.isArray(raw.matches) ? raw.matches : [];
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const footballDataSource: FeedSource = {
  id: 'football-data',
  categories: [CATEGORY],

  async fetchEvents({ cap, minUtcDate }) {
    // Fenster: ab dem frühsten erlaubten Lock bis 10 Tage später.
    const from = isoDay(minUtcDate);
    const to = isoDay(new Date(minUtcDate.getTime() + 10 * 86_400_000));
    const drafts: DraftEvent[] = [];

    for (const competition of COMPETITIONS) {
      if (drafts.length >= cap) break;
      let matches: FdMatch[];
      try {
        matches = await competitionMatches(competition.code, from, to);
      } catch (error) {
        // Ein einzelner Wettbewerb (z. B. Saisonpause) darf den Feed nicht kippen.
        console.log(`  ${competition.code}: ${error instanceof Error ? error.message : error}`);
        await sleep(7_000);
        continue;
      }

      for (const match of matches) {
        if (drafts.length >= cap) break;
        if (match.status !== 'SCHEDULED' && match.status !== 'TIMED') continue;
        if (new Date(match.utcDate) < minUtcDate) continue;

        const home = teamLabel(match.homeTeam);
        const away = teamLabel(match.awayTeam);
        drafts.push({
          category: CATEGORY,
          id: `fd-${match.id}`,
          title: `${home} – ${away}`,
          utcDate: match.utcDate,
          predictionType: 'scoreline',
          metadata: {
            competition: competition.name,
            competitionCode: competition.code,
            matchday: match.matchday ?? null,
            home: { name: home, tla: match.homeTeam?.tla ?? null },
            away: { name: away, tla: match.awayTeam?.tla ?? null },
          },
          expectedResolutionAt: new Date(new Date(match.utcDate).getTime() + 3 * 3_600_000).toISOString(),
          resolutionRule:
            `Official full-time score after 90 minutes (plus stoppage time) as reported by ` +
            `football-data.org for match ${match.id}. Extra time and penalty shootouts do not count. ` +
            `If the match is postponed, abandoned or cancelled, the event is voided.`,
          context: [
            `Competition: ${competition.name}`,
            ...(match.matchday ? [`Matchday: ${match.matchday}`] : []),
            `Home team: ${home}`,
            `Away team: ${away}`,
          ],
        });
      }
      await sleep(7_000); // Free Tier: 10 Anfragen/Minute
    }

    return drafts;
  },

  async resolve(events) {
    const results: ResolvedEvent[] = [];
    // Ein Batch-Aufruf für alle fälligen IDs statt eines Calls je Spiel.
    const ids = events
      .map((e) => e.id.replace(/^fd-/, ''))
      .filter((id) => /^\d+$/.test(id));
    if (ids.length === 0) return results;

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));

    const byId = new Map<string, FdMatch>();
    for (const chunk of chunks) {
      const raw = (await getJson(`${BASE}/matches?ids=${chunk.join(',')}`, {
        'X-Auth-Token': requireSecret('FOOTBALL_DATA_API_KEY'),
      })) as { matches?: FdMatch[] };
      for (const match of raw.matches ?? []) byId.set(String(match.id), match);
      await sleep(7_000);
    }

    for (const event of events) {
      const match = byId.get(event.id.replace(/^fd-/, ''));
      if (!match) {
        results.push({ category: event.category, id: event.id, resolution: null });
        continue;
      }

      // Unbekanntes wird nie gewertet: nur FINISHED löst auf, abgesagt/verschoben
      // wird ungültig, alles andere bleibt offen.
      if (match.status === 'FINISHED') {
        const after90 = scoreAfter90(match.score);
        if (after90) {
          results.push({
            category: event.category,
            id: event.id,
            resolution: { kind: 'scoreline', ...after90 },
            evidence: {
              source: 'football-data.org',
              status: match.status,
              duration: match.score?.duration ?? 'REGULAR',
              scoreAfter90: after90,
              fullTime: match.score?.fullTime ?? null,
            },
          });
        } else {
          results.push({
            category: event.category,
            id: event.id,
            resolution: null,
            voidReason:
              `Feed meldet FINISHED (duration ${match.score?.duration ?? 'REGULAR'}), aber der ` +
              `Stand nach 90 Minuten ist daraus nicht ableitbar.`,
          });
        }
      } else if (['POSTPONED', 'CANCELLED', 'SUSPENDED', 'AWARDED'].includes(match.status)) {
        results.push({
          category: event.category,
          id: event.id,
          resolution: null,
          voidReason: `Spielstatus ${match.status} – kein reguläres Ergebnis.`,
        });
      } else {
        results.push({ category: event.category, id: event.id, resolution: null });
      }
    }

    return results;
  },
};
