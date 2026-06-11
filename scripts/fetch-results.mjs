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
import { fileURLToPath } from 'node:url';

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

function mapMatch(match) {
  return {
    id: match.id,
    stage: match.stage ?? 'UNKNOWN',
    group: match.group ? String(match.group).replace(/^GROUP_/, '') : null,
    utcDate: match.utcDate,
    status: STATUS_MAP[match.status] ?? 'OTHER',
    home: mapTeam(match.homeTeam),
    away: mapTeam(match.awayTeam),
    // fullTime = Endstand der regulären Spielzeit inkl. Verlängerung.
    // Ein Elfmeterschiessen (score.penalties) wird bewusst IGNORIERT:
    // gewertet wird das reguläre Ergebnis, d. h. bei Entscheidung im
    // Elfmeterschiessen zählt das Remis (siehe Scoring-Doku im README).
    score: {
      home: match.score?.fullTime?.home ?? null,
      away: match.score?.fullTime?.away ?? null,
    },
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

main();
