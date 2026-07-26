#!/usr/bin/env node
/**
 * Übernimmt die abgeschlossene Fussball-WM als echte Arena-Kategorie.
 *
 * Liest `public/data/{matches,predictions}.json` **ausschliesslich lesend** und
 * schreibt `public/arena-data/football-worldcup/{events,predictions}.json` im
 * generischen Arena-Schema. Der WM-Bestand wird nicht angetastet.
 *
 * Idempotent: mehrfaches Ausführen erzeugt dasselbe Ergebnis. Da das Turnier
 * beendet ist, gibt es kein Staleness-Risiko.
 *
 *   node scripts/arena/build-worldcup.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_MATCHES = path.join(ROOT, 'public/data/matches.json');
const SRC_PREDICTIONS = path.join(ROOT, 'public/data/predictions.json');
const OUT_DIR = path.join(ROOT, 'public/arena-data/football-worldcup');
const CATEGORY = 'football-worldcup';

/** WM-Status -> Arena-Status. OTHER (verschoben/abgesagt) wird nie gewertet. */
const STATUS_MAP = {
  UPCOMING: 'UPCOMING',
  LIVE: 'LIVE',
  FINISHED: 'RESOLVED',
  OTHER: 'VOID',
};

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function mapEvent(match) {
  const status = STATUS_MAP[match.status] ?? 'VOID';
  const hasScore = isNumber(match.score?.home) && isNumber(match.score?.away);

  return {
    id: String(match.id),
    title: `${match.home?.name ?? 'TBD'} – ${match.away?.name ?? 'TBD'}`,
    utcDate: match.utcDate,
    status,
    predictionType: 'scoreline',
    resolution:
      status === 'RESOLVED' && hasScore
        ? { kind: 'scoreline', home: match.score.home, away: match.score.away }
        : null,
    // Alles Fussballspezifische lebt hier – der Arena-Core liest es nie,
    // nur der Kategorie-Renderer.
    metadata: {
      stage: match.stage ?? null,
      group: match.group ?? null,
      home: match.home ?? null,
      away: match.away ?? null,
      ...(match.duration ? { duration: match.duration } : {}),
      ...(match.penalties ? { penalties: match.penalties } : {}),
    },
  };
}

async function main() {
  const matchesFile = JSON.parse(await readFile(SRC_MATCHES, 'utf8'));
  const predictionsFile = JSON.parse(await readFile(SRC_PREDICTIONS, 'utf8'));

  const matches = Array.isArray(matchesFile?.matches) ? matchesFile.matches : [];
  if (matches.length === 0) {
    console.error('Keine Spiele in public/data/matches.json gefunden – Abbruch.');
    process.exit(1);
  }

  const events = matches
    .map(mapEvent)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate) || Number(a.id) - Number(b.id));

  const sourcePredictions = predictionsFile?.predictions ?? {};
  const predictions = {};
  let tipCount = 0;
  let missingCreatedAt = 0;

  for (const [matchId, byModel] of Object.entries(sourcePredictions)) {
    const entry = {};
    for (const [modelId, tip] of Object.entries(byModel)) {
      if (!isNumber(tip?.home) || !isNumber(tip?.away)) continue;
      if (!tip.createdAt) missingCreatedAt += 1;
      entry[modelId] = {
        value: { kind: 'scoreline', home: tip.home, away: tip.away },
        // Leerer String = Abgabezeitpunkt unbekannt. Die UI zeigt dann bewusst
        // KEIN "vor Anpfiff"-Siegel, statt einen Zeitpunkt zu behaupten.
        createdAt: tip.createdAt ?? '',
      };
      tipCount += 1;
    }
    if (Object.keys(entry).length > 0) predictions[matchId] = entry;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, 'events.json'),
    JSON.stringify({ category: CATEGORY, updatedAt: matchesFile.updatedAt, events }, null, 2) + '\n',
    'utf8',
  );
  await writeFile(
    path.join(OUT_DIR, 'predictions.json'),
    JSON.stringify({ category: CATEGORY, predictions }, null, 2) + '\n',
    'utf8',
  );

  const resolved = events.filter((e) => e.status === 'RESOLVED' && e.resolution).length;
  console.log(`football-worldcup: ${events.length} Events (${resolved} aufgelöst), ${tipCount} Tipps.`);
  if (missingCreatedAt > 0) {
    console.log(`  Hinweis: ${missingCreatedAt} Tipps ohne Abgabezeitpunkt – kein Lock-Siegel.`);
  }
}

main().catch((error) => {
  console.error(`Fehler: ${error?.message ?? error}`);
  process.exit(1);
});
