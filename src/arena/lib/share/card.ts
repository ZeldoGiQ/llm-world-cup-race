/**
 * Share-Karte als SVG – aus echten Daten gebaut, nie aus einem Bildmodell.
 *
 * Ein Bildmodell erfindet Zahlen und verhunzt Balkenlängen; für ein Benchmark
 * ist das genau die falsche Grafik. Diese Karte entsteht deshalb zur Bauzeit
 * aus denselben Werten wie das Leaderboard: Balkenlängen exakt proportional
 * zum Prediction Score, Whisker exakt auf den Bootstrap-Intervallen.
 *
 * Reiner String-Builder ohne Abhängigkeiten und ohne DOM – dadurch testbar
 * und in einem statischen Astro-Endpunkt nutzbar.
 *
 * WAAGERECHTE ZEILEN, nicht senkrechte Säulen. Das ist keine Geschmacksfrage,
 * sondern Arithmetik: Damit ein Modellname in einer Zeitleiste lesbar ist
 * (X rendert Bilder rund 500 px breit), braucht er in einer 1200-px-Vorlage
 * etwa 34 px Schriftgrad. „Claude Fable 5" ist dann breiter als der Platz,
 * den eine von fünf Säulen hat. Unter Säulen passen nur unlesbare Namen –
 * neben Zeilen passen lesbare.
 *
 * Schriften als System-Stacks: Ein SVG-Download bettet keine Fonts ein. Beim
 * Rastern nach PNG (scripts/arena/render-cards.mts) werden die echten
 * Schriftdateien geladen, dort stimmt das Bild vollständig.
 */

export interface ShareRow {
  name: string;
  color: string;
  /** Prediction Score (SCORE_V1) */
  score: number;
  /** 90-%-Intervall in Score-Einheiten; null = keine Unsicherheitsdaten */
  ciLow: number | null;
  ciHigh: number | null;
  /**
   * Logo-Inhalt im 64×64-Raum (siehe model-logo-markup.ts). Fehlt es, zeichnet
   * die Karte den Farbpunkt – Referenzzeilen und neue Modelle ohne Datei
   * bleiben so darstellbar.
   */
  logoMarkup?: string | null;
}

export interface ShareCardInput {
  /** z. B. "FIFA World Cup 2026" */
  title: string;
  /** z. B. "Prediction Score · Knowledge Cap · SCORE_V1" */
  subtitle: string;
  rows: ShareRow[];
  /** z. B. "104 events · committed before each event · 90% CI" */
  footnote: string;
}

/**
 * Ein Seitenverhältnis je Ort: Die Link-Vorschau (og) deckt X, LinkedIn,
 * WhatsApp und alles ab, was einen geteilten Link aufklappt. Instagram
 * beschneidet Querformat im Raster brutal, dafür gibt es portrait; story
 * hält oben und unten je 250 px für die Bedienleisten frei.
 */
export type ShareFormatId = 'og' | 'square' | 'portrait' | 'story';

interface ShareFormat {
  width: number;
  height: number;
  maxRows: number;
  /** von der Plattform überlagerte Zonen, die leer bleiben müssen */
  safeTop: number;
  safeBottom: number;
}

export const SHARE_FORMATS: Record<ShareFormatId, ShareFormat> = {
  og: { width: 1200, height: 630, maxRows: 5, safeTop: 0, safeBottom: 0 },
  square: { width: 1080, height: 1080, maxRows: 7, safeTop: 0, safeBottom: 0 },
  portrait: { width: 1080, height: 1350, maxRows: 9, safeTop: 0, safeBottom: 0 },
  story: { width: 1080, height: 1920, maxRows: 9, safeTop: 250, safeBottom: 250 },
};

/* — Rekordbuch auf Tinte: flache Flächen, keine Verläufe, keine Glows. — */
const INK = '#16130f';
const PAPER = '#f4f1ea';
const MUTED = '#a29a8c';
const HAIR = '#3a332a';
const BRASS = '#c9a463';
const RED = '#d94a52';
const BAR = '#6e675b';

/* — Schriftgrade. Untergrenze ist Lesbarkeit in der Zeitleiste, nicht
     Eleganz: Alles unter rund 3 % der Bildbreite ist dort Dekoration. — */
const TYPE = {
  eyebrow: 26,
  title: 58,
  headline: 34,
  name: 34,
  value: 46,
  footnote: 26,
};

const MONO = "'JetBrains Mono',ui-monospace,monospace";
const SANS = 'Inter,system-ui,sans-serif';
const SERIF = "'Fraunces','Georgia','Times New Roman',serif";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Grobe Breitenschätzung, um zu lange Namen zu kürzen. Ein String-Builder
 * kann keine Schrift ausmessen; 0,55 em ist für Inter eine brauchbare
 * Näherung und wir kürzen lieber einen Namen zu früh als die Zahl daneben
 * zu überschreiben.
 */
function truncate(text: string, fontSize: number, maxWidth: number): string {
  const max = Math.floor(maxWidth / (fontSize * 0.52));
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

/** Grobe Textbreite in px – genügt, um Kollisionen vorherzusehen. */
function estimateWidth(text: string, fontSize: number, perChar = 0.52): number {
  return text.length * fontSize * perChar;
}

/**
 * Die Kernaussage in einem Satz – der einzige Teil der Karte, den jemand
 * beim Vorbeiscrollen wirklich liest.
 *
 * Sie muss ehrlich sein, sonst widerspricht die Karte sich selbst: Ein roter
 * Balken, der „X gewinnt" schreit, während die Fußnote „Intervalle
 * überlappen" flüstert, ist bei einem Benchmark, dessen Verkaufsargument
 * Korrektheit ist, der gefährlichste Fehler überhaupt. Deshalb entscheidet
 * die Trennschärfe der Intervalle über die Formulierung – und darüber, ob
 * überhaupt jemand rot markiert wird.
 */
export interface ShareVerdict {
  text: string;
  /** true = ein Modell führt nachweislich; nur dann gibt es Rot */
  clear: boolean;
}

export function verdictFor(rows: ShareRow[]): ShareVerdict | null {
  if (rows.length === 0) return null;
  const [lead, second] = rows;
  if (!second) return { text: `${lead.name} at ${lead.score.toFixed(1)}`, clear: true };

  const separated =
    lead.ciLow !== null && second.ciHigh !== null
      ? lead.ciLow > second.ciHigh
      : lead.score > second.score;

  if (!separated) return { text: `${lead.name} ahead — too close to call`, clear: false };
  return {
    text: `${lead.name} leads by ${(lead.score - second.score).toFixed(1)} points`,
    clear: true,
  };
}

export function buildShareCardSvg(
  input: ShareCardInput,
  formatId: ShareFormatId = 'og',
): string {
  const format = SHARE_FORMATS[formatId];
  const { width, height, safeTop, safeBottom } = format;
  const rows = input.rows.slice(0, format.maxRows);
  const margin = Math.round(width * 0.06);

  const verdict = verdictFor(rows);
  // Rot ist dem Spitzenwert vorbehalten – und nur dann, wenn es ihn wirklich
  // gibt. Bei Gleichstand oder überlappenden Intervallen bleibt die Karte
  // grau; früher verglich sie Werte statt Positionen und färbte bei
  // Gleichstand jeden Balken rot.
  const topIndex = verdict?.clear ? 0 : -1;

  /* — Waagerechte Skala. Sie muss die Null enthalten (die Referenzlinie) und
       Platz nach unten lassen, wenn ein Modell schlechter ist als die
       Referenz. Genau das ist die interessanteste Geschichte, die dieses
       Benchmark erzählen kann – sie darf nicht unsichtbar sein. — */
  const values = rows.flatMap((row) => [row.score, row.ciLow ?? row.score, row.ciHigh ?? row.score]);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(10, ...values);
  const span = rawMax - rawMin || 1;
  const pad = span * 0.06;
  const min = rawMin - (rawMin < 0 ? pad : 0);
  const max = rawMax + pad;

  const nameWidth = Math.round(width * 0.32);
  const valueWidth = 140;
  const barLeft = margin + nameWidth + 20;
  const barRight = width - margin - valueWidth - 20;
  const xOf = (value: number) =>
    barLeft + ((value - min) / (max - min)) * (barRight - barLeft);
  const zeroX = xOf(0);

  /* — Senkrechter Aufbau — */
  const top = safeTop + margin;
  const eyebrowY = top + TYPE.eyebrow;
  const titleY = eyebrowY + TYPE.title + 10;
  const headlineY = titleY + TYPE.headline + 14;
  const ruleY = headlineY + 26;
  // Fußnote und Marke teilen sich eine Zeile, solange sie nebeneinander
  // passen. Im Hochformat tun sie das nicht – dort stapeln sie, statt sich
  // zu überschreiben.
  const footerFits =
    estimateWidth(input.footnote, TYPE.footnote) +
      estimateWidth('futurebench.ai', TYPE.footnote, 0.6) +
      2 * margin +
      40 <
    width;
  const brandY = height - safeBottom - margin;
  const footnoteY = footerFits ? brandY : brandY - TYPE.footnote - 14;

  // Der Zeilenblock wird in der freien Fläche zentriert. Im Hochformat bliebe
  // er sonst oben kleben und die untere Bildhälfte wäre leer.
  const areaTop = ruleY + 34;
  const areaBottom = footnoteY - 46;
  const rowHeight = Math.min(140, (areaBottom - areaTop) / Math.max(rows.length, 1));
  const rowsTop = areaTop + Math.max(0, (areaBottom - areaTop - rowHeight * rows.length) / 2);

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escapeXml(input.title)} — ${escapeXml(input.subtitle)}</title>`,
    `<rect width="${width}" height="${height}" fill="${INK}"/>`,
    `<text x="${margin}" y="${eyebrowY}" font-family="${MONO}" font-size="${TYPE.eyebrow}" letter-spacing="4" fill="${BRASS}">${escapeXml(input.subtitle.toUpperCase())}</text>`,
    `<text x="${margin}" y="${titleY}" font-family="${SERIF}" font-size="${TYPE.title}" font-weight="600" fill="${PAPER}">${escapeXml(input.title)}</text>`,
  ];

  if (verdict) {
    parts.push(
      `<text x="${margin}" y="${headlineY}" font-family="${SERIF}" font-size="${TYPE.headline}" font-weight="600" fill="${verdict.clear ? RED : BRASS}">${escapeXml(verdict.text)}</text>`,
    );
  }

  parts.push(
    `<line x1="${margin}" y1="${ruleY}" x2="${width - margin}" y2="${ruleY}" stroke="${BRASS}" stroke-width="1"/>`,
    // Marke oben rechts: Lorbeer auf Tinte
    `<g transform="translate(${width - margin - 46} ${safeTop + margin - 26}) scale(0.95)">` +
      `<g fill="none" stroke="${PAPER}" stroke-width="3.4" stroke-linecap="round">` +
      `<path d="M17 42C8 35 6.5 22 12 10"/><path d="M31 42C40 35 41.5 22 36 10"/></g>` +
      `<circle cx="24" cy="25" r="10" fill="${RED}"/></g>`,
    // Referenzlinie: die Null, gegen die gemessen wird
    `<line x1="${zeroX.toFixed(1)}" y1="${rowsTop - 14}" x2="${zeroX.toFixed(1)}" y2="${(rowsTop + rowHeight * rows.length).toFixed(1)}" stroke="${HAIR}" stroke-dasharray="6 6" stroke-width="2"/>`,
  );

  rows.forEach((row, index) => {
    const centerY = rowsTop + rowHeight * index + rowHeight / 2;
    const isTop = index === topIndex;
    const barHeight = Math.min(38, rowHeight * 0.46);
    const scoreX = xOf(row.score);
    const barX = Math.min(zeroX, scoreX);
    const barW = Math.abs(scoreX - zeroX);

    // Logo links, dann Name
    if (row.logoMarkup) {
      const size = 40;
      parts.push(
        `<g transform="translate(${margin} ${(centerY - size / 2).toFixed(1)}) scale(${size / 64})">${row.logoMarkup}</g>`,
      );
    } else {
      parts.push(
        `<circle cx="${margin + 20}" cy="${centerY.toFixed(1)}" r="10" fill="${escapeXml(row.color)}"/>`,
      );
    }
    parts.push(
      `<text x="${margin + 54}" y="${(centerY + TYPE.name * 0.35).toFixed(1)}" font-family="${SANS}" font-size="${TYPE.name}" font-weight="600" fill="${PAPER}">${escapeXml(truncate(row.name, TYPE.name, nameWidth - 54))}</text>`,
      `<rect x="${barX.toFixed(1)}" y="${(centerY - barHeight / 2).toFixed(1)}" width="${Math.max(barW, 2).toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${isTop ? RED : BAR}"/>`,
    );

    if (row.ciLow !== null && row.ciHigh !== null) {
      const lowX = xOf(row.ciLow);
      const highX = xOf(row.ciHigh);
      const cap = barHeight * 0.42;
      parts.push(
        `<line x1="${lowX.toFixed(1)}" y1="${centerY.toFixed(1)}" x2="${highX.toFixed(1)}" y2="${centerY.toFixed(1)}" stroke="${MUTED}" stroke-width="2.5"/>`,
        `<line x1="${lowX.toFixed(1)}" y1="${(centerY - cap).toFixed(1)}" x2="${lowX.toFixed(1)}" y2="${(centerY + cap).toFixed(1)}" stroke="${MUTED}" stroke-width="2.5"/>`,
        `<line x1="${highX.toFixed(1)}" y1="${(centerY - cap).toFixed(1)}" x2="${highX.toFixed(1)}" y2="${(centerY + cap).toFixed(1)}" stroke="${MUTED}" stroke-width="2.5"/>`,
      );
    }

    parts.push(
      `<text x="${width - margin}" y="${(centerY + TYPE.value * 0.35).toFixed(1)}" text-anchor="end" font-family="${MONO}" font-size="${TYPE.value}" font-weight="700" fill="${isTop ? RED : PAPER}">${row.score.toFixed(1)}</text>`,
    );
  });

  parts.push(
    `<text x="${margin}" y="${footnoteY}" font-family="${SANS}" font-size="${TYPE.footnote}" fill="${MUTED}">${escapeXml(input.footnote)}</text>`,
    `<text x="${width - margin}" y="${brandY}" text-anchor="end" font-family="${MONO}" font-size="${TYPE.footnote}" font-weight="700" fill="${PAPER}">futurebench.ai</text>`,
    `</svg>`,
  );

  return parts.join('\n');
}
