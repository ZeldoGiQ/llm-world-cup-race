/**
 * Share-Karte als SVG – aus echten Daten gebaut, nie aus einem Bildmodell.
 *
 * Ein Bildmodell erfindet Zahlen und verhunzt Balkenlängen; für ein Benchmark
 * ist das genau die falsche Grafik. Diese Karte entsteht deshalb zur Bauzeit
 * aus denselben Werten wie das Leaderboard: Säulenhöhen exakt proportional zum
 * Prediction Score, Whisker exakt auf den Bootstrap-Intervallen.
 *
 * Reiner String-Builder ohne Abhängigkeiten und ohne DOM – dadurch testbar
 * und in einem statischen Astro-Endpunkt nutzbar. 1200×630 (OG-Format).
 * Schriften als System-Stacks: SVG-Downloads betten keine Fonts ein, und ein
 * Substitut mit richtigen Zahlen schlägt eine schöne Lüge.
 */

export interface ShareRow {
  name: string;
  color: string;
  /** Prediction Score (SCORE_V1) */
  score: number;
  /** 90-%-Intervall in Score-Einheiten; null = keine Unsicherheitsdaten */
  ciLow: number | null;
  ciHigh: number | null;
}

export interface ShareCardInput {
  /** z. B. "FIFA World Cup 2026" */
  title: string;
  /** z. B. "Prediction Score · Knowledge Cap · SCORE_V1" */
  subtitle: string;
  /** höchstens die ersten 5 werden gezeichnet */
  rows: ShareRow[];
  /** z. B. "104 events · committed before each event · 90% CI" */
  footnote: string;
}

const WIDTH = 1200;
const HEIGHT = 630;
const CHART_TOP = 210;
const CHART_BOTTOM = 500;
const CHART_LEFT = 110;
const CHART_RIGHT = 1090;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildShareCardSvg(input: ShareCardInput): string {
  const rows = input.rows.slice(0, 5);
  const count = Math.max(rows.length, 1);

  // Skala: 0 (Referenzlinie) bis zum Maximum aus Score und Intervall-Obergrenze,
  // mit Luft nach oben. Negative Werte werden auf der Linie gekappt – die Karte
  // ist ein Poster, die exakte Zahl steht daneben.
  const maxValue = Math.max(
    10,
    ...rows.map((row) => Math.max(row.score, row.ciHigh ?? row.score)),
  );
  const scale = (CHART_BOTTOM - CHART_TOP) / (maxValue * 1.15);
  const yOf = (value: number) => CHART_BOTTOM - Math.max(0, value) * scale;

  const slot = (CHART_RIGHT - CHART_LEFT) / count;
  const columnWidth = Math.min(120, slot * 0.45);

  // Rekordbuch auf Tinte: flache Flächen, keine Verläufe, keine Glows.
  // Rot ist dem Spitzenwert vorbehalten — nur die höchste Säule trägt es.
  const INK = '#16130f';
  const PAPER = '#f4f1ea';
  const MUTED = '#a29a8c';
  const HAIR = '#3a332a';
  const BRASS = '#c9a463';
  const RED = '#d94a52';
  const BAR = '#6e675b';
  const topScore = Math.max(...rows.map((row) => row.score));

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img">`,
    `<title>${escapeXml(input.title)} — ${escapeXml(input.subtitle)}</title>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${INK}"/>`,
    // Kopf: Spur in Messing, Titel in Serife, Messing-Haarlinie darunter
    `<text x="72" y="84" font-family="'JetBrains Mono',monospace" font-size="20" letter-spacing="4" fill="${BRASS}">${escapeXml(input.subtitle.toUpperCase())}</text>`,
    `<text x="72" y="148" font-family="'Fraunces','Georgia','Times New Roman',serif" font-size="52" font-weight="600" fill="${PAPER}">${escapeXml(input.title)}</text>`,
    `<line x1="72" y1="172" x2="${WIDTH - 72}" y2="172" stroke="${BRASS}" stroke-width="1"/>`,
    // Marke oben rechts: Lorbeer-Zeichen auf Tinte
    `<g transform="translate(${WIDTH - 122} 44) scale(1.1)">` +
      `<g fill="none" stroke="${PAPER}" stroke-width="3.4" stroke-linecap="round">` +
      `<path d="M17 42C8 35 6.5 22 12 10"/><path d="M31 42C40 35 41.5 22 36 10"/></g>` +
      `<circle cx="24" cy="25" r="10" fill="${RED}"/></g>`,
    // Referenzlinie (Score 0)
    `<line x1="72" y1="${CHART_BOTTOM}" x2="${WIDTH - 72}" y2="${CHART_BOTTOM}" stroke="${HAIR}" stroke-dasharray="6 6" stroke-width="2"/>`,
    `<text x="${WIDTH - 72}" y="${CHART_BOTTOM + 24}" text-anchor="end" font-family="'JetBrains Mono',monospace" font-size="16" fill="${MUTED}">reference 0</text>`,
  );

  rows.forEach((row, index) => {
    const centerX = CHART_LEFT + slot * index + slot / 2;
    const barX = centerX - columnWidth / 2;
    const topY = yOf(row.score);

    // Säule: gestochene Kante, flache Farbe — Rot nur für den Spitzenwert
    const isTop = row.score === topScore;
    parts.push(
      `<rect x="${barX.toFixed(1)}" y="${topY.toFixed(1)}" width="${columnWidth.toFixed(1)}" height="${(CHART_BOTTOM - topY).toFixed(1)}" rx="2" fill="${isTop ? RED : BAR}"/>`,
    );

    // Whisker (90-%-Intervall)
    if (row.ciLow !== null && row.ciHigh !== null) {
      const highY = yOf(row.ciHigh);
      const lowY = yOf(row.ciLow);
      const capHalf = Math.min(26, columnWidth / 2);
      parts.push(
        `<line x1="${centerX}" y1="${highY.toFixed(1)}" x2="${centerX}" y2="${lowY.toFixed(1)}" stroke="${MUTED}" stroke-width="2.5"/>`,
        `<line x1="${(centerX - capHalf).toFixed(1)}" y1="${highY.toFixed(1)}" x2="${(centerX + capHalf).toFixed(1)}" y2="${highY.toFixed(1)}" stroke="${MUTED}" stroke-width="2.5"/>`,
        `<line x1="${(centerX - capHalf).toFixed(1)}" y1="${lowY.toFixed(1)}" x2="${(centerX + capHalf).toFixed(1)}" y2="${lowY.toFixed(1)}" stroke="${MUTED}" stroke-width="2.5"/>`,
      );
    }

    // Score über der Säule (bzw. über dem Whisker)
    const labelY = Math.min(topY, yOf(row.ciHigh ?? row.score)) - 16;
    parts.push(
      `<text x="${centerX}" y="${labelY.toFixed(1)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="30" font-weight="700" fill="${isTop ? RED : PAPER}">${row.score.toFixed(1)}</text>`,
      // Farbpunkt + Name unter der Linie
      `<circle cx="${(centerX - 0).toFixed(1)}" cy="${CHART_BOTTOM + 46}" r="7" fill="${escapeXml(row.color)}"/>`,
      `<text x="${centerX}" y="${CHART_BOTTOM + 78}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="20" font-weight="600" fill="${PAPER}">${escapeXml(row.name)}</text>`,
    );
  });

  parts.push(
    `<text x="72" y="${HEIGHT - 34}" font-family="Inter,system-ui,sans-serif" font-size="17" fill="${MUTED}">${escapeXml(input.footnote)}</text>`,
    `<text x="${WIDTH - 72}" y="${HEIGHT - 34}" text-anchor="end" font-family="'JetBrains Mono',monospace" font-size="19" font-weight="700" fill="${PAPER}">futurebench.ai</text>`,
    `</svg>`,
  );

  return parts.join('\n');
}
