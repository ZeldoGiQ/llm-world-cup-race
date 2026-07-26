/**
 * Standings-Engine – vollständig datengetrieben.
 *
 * Die Funktion kennt keine Kategorie, keinen Vorhersage-Typ und keine Metrik.
 * Sie liest `descriptor.metricIds`, fragt für jede ID die Metrik-Registry und
 * rankt nach `descriptor.primaryMetric` unter Beachtung von `betterDirection`.
 * Deshalb genügt für eine neue Kategorie oder Metrik ein Registry-Eintrag –
 * hier ist nichts anzupassen.
 *
 * Gewertet wird ausschliesslich, was aufgelöst ist (`status === 'RESOLVED'` mit
 * vorhandener `resolution`). Fehlende Tipps zählen nicht als gewertetes Event;
 * unbekannte Modell-IDs in den Daten werden ignoriert.
 */
import type { CategoryDescriptor } from '../categories/index';
import { pick, type Locale } from '../i18n/locales';
import { metrics, type Metric, type MetricValue } from '../metrics/index';
import { predictionTypes } from '../prediction-types/index';
import type { ArenaEvent, ArenaModel, EventsFile, PredictionsFile, Sample } from '../types';

export interface StandingCell {
  metricId: string;
  label: string;
  /** null = für dieses Modell nicht berechenbar (z. B. keine Baseline, n = 0) */
  value: MetricValue | null;
  formatted: string;
  betterDirection: Metric['betterDirection'];
}

/**
 * Mindest-Abdeckung für einen echten Rang: Ein Modell muss mindestens die Hälfte
 * der aufgelösten Events getippt haben.
 *
 * Ohne diese Hürde könnte ein Modell mit einer Handvoll Glückstreffer an der
 * Spitze stehen und die Aussage des Benchmarks entwerten – Werte über
 * unterschiedlich grosse Event-Mengen sind nicht vergleichbar. Solche Modelle
 * erscheinen weiter in der Tabelle, aber als "vorläufig" und ohne Rang.
 */
export const MIN_COVERAGE = 0.5;

export interface StandingRow {
  model: ArenaModel;
  /** 0, solange kein Rang zugewiesen wurde (Baselines bekommen keinen Rang) */
  rank: number;
  /** Anzahl gewerteter Events */
  scored: number;
  /** true = zu wenige gewertete Events für einen belastbaren Rang */
  provisional: boolean;
  /** Anzahl abgegebener Tipps auf noch offene Events */
  openPredictions: number;
  cells: StandingCell[];
  /** Wert der Ranking-Metrik; null = nicht rankbar */
  primaryValue: number | null;
  /** true bei Referenz-Teilnehmern – erscheinen separat, ohne Rang */
  isBaseline: boolean;
}

export interface Standings {
  rows: StandingRow[];
  baselineRows: StandingRow[];
  /** Spaltenköpfe in Reihenfolge von descriptor.metricIds */
  columns: Array<{ metricId: string; label: string; description: string }>;
  resolvedEvents: number;
  openEvents: number;
}

/** Ein Event ist wertbar, wenn es aufgelöst ist und ein passendes Ergebnis hat. */
function resolvedEventsOf(events: ArenaEvent[]): ArenaEvent[] {
  return events.filter((event) => {
    if (event.status !== 'RESOLVED' || event.resolution === null) return false;
    const handler = predictionTypes.find(event.predictionType);
    // Ohne Handler kann das Ergebnis nicht validiert werden -> nicht werten.
    return handler ? handler.validateResolution(event.resolution) : false;
  });
}

/** Sammelt die (Tipp, Ergebnis)-Paare eines Modells über die gewerteten Events. */
function collectSamples(
  modelId: string,
  resolved: ArenaEvent[],
  predictions: PredictionsFile['predictions'],
): { samples: Sample[]; eventIds: string[] } {
  const samples: Sample[] = [];
  const eventIds: string[] = [];
  for (const event of resolved) {
    const prediction = predictions[event.id]?.[modelId];
    if (!prediction) continue;
    const handler = predictionTypes.find(event.predictionType);
    if (!handler || !handler.validate(prediction.value)) continue;
    samples.push({ prediction: prediction.value, resolution: event.resolution! });
    eventIds.push(event.id);
  }
  return { samples, eventIds };
}

/** Zählt Tipps auf noch nicht aufgelöste Events (öffentlich sichtbare Zukunft). */
function countOpenPredictions(
  modelId: string,
  events: ArenaEvent[],
  predictions: PredictionsFile['predictions'],
): number {
  let count = 0;
  for (const event of events) {
    if (event.status === 'RESOLVED' || event.status === 'VOID') continue;
    if (predictions[event.id]?.[modelId]) count += 1;
  }
  return count;
}

export function computeStandings(
  models: ArenaModel[],
  eventsFile: EventsFile,
  predictionsFile: PredictionsFile,
  descriptor: CategoryDescriptor,
  locale: Locale,
): Standings {
  const events = eventsFile?.events ?? [];
  const predictions = predictionsFile?.predictions ?? {};
  const resolved = resolvedEventsOf(events);
  const openEvents = events.filter((e) => e.status === 'UPCOMING' || e.status === 'LIVE').length;

  // Nur Metriken verwenden, die tatsächlich registriert sind – so bricht eine
  // veraltete metricId in den Daten nicht die ganze Seite.
  const columnMetrics = descriptor.metricIds
    .map((id) => metrics.find(id))
    .filter((m): m is Metric => m !== undefined);

  const baselineModel = descriptor.baselineModelId
    ? models.find((m) => m.id === descriptor.baselineModelId)
    : undefined;
  const baselineAll = baselineModel
    ? collectSamples(baselineModel.id, resolved, predictions)
    : null;

  // Referenz-Teilnehmer anderer Kategorien gehören nicht in diese Tabelle:
  // die Modell-Registry ist global, die Baseline aber kategoriespezifisch.
  const relevantModels = models.filter(
    (model) => model.baseline !== true || model.id === descriptor.baselineModelId,
  );

  const allRows: StandingRow[] = relevantModels.map((model) => {
    const { samples, eventIds } = collectSamples(model.id, resolved, predictions);

    // Baseline auf genau die Events beschränken, die auch das Modell getippt hat
    // – sonst wäre der Skill-Score über unterschiedliche Event-Mengen verglichen.
    let baselineSamples: Sample[] | undefined;
    if (baselineAll && model.id !== baselineModel?.id) {
      const wanted = new Set(eventIds);
      baselineSamples = baselineAll.samples.filter((_, index) =>
        wanted.has(baselineAll.eventIds[index]!),
      );
    }

    const cells: StandingCell[] = columnMetrics.map((metric) => {
      const value = metric.compute(samples, { baselineSamples, baselineModel });
      return {
        metricId: metric.id,
        label: pick(metric.label, locale),
        value,
        formatted: value === null ? '—' : metric.format(value, locale),
        betterDirection: metric.betterDirection,
      };
    });

    const primaryCell = cells.find((c) => c.metricId === descriptor.primaryMetric);
    const required = Math.ceil(resolved.length * MIN_COVERAGE);
    return {
      model,
      rank: 0,
      scored: samples.length,
      provisional: samples.length > 0 && samples.length < required,
      openPredictions: countOpenPredictions(model.id, events, predictions),
      cells,
      primaryValue: primaryCell?.value?.value ?? null,
      isBaseline: model.baseline === true,
    };
  });

  const primaryMetric = metrics.find(descriptor.primaryMetric);
  const lowerIsBetter = primaryMetric?.betterDirection === 'lower';

  const rows = allRows.filter((r) => !r.isBaseline);
  const baselineRows = allRows.filter((r) => r.isBaseline);

  /** Rankbar heisst: hat einen Wert UND genug gewertete Events. */
  const isRankable = (row: StandingRow) => row.primaryValue !== null && !row.provisional;

  rows.sort((a, b) => {
    // Erst alle rankbaren Modelle, dann vorläufige, dann wertlose.
    const rankableDiff = Number(isRankable(b)) - Number(isRankable(a));
    if (rankableDiff !== 0) return rankableDiff;
    if (a.primaryValue === null && b.primaryValue === null) {
      return a.model.name.localeCompare(b.model.name, 'de');
    }
    if (a.primaryValue === null) return 1;
    if (b.primaryValue === null) return -1;
    const diff = lowerIsBetter
      ? a.primaryValue - b.primaryValue
      : b.primaryValue - a.primaryValue;
    return diff !== 0 ? diff : b.scored - a.scored || a.model.name.localeCompare(b.model.name, 'de');
  });

  // Standard-Wettkampf-Ranking: Gleichstand teilt den Rang, danach wird übersprungen.
  let previousKey = '';
  let previousRank = 0;
  let position = 0;
  rows.forEach((row) => {
    if (!isRankable(row)) {
      row.rank = 0;
      return;
    }
    position += 1;
    const key = `${row.primaryValue}|${row.scored}`;
    row.rank = key === previousKey ? previousRank : position;
    previousKey = key;
    previousRank = row.rank;
  });

  return {
    rows,
    baselineRows,
    columns: columnMetrics.map((m) => ({
      metricId: m.id,
      label: pick(m.label, locale),
      description: pick(m.description, locale),
    })),
    resolvedEvents: resolved.length,
    openEvents,
  };
}
