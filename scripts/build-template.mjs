#!/usr/bin/env node
/**
 * Erzeugt predictions-template.csv zum Ausfüllen im Spreadsheet.
 *
 *   node scripts/build-template.mjs                       # alle Spiele
 *   node scripts/build-template.mjs --stage GROUP_STAGE   # nur eine Phase
 *   node scripts/build-template.mjs --stage LAST_16,QUARTER_FINALS
 *   node scripts/build-template.mjs --out meine-datei.csv
 *
 * Spalten: matchId, utcDate, stage, group, home, away + eine Spalte pro
 * Modell aus src/data/models.json. Zellenformat: "2-1".
 * Bereits vorhandene Tipps aus public/data/predictions.json werden
 * vorbefüllt (unveränderte Zellen bleiben beim Import unangetastet).
 *
 * Spielplan-Quelle: football-data.org (FOOTBALL_DATA_API_KEY nötig);
 * ohne Key wird als Fallback der lokale Stand public/data/matches.json benutzt.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCsv } from './lib/csv.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MODELS_FILE = path.resolve(SCRIPT_DIR, '../src/data/models.json');
const MATCHES_FILE = path.resolve(SCRIPT_DIR, '../public/data/matches.json');
const PREDICTIONS_FILE = path.resolve(SCRIPT_DIR, '../public/data/predictions.json');
const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

function parseArgs(argv) {
  const args = { stage: null, out: 'predictions-template.csv' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--stage') args.stage = argv[++i] ?? null;
    else if (argv[i] === '--out') args.out = argv[++i] ?? args.out;
  }
  return args;
}

async function loadMatches() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (apiKey) {
    const response = await fetch(API_URL, {
      headers: { 'X-Auth-Token': apiKey },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`API-Fehler: HTTP ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload?.matches)) throw new Error('Unerwartete API-Antwort.');
    return payload.matches.map((match) => ({
      id: match.id,
      utcDate: match.utcDate,
      stage: match.stage ?? 'UNKNOWN',
      group: match.group ? String(match.group).replace(/^GROUP_/, '') : null,
      home: match.homeTeam?.name ?? 'TBD',
      away: match.awayTeam?.name ?? 'TBD',
    }));
  }

  console.warn('Hinweis: FOOTBALL_DATA_API_KEY nicht gesetzt - nutze lokalen Stand aus public/data/matches.json.');
  const local = JSON.parse(await readFile(MATCHES_FILE, 'utf8'));
  return (local.matches ?? []).map((match) => ({
    id: match.id,
    utcDate: match.utcDate,
    stage: match.stage,
    group: match.group,
    home: match.home?.name ?? 'TBD',
    away: match.away?.name ?? 'TBD',
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const models = JSON.parse(await readFile(MODELS_FILE, 'utf8'));

  let existingPredictions = {};
  try {
    existingPredictions = JSON.parse(await readFile(PREDICTIONS_FILE, 'utf8')).predictions ?? {};
  } catch {
    // noch keine predictions.json -> leeres Template
  }

  let matches = await loadMatches();

  if (args.stage) {
    const wanted = new Set(
      args.stage.split(',').map((stage) => stage.trim().toUpperCase()).filter(Boolean),
    );
    matches = matches.filter((match) => wanted.has(String(match.stage).toUpperCase()));
  }

  matches.sort((a, b) => String(a.utcDate).localeCompare(String(b.utcDate)) || a.id - b.id);

  if (matches.length === 0) {
    console.error(`Keine Spiele gefunden${args.stage ? ` für --stage ${args.stage}` : ''} - keine Datei geschrieben.`);
    process.exit(1);
  }

  const header = ['matchId', 'utcDate', 'stage', 'group', 'home', 'away', ...models.map((m) => m.id)];
  const rows = [header];
  for (const match of matches) {
    const existing = existingPredictions[String(match.id)] ?? {};
    rows.push([
      match.id,
      match.utcDate,
      match.stage,
      match.group ?? '',
      match.home,
      match.away,
      ...models.map((model) => {
        const tip = existing[model.id];
        return tip ? `${tip.home}-${tip.away}` : '';
      }),
    ]);
  }

  const outPath = path.resolve(process.cwd(), args.out);
  await writeFile(outPath, buildCsv(rows), 'utf8');
  console.log(`${args.out} geschrieben: ${matches.length} Spiele, ${models.length} Modell-Spalten.`);
  console.log('Im Spreadsheet ausfüllen (Format "2-1"), dann importieren mit:');
  console.log(`  node scripts/import-predictions.mjs ${args.out}`);
}

main().catch((error) => {
  console.error(`Fehler: ${error?.message ?? error}`);
  process.exit(1);
});
