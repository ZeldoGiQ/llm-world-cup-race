import { describe, expect, it } from 'vitest';
import { buildShareCardSvg, type ShareRow } from './card';
import { innerSvgMarkup } from './model-logo-markup';

const row = (over: Partial<ShareRow> = {}): ShareRow => ({
  name: 'Grok 4.3',
  color: '#9b59b6',
  score: 21.5,
  ciLow: 14.9,
  ciHigh: 27.8,
  ...over,
});

const input = (rows: ShareRow[]) => ({
  title: 'FIFA World Cup 2026',
  subtitle: 'Prediction Score · Knowledge Cap · SCORE_V1',
  rows,
  footnote: '104 events · committed before each event · 90% CI',
});

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

describe('buildShareCardSvg', () => {
  it('setzt das Logo ein, wenn eines mitkommt', () => {
    const svg = buildShareCardSvg(input([row({ logoMarkup: '<rect id="logo"/>' })]));
    expect(svg).toContain('<rect id="logo"/>');
    // Auf 36 px skaliert: 36/64
    expect(svg).toContain('scale(0.5625)');
  });

  it('fällt ohne Logo auf den Farbpunkt zurück', () => {
    const svg = buildShareCardSvg(input([row()]));
    expect(svg).toContain('fill="#9b59b6"');
    expect(svg).not.toContain('scale(0.5625)');
  });

  it('färbt nur den Spitzenwert rot – die Rekordregel des Design-Systems', () => {
    const svg = buildShareCardSvg(input([row({ score: 21.5 }), row({ name: 'Kimi', score: 8.2 })]));
    const red = svg.match(/fill="#d94a52"/g) ?? [];
    const grey = svg.match(/fill="#6e675b"/g) ?? [];
    expect(red.length).toBeGreaterThan(0);
    expect(grey.length).toBe(1);
  });

  it('bleibt gültiges SVG bei negativen Scores', () => {
    // Ein Modell darf schlechter sein als die Referenz. Die Säule wird dann
    // auf der Nulllinie gekappt, die Zahl bleibt ehrlich negativ.
    const svg = buildShareCardSvg(input([row({ score: -12.4, ciLow: -20, ciHigh: -4 })]));
    expect(svg).toContain('-12.4');
    expect(svg).not.toMatch(/height="-/);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('maskiert Sonderzeichen in Namen und Titel', () => {
    const svg = buildShareCardSvg({
      ...input([row({ name: 'A & B <test>' })]),
      title: 'Tom & Jerry',
    });
    expect(svg).toContain('A &amp; B &lt;test&gt;');
    expect(svg).toContain('Tom &amp; Jerry');
  });
});
