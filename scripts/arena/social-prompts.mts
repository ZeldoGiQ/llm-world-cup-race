/**
 * Prompt-Generator für Social-Media-Bilder (GPT Image 2 & Co.).
 *
 * Aufruf:
 *   npm run share:prompts                       → schreibt alle Prompts nach ops/social-prompts.md
 *   npm run share:prompts -- --preset banner    → gibt einen Prompt aus
 *   npm run share:prompts -- --preset announcement --headline "Grok leads with 21.5"
 *
 * Die Trennlinie, die dieser Generator zieht:
 *
 *   Ein Bildmodell darf ALLES malen, was keine Datenaussage trifft — Banner,
 *   Ankündigungen, Texturen, Thumbnails. Es darf NIE ein Diagramm malen.
 *   Ein erfundener Balken, der nicht zur Zahl daneben passt, kostet genau die
 *   Glaubwürdigkeit, die dieses Benchmark ausmacht. Diagramme kommen deshalb
 *   aus /arena/share/<kategorie>.svg — dort ist jede Säulenhöhe gerechnet.
 *
 * Deswegen enthält jeder Prompt hier einen harten Negativblock gegen Charts
 * und Zahlen, und Text im Bild wird immer als wörtlich zu setzende Zeile
 * übergeben statt vom Modell erfunden.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'ops', 'social-prompts.md');

/**
 * Der Stilblock ist die Prosafassung unserer Design-Tokens (src/arena/styles/
 * arena.css). Ändern sich dort die Farben, gehört diese Beschreibung
 * nachgezogen — sie ist bewusst ausgeschrieben, weil ein Bildmodell keine
 * CSS-Variablen liest.
 */
const STYLE = [
  'Visual style: a modern printed record book — editorial, archival, precise.',
  'Flat matte color only: deep ink black #16130f as the ground, warm paper #f4f1ea for light surfaces,',
  'a single deep red #a4232a used sparingly as the one accent, thin brass #c9a463 hairlines.',
  'Absolutely no gradients, no glows, no lens flare, no 3D shading, no neon, no cyber aesthetic.',
  'Sharp corners throughout (nothing more rounded than a 2px radius). Generous negative space.',
  'A single fine horizontal rule may divide the composition.',
  'Typography: high-contrast serif display in the spirit of Fraunces; small text in a clean grotesque like Inter.',
  'Subtle paper grain is welcome; keep it quiet.',
].join(' ');

/** Was nie im Bild landen darf. Der Chart-Teil ist der wichtige. */
const NEGATIVE = [
  'Do not draw any chart, bar graph, line graph, dashboard, table of numbers or statistics —',
  'no invented data of any kind, and no numerals other than those explicitly given below.',
  'No stock-photo people, no glossy 3D robots, no brain or circuit clichés, no watermark,',
  'no UI screenshots, no gibberish or garbled lettering.',
].join(' ');

/** Motive der Marke — das Logo ist ein Lorbeerkranz mit roter Scheibe. */
const MOTIFS =
  'Recurring brand motifs you may use: a laurel wreath drawn as two thin arcs, a solid red disc, a dashed baseline, a hairline grid.';

function textRule(headline: string | null): string {
  if (!headline) {
    return 'Render no text at all — the image must be usable as a background under separately typeset text.';
  }
  return `The only text in the image is exactly this line, spelled letter for letter: "${headline}". Set it large, legible and correctly spelled; add no other words, labels, numbers or captions.`;
}

interface Preset {
  id: string;
  label: string;
  size: string;
  aspect: string;
  /** Standard-Schlagzeile; null = Bild bewusst ohne Text */
  headline: string | null;
  scene: string;
}

const PRESETS: Preset[] = [
  {
    id: 'banner',
    label: 'Kanal-/Profilbanner (X, LinkedIn, YouTube)',
    size: '1500x500',
    aspect: '3:1',
    headline: 'FutureBench',
    scene:
      'A wide, calm masthead. Left third holds the wordmark; the rest is quiet ink-black space with a single brass hairline running the full width and one small red disc sitting on it like a marker on a ruler. Think the cover plate of a ledger, not a hero banner.',
  },
  {
    id: 'announcement',
    label: 'Ankündigungsbild (Post/Link-Vorschau)',
    size: '1200x630',
    aspect: '1.91:1',
    headline: 'Every prediction, published before the event.',
    scene:
      'A landscape editorial plate. The sentence sits in the upper left on ink black, a brass hairline below it, and beneath that a wide expanse of paper-white left deliberately empty, as if awaiting a printed entry. One red disc in the lower right corner, small.',
  },
  {
    id: 'square',
    label: 'Instagram-Feed / LinkedIn-Quadrat',
    size: '1080x1080',
    aspect: '1:1',
    headline: 'Which AI reads the future best?',
    scene:
      'A square title card. The question is centered, set in the serif display face, breaking across two or three lines. Above it a laurel wreath drawn in thin paper-white arcs with a red disc at its center. Ink-black ground, wide margins.',
  },
  {
    id: 'story',
    label: 'Story / Reel (Hochformat)',
    size: '1080x1920',
    aspect: '9:16',
    headline: 'Locked before kickoff.',
    scene:
      'A tall poster. The line sits in the upper third; the lower two thirds are an empty paper-white field with a single dashed hairline running across, suggesting a baseline on a chart that has not been drawn yet. Keep the top and bottom 250 pixels free of anything important.',
  },
  {
    id: 'thumbnail',
    label: 'YouTube-Thumbnail',
    size: '1280x720',
    aspect: '16:9',
    headline: 'AI vs. THE FUTURE',
    scene:
      'A bold but restrained thumbnail. The two words stack in heavy serif capitals on ink black, the word FUTURE picked out in the deep red. A laurel arc curves in from the right edge. High contrast so it still reads at 210 pixels wide.',
  },
  {
    id: 'texture',
    label: 'Hintergrund-Textur (Text kommt später drauf)',
    size: '1600x900',
    aspect: '16:9',
    headline: null,
    scene:
      'An abstract ledger surface: faint ruled hairlines in brass on ink black, a few dashed baselines, one red disc off-center as the only bright point. Everything low contrast so headline type can be laid on top later.',
  },
];

function buildPrompt(preset: Preset, headlineOverride?: string): string {
  const headline =
    headlineOverride !== undefined ? headlineOverride || null : preset.headline;
  return [
    preset.scene,
    '',
    STYLE,
    MOTIFS,
    '',
    textRule(headline),
    '',
    NEGATIVE,
    '',
    `Aspect ratio ${preset.aspect} (${preset.size} pixels).`,
  ].join('\n');
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const wanted = arg('preset');
const headline = arg('headline');

if (wanted) {
  const preset = PRESETS.find((candidate) => candidate.id === wanted);
  if (!preset) {
    console.error(`Unbekanntes Preset "${wanted}". Verfügbar: ${PRESETS.map((p) => p.id).join(', ')}`);
    process.exit(1);
  }
  console.log(buildPrompt(preset, headline));
} else {
  const doc = [
    '# Social-Prompts für FutureBench',
    '',
    'Erzeugt von `npm run share:prompts` — nicht von Hand pflegen, sondern',
    '`scripts/arena/social-prompts.mts` anpassen und neu erzeugen.',
    '',
    'So benutzt du sie: Prompt kopieren, in GPT Image 2 (oder ein anderes',
    'Bildmodell) einfügen, Bild erzeugen lassen, fertig.',
    '',
    '**Diagramme gehören nicht hierher.** Die Leaderboard-Grafik mit echten',
    'Zahlen liegt fertig unter `https://www.futurebench.ai/arena/share/<kategorie>.svg`.',
    'Ein Bildmodell würde die Balkenhöhen erfinden.',
    '',
    ...PRESETS.flatMap((preset) => [
      `## ${preset.label}`,
      '',
      `\`npm run share:prompts -- --preset ${preset.id}\` · ${preset.size} · ${preset.aspect}`,
      '',
      '```text',
      buildPrompt(preset),
      '```',
      '',
      'Eigene Schlagzeile:',
      '',
      '```bash',
      `npm run share:prompts -- --preset ${preset.id} --headline "Dein Text"`,
      '```',
      '',
    ]),
  ].join('\n');

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, doc, 'utf8');
  console.log(`${PRESETS.length} Prompts geschrieben: ${OUT}`);
}
