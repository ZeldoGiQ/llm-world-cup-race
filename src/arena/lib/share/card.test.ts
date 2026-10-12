import { describe, expect, it } from 'vitest';
import { buildShareCardSvg, SHARE_FORMATS, type ShareCardInput, type ShareRow } from './card';
import { innerSvgMarkup } from './model-logo-markup';

const row = (over: Partial<ShareRow> = {}): ShareRow => ({
  name: 'GPT-5.5',
  color: '#9b59b6',
  value: 0.582,
  formatted: '58.2 %',
  ciLow: 0.52,
  ciHigh: 0.64,
  ...over,
});

const input = (rows: ShareRow[], over: Partial<ShareCardInput> = {}): ShareCardInput => ({
  title: 'Football leagues',
  subtitle: 'Right outcome',
  rows,
  footnote: '201 events · every prediction published before the event · no internet access',
  headline: 'GPT-5.5 called 58.2 % of matches right',
  clear: false,
  reference: { label: 'Always home win', value: 0.45, formatted: '45.0 %' },
  ...over,
});

const RED = '#d94a52';

/** Balken tragen rx="2"; der Hintergrund und die Logo-Kacheln nicht. */
function bars(svg: string): { x: number; width: number; fill: string }[] {
  return [...svg.matchAll(/<rect x="([\d.-]+)" y="[\d.-]+" width="([\d.]+)" height="[\d.]+" rx="2" fill="([^"]+)"/g)].map(
    (match) => ({ x: Number(match[1]), width: Number(match[2]), fill: match[3] }),
  );
}

/** Die gestrichelte Senkrechte markiert die Referenz. */
function referenceX(svg: string): number | null {
  const match = svg.match(/<line x1="([\d.]+)"[^>]*stroke-dasharray/);
  return match ? Number(match[1]) : null;
}

describe('innerSvgMarkup', () => {
  it('schält den Inhalt aus einer Logo-Datei', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect/></svg>';
    expect(innerSvgMarkup(source)).toBe('<rect/>');
  });

  it('gibt null zurück, statt kaputtes Markup weiterzureichen', () => {
    expect(innerSvgMarkup('kein svg')).toBeNull();
    expect(innerSvgMarkup('<svg viewBox="0 0 64 64"></svg>')).toBeNull();
  });
});

describe('buildShareCardSvg', () => {
  it('zeigt die Alltagszahl formatiert, nicht den Score', () => {
    const svg = buildShareCardSvg(input([row(), row({ name: 'Kimi K3', value: 0.57, formatted: '57.0 %' })]));
    expect(svg).toContain('58.2 %');
    expect(svg).toContain('57.0 %');
    expect(svg).toContain('RIGHT OUTCOME');
    expect(svg).toContain('GPT-5.5 called 58.2 % of matches right');
  });

  it('zeichnet die Referenz als beschriftete Linie zwischen null und dem Maximum', () => {
    const svg = buildShareCardSvg(input([row(), row({ name: 'B', value: 0.3, formatted: '30.0 %' })]));
    expect(svg).toContain('Always home win 45.0 %');
    const refX = referenceX(svg)!;
    const [first, second] = bars(svg);
    // 45 % liegt zwischen 30 % und 58 %: die Linie zwischen den Balkenenden.
    expect(refX).toBeGreaterThan(second!.x + second!.width);
    expect(refX).toBeLessThan(first!.x + first!.width);
  });

  it('färbt bei knapper Entscheidung keinen einzigen Balken rot', () => {
    const svg = buildShareCardSvg(input([row(), row({ name: 'B', value: 0.58, formatted: '58.0 %' })], { clear: false }));
    expect(bars(svg).filter((bar) => bar.fill === RED)).toHaveLength(0);
  });

  it('färbt genau einen Balken rot, wenn einer nachweislich führt', () => {
    const svg = buildShareCardSvg(input([row(), row({ name: 'B', value: 0.4, formatted: '40.0 %' })], { clear: true }));
    expect(bars(svg).filter((bar) => bar.fill === RED)).toHaveLength(1);
    expect(bars(svg)[0]!.fill).toBe(RED);
  });

  it('kommt ohne Referenz und ohne Überschrift aus', () => {
    const svg = buildShareCardSvg(input([row(), row({ name: 'B' })], { reference: null, headline: null }));
    expect(referenceX(svg)).toBeNull();
    expect(svg).not.toContain('NaN');
  });

  it('macht Balken proportional: halber Wert, halbe Länge', () => {
    const svg = buildShareCardSvg(input([row({ value: 0.8 }), row({ name: 'B', value: 0.4 })], { reference: null }));
    const [a, b] = bars(svg);
    expect(a!.width / b!.width).toBeCloseTo(2, 1);
  });

  it('setzt das Logo ein und fällt sonst auf den Farbpunkt zurück', () => {
    const withLogo = buildShareCardSvg(input([row({ logoMarkup: '<rect id="logo"/>' })]));
    expect(withLogo).toContain('<rect id="logo"/>');
    const withoutLogo = buildShareCardSvg(input([row({ logoMarkup: null })]));
    expect(withoutLogo).toContain('fill="#9b59b6"');
  });

  it('kürzt zu lange Modellnamen, statt die Zahl zu überschreiben', () => {
    const svg = buildShareCardSvg(input([row({ name: 'Ein unfassbar langer Modellname mit Versionsnummer 12.3.4' })]));
    expect(svg).toContain('…');
  });

  it('liefert jedes Format in seiner Größe und gültig', () => {
    for (const [id, format] of Object.entries(SHARE_FORMATS)) {
      const svg = buildShareCardSvg(input(Array.from({ length: 9 }, (_, i) => row({ name: `M${i}`, value: 0.5 - i * 0.03 }))), id as keyof typeof SHARE_FORMATS);
      expect(svg).toContain(`width="${format.width}" height="${format.height}"`);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
      expect(svg).not.toMatch(/(width|height)="-/);
      expect(svg).not.toContain('NaN');
    }
  });

  it('maskiert Sonderzeichen in Namen und Titel', () => {
    const svg = buildShareCardSvg(input([row({ name: 'A & B' })], { title: 'Crypto <24h>' }));
    expect(svg).toContain('A &amp; B');
    expect(svg).toContain('Crypto &lt;24h&gt;');
  });
});
