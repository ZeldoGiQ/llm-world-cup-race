/**
 * Share-Karte als SVG – aus echten Daten gebaut, nie aus einem Bildmodell.
 *
 * Ein Bildmodell erfindet Zahlen und verhunzt Balkenlängen; für ein Benchmark
 * ist das genau die falsche Grafik. Diese Karte entsteht deshalb zur Bauzeit
 * aus denselben Werten wie das Leaderboard: Balkenlängen exakt proportional
 * zur Alltagszahl der Kategorie (lib/plain), Whisker exakt auf den
 * Bootstrap-Intervallen, die Referenz als gestrichelte Linie genau dort, wo
 * die stumpfe Regel landet.
 *
 * Die Karte zeigt die ALLTAGSZAHL, nicht den Prediction Score: „58 % der
 * Spiele richtig" versteht jeder, „+7.4" niemand ohne die Formel. Der Score
 * bleibt der Methodik-Seite und der letzten Tabellenspalte vorbehalten.
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
  /** Alltagszahl in ihrer Einheit (Anteil 0–1, Prozentfehler, Punkte) */
  value: number;
  /** Dieselbe Zahl, fertig formatiert: "58.2 %", "1.8 %", "190" */
  formatted: string;
  /** 90-%-Intervall in derselben Einheit; null = keine Unsicherheitsdaten */
  ciLow: number | null;
  ciHigh: number | null;
  /**
   * Logo-Inhalt im 64×64-Raum (siehe model-logo-markup.ts). Fehlt es, zeichnet
   * die Karte den Farbpunkt – Referenzzeilen und neue Modelle ohne Datei
   * bleiben so darstellbar.
   */
  logoMarkup?: string | null;
}

export interface ShareReference {
  /** Alltagsname, z. B. "Always home win" */
  label: string;
  value: number;
  formatted: string;
}

export interface ShareCardInput {
  /** z. B. "Football leagues" */
  title: string;
  /** Eyebrow: die Alltagszahl, z. B. "Right outcome" */
  subtitle: string;
  rows: ShareRow[];
  /** z. B. "201 events · every prediction published before the event · no internet access" */
  footnote: string;
  /** Die Kernaussage in einem Satz; null = niemand liegt eindeutig vorn */
  headline: string | null;
  /** true = das führende Modell hält Platz eins nachweislich (≥ 90 % der Neuziehungen); nur dann Rot */
  clear: boolean;
  /** Die stumpfe Regel als Bezugslinie; null = keine Referenz verfügbar */
  reference: ShareReference | null;
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
  eyebrow: 22,
  title: 50,
  headline: 30,
  name: 34,
  value: 44,
  footnote: 22,
  reference: 22,
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

export function buildShareCardSvg(
  input: ShareCardInput,
  formatId: ShareFormatId = 'og',
): string {
  const format = SHARE_FORMATS[formatId];
  const { width, height, safeTop, safeBottom } = format;
  const rows = input.rows.slice(0, format.maxRows);
  const margin = Math.round(width * 0.06);

  // Rot ist dem Spitzenwert vorbehalten – und nur dann, wenn es ihn wirklich
  // gibt. Bei überlappenden Intervallen bleibt die Karte grau: Ein roter
  // Balken, der „X gewinnt" schreit, während der Text „zu knapp" sagt, ist
  // bei einem Benchmark, dessen Verkaufsargument Korrektheit ist, der
  // gefährlichste Fehler überhaupt.
  const topIndex = input.clear && rows.length > 0 ? 0 : -1;

  /* — Waagerechte Skala von null bis knapp über den größten Wert. Die
       Referenz muss im Bild sein, sonst fehlt der Vergleich, der die Zahl
       erst lesbar macht. — */
  const values = rows.flatMap((row) => [row.value, row.ciLow ?? row.value, row.ciHigh ?? row.value]);
  if (input.reference) values.push(input.reference.value);
  const finite = values.filter((value) => Number.isFinite(value));
  const rawMax = Math.max(1e-9, ...finite);
  const max = rawMax * 1.06;

  const nameWidth = Math.round(width * 0.32);
  const valueWidth = 150;
  const barLeft = margin + nameWidth + 20;
  const barRight = width - margin - valueWidth - 20;
  const xOf = (value: number) => barLeft + (Math.max(0, value) / max) * (barRight - barLeft);

  /* — Senkrechter Aufbau — */
  const top = safeTop + margin;
  const eyebrowY = top + TYPE.eyebrow;
  const titleY = eyebrowY + TYPE.title + 6;
  const headlineY = titleY + TYPE.headline + 10;
  const ruleY = headlineY + 18;
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
  // er sonst oben kleben und die untere Bildhälfte wäre leer. Über den
  // Zeilen bleibt Platz für die Beschriftung der Referenzlinie.
  const areaTop = ruleY + 20 + (input.reference ? TYPE.reference + 10 : 0);
  const areaBottom = footnoteY - 40;
  const rowHeight = Math.min(140, (areaBottom - areaTop) / Math.max(rows.length, 1));
  const rowsTop = areaTop + Math.max(0, (areaBottom - areaTop - rowHeight * rows.length) / 2);
  // Schriftgrade dürfen die Zeile nicht sprengen: Im Querformat mit fünf
  // Zeilen bleiben rund 50 px je Zeile – ein 44-px-Wert passt, ein größerer
  // würde in die Nachbarzeile ragen und die Zahlen unlesbar übereinanderlegen.
  const nameSize = Math.min(TYPE.name, Math.round(rowHeight * 0.72));
  const valueSize = Math.min(TYPE.value, Math.round(rowHeight * 0.9));

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escapeXml(input.title)} — ${escapeXml(input.subtitle)}</title>`,
    `<rect width="${width}" height="${height}" fill="${INK}"/>`,
    `<text x="${margin}" y="${eyebrowY}" font-family="${MONO}" font-size="${TYPE.eyebrow}" letter-spacing="4" fill="${BRASS}">${escapeXml(input.subtitle.toUpperCase())}</text>`,
    `<text x="${margin}" y="${titleY}" font-family="${SERIF}" font-size="${TYPE.title}" font-weight="600" fill="${PAPER}">${escapeXml(input.title)}</text>`,
  ];

  if (input.headline) {
    parts.push(
      `<text x="${margin}" y="${headlineY}" font-family="${SERIF}" font-size="${TYPE.headline}" font-weight="600" fill="${input.clear ? RED : BRASS}">${escapeXml(truncate(input.headline, TYPE.headline, width - 2 * margin - 60))}</text>`,
    );
  }

  parts.push(
    `<line x1="${margin}" y1="${ruleY}" x2="${width - margin}" y2="${ruleY}" stroke="${BRASS}" stroke-width="1"/>`,
    // Marke oben rechts: Lorbeer auf Tinte
    `<g transform="translate(${width - margin - 46} ${safeTop + margin - 26}) scale(0.95)">` +
      `<g fill="none" stroke="${PAPER}" stroke-width="3.4" stroke-linecap="round">` +
      `<path d="M17 42C8 35 6.5 22 12 10"/><path d="M31 42C40 35 41.5 22 36 10"/></g>` +
      `<circle cx="24" cy="25" r="10" fill="${RED}"/></g>`,
  );

  /* — Referenzlinie: wo die stumpfe Regel landet. Beschriftet, damit niemand
       raten muss, was die Linie bedeutet. Der Text steht links oder rechts
       der Linie, je nachdem, wo mehr Platz ist. — */
  if (input.reference) {
    const refX = xOf(input.reference.value);
    const label = `${input.reference.label} ${input.reference.formatted}`;
    const anchorEnd = refX > (barLeft + barRight) / 2;
    const labelY = rowsTop - 18;
    parts.push(
      `<line x1="${refX.toFixed(1)}" y1="${(rowsTop - 10).toFixed(1)}" x2="${refX.toFixed(1)}" y2="${(rowsTop + rowHeight * rows.length).toFixed(1)}" stroke="${HAIR}" stroke-dasharray="6 6" stroke-width="2"/>`,
      `<text x="${(refX + (anchorEnd ? -10 : 10)).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchorEnd ? 'end' : 'start'}" font-family="${SANS}" font-size="${TYPE.reference}" fill="${MUTED}">${escapeXml(label)}</text>`,
    );
  }

  rows.forEach((row, index) => {
    const centerY = rowsTop + rowHeight * index + rowHeight / 2;
    const isTop = index === topIndex;
    const barHeight = Math.min(38, rowHeight * 0.46);
    const barW = xOf(row.value) - barLeft;

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
      `<text x="${margin + 54}" y="${(centerY + nameSize * 0.35).toFixed(1)}" font-family="${SANS}" font-size="${nameSize}" font-weight="600" fill="${PAPER}">${escapeXml(truncate(row.name, nameSize, nameWidth - 54))}</text>`,
      `<rect x="${barLeft.toFixed(1)}" y="${(centerY - barHeight / 2).toFixed(1)}" width="${Math.max(barW, 2).toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${isTop ? RED : BAR}"/>`,
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
      `<text x="${width - margin}" y="${(centerY + valueSize * 0.35).toFixed(1)}" text-anchor="end" font-family="${MONO}" font-size="${valueSize}" font-weight="700" fill="${isTop ? RED : PAPER}">${escapeXml(row.formatted)}</text>`,
    );
  });

  parts.push(
    `<text x="${margin}" y="${footnoteY}" font-family="${SANS}" font-size="${TYPE.footnote}" fill="${MUTED}">${escapeXml(input.footnote)}</text>`,
    `<text x="${width - margin}" y="${brandY}" text-anchor="end" font-family="${MONO}" font-size="${TYPE.footnote}" font-weight="700" fill="${PAPER}">futurebench.ai</text>`,
    `</svg>`,
  );

  return parts.join('\n');
}
