#!/usr/bin/env node
/**
 * Erzeugt die DUMMY-Datensätze der Arena (Aktien, Wahlen, Sport-Mix).
 *
 * Wichtig: Diese Daten sind erfunden – sie dienen ausschliesslich dazu, das
 * Frontend zu bauen und zu prüfen, solange es keine echten Resolver gibt. Das
 * Schema ist identisch zu dem, was ein echter Resolver später liefert, damit der
 * Umstieg auf Echtdaten keine Frontend-Änderung braucht.
 *
 * Deterministisch: fester Seed -> bei jedem Lauf identische Ausgabe (git-stabil).
 *
 *   node scripts/arena/build-dummy.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_ROOT = path.join(ROOT, 'public/arena-data');

/** mulberry32 – kleiner, deterministischer PRNG. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalverteilte Zufallszahl (Box-Muller) mit gegebenem Sigma. */
function gauss(random, sigma) {
  const u = Math.max(random(), 1e-9);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}

const round2 = (n) => Math.round(n * 100) / 100;
const clampProb = (p) => Math.min(0.97, Math.max(0.03, p));

async function writeCategory(id, events, predictions, updatedAt) {
  const dir = path.join(OUT_ROOT, id);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'events.json'),
    JSON.stringify({ category: id, updatedAt, events }, null, 2) + '\n',
    'utf8',
  );
  await writeFile(
    path.join(dir, 'predictions.json'),
    JSON.stringify({ category: id, predictions }, null, 2) + '\n',
    'utf8',
  );
  const resolved = events.filter((e) => e.status === 'RESOLVED').length;
  const tips = Object.values(predictions).reduce((sum, e) => sum + Object.keys(e).length, 0);
  console.log(`${id}: ${events.length} Events (${resolved} aufgelöst), ${tips} Tipps.`);
}

/* ------------------------------------------------------------------ */
/* 1) Aktienindex – numerische Punktschätzung                          */
/* ------------------------------------------------------------------ */

async function buildStocks() {
  const random = rng(20260719);
  // Genauigkeit der Modelle: kleineres Sigma = bessere Schätzungen.
  const profiles = {
    grok: { sigma: 28, bias: 2 },
    claude: { sigma: 34, bias: -4 },
    gpt: { sigma: 45, bias: 6 },
    kimi: { sigma: 52, bias: -8 },
    gemini: { sigma: 61, bias: 12 },
    qwen: { sigma: 78, bias: -15 },
    nova: { sigma: 30, bias: 0, onlyLast: 5 },
  };

  const events = [];
  const predictions = {};
  let close = 6180.42;
  const firstFriday = Date.UTC(2026, 3, 3, 20, 0, 0); // 03.04.2026, 20:00 UTC
  const WEEKS = 16;
  const RESOLVED_WEEKS = 12;

  for (let week = 0; week < WEEKS; week += 1) {
    const date = new Date(firstFriday + week * 7 * 24 * 3600 * 1000);
    const previousClose = close;
    // Wochenbewegung: leichter Aufwärtsdrift plus Rauschen.
    const nextClose = round2(previousClose * (1 + 0.0018 + gauss(random, 0.011)));
    const resolved = week < RESOLVED_WEEKS;
    const id = `spx-${date.toISOString().slice(0, 10)}`;

    events.push({
      id,
      title: `S&P 500 – Schlusskurs ${date.toLocaleDateString('de-DE', { timeZone: 'UTC' })}`,
      utcDate: date.toISOString(),
      status: resolved ? 'RESOLVED' : 'UPCOMING',
      predictionType: 'numeric',
      resolution: resolved ? { kind: 'numeric', value: nextClose } : null,
      metadata: {
        symbol: 'SPX',
        previousClose,
        period: 'Wochenschluss',
      },
    });

    const createdAt = new Date(date.getTime() - 3 * 24 * 3600 * 1000).toISOString();
    const entry = {};
    for (const [modelId, profile] of Object.entries(profiles)) {
      // Modell mit Early-Access nimmt erst an den letzten Wochen teil (kleines n).
      if (profile.onlyLast && week < WEEKS - profile.onlyLast) continue;
      const guess = round2(nextClose + profile.bias + gauss(random, profile.sigma));
      entry[modelId] = { value: { kind: 'numeric', value: guess }, createdAt };
    }
    // Baseline Random-Walk: "morgen wie heute" – der klassische Referenzwert.
    entry['baseline-randomwalk'] = {
      value: { kind: 'numeric', value: previousClose },
      createdAt,
    };
    // Eine bewusste Lücke: Qwen hat in Woche 4 keinen Tipp abgegeben.
    if (week === 4) delete entry.qwen;

    predictions[id] = entry;
    close = nextClose;
  }

  await writeCategory('stocks-index', events, predictions, '2026-07-19T21:00:00Z');
}

/* ------------------------------------------------------------------ */
/* 2) Wahlen & Politik – Wahrscheinlichkeiten (Ja/Nein)                */
/* ------------------------------------------------------------------ */

async function buildElections() {
  const random = rng(1312026);
  const questions = [
    ['Amtsinhaber gewinnt die Präsidentschaftswahl', 0.62, '2026-05-10'],
    ['Wahlbeteiligung über 70 Prozent', 0.44, '2026-05-10'],
    ['Regierungspartei verliert die absolute Mehrheit', 0.71, '2026-05-24'],
    ['Koalitionsverhandlungen dauern über 60 Tage', 0.38, '2026-06-02'],
    ['Grüne erreichen über 15 Prozent', 0.29, '2026-06-07'],
    ['Kandidatin X tritt vor der Wahl zurück', 0.12, '2026-06-14'],
    ['Zweiter Wahlgang wird nötig', 0.55, '2026-06-21'],
    ['Neue Partei zieht ins Parlament ein', 0.47, '2026-06-28'],
    ['Referendum wird angenommen', 0.66, '2026-07-05'],
    ['Rücktritt des Finanzministers bis Monatsende', 0.21, '2026-07-12'],
    ['Parlament beschliesst Neuwahlen', 0.33, '2026-08-16'],
    ['Umfragevorsprung schrumpft unter 3 Punkte', 0.58, '2026-08-23'],
    ['Kandidat Y gewinnt die Vorwahl', 0.49, '2026-09-06'],
    ['Wahlrechtsreform passiert die zweite Kammer', 0.4, '2026-09-13'],
  ];
  const RESOLVED_COUNT = 10;

  // Kalibrierungsprofile: gamma < 1 = zurückhaltend, > 1 = overconfident.
  const profiles = {
    claude: { gamma: 1.05, noise: 0.05 },
    gpt: { gamma: 1.1, noise: 0.07 },
    kimi: { gamma: 1.0, noise: 0.1 },
    grok: { gamma: 1.35, noise: 0.09 },
    gemini: { gamma: 2.1, noise: 0.08 }, // stark overconfident -> schlechter Log-Loss
    qwen: { gamma: 0.55, noise: 0.06 }, // klebt an 50/50 -> schwacher Brier
  };

  const events = [];
  const predictions = {};

  questions.forEach(([title, trueProbability, dateOnly], index) => {
    const date = new Date(`${dateOnly}T18:00:00Z`);
    const resolved = index < RESOLVED_COUNT;
    // Ausgang deterministisch aus der wahren Wahrscheinlichkeit ziehen.
    const outcome = random() < trueProbability;
    const id = `pol-${String(index + 1).padStart(2, '0')}`;

    events.push({
      id,
      title,
      utcDate: date.toISOString(),
      status: resolved ? 'RESOLVED' : 'UPCOMING',
      predictionType: 'binary',
      resolution: resolved ? { kind: 'binary', outcome } : null,
      metadata: { region: 'DACH', topic: 'Wahlen', source: 'Beispieldaten' },
    });

    const createdAt = new Date(date.getTime() - 14 * 24 * 3600 * 1000).toISOString();
    const entry = {};
    for (const [modelId, profile] of Object.entries(profiles)) {
      const noisy = clampProb(trueProbability + gauss(random, profile.noise));
      // Logit-Skalierung: verstärkt (gamma>1) oder dämpft (gamma<1) die Überzeugung.
      const logit = Math.log(noisy / (1 - noisy)) * profile.gamma;
      const scaled = clampProb(1 / (1 + Math.exp(-logit)));
      entry[modelId] = {
        value: { kind: 'binary', probability: round2(scaled) },
        createdAt,
      };
    }
    // Baseline: letzte Umfrage – nahe an der Wahrheit, aber träge.
    entry['baseline-poll'] = {
      value: { kind: 'binary', probability: round2(clampProb(trueProbability + gauss(random, 0.12))) },
      createdAt,
    };
    predictions[id] = entry;
  });

  await writeCategory('elections', events, predictions, '2026-07-19T21:00:00Z');
}

/* ------------------------------------------------------------------ */
/* 3) Sport-Mix – Ergebnistipps über verschiedene Ligen                */
/* ------------------------------------------------------------------ */

async function buildSportsMixed() {
  const random = rng(240726);
  const fixtures = [
    ['Bayern München', 'Bayer Leverkusen', 'Bundesliga', 'RESOLVED', [3, 1]],
    ['Manchester City', 'Arsenal', 'Premier League', 'RESOLVED', [1, 1]],
    ['Real Madrid', 'FC Barcelona', 'LaLiga', 'RESOLVED', [2, 3]],
    ['Inter Mailand', 'Juventus Turin', 'Serie A', 'RESOLVED', [2, 0]],
    ['Paris Saint-Germain', 'Olympique Marseille', 'Ligue 1', 'RESOLVED', [4, 0]],
    ['Borussia Dortmund', 'RB Leipzig', 'Bundesliga', 'RESOLVED', [1, 2]],
    ['Liverpool', 'Chelsea', 'Premier League', 'LIVE', [1, 0]],
    ['Atlético Madrid', 'Sevilla', 'LaLiga', 'LIVE', [0, 0]],
    ['AC Mailand', 'SSC Neapel', 'Serie A', 'UPCOMING', null],
    ['Ajax Amsterdam', 'PSV Eindhoven', 'Eredivisie', 'VOID', null],
  ];

  // Wie oft trifft ein Modell exakt / wie nah liegt es?
  const profiles = {
    kimi: { skill: 0.9 },
    gpt: { skill: 0.75 },
    claude: { skill: 0.72 },
    grok: { skill: 0.6 },
    gemini: { skill: 0.5 },
    qwen: { skill: 0.42 },
  };

  const events = [];
  const predictions = {};
  const base = Date.UTC(2026, 6, 25, 18, 30, 0);

  fixtures.forEach(([home, away, league, status, score], index) => {
    const date = new Date(base + index * 26 * 3600 * 1000);
    const id = `mix-${String(index + 1).padStart(2, '0')}`;

    events.push({
      id,
      title: `${home} – ${away}`,
      utcDate: date.toISOString(),
      status,
      predictionType: 'scoreline',
      resolution:
        status === 'RESOLVED' && score ? { kind: 'scoreline', home: score[0], away: score[1] } : null,
      metadata: { league, home: { name: home }, away: { name: away } },
    });

    const createdAt = new Date(date.getTime() - 2 * 24 * 3600 * 1000).toISOString();
    const entry = {};
    const reference = score ?? [1, 1];

    for (const [modelId, profile] of Object.entries(profiles)) {
      // Mit Wahrscheinlichkeit `skill` nahe am Referenzergebnis, sonst daneben.
      const accurate = random() < profile.skill;
      const jitter = () => (accurate ? Math.round(gauss(random, 0.6)) : Math.round(gauss(random, 1.6)));
      const home_ = Math.max(0, Math.min(6, reference[0] + jitter()));
      const away_ = Math.max(0, Math.min(6, reference[1] + jitter()));
      entry[modelId] = { value: { kind: 'scoreline', home: home_, away: away_ }, createdAt };
    }
    // Baseline: Buchmacher-Konsens – solide Tendenz, selten exakt.
    entry['baseline-market'] = {
      value: {
        kind: 'scoreline',
        home: Math.max(0, reference[0] + (random() < 0.5 ? 0 : 1)),
        away: Math.max(0, reference[1] - (random() < 0.6 ? 0 : 1)),
      },
      createdAt,
    };
    // Bewusste Lücke: beim letzten aufgelösten Spiel fehlt Geminis Tipp.
    if (index === 5) delete entry.gemini;

    predictions[id] = entry;
  });

  await writeCategory('sports-mixed', events, predictions, '2026-07-26T12:00:00Z');
}

/* ------------------------------------------------------------------ */

async function main() {
  await buildStocks();
  await buildElections();
  await buildSportsMixed();

  // Registry: welche Kategorien die Arena kennt (Quelle für getStaticPaths).
  const registry = {
    categories: [
      { id: 'football-worldcup', label: 'Fussball-WM 2026' },
      { id: 'stocks-index', label: 'Aktienindex' },
      { id: 'elections', label: 'Wahlen & Politik' },
      { id: 'sports-mixed', label: 'Sport-Mix' },
    ],
  };
  await writeFile(
    path.join(OUT_ROOT, 'registry.json'),
    JSON.stringify(registry, null, 2) + '\n',
    'utf8',
  );
  console.log(`registry.json: ${registry.categories.length} Kategorien.`);
}

main().catch((error) => {
  console.error(`Fehler: ${error?.message ?? error}`);
  process.exit(1);
});
