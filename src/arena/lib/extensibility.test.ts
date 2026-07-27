/**
 * Erweiterbarkeits-Vertrag.
 *
 * Dieser Test ist die Absicherung des zentralen Architekturversprechens: Eine
 * neue Metrik und eine neue Kategorie kommen allein durch Registrierung hinzu –
 * ohne eine Zeile in der Engine, in den Komponenten oder im Daten-Layer.
 *
 * Würde jemand später ein `switch (category)` oder `switch (predictionType)` in
 * `computeStandings` einbauen, schlägt dieser Test fehl, weil die hier frisch
 * erfundene Kategorie dann unbekannt wäre.
 *
 * Bewusste Grenze: Eine völlig neue *Wertform* (z. B. Rangordnungen statt Zahlen)
 * erweitert die Union `PredictionValue` in types.ts. Das ist Absicht – der
 * Compiler zwingt dann dazu, den neuen Fall überall zu behandeln, statt ihn zur
 * Laufzeit stillschweigend zu ignorieren.
 */
import { describe, expect, it } from 'vitest';
import './prediction-types/numeric';
// Bestandsmetriken laden, damit die neue Kategorie sie mitverwenden kann.
import './metrics/error';
import { categories, type CategoryDescriptor } from './categories/index';
import { formatFixed, metrics, metricsFor, type Metric } from './metrics/index';
import { computeStandings } from './scoring/standings';
import type { ArenaModel, EventsFile, PredictionsFile, Sample } from './types';

/* ---- Schritt 1: eine brandneue Metrik, nur durch Registrierung ---- */

/** Anteil der Schätzungen, die den Ist-Wert unterschätzen (Bias-Indikator). */
const underestimationRate: Metric = {
  id: 'underestimation-rate',
  label: { en: 'Too low', de: 'Zu niedrig', es: 'Demasiado bajo' },
  description: {
    en: 'Share of estimates below the actual value — reveals systematic bias.',
    de: 'Anteil der Schätzungen unterhalb des tatsächlichen Werts – zeigt systematischen Bias.',
    es: 'Proporción de estimaciones por debajo del valor real: revela un sesgo sistemático.',
  },
  appliesTo: ['numeric'],
  betterDirection: 'lower',
  compute(samples: Sample[]) {
    const usable = samples.filter(
      (s) => s.prediction.kind === 'numeric' && s.resolution.kind === 'numeric',
    );
    if (usable.length === 0) return null;
    const below = usable.filter(
      (s) =>
        s.prediction.kind === 'numeric' &&
        s.resolution.kind === 'numeric' &&
        s.prediction.value < s.resolution.value,
    ).length;
    return { value: below / usable.length, n: usable.length };
  },
  format: (v, locale) => formatFixed(v.value, locale, 2),
};

metrics.register(underestimationRate);

/* ---- Schritt 2: eine brandneue Kategorie, nur durch Registrierung ---- */

const rainfallCategory: CategoryDescriptor = {
  id: 'weather-rainfall',
  dataSource: 'example',
  label: { en: 'Rainfall', de: 'Niederschlag', es: 'Precipitación' },
  blurb: {
    en: 'Invented category that exists purely to serve this test.',
    de: 'Erfundene Kategorie, die ausschließlich diesen Test bedient.',
    es: 'Categoría inventada que existe solo para este test.',
  },
  question: {
    en: 'Rainfall in millimetres',
    de: 'Regenmenge in Millimetern',
    es: 'Precipitación en milímetros',
  },
  accent: '#22d3ee',
  predictionType: 'numeric',
  // Mischung aus bestehenden Metriken und der oben neu erfundenen:
  metricIds: ['mae', 'underestimation-rate'],
  primaryMetric: 'mae',
  eventTitle: (event) => ({ primary: event.title, secondary: 'Test category' }),
};

categories.register(rainfallCategory);

/* ---- Schritt 3: die Engine muss beides ohne Anpassung verarbeiten ---- */

const MODELS: ArenaModel[] = [
  { id: 'a', name: 'Modell A', provider: 'X', color: '#111111' },
  { id: 'b', name: 'Modell B', provider: 'Y', color: '#222222' },
];

function numericEvent(id: string, value: number): EventsFile['events'][number] {
  return {
    id,
    title: `Messung ${id}`,
    utcDate: '2026-07-01T06:00:00Z',
    status: 'RESOLVED',
    predictionType: 'numeric',
    resolution: { kind: 'numeric', value },
    metadata: {},
  };
}

const events: EventsFile = {
  category: rainfallCategory.id,
  updatedAt: '2026-07-01T12:00:00Z',
  events: [numericEvent('r1', 10), numericEvent('r2', 20)],
};

const predictions: PredictionsFile = {
  category: rainfallCategory.id,
  predictions: {
    r1: {
      a: { value: { kind: 'numeric', value: 9 }, createdAt: '2026-06-30T00:00:00Z' }, // zu niedrig
      b: { value: { kind: 'numeric', value: 15 }, createdAt: '2026-06-30T00:00:00Z' },
    },
    r2: {
      a: { value: { kind: 'numeric', value: 19 }, createdAt: '2026-06-30T00:00:00Z' }, // zu niedrig
      b: { value: { kind: 'numeric', value: 25 }, createdAt: '2026-06-30T00:00:00Z' },
    },
  },
};

describe('Erweiterbarkeit ohne Core-Änderung', () => {
  const standings = computeStandings(MODELS, events, predictions, rainfallCategory, 'en');

  it('nimmt die neue Kategorie in die Registry auf', () => {
    expect(categories.has('weather-rainfall')).toBe(true);
    expect(categories.get('weather-rainfall').label.de).toBe('Niederschlag');
  });

  it('macht die neue Metrik über die Typ-Zuordnung auffindbar', () => {
    expect(metricsFor('numeric').map((m) => m.id)).toContain('underestimation-rate');
    // ... und nicht bei Typen, für die sie nicht deklariert wurde:
    expect(metricsFor('binary').map((m) => m.id)).not.toContain('underestimation-rate');
  });

  it('erzeugt die Tabellenspalten allein aus metricIds', () => {
    expect(standings.columns.map((c) => c.metricId)).toEqual(['mae', 'underestimation-rate']);
    expect(standings.columns[1]!.label).toBe('Too low');
  });

  it('berechnet die neue Metrik korrekt und rankt nach der Wunschmetrik', () => {
    const a = standings.rows.find((r) => r.model.id === 'a')!;
    const b = standings.rows.find((r) => r.model.id === 'b')!;

    // a liegt beide Male 1 daneben -> MAE 1 ; b liegt 5 daneben -> MAE 5
    expect(a.primaryValue).toBe(1);
    expect(b.primaryValue).toBe(5);
    expect(a.rank).toBe(1);

    // a unterschätzt beide Male, b überschätzt beide Male
    expect(a.cells.find((c) => c.metricId === 'underestimation-rate')!.value!.value).toBe(1);
    expect(b.cells.find((c) => c.metricId === 'underestimation-rate')!.value!.value).toBe(0);
  });

  it('kennt die neue Kategorie ohne Skill-Score, weil keine Baseline gesetzt ist', () => {
    expect(standings.baselineRows).toHaveLength(0);
    expect(standings.columns.map((c) => c.metricId)).not.toContain('skill-score');
  });
});

describe('Provenienz ist erklärungspflichtig', () => {
  it('deklariert für jede Kategorie, ob es echte oder Beispieldaten sind', () => {
    /*
     * Doppelt gesichert: Der Compiler erzwingt das Feld (Pflichtfeld ohne
     * Standardwert), und dieser Test hält fest, dass niemand einen dritten Wert
     * einschmuggelt. Ohne diese Angabe könnte eine neue Kategorie unbemerkt in
     * die Kennzahlen der Startseite einfließen.
     */
    for (const descriptor of categories.list()) {
      expect(
        ['live', 'example'],
        `Kategorie "${descriptor.id}" hat kein gültiges dataSource`,
      ).toContain(descriptor.dataSource);
    }
  });
});
