/**
 * Rastert die Share-Karten nach PNG. Läuft nach `astro build`.
 *
 * Warum überhaupt: X, LinkedIn, Instagram und WhatsApp nehmen kein SVG an –
 * weder als Upload noch als og:image. Ohne diesen Schritt sind unsere Karten
 * schön und unteilbar.
 *
 * Warum als eigener Schritt statt im Astro-Endpunkt: Die PNG ist damit per
 * Konstruktion eine 1:1-Rasterung genau der SVG, die ausgeliefert wird.
 * Bild und Zahlen können nicht auseinanderlaufen, weil es nur eine Quelle
 * gibt (card.ts).
 *
 * Zwei Eigenheiten des Renderers, beide durch Ausprobieren gefunden:
 *
 *  1. resvg liest KEIN woff2. Bekommt es keine Schrift, lässt es Text
 *     ersatzlos weg – die Karte wäre leer, ohne Fehlermeldung. Deshalb
 *     werden die Schriften mit wawoff2 nach TTF entpackt (einmalig
 *     zwischengespeichert).
 *  2. resvg ignoriert font-weight bei Variable Fonts und rendert stur die
 *     Standardinstanz; bei Fraunces ist das Black statt Semibold. Deshalb
 *     die STATISCHEN @fontsource-Pakete mit je einer Datei pro Schnitt –
 *     nicht die @fontsource-variable-Pakete, die die Website benutzt.
 *
 * loadSystemFonts bleibt aus: Sonst hinge das Aussehen davon ab, welche
 * Schriften auf dem Rechner installiert sind, der gerade baut. So ist die
 * Ausgabe auf Windows und in der CI bitgleich.
 */
import { Resvg } from '@resvg/resvg-js';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decompress } from 'wawoff2';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CARDS_DIR = join(ROOT, 'dist', 'arena', 'share');
const FONT_CACHE = join(tmpdir(), 'futurebench-fonts-ttf-v1');

/** Nur die Familien und Schnitte, die card.ts wirklich benutzt. */
const FONT_SPEC = [
  { pkg: '@fontsource/inter', slug: 'inter', weights: [400, 600, 700] },
  { pkg: '@fontsource/fraunces', slug: 'fraunces', weights: [400, 600, 700] },
  { pkg: '@fontsource/jetbrains-mono', slug: 'jetbrains-mono', weights: [400, 500, 700] },
];
// latin-ext trägt Umlaute und Akzente. Mehr brauchen wir nicht – und was
// darüber hinausgeht, fängt assertRenderableText ab.
const SUBSETS = ['latin', 'latin-ext'];

let cachedFonts: string[] | null = null;

async function fontFiles(): Promise<string[]> {
  if (cachedFonts) return cachedFonts;
  await mkdir(FONT_CACHE, { recursive: true });
  const files: string[] = [];
  for (const { pkg, slug, weights } of FONT_SPEC) {
    const dir = join(dirname(require.resolve(`${pkg}/package.json`)), 'files');
    for (const subset of SUBSETS) {
      for (const weight of weights) {
        const source = join(dir, `${slug}-${subset}-${weight}-normal.woff2`);
        if (!existsSync(source)) continue;
        const target = join(FONT_CACHE, `${slug}-${subset}-${weight}.ttf`);
        if (!existsSync(target)) {
          await writeFile(target, Buffer.from(await decompress(await readFile(source))));
        }
        files.push(target);
      }
    }
  }
  if (files.length === 0) {
    throw new Error('Keine Schriftdateien gefunden – sind die @fontsource-Pakete installiert?');
  }
  cachedFonts = files;
  return files;
}

/**
 * Bricht ab, wenn eine Karte ein Zeichen enthält, für das keine Glyphe
 * geladen ist. Ohne diese Prüfung rendert so etwas still als leeres
 * Kästchen – und die Karte ginge genau so auf X hinaus. Ein kaputter Build
 * ist das kleinere Übel.
 */
const ALLOWED_BEYOND_LATIN = new Set(['·', '–', '—', '…', '“', '”', '’']);

export function assertRenderableText(svg: string, label: string): void {
  const missing = new Set<string>();
  for (const match of svg.matchAll(/>([^<]+)</g)) {
    for (const char of match[1]) {
      const code = char.codePointAt(0)!;
      if (code < 0x250 || ALLOWED_BEYOND_LATIN.has(char)) continue;
      missing.add(`${char} (U+${code.toString(16).toUpperCase().padStart(4, '0')})`);
    }
  }
  if (missing.size > 0) {
    throw new Error(
      `${label}: Zeichen ohne Glyphe, würden als leeres Kästchen rendern: ${[...missing].join(', ')}`,
    );
  }
}

async function renderPng(svg: string, width: number): Promise<Buffer> {
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      loadSystemFonts: false,
      fontFiles: await fontFiles(),
      defaultFontFamily: 'Inter',
      sansSerifFamily: 'Inter',
      serifFamily: 'Fraunces',
      monospaceFamily: 'JetBrains Mono',
    },
    logLevel: 'error',
  });
  return renderer.render().asPng();
}

if (!existsSync(CARDS_DIR)) {
  console.log('Keine Share-Karten gefunden – erst "astro build" laufen lassen.');
  process.exit(0);
}

const svgFiles = (await readdir(CARDS_DIR)).filter((name) => name.endsWith('.svg'));
let written = 0;

for (const file of svgFiles) {
  const svg = await readFile(join(CARDS_DIR, file), 'utf8');
  const name = basename(file, '.svg');
  assertRenderableText(svg, file);

  const width = Number(svg.match(/\swidth="(\d+)"/)?.[1] ?? 1200);
  // Einmal in Originalgröße für Vorschauen und Upload, einmal doppelt für
  // scharfe Darstellung auf hochauflösenden Bildschirmen.
  await writeFile(join(CARDS_DIR, `${name}.png`), await renderPng(svg, width));
  await writeFile(join(CARDS_DIR, `${name}@2x.png`), await renderPng(svg, width * 2));
  written += 2;
}

console.log(`${written} PNG aus ${svgFiles.length} Karten gerendert (${CARDS_DIR})`);
