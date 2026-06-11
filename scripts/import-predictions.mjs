#!/usr/bin/env node
/**
 * Importiert eine ausgefüllte predictions-template.csv nach
 * public/data/predictions.json.
 *
 *   node scripts/import-predictions.mjs [pfad/zur/datei.csv]
 *
 * Regeln:
 *   - Leere Zellen werden übersprungen.
 *   - Zellenformat "2-1" (auch "2:1" wird akzeptiert); Ungültiges -> Warnung.
 *   - Vorhandene Tipps bleiben erhalten; nur neue/geänderte Zellen werden
 *     geschrieben und bekommen createdAt = jetzt (unveränderte Tipps behalten
 *     ihr ursprüngliches createdAt -> Basis für das "vor Anpfiff"-Badge).
 *   - Unbekannte matchIds werden gemeldet, aber importiert (Spielplan kann
 *     lokal veraltet sein); unbekannte Modell-Spalten werden gemeldet und
 *     übersprungen (models.json ist die Quelle der Wahrheit).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './lib/csv.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MODELS_FILE = path.resolve(SCRIPT_DIR, '../src/data/models.json');
const MATCHES_FILE = path.resolve(SCRIPT_DIR, '../public/data/matches.json');
const PREDICTIONS_FILE = path.resolve(SCRIPT_DIR, '../public/data/predictions.json');

const SCORE_PATTERN = /^(\d+)\s*[-:–]\s*(\d+)$/;

async function main() {
  const csvPath = path.resolve(process.cwd(), process.argv[2] ?? 'predictions-template.csv');

  let csvText;
  try {
    csvText = await readFile(csvPath, 'utf8');
  } catch {
    console.error(`CSV-Datei nicht gefunden: ${csvPath}`);
    console.error('Erst Template erzeugen: node scripts/build-template.mjs');
    process.exit(1);
  }

  const models = JSON.parse(await readFile(MODELS_FILE, 'utf8'));
  const modelIds = new Set(models.map((model) => model.id));

  let knownMatchIds = null;
  try {
    const matchesFile = JSON.parse(await readFile(MATCHES_FILE, 'utf8'));
    knownMatchIds = new Set((matchesFile.matches ?? []).map((match) => String(match.id)));
  } catch {
    // ohne matches.json keine Validierung der matchIds
  }

  const { rows, delimiter } = parseCsv(csvText);
  if (rows.length < 2) {
    console.error('CSV enthält keine Datenzeilen.');
    process.exit(1);
  }

  const header = rows[0].map((cell) => cell.trim());
  const matchIdColumn = header.indexOf('matchId');
  if (matchIdColumn === -1) {
    console.error('CSV-Header enthält keine Spalte "matchId" - falsche Datei?');
    process.exit(1);
  }

  const FIXED_COLUMNS = new Set(['matchId', 'utcDate', 'stage', 'group', 'home', 'away']);
  const warnings = [];
  const modelColumns = [];
  header.forEach((name, index) => {
    if (FIXED_COLUMNS.has(name)) return;
    if (modelIds.has(name)) modelColumns.push({ modelId: name, index });
    else if (name !== '') warnings.push(`Unbekannte Spalte "${name}" wird ignoriert (nicht in models.json).`);
  });
  if (modelColumns.length === 0) {
    console.error('Keine Modell-Spalten gefunden (erwartet z. B. ' + [...modelIds].join(', ') + ').');
    process.exit(1);
  }

  let predictionsFile = { predictions: {} };
  try {
    predictionsFile = JSON.parse(await readFile(PREDICTIONS_FILE, 'utf8'));
    if (!predictionsFile.predictions || typeof predictionsFile.predictions !== 'object') {
      predictionsFile.predictions = {};
    }
  } catch {
    // noch keine predictions.json -> wird neu angelegt
  }

  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let skippedEmpty = 0;

  for (const row of rows.slice(1)) {
    const matchId = (row[matchIdColumn] ?? '').trim();
    if (!matchId) {
      warnings.push('Zeile ohne matchId übersprungen.');
      continue;
    }
    if (knownMatchIds && !knownMatchIds.has(matchId)) {
      warnings.push(`matchId ${matchId} ist nicht in matches.json (wird trotzdem importiert).`);
    }

    for (const { modelId, index } of modelColumns) {
      const cell = (row[index] ?? '').trim();
      if (cell === '') {
        skippedEmpty += 1;
        continue;
      }
      const parsed = SCORE_PATTERN.exec(cell);
      if (!parsed) {
        warnings.push(`Ungültiger Tipp "${cell}" (matchId ${matchId}, ${modelId}) - erwartet z. B. "2-1".`);
        continue;
      }
      const tip = { home: Number(parsed[1]), away: Number(parsed[2]), createdAt: now };

      const matchPredictions = (predictionsFile.predictions[matchId] ??= {});
      const existing = matchPredictions[modelId];
      if (existing && existing.home === tip.home && existing.away === tip.away) {
        unchanged += 1; // identischer Tipp -> createdAt unangetastet lassen
        continue;
      }
      if (existing) updated += 1;
      else added += 1;
      matchPredictions[modelId] = tip;
    }
  }

  // Stabile, diff-freundliche Ausgabe: matchIds numerisch sortiert,
  // Modelle in der Reihenfolge von models.json (fremde Keys hinten anstellen).
  const modelOrder = models.map((model) => model.id);
  const sortedPredictions = {};
  const matchKeys = Object.keys(predictionsFile.predictions).sort((a, b) => Number(a) - Number(b));
  for (const key of matchKeys) {
    const entry = predictionsFile.predictions[key];
    const sortedEntry = {};
    for (const id of modelOrder) if (entry[id]) sortedEntry[id] = entry[id];
    for (const id of Object.keys(entry)) if (!(id in sortedEntry)) sortedEntry[id] = entry[id];
    sortedPredictions[key] = sortedEntry;
  }

  await writeFile(
    PREDICTIONS_FILE,
    JSON.stringify({ predictions: sortedPredictions }, null, 2) + '\n',
    'utf8',
  );

  console.log(`Import abgeschlossen (Delimiter "${delimiter}"):`);
  console.log(`  +${added} neu, ~${updated} geändert, =${unchanged} unverändert, ${skippedEmpty} leere Zellen übersprungen.`);
  if (warnings.length > 0) {
    console.log(`  ${warnings.length} Warnung(en):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
  console.log('Danach veröffentlichen mit:');
  console.log('  git add public/data/predictions.json && git commit -m "tippabgabe" && git push');
}

main().catch((error) => {
  console.error(`Fehler: ${error?.message ?? error}`);
  process.exit(1);
});
