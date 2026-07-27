/**
 * Der Parser ist die Stelle, an der Modell-Freitext auf den Datenvertrag trifft.
 * Zentrale Eigenschaft, die hier festgenagelt wird: es wird NIE koerziert.
 */
import { describe, expect, it } from 'vitest';
import { extractLastJson, parseAnswer } from './parse-answer.mts';

describe('extractLastJson', () => {
  it('nimmt den letzten fenced Block, nicht den ersten', () => {
    const text = [
      'Erst ein Beispiel:',
      '```json',
      '{"prediction":{"kind":"scoreline","home":9,"away":9}}',
      '```',
      'Und hier meine echte Antwort:',
      '```json',
      '{"prediction":{"kind":"scoreline","home":2,"away":1}}',
      '```',
    ].join('\n');
    expect(extractLastJson(text)).toEqual({
      prediction: { kind: 'scoreline', home: 2, away: 1 },
    });
  });

  it('überspringt einen kaputten Block, wenn ein intakter folgt', () => {
    const text = '```json\n{oops\n```\n```json\n{"a":1}\n```';
    expect(extractLastJson(text)).toEqual({ a: 1 });
  });

  it('akzeptiert Fences ohne Sprachangabe und rohes JSON', () => {
    expect(extractLastJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractLastJson('  {"a":1}  ')).toEqual({ a: 1 });
  });

  it('gibt undefined zurück, statt zu werfen', () => {
    expect(extractLastJson('Ich kann das nicht beantworten.')).toBeUndefined();
  });
});

describe('parseAnswer', () => {
  it('liest den Wrapper mit rationale und sources', () => {
    const result = parseAnswer(
      '```json\n{"prediction":{"kind":"binary","probability":0.62},' +
        '"rationale":"Umfragen liegen stabil.","sources":["https://example.org/poll"]}\n```',
      'binary',
    );
    expect(result).toEqual({
      ok: true,
      value: { kind: 'binary', probability: 0.62 },
      rationale: 'Umfragen liegen stabil.',
      sources: ['https://example.org/poll'],
    });
  });

  it('akzeptiert auch den nackten Wert ohne Wrapper', () => {
    const result = parseAnswer('```json\n{"kind":"numeric","value":4512.3}\n```', 'numeric');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ kind: 'numeric', value: 4512.3 });
  });

  it('meldet no-json, wenn kein Block parsbar ist', () => {
    const result = parseAnswer('Dazu möchte ich nichts sagen.', 'scoreline');
    expect(result).toMatchObject({ ok: false, reason: 'no-json' });
  });

  it('meldet invalid-value beim falschen Typ – ohne zu korrigieren', () => {
    const result = parseAnswer('```json\n{"kind":"numeric","value":3}\n```', 'scoreline');
    expect(result).toMatchObject({ ok: false, reason: 'invalid-value' });
  });

  it('koerziert eine unmögliche Wahrscheinlichkeit NICHT auf 1', () => {
    const result = parseAnswer('```json\n{"kind":"binary","probability":1.3}\n```', 'binary');
    // Der Fehler ist die Strafe: kein Plausibilitätsfilter, keine Rundung.
    expect(result).toMatchObject({ ok: false, reason: 'invalid-value' });
  });

  it('lehnt Fließkommazahlen als Torzahl ab', () => {
    const result = parseAnswer('```json\n{"kind":"scoreline","home":2.5,"away":1}\n```', 'scoreline');
    expect(result).toMatchObject({ ok: false, reason: 'invalid-value' });
  });

  it('kappt rationale auf 500 Zeichen und sources auf 5 Einträge', () => {
    const sources = Array.from({ length: 9 }, (_, i) => `https://example.org/${i}`);
    const result = parseAnswer(
      '```json\n' +
        JSON.stringify({
          prediction: { kind: 'numeric', value: 1 },
          rationale: 'x'.repeat(900),
          sources,
        }) +
        '\n```',
      'numeric',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rationale).toHaveLength(500);
      expect(result.sources).toHaveLength(5);
    }
  });

  it('ignoriert Nicht-String-Einträge in sources', () => {
    const result = parseAnswer(
      '```json\n{"prediction":{"kind":"numeric","value":1},"sources":[1,"https://a.example",null]}\n```',
      'numeric',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sources).toEqual(['https://a.example']);
  });
});
