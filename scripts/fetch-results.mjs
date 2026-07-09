#!/usr/bin/env node
/**
 * Holt den kompletten WM-2026-Spielplan inkl. Ergebnisse von football-data.org
 * (v4, Competition WC) und schreibt public/data/matches.json im App-Schema.
 *
 * Defensiv:
 *   - Bei fehlendem Key, Nicht-200, Timeout oder kaputter Antwort wird die
 *     bestehende Datei NICHT angetastet und mit Exit-Code 1 abgebrochen –
 *     der alte Stand bleibt live.
 *   - Geschrieben wird nur, wenn sich inhaltlich etwas geändert hat
 *     (updatedAt zählt nicht als Änderung) -> kein unnötiger Commit/Deploy.
 *
 * Genau 1 API-Call pro Lauf (Free-Tier: 10 Calls/Minute -> unkritisch).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(SCRIPT_DIR, '../public/data/matches.json');
const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

/**
 * Status-Mapping football-data.org -> App:
 *   SCHEDULED, TIMED                -> UPCOMING
 *   IN_PLAY, PAUSED                 -> LIVE
 *   FINISHED, AWARDED               -> FINISHED
 *   SUSPENDED, POSTPONED, CANCELLED -> OTHER (dezent anzeigen, nie werten)
 * Unbekannte Status werden defensiv zu OTHER.
 */
const STATUS_MAP = {
  SCHEDULED: 'UPCOMING',
  TIMED: 'UPCOMING',
  IN_PLAY: 'LIVE',
  PAUSED: 'LIVE',
  FINISHED: 'FINISHED',
  AWARDED: 'FINISHED',
  SUSPENDED: 'OTHER',
  POSTPONED: 'OTHER',
  CANCELLED: 'OTHER',
};

function mapTeam(team) {
  // K.-o.-Spiele mit noch unbekannten Teams: API liefert null-Felder
  return {
    id: team?.id ?? null,
    name: team?.name ?? 'TBD',
    tla: team?.tla ?? null,
  };
}

/** {home, away} aus einem API-Score-Paar lesen (defensiv, v2-Altschreibweise inkl.). */
function scorePair(pair) {
  const home = pair?.home ?? pair?.homeTeam ?? null;
  const away = pair?.away ?? pair?.awayTeam ?? null;
  return typeof home === 'number' && typeof away === 'number' ? { home, away } : null;
}

/**
 * Ergebnis nach 120 Minuten bestimmen (fürs Tippspiel zählt NUR das).
 *
 * Laut API-Doku (docs.football-data.org/general/v4/overtime.html) enthält
 * fullTime bei duration=PENALTY_SHOOTOUT auch die Elfmeter-Tore
 * (Beispiel: 1:1 n. V., 6:5 i. E. -> fullTime 7:6). Deshalb:
 *   - PENALTY_SHOOTOUT: score = regularTime + extraTime
 *                       (Fallback: fullTime - penalties), Elfmeter separat.
 *   - EXTRA_TIME:       fullTime ist bereits der 120-Minuten-Stand.
 *   - REGULAR:          fullTime unverändert.
 */
function mapScore(apiScore, matchId) {
  const fullTime = scorePair(apiScore?.fullTime) ?? { home: null, away: null };
  const duration = apiScore?.duration ?? 'REGULAR';

  if (duration === 'EXTRA_TIME') {
    return { score: fullTime, duration: 'EXTRA_TIME', penalties: null };
  }
  if (duration !== 'PENALTY_SHOOTOUT') {
    return { score: fullTime, duration: null, penalties: null };
  }

  const regular = scorePair(apiScore?.regularTime);
  const extra = scorePair(apiScore?.extraTime);
  const penalties = scorePair(apiScore?.penalties);

  let after120 = null;
  if (regular && extra) {
    after120 = { home: regular.home + extra.home, away: regular.away + extra.away };
  } else if (scorePair(apiScore?.fullTime) && penalties) {
    after120 = { home: fullTime.home - penalties.home, away: fullTime.away - penalties.away };
  }
  if (!after120) {
    // Sollte nicht vorkommen - lieber fullTime anzeigen als gar nichts,
    // aber laut ins Log, damit es in den Action-Logs auffällt.
    console.warn(
      `WARNUNG: Match ${matchId} endete im Elfmeterschiessen, aber der 120-Minuten-Stand ` +
        `ist aus der API-Antwort nicht ableitbar (regularTime/extraTime/penalties fehlen).`,
    );
    return { score: fullTime, duration: 'PENALTY_SHOOTOUT', penalties };
  }
  return { score: after120, duration: 'PENALTY_SHOOTOUT', penalties };
}

export function mapMatch(match) {
  const { score, duration, penalties } = mapScore(match.score, match.id);
  return {
    id: match.id,
    stage: match.stage ?? 'UNKNOWN',
    group: match.group ? String(match.group).replace(/^GROUP_/, '') : null,
    utcDate: match.utcDate,
    status: STATUS_MAP[match.status] ?? 'OTHER',
    home: mapTeam(match.homeTeam),
    away: mapTeam(match.awayTeam),
    // Ergebnis nach 120 Minuten (regulär + Verlängerung), OHNE Elfmeterschiessen.
    score,
    // Nur gesetzt, wenn das Spiel über die reguläre Zeit hinausging:
    ...(duration ? { duration } : {}),
    ...(penalties ? { penalties } : {}),
  };
}

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error('FOOTBALL_DATA_API_KEY ist nicht gesetzt - Abbruch, matches.json bleibt unverändert.');
    process.exit(1);
  }

  let payload;
  try {
    const response = await fetch(API_URL, {
      headers: { 'X-Auth-Token': apiKey },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error(`API-Fehler: HTTP ${response.status} ${response.statusText} - Abbruch, matches.json bleibt unverändert.`);
      process.exit(1);
    }
    payload = await response.json();
  } catch (error) {
    console.error(`API nicht erreichbar (${error?.message ?? error}) - Abbruch, matches.json bleibt unverändert.`);
    process.exit(1);
  }

  if (!Array.isArray(payload?.matches)) {
    console.error('Unerwartete API-Antwort (Feld "matches" fehlt) - Abbruch, matches.json bleibt unverändert.');
    process.exit(1);
  }

  const matches = payload.matches
    .map(mapMatch)
    .sort((a, b) => String(a.utcDate).localeCompare(String(b.utcDate)) || a.id - b.id);

  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  } catch {
    // Datei fehlt oder ist kaputt -> einfach neu schreiben
  }

  if (previous && JSON.stringify(previous.matches) === JSON.stringify(matches)) {
    console.log(`Keine Änderungen (${matches.length} Spiele) - nichts geschrieben.`);
    return;
  }

  const output = { updatedAt: new Date().toISOString(), matches };
  await writeFile(OUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`matches.json aktualisiert: ${matches.length} Spiele.`);
}

// Nur ausführen, wenn direkt gestartet (erlaubt Import von mapMatch in Tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
