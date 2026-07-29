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

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img">`,
    `<title>${escapeXml(input.title)} — ${escapeXml(input.subtitle)}</title>`,
    // Hintergrund + dezente Glows (radial über Gradienten)
    `<defs>` +
      `<radialGradient id="gCyan" cx="50%" cy="0%" r="70%">` +
      `<stop offset="0%" stop-color="#06b6d4" stop-opacity="0.16"/>` +
      `<stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>` +
      `</radialGradient>` +
      `<radialGradient id="gClay" cx="0%" cy="100%" r="70%">` +
      `<stop offset="0%" stop-color="#d97757" stop-opacity="0.12"/>` +
      `<stop offset="100%" stop-color="#d97757" stop-opacity="0"/>` +
      `</radialGradient>` +
      `<linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="#67e8f9"/>` +
      `<stop offset="100%" stop-color="#0e7490"/>` +
      `</linearGradient>` +
      `</defs>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#0a0c10"/>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#gCyan)"/>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#gClay)"/>`,
    // Kopf
    `<text x="72" y="86" font-family="'JetBrains Mono',monospace" font-size="20" letter-spacing="4" fill="#e08a64">${escapeXml(input.subtitle.toUpperCase())}</text>`,
    `<text x="72" y="150" font-family="Georgia,'Times New Roman',serif" font-size="52" font-weight="600" fill="#f2f4f9">${escapeXml(input.title)}</text>`,
    // Referenzlinie (Score 0)
    `<line x1="72" y1="${CHART_BOTTOM}" x2="${WIDTH - 72}" y2="${CHART_BOTTOM}" stroke="#3d4555" stroke-dasharray="6 6" stroke-width="2"/>`,
    `<text x="${WIDTH - 72}" y="${CHART_BOTTOM + 24}" text-anchor="end" font-family="'JetBrains Mono',monospace" font-size="16" fill="#8b94a7">reference 0</text>`,
  );

  rows.forEach((row, index) => {
    const centerX = CHART_LEFT + slot * index + slot / 2;
    const barX = centerX - columnWidth / 2;
    const topY = yOf(row.score);

    // Säule
    parts.push(
      `<rect x="${barX.toFixed(1)}" y="${topY.toFixed(1)}" width="${columnWidth.toFixed(1)}" height="${(CHART_BOTTOM - topY).toFixed(1)}" rx="8" fill="url(#gBar)"/>`,
    );

    // Whisker (90-%-Intervall)
    if (row.ciLow !== null && row.ciHigh !== null) {
      const highY = yOf(row.ciHigh);
      const lowY = yOf(row.ciLow);
      const capHalf = Math.min(26, columnWidth / 2);
      parts.push(
        `<line x1="${centerX}" y1="${highY.toFixed(1)}" x2="${centerX}" y2="${lowY.toFixed(1)}" stroke="#8b94a7" stroke-width="2.5"/>`,
        `<line x1="${(centerX - capHalf).toFixed(1)}" y1="${highY.toFixed(1)}" x2="${(centerX + capHalf).toFixed(1)}" y2="${highY.toFixed(1)}" stroke="#8b94a7" stroke-width="2.5"/>`,
        `<line x1="${(centerX - capHalf).toFixed(1)}" y1="${lowY.toFixed(1)}" x2="${(centerX + capHalf).toFixed(1)}" y2="${lowY.toFixed(1)}" stroke="#8b94a7" stroke-width="2.5"/>`,
      );
    }

    // Score über der Säule (bzw. über dem Whisker)
    const labelY = Math.min(topY, yOf(row.ciHigh ?? row.score)) - 16;
    parts.push(
      `<text x="${centerX}" y="${labelY.toFixed(1)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="30" font-weight="700" fill="#67e8f9">${row.score.toFixed(1)}</text>`,
      // Farbpunkt + Name unter der Linie
      `<circle cx="${(centerX - 0).toFixed(1)}" cy="${CHART_BOTTOM + 46}" r="7" fill="${escapeXml(row.color)}"/>`,
      `<text x="${centerX}" y="${CHART_BOTTOM + 78}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="20" font-weight="600" fill="#f2f4f9">${escapeXml(row.name)}</text>`,
    );
  });

  parts.push(
    `<text x="72" y="${HEIGHT - 34}" font-family="Inter,system-ui,sans-serif" font-size="17" fill="#8b94a7">${escapeXml(input.footnote)}</text>`,
    `<text x="${WIDTH - 72}" y="${HEIGHT - 34}" text-anchor="end" font-family="'JetBrains Mono',monospace" font-size="19" font-weight="700" fill="#f2f4f9">futurebench.ai</text>`,
    `</svg>`,
  );

  return parts.join('\n');
}
