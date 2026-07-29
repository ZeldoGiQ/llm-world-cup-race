import { describe, expect, it } from 'vitest';
import { buildShareCardSvg, SHARE_FORMATS, verdictFor, type ShareRow } from './card';
import { innerSvgMarkup } from './model-logo-markup';

const row = (over: Partial<ShareRow> = {}): ShareRow => ({
  name: 'Grok 4.3',
  color: '#9b59b6',
  score: 21.5,
  ciLow: 18.0,
  ciHigh: 25.0,
  ...over,
});

const input = (rows: ShareRow[]) => ({
  title: 'FIFA World Cup 2026',
  subtitle: 'Prediction Score · Knowledge Cap · SCORE_V1',
  rows,
  footnote: '104 events · 90% CI',
});

const RED = '#d94a52';

/** Balken tragen rx="2"; der Hintergrund und die Logo-Kacheln nicht. */
function bars(svg: string): { x: number; width: number; fill: string }[] {
  return [...svg.matchAll(/<rect x="([\d.-]+)" y="[\d.-]+" width="([\d.]+)" height="[\d.]+" rx="2" fill="([^"]+)"/g)].map(
    (match) => ({ x: Number(match[1]), width: Number(match[2]), fill: match[3] }),
  );
}

/** Die gestrichelte Senkrechte markiert die Referenz (Score 0). */
function zeroX(svg: string): number {
  return Number(svg.match(/<line x1="([\d.]+)"[^>]*stroke-dasharray/)![1]);
}

describe('innerSvgMarkup', () => {
  it('schält den Inhalt aus einer Logo-Datei', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n  <rect/>\n</svg>\n';
    expect(innerSvgMarkup(source)).toBe('<rect/>');
  });

  it('gibt null zurück, statt kaputtes Markup weiterzureichen', () => {
    // Lieber der Farbpunkt als eine Karte, die kein gültiges SVG mehr ist.
    expect(innerSvgMarkup('kein svg')).toBeNull();
    expect(innerSvgMarkup('<svg viewBox="0 0 64 64"></svg>')).toBeNull();
  });
});

describe('verdictFor – die Karte muss sagen, was die Zahlen hergeben', () => {
  it('nennt einen Vorsprung nur, wenn die Intervalle sich trennen', () => {
    const verdict = verdictFor([
      row({ name: 'A', score: 30, ciLow: 25, ciHigh: 35 }),
      row({ name: 'B', score: 10, ciLow: 5, ciHigh: 15 }),
    ]);
    expect(verdict).toEqual({ text: 'A leads by 20.0 points', clear: true });
  });

  it('sagt bei Überlappung ausdrücklich, dass es zu knapp ist', () => {
    // Die echten WM-Daten sind genau dieser Fall. Eine Karte, die hier
    // „führt" behauptet, widerspricht ihrer eigenen Fußnote.
    const verdict = verdictFor([
      row({ name: 'A', score: 21.5, ciLow: 10.9, ciHigh: 31.3 }),
      row({ name: 'B', score: 19.4, ciLow: 9.0, ciHigh: 29.1 }),
    ]);
    expect(verdict).toEqual({ text: 'A ahead — too close to call', clear: false });
  });
});

describe('buildShareCardSvg', () => {
  it('färbt bei Gleichstand keinen einzigen Balken rot', () => {
    // Regression: Früher wurde per Wert verglichen (score === topScore),
    // wodurch bei Gleichstand JEDER Balken zum Spitzenwert wurde – die
    // Krypto-Karte hatte fünf rote Balken.
    const svg = buildShareCardSvg(
      input([row({ name: 'A', score: 14.2 }), row({ name: 'B', score: 14.2 })]),
    );
    expect(bars(svg).filter((bar) => bar.fill === RED)).toHaveLength(0);
  });

  it('färbt genau einen Balken rot, wenn einer nachweislich führt', () => {
    const svg = buildShareCardSvg(
      input([
        row({ name: 'A', score: 30, ciLow: 25, ciHigh: 35 }),
        row({ name: 'B', score: 10, ciLow: 5, ciHigh: 15 }),
      ]),
    );
    expect(bars(svg).filter((bar) => bar.fill === RED)).toHaveLength(1);
  });

  it('zeichnet negative Scores sichtbar links der Referenz', () => {
    // Regression: Die alte Skala kappte bei 0, negative Balken hatten Länge
    // null. „Modell schlechter als der Würfel" ist die interessanteste
    // Aussage des Benchmarks – sie darf nicht unsichtbar sein.
    const svg = buildShareCardSvg(
      input([
        row({ name: 'Gut', score: 12, ciLow: 8, ciHigh: 16 }),
        row({ name: 'Schlecht', score: -12.4, ciLow: -20, ciHigh: -4 }),
      ]),
    );
    const negative = bars(svg).at(-1)!;
    expect(negative.width).toBeGreaterThan(20);
    expect(negative.x).toBeLessThan(zeroX(svg));
    expect(svg).toContain('-12.4');
  });

  it('setzt das Logo ein und fällt sonst auf den Farbpunkt zurück', () => {
    const withLogo = buildShareCardSvg(input([row({ logoMarkup: '<rect id="logo"/>' })]));
    expect(withLogo).toContain('<rect id="logo"/>');

    const withoutLogo = buildShareCardSvg(input([row()]));
    expect(withoutLogo).toContain('fill="#9b59b6"');
  });

  it('kürzt zu lange Modellnamen, statt die Zahl zu überschreiben', () => {
    const svg = buildShareCardSvg(input([row({ name: 'Ein sehr langer Modellname der nicht passt' })]));
    expect(svg).toContain('…');
  });

  it('liefert jedes Format in seiner Größe und gültig', () => {
    for (const [id, format] of Object.entries(SHARE_FORMATS)) {
      const svg = buildShareCardSvg(input([row(), row({ name: 'B', score: 9 })]), id as never);
      expect(svg).toContain(`width="${format.width}" height="${format.height}"`);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
      expect(svg).not.toMatch(/(width|height)="-/);
      expect(svg).not.toContain('NaN');
    }
  });

  it('maskiert Sonderzeichen in Namen und Titel', () => {
    const svg = buildShareCardSvg({
      ...input([row({ name: 'A & B' })]),
      title: 'Tom & Jerry <script>',
    });
    expect(svg).toContain('A &amp; B');
    expect(svg).toContain('Tom &amp; Jerry &lt;script&gt;');
  });
});
