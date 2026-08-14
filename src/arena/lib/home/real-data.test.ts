/**
 * Integritäts- und Ehrlichkeitsprüfung an den ECHTEN Datendateien.
 *
 * Diese Datei friert den heutigen Zustand ein, statt auf ihn zu hoffen. Sie ist
 * der Wächter gegen die zwei teuersten Fehler des Projekts:
 *
 * 1. Eine Vorhersage, die nach dem Ereignis entstanden ist, würde das ganze
 *    Benchmark entwerten. Heute: 0 Fälle. Ein neuer Fall bricht den Build.
 * 2. Eine Fehlklassifikation der Provenienz würde entweder Beispieldaten als
 *    echt ausweisen oder die einzige echte Kategorie stilllegen.
 */
import { describe, expect, it } from 'vitest';
import '../plugins';
import { categories } from '../categories/index';
import { metrics } from '../metrics/index';
import { predictionTypes } from '../prediction-types/index';
import { references } from '../references/index';
import { bootstrapCategory } from '../scoring/bootstrap';
import {
  computeOverall,
  REQUIRED_CATEGORIES,
  type QualificationFailure,
} from '../scoring/overall';
import type { ArenaModel, EventsFile, PredictionsFile, Sample } from '../types';
import modelsJson from '../../data/models.json';
import { classifyCategoryData } from './provenance';

import wcEvents from '../../../../public/arena-data/football-worldcup/events.json';
import wcPredictions from '../../../../public/arena-data/football-worldcup/predictions.json';
import flEvents from '../../../../public/arena-data/football-leagues/events.json';
import flPredictions from '../../../../public/arena-data/football-leagues/predictions.json';
import cryptoEvents from '../../../../public/arena-data/crypto/events.json';
import cryptoPredictions from '../../../../public/arena-data/crypto/predictions.json';
import stocksEvents from '../../../../public/arena-data/stocks-index/events.json';
import stocksPredictions from '../../../../public/arena-data/stocks-index/predictions.json';
import electionEvents from '../../../../public/arena-data/elections/events.json';
import electionPredictions from '../../../../public/arena-data/elections/predictions.json';
import mixedEvents from '../../../../public/arena-data/sports-mixed/events.json';
import mixedPredictions from '../../../../public/arena-data/sports-mixed/predictions.json';

interface Bundle {
  id: string;
  events: EventsFile;
  predictions: PredictionsFile;
}

const BUNDLES: Bundle[] = [
  { id: 'football-worldcup', events: wcEvents as unknown as EventsFile, predictions: wcPredictions as unknown as PredictionsFile },
  { id: 'football-leagues', events: flEvents as unknown as EventsFile, predictions: flPredictions as unknown as PredictionsFile },
  { id: 'crypto', events: cryptoEvents as unknown as EventsFile, predictions: cryptoPredictions as unknown as PredictionsFile },
  { id: 'stocks-index', events: stocksEvents as unknown as EventsFile, predictions: stocksPredictions as unknown as PredictionsFile },
  { id: 'elections', events: electionEvents as unknown as EventsFile, predictions: electionPredictions as unknown as PredictionsFile },
  { id: 'sports-mixed', events: mixedEvents as unknown as EventsFile, predictions: mixedPredictions as unknown as PredictionsFile },
];

const models = modelsJson as ArenaModel[];

describe('Integrität der echten Daten', () => {
  it('kein Tipp trägt einen Zeitstempel zum oder nach dem Ereignis', () => {
    for (const bundle of BUNDLES) {
      const byId = new Map(bundle.events.events.map((event) => [event.id, event]));
      for (const [eventId, byModel] of Object.entries(bundle.predictions.predictions)) {
        const event = byId.get(eventId);
        if (!event) continue;
        for (const [modelId, prediction] of Object.entries(byModel)) {
          if (!prediction.createdAt) continue; // unbekannt ist kein Verstoss
          expect(
            Date.parse(prediction.createdAt),
            `${bundle.id}/${eventId}/${modelId} nach Ereignisbeginn abgegeben`,
          ).toBeLessThan(Date.parse(event.utcDate));
        }
      }
    }
  });

  it('jedes aufgelöste Event trägt ein typvalides Ergebnis', () => {
    for (const bundle of BUNDLES) {
      for (const event of bundle.events.events) {
        if (event.status !== 'RESOLVED') continue;
        const handler = predictionTypes.find(event.predictionType);
        expect(handler, `${bundle.id}: Typ ${event.predictionType} nicht registriert`).toBeDefined();
        expect(
          handler!.validateResolution(event.resolution),
          `${bundle.id}/${event.id}: Ergebnis passt nicht zum Typ`,
        ).toBe(true);
      }
    }
  });
});

describe('Provenienz-Klassifikation der echten Daten', () => {
  it('erkennt genau vier echte und zwei Beispiel-Kategorien', () => {
    const result = new Map<string, string>();
    for (const bundle of BUNDLES) {
      const descriptor = categories.get(bundle.id);
      const classified = classifyCategoryData(
        descriptor.dataSource,
        bundle.events,
        bundle.predictions,
      );
      result.set(bundle.id, classified.dataSource);
      expect(classified.integrityCount, `${bundle.id} hat Integritätsfehler`).toBe(0);
    }
    expect(Object.fromEntries(result)).toEqual({
      'football-worldcup': 'live',
      'football-leagues': 'live',
      crypto: 'live',
      'stocks-index': 'live',
      elections: 'example',
      'sports-mixed': 'example',
    });
  });

  it('stuft die Beispieldaten aus eigenem Indiz ab, nicht nur aus der Deklaration', () => {
    // Selbst wenn jemand die Deklaration auf "live" dreht, greifen die Indizien.
    const elections = BUNDLES.find((b) => b.id === 'elections')!;
    const forced = classifyCategoryData('live', elections.events, elections.predictions);
    expect(forced.dataSource).toBe('example');
    expect(forced.flags).toContain('metadata-source-sample');

    const mixed = BUNDLES.find((b) => b.id === 'sports-mixed')!;
    const forcedMixed = classifyCategoryData('live', mixed.events, mixed.predictions);
    expect(forcedMixed.dataSource).toBe('example');
    expect(forcedMixed.flags).toContain('resolved-after-update');
  });

  it('stuft die einzige vollständige echte Kategorie NICHT zu Unrecht ab', () => {
    const wc = BUNDLES.find((b) => b.id === 'football-worldcup')!;
    const classified = classifyCategoryData('live', wc.events, wc.predictions);
    expect(classified.dataSource).toBe('live');
    expect(classified.flags).toEqual([]);
  });
});

describe('Referenzregel auf den echten WM-Ergebnissen', () => {
  const wc = BUNDLES.find((b) => b.id === 'football-worldcup')!;
  const rule = references.get('constant-1-0');
  const resolved = wc.events.events.filter(
    (event) => event.status === 'RESOLVED' && event.resolution !== null,
  );

  it('legt ihre Nachträglichkeit offen', () => {
    // Eine im Nachhinein gewählte Latte darf nicht wie eine vorab vereinbarte
    // aussehen – sonst bestimmt sie unbemerkt die Höhe des Skill-Werts.
    expect(rule.retroactive).toBe(true);
  });

  it('erreicht mit "immer 1:0" genau 128 Punkte über 104 Spiele', () => {
    const samples: Sample[] = resolved.map((event) => ({
      prediction: rule.predict(event)!,
      resolution: event.resolution!,
    }));
    expect(samples).toHaveLength(104);
    const points = metrics.get('kicktipp-points').compute(samples, {});
    expect(points?.value).toBe(128);
  });

  it('schneidet schlechter ab als die angepasste Konstante 2:1 – deshalb wird 1:0 verwendet', () => {
    const fitted: Sample[] = resolved.map((event) => ({
      prediction: { kind: 'scoreline', home: 2, away: 1 },
      resolution: event.resolution!,
    }));
    const fittedPoints = metrics.get('kicktipp-points').compute(fitted, {})!.value;
    // 2:1 wäre die beste Konstante für dieses Turnier – aber die kennt man erst
    // hinterher. Eine an die Ergebnisse angepasste Referenz ist keine Referenz.
    expect(fittedPoints).toBeGreaterThan(128);
  });
});

describe('Unsicherheit der WM-Rangliste', () => {
  const wc = BUNDLES.find((b) => b.id === 'football-worldcup')!;
  const resolved = wc.events.events.filter(
    (event) => event.status === 'RESOLVED' && event.resolution !== null,
  );
  // Nur Modelle, die in dieser Kategorie überhaupt angetreten sind – die
  // Modell-Registry wächst weiter (neue Teilnehmer ohne WM-Historie), und ein
  // Schnitt über Nicht-Teilnehmer wäre leer. Gleiche Logik wie die Startseite.
  const contenders = models.filter(
    (m) =>
      !m.baseline &&
      m.access !== 'early-access' &&
      resolved.some((event) => wc.predictions.predictions[event.id]?.[m.id]),
  );
  const common = resolved.filter((event) =>
    contenders.every((model) => wc.predictions.predictions[event.id]?.[model.id]),
  );
  const samplesByModel = new Map<string, Sample[]>(
    contenders.map((model) => [
      model.id,
      common.map((event) => ({
        prediction: wc.predictions.predictions[event.id]![model.id]!.value,
        resolution: event.resolution!,
      })),
    ]),
  );
  const result = bootstrapCategory({
    samplesByModel,
    metric: metrics.get('kicktipp-points'),
  });

  it('rechnet über alle 104 Spiele als gemeinsame Menge', () => {
    expect(result.commonEvents).toBe(104);
  });

  it('zeigt die Spitze als NICHT entschieden – die Kernaussage der Startseite', () => {
    // 190 gegen 184 Punkte sind sechs Punkte bei 1,4 Punkten Streuung pro Event.
    // Wer daraus einen Sieger macht, behauptet mehr als die Daten tragen.
    const grok = result.probabilityFirst.grok!;
    const claude = result.probabilityFirst.claude!;
    expect(grok).toBeGreaterThan(0.5);
    expect(grok).toBeLessThan(0.9); // unter der Medaillenschwelle
    expect(claude).toBeGreaterThan(0.1);
    expect(grok + claude).toBeGreaterThan(0.95); // die Spitze ist ein Zweikampf
  });

  it('lässt den Führenden das Rangintervall 1–2 teilen', () => {
    expect(result.rankInterval.grok![0]).toBe(1);
    expect(result.rankInterval.grok![1]).toBeGreaterThanOrEqual(2);
  });

  it('setzt das Schlusslicht klar ab', () => {
    expect(result.probabilityFirst.qwen).toBeLessThan(0.01);
    expect(result.rankInterval.qwen![1]).toBe(6);
  });

  it('trennt nur eine Minderheit der 15 Paare belastbar', () => {
    expect(result.pairs).toHaveLength(15);
    const separated = result.pairs.filter((pair) => pair.separated);
    // Wären alle Paare getrennt, bräuchte man keine Unsicherheitsangabe. Wäre
    // keines getrennt, wäre die Tabelle wertlos. Die Wahrheit liegt dazwischen.
    expect(separated.length).toBeGreaterThan(0);
    expect(separated.length).toBeLessThan(15);
    // Erster gegen Zweiter darf nicht als getrennt gelten.
    const top = result.pairs.find(
      (pair) =>
        (pair.a === 'grok' && pair.b === 'claude') || (pair.a === 'claude' && pair.b === 'grok'),
    );
    expect(top!.separated).toBe(false);
  });
});

describe('Gesamtwertung über die echten Daten', () => {
  const overall = computeOverall(
    models,
    BUNDLES.map((bundle) => {
      const descriptor = categories.get(bundle.id);
      const classified = classifyCategoryData(
        descriptor.dataSource,
        bundle.events,
        bundle.predictions,
      );
      return {
        descriptor,
        events: bundle.events,
        predictions: bundle.predictions,
        dataSource: classified.dataSource,
        integrityErrors: classified.integrityCount,
        reference: descriptor.referenceRuleId
          ? references.find(descriptor.referenceRuleId)
          : undefined,
      };
    }),
  );

  it('entsteht genau dann, wenn genug Kategorien qualifiziert sind', () => {
    // Dieser Test hat schon einmal den Kalendertag eingefroren statt der
    // Regel: Er behauptete, es gebe keine Gesamtwertung – und wurde rot, als
    // die zweite Kategorie qualifizierte. Geprüft wird deshalb der
    // Zusammenhang, nicht der Zählerstand.
    expect(overall.totalCategories).toBe(6);
    expect(overall.status).toBe(
      overall.qualifiedCount >= REQUIRED_CATEGORIES ? 'ready' : 'insufficient',
    );

    if (overall.status === 'ready') {
      expect(overall.rows.length).toBeGreaterThan(0);
      for (const row of overall.rows) {
        expect(row.categoriesCounted).toBeGreaterThan(0);
        if (row.predictionScore !== null) expect(Number.isFinite(row.predictionScore)).toBe(true);
      }
    } else {
      expect(overall.rows).toEqual([]);
    }
  });

  it('nennt für jede nicht qualifizierte Kategorie einen prüfbaren Grund', () => {
    const unqualified = overall.qualifications.filter((q) => !q.qualified);
    const reasons = new Map(unqualified.map((q) => [q.categoryId, q.reason]));

    // Beispieldaten qualifizieren sich nie – das ist eine feste Regel und
    // kein Zwischenstand.
    expect(reasons.get('elections')).toBe('example-data');
    expect(reasons.get('sports-mixed')).toBe('example-data');

    // Die Live-Kategorien wachsen unter diesem Test weiter: erst fehlt die
    // Referenz, dann fehlen Vorhersagen, dann Auflösungen, irgendwann sind
    // sie qualifiziert. Alle diese Gründe sind gültige Zwischenstände auf
    // demselben Weg – nur „integrity" wäre ein echter Fehler und deshalb
    // hier ausgeschlossen.
    const ONGOING: QualificationFailure[] = [
      'no-reference',
      'no-predictions',
      'too-few-resolved',
      'too-few-models',
    ];
    for (const [id, reason] of reasons) {
      if (id === 'elections' || id === 'sports-mixed') continue;
      expect(ONGOING).toContain(reason);
    }

    expect(unqualified.length + overall.qualifiedCount).toBe(overall.totalCategories);
  });

  it('qualifiziert die WM und merkt sich die nachträgliche Referenz', () => {
    const wc = overall.qualifications.find((q) => q.categoryId === 'football-worldcup')!;
    expect(wc.qualified).toBe(true);
    expect(wc.resolvedEvents).toBe(104);
    expect(wc.commonEvents).toBe(104);
    expect(wc.scoredModels).toBe(6);
    expect(wc.retroactiveReference).toBe(true);
  });
});
