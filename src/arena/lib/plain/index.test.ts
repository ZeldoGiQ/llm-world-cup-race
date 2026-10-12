import { describe, expect, it } from 'vitest';
import '../plugins';
import { categories } from '../categories/index';
import { metrics } from '../metrics/index';
import { headlineFor, overallPlain, PLAIN_PHRASINGS, plainHeadline, plainLabel } from './index';
import type { OverallRow } from '../scoring/overall';

describe('Alltagszahl – Invarianten über alle Kategorien', () => {
  it('jede Kategorie nennt ihre Referenz in Alltagssprache', () => {
    for (const descriptor of categories.list()) {
      expect(descriptor.plainReference?.en, descriptor.id).toBeTruthy();
      expect(descriptor.plainReference?.de, descriptor.id).toBeTruthy();
    }
  });

  it('die Alltagszahl steht vorn in der Tabelle und ist die Ranking-Metrik', () => {
    for (const descriptor of categories.list()) {
      expect(descriptor.metricIds[0], descriptor.id).toBe(descriptor.primaryMetric);
      expect(metrics.find(descriptor.primaryMetric), descriptor.id).toBeDefined();
    }
  });

  it('der Prediction Score steht hinten, nicht vorn', () => {
    for (const descriptor of categories.list()) {
      const index = descriptor.metricIds.indexOf('prediction-score');
      if (index === -1) continue;
      expect(index, descriptor.id).toBe(descriptor.metricIds.length - 1);
    }
  });

  it('jede Ranking-Metrik einer echten Kategorie hat einen Alltagssatz', () => {
    for (const descriptor of categories.list()) {
      if (descriptor.dataSource !== 'live') continue;
      expect(PLAIN_PHRASINGS[descriptor.primaryMetric], descriptor.id).toBeDefined();
    }
  });
});

describe('plainHeadline / plainLabel', () => {
  it('baut den Satz in allen drei Sprachen', () => {
    expect(plainHeadline('tendency-acc', 'en', { model: 'GPT-5.5', value: '58 %' })).toBe(
      'GPT-5.5 called 58 % of matches right',
    );
    expect(plainHeadline('tendency-acc', 'de', { model: 'GPT-5.5', value: '58 %' })).toBe(
      'GPT-5.5 lag bei 58 % der Spiele richtig',
    );
    expect(plainHeadline('mape', 'es', { model: 'Qwen', value: '1,8 %' })).toContain('Qwen se acerca más');
  });

  it('fällt bei unbekannter Metrik auf einen neutralen Satz zurück', () => {
    expect(plainHeadline('brier', 'en', { model: 'A', value: '0.21' })).toBe('A leads with 0.21');
    expect(plainLabel(metrics.get('brier'), 'de')).toBe('Brier');
  });
});

describe('headlineFor', () => {
  const base = { metricId: 'mape', locale: 'en' as const, betterDirection: 'lower' as const, model: 'GLM-5.2' };

  it('sagt zuerst, wenn die stumpfe Regel alle schlägt', () => {
    const text = headlineFor({
      ...base,
      value: 0.0224,
      formatted: '2.24%',
      reference: { label: 'Price unchanged', value: 0.0223, formatted: '2.23%' },
    });
    expect(text).toBe('No model beats "Price unchanged" — GLM-5.2 comes closest at 2.24%');
  });

  it('nutzt den normalen Satz, sobald das Modell die Referenz schlägt', () => {
    const text = headlineFor({
      ...base,
      value: 0.018,
      formatted: '1.80%',
      reference: { label: 'Price unchanged', value: 0.0223, formatted: '2.23%' },
    });
    expect(text).toBe('GLM-5.2 comes closest: 1.80% off on average');
  });

  it('beachtet die Richtung: bei "höher ist besser" muss der Wert über der Referenz liegen', () => {
    const higher = { ...base, metricId: 'tendency-acc', betterDirection: 'higher' as const, model: 'GPT-5.5' };
    expect(
      headlineFor({ ...higher, value: 0.4, formatted: '40%', reference: { label: 'Always home win', value: 0.43, formatted: '43%' } }),
    ).toContain('No model beats');
    expect(
      headlineFor({ ...higher, value: 0.52, formatted: '52%', reference: { label: 'Always home win', value: 0.43, formatted: '43%' } }),
    ).toBe('GPT-5.5 called 52% of matches right');
  });
});

describe('overallPlain', () => {
  it('zählt die Kategorien, in denen die Referenz geschlagen wurde', () => {
    const row = {
      cells: [{ ratio: 0.8 }, { ratio: 1.0 }, { ratio: 0.5 }, { ratio: 1.3 }],
    } as unknown as OverallRow;
    expect(overallPlain(row)).toEqual({ beats: 2, counted: 4, fraction: 0.5 });
  });
});
