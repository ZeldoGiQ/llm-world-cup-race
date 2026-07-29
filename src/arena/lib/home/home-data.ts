/**
 * Datenschicht der Startseite – die einzige Quelle der Ansicht.
 *
 * `HomeView.astro` enthält bewusst keine Kategorie-ID, keine Metrik-ID, keine
 * Modell-ID und keine eigene Arithmetik. Alles, was auf der Seite steht, kommt
 * aus dieser Datei. Das hat zwei Gründe: Erweiterbarkeit (eine neue Kategorie
 * erscheint ohne Änderung an der Ansicht) und Prüfbarkeit (die Ehrlichkeits-
 * regeln sind hier testbar, in einer .astro-Datei wären sie es nicht).
 *
 * Alles läuft zur Bauzeit. Die Startseite trägt kein JavaScript.
 */
import modelsJson from '../../data/models.json';
import { categories, type CategoryDescriptor } from '../categories/index';
import { formatDate } from '../i18n/format';
import { pick, type Locale } from '../i18n/locales';
import { metrics, type Metric } from '../metrics/index';
import { predictionTypes } from '../prediction-types/index';
import { references, type ReferenceRule } from '../references/index';
import {
  bootstrapCategory,
  type CategoryUncertainty,
} from '../scoring/bootstrap';
import { computeOverall, type OverallCategoryInput, type OverallStandings } from '../scoring/overall';
import { computeStandings, MIN_COVERAGE, type Standings } from '../scoring/standings';
import type {
  ArenaEvent,
  ArenaModel,
  EventsFile,
  Prediction,
  PredictionsFile,
  Sample,
} from '../types';
import { classifyCategoryData, type DataSource, type IntegrityError, type ProvenanceFlag } from './provenance';

/*
 * Datendateien zur Bauzeit einsammeln.
 *
 * `import.meta.glob` statt eines dynamischen Pfad-Imports: Vite löst das
 * statisch auf, es gibt also keine zur Laufzeit fehlschlagenden Pfade. Fehlt
 * eine Datei, taucht sie hier gar nicht auf und die Kategorie gilt als „noch
 * keine Events" – eine unvollständige Kategorie reisst die Startseite nie mit.
 */
const EVENT_FILES = import.meta.glob<EventsFile>('../../../../public/arena-data/*/events.json', {
  eager: true,
  import: 'default',
});
const PREDICTION_FILES = import.meta.glob<PredictionsFile>(
  '../../../../public/arena-data/*/predictions.json',
  { eager: true, import: 'default' },
);

function fileFor<T>(map: Record<string, T>, categoryId: string, name: string): T | null {
  const suffix = `/${categoryId}/${name}`;
  for (const [path, value] of Object.entries(map)) {
    if (path.endsWith(suffix)) return value;
  }
  return null;
}

/** Zustand einer Kategorie, aus den Daten abgeleitet – nie handgepflegt. */
export type CategoryState =
  /** echte Daten und mindestens ein gewertetes Event */
  | 'scored'
  /** echte Events angelegt, aber noch kein Modell hat getippt */
  | 'armed'
  /** erste Tipps liegen, noch nichts aufgelöst */
  | 'awaiting'
  /** Beispieldaten – zählt in keine Zahl */
  | 'example';

export interface ReferenceLine {
  rule: ReferenceRule;
  label: string;
  note: string;
  retroactive: boolean;
  /** Wert der Ranking-Metrik für die Referenz, bereits formatiert */
  formatted: string;
  value: number | null;
}

export interface CategoryHome {
  id: string;
  descriptor: CategoryDescriptor;
  events: EventsFile | null;
  predictions: PredictionsFile | null;
  declaredDataSource: DataSource;
  dataSource: DataSource;
  flags: ProvenanceFlag[];
  integrityErrors: IntegrityError[];
  integrityCount: number;
  /** true = fliegt aus jeder Zahl der Seite (Regelbruch, nicht Beispieldaten) */
  blocked: boolean;
  standings: Standings | null;
  primaryMetric: Metric | undefined;
  reference: ReferenceLine | null;
  state: CategoryState;
  resolvedEvents: number;
  /** aufgelöste Events, für die mindestens ein Tipp vorliegt */
  scoredEvents: number;
  scoredPairs: number;
  openEvents: number;
  /** Events, die zum Bauzeitpunkt wirklich laufen (Status LIVE und Zeitpunkt erreicht) */
  liveNow: number;
  openPredictions: number;
  openSlots: number;
  nextLockAt: string | null;
  updatedAt: string | null;
  leader: { model: ArenaModel; formatted: string } | null;
}

/** Ein Eintrag der „Next Predictions"-Zeile ganz oben. */
export interface NextUpEntry {
  categoryId: string;
  categoryLabel: string;
  accent: string;
  title: string;
  utcDate: string;
  /** abgegebene Tipps der aktiven Modelle für dieses Event */
  filed: number;
  slots: number;
}

export interface HomeKpi {
  scoredEvents: number;
  predictions: number;
  modelsRanked: number;
  openEvents: number;
  openPredictions: number;
  openSlots: number;
  openCategories: number;
  nextLockAt: string | null;
}

export interface LeadTimeStats {
  count: number;
  medianMs: number;
  p10Ms: number;
  minMs: number;
  under24h: number;
  batches: number;
}

export interface VerifyCase {
  category: CategoryHome;
  event: ArenaEvent;
  model: ArenaModel;
  prediction: Prediction;
  outcome: { label: string; detail: string };
  leadMs: number;
}

export interface ProvenanceSummary {
  scoredPredictions: number;
  /** Vorhersagen, deren Zeitstempel durch einen älteren Commit belegt ist. */
  attested: number;
  leadTime: LeadTimeStats | null;
  release: { days: number; model: ArenaModel; firstEvent: string; excluded: number } | null;
  agreement: { identical: number; pairs: number } | null;
  verify: VerifyCase | null;
}

export interface HomeAnswer {
  variant: 'clear' | 'tied' | 'coldStart';
  leader?: { model: ArenaModel; formatted: string; probabilityFirst: number };
  runnerUp?: { model: ArenaModel; formatted: string; probabilityFirst: number; gap: string };
  category?: CategoryHome;
  metricLabel?: string;
}

export interface HomeData {
  /** Die nächsten sperrenden Events über alle echten Kategorien, max. 3. */
  nextUp: NextUpEntry[];
  categories: CategoryHome[];
  live: CategoryHome[];
  example: CategoryHome[];
  /** Kategorie mit der breitesten Beweislage – Held der Startseite */
  featured: CategoryHome | null;
  uncertainty: CategoryUncertainty | null;
  answer: HomeAnswer;
  kpi: HomeKpi;
  overall: OverallStandings;
  provenance: ProvenanceSummary;
  models: ArenaModel[];
  rankedModels: ArenaModel[];
  earlyAccessModels: ArenaModel[];
  baselineModels: ArenaModel[];
  updatedAt: string | null;
  builtAt: string;
  totalEvents: number;
}

const ALL_MODELS = modelsJson as ArenaModel[];

/** Offen = weder aufgelöst noch ungültig; auf diese Events kann noch getippt werden. */
function isOpen(event: ArenaEvent): boolean {
  return event.status !== 'RESOLVED' && event.status !== 'VOID';
}

/**
 * Läuft das Ereignis wirklich gerade?
 *
 * Der Status allein genügt nicht: In den Beispieldaten stehen Events mit Status
 * LIVE und einem Zeitpunkt in der Zukunft. Ohne diese Prüfung würde die Seite
 * behaupten, gerade liefe etwas.
 */
function isLiveNow(event: ArenaEvent, nowMs: number): boolean {
  return event.status === 'LIVE' && Date.parse(event.utcDate) <= nowMs;
}

/** Aufgelöste Events mit typvalidem Ergebnis. */
function resolvedEventsOf(events: ArenaEvent[]): ArenaEvent[] {
  return events.filter((event) => {
    if (event.status !== 'RESOLVED' || event.resolution === null) return false;
    const handler = predictionTypes.find(event.predictionType);
    return handler ? handler.validateResolution(event.resolution) : false;
  });
}

function validPrediction(event: ArenaEvent, prediction: Prediction | undefined): boolean {
  if (!prediction) return false;
  const handler = predictionTypes.find(event.predictionType);
  return handler ? handler.validate(prediction.value) : false;
}

/**
 * Stichproben über die gemeinsame Event-Menge.
 *
 * Der gepaarte Bootstrap verlangt für alle Modelle dieselben Events in
 * derselben Reihenfolge – sonst wäre eine Ziehung nicht auf alle anwendbar und
 * der Vergleich stillschweigend falsch.
 */
function commonSamples(
  modelIds: string[],
  resolved: ArenaEvent[],
  predictions: PredictionsFile['predictions'],
): { events: ArenaEvent[]; byModel: Map<string, Sample[]> } {
  const events = resolved.filter((event) =>
    modelIds.every((modelId) => validPrediction(event, predictions[event.id]?.[modelId])),
  );
  const byModel = new Map<string, Sample[]>();
  for (const modelId of modelIds) {
    byModel.set(
      modelId,
      events.map((event) => ({
        prediction: predictions[event.id]![modelId]!.value,
        resolution: event.resolution!,
      })),
    );
  }
  return { events, byModel };
}

function referenceSamples(rule: ReferenceRule, events: ArenaEvent[]): Sample[] | null {
  const samples: Sample[] = [];
  for (const event of events) {
    if (!rule.appliesTo.includes(event.predictionType)) return null;
    const prediction = rule.predict(event);
    if (prediction === null) return null;
    samples.push({ prediction, resolution: event.resolution! });
  }
  return samples;
}

/**
 * Unsicherheit einer Kategorie – in Score-Einheiten, wo eine Referenz existiert.
 *
 * Der Bootstrap läuft bevorzugt über die Prediction-Score-Metrik, damit
 * Intervalle und Whisker in derselben Einheit stehen wie die Hero-Zahl. Ohne
 * Referenz (kein Quotient bildbar) fällt er auf die Ranking-Metrik der
 * Kategorie zurück – die Rangaussagen (P(#1), Intervalle) sind in beiden
 * Fällen identisch, weil Score und Verlust dieselbe Ordnung tragen.
 *
 * Exportiert, weil auch der Share-Karten-Endpunkt sie je Kategorie braucht.
 */
export function uncertaintyFor(entry: CategoryHome): CategoryUncertainty | null {
  if (!entry.standings || !entry.events || !entry.predictions) return null;
  const contenders = entry.standings.rows
    .filter((row) => row.scored > 0 && !row.isBaseline)
    .map((row) => row.model.id);
  if (contenders.length < 2) return null;

  const resolved = resolvedEventsOf(entry.events.events ?? []);
  const predictionMap = entry.predictions.predictions ?? {};
  const { events: commonEvents, byModel } = commonSamples(contenders, resolved, predictionMap);
  if (commonEvents.length === 0) return null;

  // Referenz-Stichprobe über die gemeinsame Event-Menge: aus der Regel oder
  // aus den Tipps des Referenz-Teilnehmers.
  let baseline: Sample[] | undefined;
  if (entry.reference) {
    baseline = referenceSamples(entry.reference.rule, commonEvents) ?? undefined;
  } else if (entry.descriptor.baselineModelId) {
    const samples: Sample[] = [];
    for (const event of commonEvents) {
      const prediction = predictionMap[event.id]?.[entry.descriptor.baselineModelId];
      if (!validPrediction(event, prediction)) break;
      samples.push({ prediction: prediction!.value, resolution: event.resolution! });
    }
    if (samples.length === commonEvents.length) baseline = samples;
  }

  const scoreMetric = metrics.find('prediction-score');
  const useScore = Boolean(baseline && baseline.length === commonEvents.length && scoreMetric);

  return bootstrapCategory({
    samplesByModel: byModel,
    metric: useScore ? scoreMetric! : (entry.primaryMetric ?? scoreMetric!),
    baselineSamples: useScore ? baseline : undefined,
  });
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return Number.NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index]!;
}

/* ------------------------------------------------------------------ */
/* Aufbau                                                              */
/* ------------------------------------------------------------------ */

export function loadHomeData(locale: Locale, now: Date = new Date()): HomeData {
  const nowMs = now.getTime();
  const rankedModels = ALL_MODELS.filter(
    (model) => model.baseline !== true && model.access !== 'early-access',
  );
  const earlyAccessModels = ALL_MODELS.filter((model) => model.access === 'early-access');
  const baselineModels = ALL_MODELS.filter((model) => model.baseline === true);

  /*
   * Aktive Teilnehmer aus den DATEN ableiten, nicht aus der Modellliste:
   * models.json führt auch stillgelegte Zeilen (Historie bleibt für immer),
   * aber „7 von 10 abgegeben" wäre eine Lüge, wenn drei der zehn gar nicht
   * mehr antreten. Aktiv ist, wer auf OFFENE Events tippt – die Historie in
   * abgeschlossenen Runden zählt hier nicht, sonst gälten die WM-Veteranen
   * für immer als aktiv. Solange noch niemand getippt hat (Kaltstart), gilt
   * die volle Liste als Schätzung.
   */
  const activeIds = new Set<string>();
  for (const descriptor of categories.list()) {
    if (descriptor.dataSource !== 'live') continue;
    const eventFile = fileFor(EVENT_FILES, descriptor.id, 'events.json');
    const predictionFile = fileFor(PREDICTION_FILES, descriptor.id, 'predictions.json');
    for (const event of (eventFile?.events ?? []).filter(isOpen)) {
      for (const modelId of Object.keys(predictionFile?.predictions?.[event.id] ?? {})) {
        if (rankedModels.some((model) => model.id === modelId)) activeIds.add(modelId);
      }
    }
  }
  const activeCount = activeIds.size > 0 ? activeIds.size : rankedModels.length;
  const isActive = (modelId: string) => (activeIds.size > 0 ? activeIds.has(modelId) : true);

  const list: CategoryHome[] = [];

  for (const descriptor of categories.list()) {
    const events = fileFor(EVENT_FILES, descriptor.id, 'events.json');
    const predictions = fileFor(PREDICTION_FILES, descriptor.id, 'predictions.json');
    const provenance = classifyCategoryData(descriptor.dataSource, events, predictions, undefined);

    const eventList = events?.events ?? [];
    const predictionMap = predictions?.predictions ?? {};
    const resolved = resolvedEventsOf(eventList);
    const open = eventList.filter(isOpen);
    const liveNow = eventList.filter((event) => isLiveNow(event, nowMs)).length;

    let scoredPairs = 0;
    const scoredEventIds = new Set<string>();
    for (const event of resolved) {
      for (const model of ALL_MODELS) {
        if (validPrediction(event, predictionMap[event.id]?.[model.id])) {
          scoredPairs += 1;
          scoredEventIds.add(event.id);
        }
      }
    }

    let openPredictions = 0;
    for (const event of open) {
      for (const model of rankedModels) {
        if (predictionMap[event.id]?.[model.id]) openPredictions += 1;
      }
    }

    const nextLock =
      open.length > 0
        ? open
            .map((event) => event.utcDate)
            // Numerisch vergleichen: Die Dateien mischen "…Z" und "…+00:00",
            // ein Textvergleich wählt dann das falsche Event.
            .sort((a, b) => Date.parse(a) - Date.parse(b))[0]!
        : null;

    const standings =
      events && predictions
        ? computeStandings(ALL_MODELS, events, predictions, descriptor, locale)
        : null;
    const primaryMetric = metrics.find(descriptor.primaryMetric);

    // Referenzzeile aus einer Referenzregel (nicht aus einem Baseline-Modell).
    let reference: ReferenceLine | null = null;
    const rule = descriptor.referenceRuleId ? references.find(descriptor.referenceRuleId) : undefined;
    if (rule && primaryMetric && resolved.length > 0) {
      const samples = referenceSamples(rule, resolved);
      const computed = samples ? primaryMetric.compute(samples, {}) : null;
      reference = {
        rule,
        label: pick(rule.label, locale),
        note: pick(rule.note, locale),
        retroactive: rule.retroactive === true,
        formatted: computed ? primaryMetric.format(computed, locale) : '—',
        value: computed?.value ?? null,
      };
    }

    const blocked = provenance.integrityCount > 0;
    const state: CategoryState =
      provenance.dataSource === 'example'
        ? 'example'
        : scoredEventIds.size > 0
          ? 'scored'
          : openPredictions > 0
            ? 'awaiting'
            : 'armed';

    const leaderRow = standings?.rows.find((row) => row.rank === 1);
    // Kachel-Anzeige in der Leitwährung, wenn die Kategorie einen Score trägt.
    const leaderCell =
      leaderRow?.cells.find(
        (cell) => cell.metricId === 'prediction-score' && cell.value !== null,
      ) ?? leaderRow?.cells.find((cell) => cell.metricId === descriptor.primaryMetric);

    list.push({
      id: descriptor.id,
      descriptor,
      events,
      predictions,
      declaredDataSource: descriptor.dataSource,
      dataSource: provenance.dataSource,
      flags: provenance.flags,
      integrityErrors: provenance.integrityErrors,
      integrityCount: provenance.integrityCount,
      blocked,
      standings,
      primaryMetric,
      reference,
      state,
      resolvedEvents: resolved.length,
      scoredEvents: scoredEventIds.size,
      scoredPairs,
      openEvents: open.length,
      liveNow,
      openPredictions,
      openSlots: open.length * activeCount,
      nextLockAt: nextLock,
      updatedAt: events?.updatedAt ?? null,
      leader:
        leaderRow && leaderCell ? { model: leaderRow.model, formatted: leaderCell.formatted } : null,
    });
  }

  // Beispieldaten und blockierte Kategorien zählen in keine Zahl der Seite.
  const live = list.filter((entry) => entry.dataSource === 'live' && !entry.blocked);
  const example = list.filter((entry) => entry.dataSource === 'example' || entry.blocked);

  /* --- Held: Kategorie mit den meisten gewerteten Paaren --- */
  const featured =
    [...live]
      .filter((entry) => entry.scoredPairs > 0)
      .sort(
        (a, b) =>
          b.scoredPairs - a.scoredPairs ||
          Date.parse(b.updatedAt ?? '0') - Date.parse(a.updatedAt ?? '0') ||
          a.id.localeCompare(b.id),
      )[0] ?? null;

  /* --- Unsicherheit der Heldenkategorie --- */
  const uncertainty: CategoryUncertainty | null = featured ? uncertaintyFor(featured) : null;

  /* --- Antwortzeile: spricht in der Leitwährung, dem Prediction Score --- */
  let answer: HomeAnswer = { variant: 'coldStart' };
  if (featured?.standings && featured.primaryMetric) {
    const ranked = featured.standings.rows.filter((row) => row.rank > 0);
    const first = ranked[0];
    const second = ranked[1];
    const scoreMetric = metrics.find('prediction-score');
    // Score-Zelle bevorzugen; ohne Referenz fällt die Zeile auf die
    // Ranking-Metrik der Kategorie zurück.
    const heroCellOf = (row: typeof first) =>
      row?.cells.find((cell) => cell.metricId === 'prediction-score' && cell.value !== null) ??
      row?.cells.find((cell) => cell.metricId === featured.descriptor.primaryMetric);
    const firstCell = heroCellOf(first);
    const usesScore = firstCell?.metricId === 'prediction-score' && scoreMetric !== undefined;
    const heroMetric = usesScore ? scoreMetric! : featured.primaryMetric;
    const pFirst = first ? (uncertainty?.probabilityFirst[first.model.id] ?? 0) : 0;

    if (first && second) {
      const secondCell = heroCellOf(second);
      const gapValue =
        firstCell?.value != null && secondCell?.value != null
          ? Math.abs(firstCell.value.value - secondCell.value.value)
          : null;
      answer = {
        // Eine Medaille erst, wenn das führende Modell in mindestens 90 % der
        // Ziehungen vorn liegt. Alles darunter ist eine Führung, kein Sieg.
        variant: pFirst >= 0.9 ? 'clear' : 'tied',
        category: featured,
        metricLabel: pick(heroMetric.label, locale),
        leader: {
          model: first.model,
          formatted: firstCell?.formatted ?? '—',
          probabilityFirst: pFirst,
        },
        runnerUp: {
          model: second.model,
          formatted: secondCell?.formatted ?? '—',
          probabilityFirst: uncertainty?.probabilityFirst[second.model.id] ?? 0,
          gap: gapValue === null ? '—' : heroMetric.format({ value: gapValue, n: 0 }, locale),
        },
      };
    }
  }

  /* --- Kennzahlen (ausschliesslich echte Daten) --- */
  const rankedIds = new Set<string>();
  for (const entry of live) {
    for (const row of entry.standings?.rows ?? []) {
      if (row.rank > 0) rankedIds.add(row.model.id);
    }
  }
  const openCategories = live.filter((entry) => entry.openEvents > 0);
  const kpi: HomeKpi = {
    scoredEvents: live.reduce((sum, entry) => sum + entry.scoredEvents, 0),
    predictions: live.reduce((sum, entry) => sum + entry.scoredPairs, 0),
    modelsRanked: rankedIds.size,
    openEvents: live.reduce((sum, entry) => sum + entry.openEvents, 0),
    openPredictions: live.reduce((sum, entry) => sum + entry.openPredictions, 0),
    openSlots: live.reduce((sum, entry) => sum + entry.openSlots, 0),
    openCategories: openCategories.length,
    nextLockAt:
      openCategories
        .map((entry) => entry.nextLockAt)
        .filter((value): value is string => value !== null)
        .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null,
  };

  /* --- Gesamtwertung --- */
  const overallInputs: OverallCategoryInput[] = list.map((entry) => ({
    descriptor: entry.descriptor,
    events: entry.events,
    predictions: entry.predictions,
    dataSource: entry.dataSource,
    integrityErrors: entry.integrityCount,
    reference: entry.reference?.rule,
  }));
  const overall: OverallStandings = computeOverall(ALL_MODELS, overallInputs);

  /* --- Belege --- */
  const provenance = buildProvenance(live, rankedModels, locale, nowMs);

  const updatedAt =
    list
      .map((entry) => entry.updatedAt)
      .filter((value): value is string => value !== null)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

  /* --- „Next Predictions": die nächsten sperrenden Events, kategorieübergreifend --- */
  const nextUp: NextUpEntry[] = live
    .flatMap((entry) =>
      (entry.events?.events ?? [])
        .filter((event) => isOpen(event) && Date.parse(event.utcDate) > nowMs)
        .map((event) => {
          const byModel = entry.predictions?.predictions?.[event.id] ?? {};
          const filed = rankedModels.filter(
            (model) => isActive(model.id) && validPrediction(event, byModel[model.id]),
          ).length;
          return {
            categoryId: entry.id,
            categoryLabel: pick(entry.descriptor.label, locale),
            accent: entry.descriptor.accent,
            title: event.titles?.[locale] ?? event.titles?.en ?? event.title,
            utcDate: event.utcDate,
            filed,
            slots: activeCount,
          };
        }),
    )
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .slice(0, 3);

  return {
    nextUp,
    categories: list,
    live,
    example,
    featured,
    uncertainty,
    answer,
    kpi,
    overall,
    provenance,
    models: ALL_MODELS,
    rankedModels,
    earlyAccessModels,
    baselineModels,
    updatedAt,
    builtAt: now.toISOString(),
    totalEvents: list.reduce((sum, entry) => sum + (entry.events?.events?.length ?? 0), 0),
  };
}

/**
 * Prüfbare Belege statt Behauptungen.
 *
 * Die Vorlaufzeit-Verteilung, der Abstand zwischen Modellveröffentlichung und
 * erstem Ereignis und ein einzelner nachrechenbarer Fall – alles aus den
 * vorhandenen Zeitstempeln, nichts hinzuerfunden. `attested` bleibt bei 0,
 * solange kein Commit-Nachweis vorliegt; das ist heute unangenehm und in
 * einigen Wochen die stärkste Zahl der Seite.
 */
function buildProvenance(
  live: CategoryHome[],
  rankedModels: ArenaModel[],
  locale: Locale,
  nowMs: number,
): ProvenanceSummary {
  const leadTimes: number[] = [];
  const timestamps = new Set<string>();
  let scoredPredictions = 0;
  let best: VerifyCase | null = null;
  let firstEventMs = Number.POSITIVE_INFINITY;
  let firstEventIso: string | null = null;

  for (const entry of live) {
    const resolved = resolvedEventsOf(entry.events?.events ?? []);
    const predictionMap = entry.predictions?.predictions ?? {};
    for (const event of resolved) {
      const eventMs = Date.parse(event.utcDate);
      if (Number.isFinite(eventMs) && eventMs < firstEventMs) {
        firstEventMs = eventMs;
        firstEventIso = event.utcDate;
      }
      for (const model of rankedModels) {
        const prediction = predictionMap[event.id]?.[model.id];
        if (!validPrediction(event, prediction)) continue;
        scoredPredictions += 1;
        const createdMs = prediction!.createdAt ? Date.parse(prediction!.createdAt) : Number.NaN;
        if (!Number.isFinite(createdMs)) continue;
        timestamps.add(prediction!.createdAt);
        const lead = eventMs - createdMs;
        if (lead <= 0) continue;
        leadTimes.push(lead);

        // Prüf-Beleg: der Fall mit der grössten Vorlaufzeit ist der am besten
        // belegte – da ist am wenigsten Raum für den Verdacht, nachträglich
        // getippt worden zu sein.
        if (!best || lead > best.leadMs) {
          const handler = predictionTypes.find(event.predictionType);
          const outcome = handler?.describeOutcome(prediction!.value, event.resolution!, locale);
          if (outcome) {
            best = {
              category: entry,
              event,
              model,
              prediction: prediction!,
              outcome: { label: outcome.label, detail: outcome.detail },
              leadMs: lead,
            };
          }
        }
      }
    }
  }

  const sorted = [...leadTimes].sort((a, b) => a - b);
  const leadTime: LeadTimeStats | null =
    sorted.length > 0
      ? {
          count: sorted.length,
          medianMs: median(sorted),
          p10Ms: percentile(sorted, 0.1),
          minMs: sorted[0]!,
          under24h: sorted.filter((value) => value < 86_400_000).length,
          batches: timestamps.size,
        }
      : null;

  /* --- Abstand Modellveröffentlichung zum ersten gewerteten Ereignis --- */
  let release: ProvenanceSummary['release'] = null;
  if (firstEventIso !== null) {
    const withDate = rankedModels.filter((model) => Boolean(model.releaseDate));
    const excluded = rankedModels.length - withDate.length;
    const newest = withDate
      .slice()
      .sort((a, b) => Date.parse(b.releaseDate!) - Date.parse(a.releaseDate!))[0];
    if (newest) {
      const gapMs = firstEventMs - Date.parse(newest.releaseDate!);
      release = {
        // Abwärts runden: 20,79 Tage sind 20 volle Tage, nicht 21.
        days: Math.floor(gapMs / 86_400_000),
        model: newest,
        firstEvent: firstEventIso,
        excluded,
      };
    }
  }

  /* --- Übereinstimmung: wie unabhängig sind die Teilnehmer wirklich? --- */
  let agreement: ProvenanceSummary['agreement'] = null;
  const featured = [...live].sort((a, b) => b.scoredPairs - a.scoredPairs)[0];
  if (featured?.events && featured.predictions) {
    const resolved = resolvedEventsOf(featured.events.events ?? []);
    const predictionMap = featured.predictions.predictions ?? {};
    const handlerFormat = (event: ArenaEvent, prediction: Prediction) =>
      predictionTypes.find(event.predictionType)?.formatValue(prediction.value, locale) ?? '';
    let identical = 0;
    let pairs = 0;
    for (const event of resolved) {
      const entries = rankedModels
        .map((model) => predictionMap[event.id]?.[model.id])
        .filter((prediction): prediction is Prediction => validPrediction(event, prediction));
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          pairs += 1;
          if (handlerFormat(event, entries[i]!) === handlerFormat(event, entries[j]!)) identical += 1;
        }
      }
    }
    if (pairs > 0) agreement = { identical, pairs };
  }

  return {
    scoredPredictions,
    // Kein Commit-Nachweis vorhanden: bewusst 0 statt einer geschätzten Zahl.
    attested: 0,
    leadTime,
    release,
    agreement,
    verify: best,
  };
}

/* ------------------------------------------------------------------ */
/* Darstellungshelfer (bleiben hier, damit die Ansicht rechenfrei ist) */
/* ------------------------------------------------------------------ */

/** Dauer grob, aber ehrlich: „25 days", „23 h", „20 min". */
export function formatDuration(ms: number, locale: Locale): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = ms / 3_600_000;
  if (hours < 48) return `${Math.round(hours)} h`;
  const days = ms / 86_400_000;
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale === 'de' ? 'de-DE' : 'es-ES', {
    maximumFractionDigits: 1,
  }).format(days)} d`;
}

/** Zeitpunkt immer absolut und in UTC – ein statischer Build darf nie „in 3 h" behaupten. */
export function formatUtc(iso: string, locale: Locale): string {
  return `${formatDate(iso, locale)}, ${new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : locale === 'de' ? 'de-DE' : 'es-ES',
    { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false },
  ).format(new Date(iso))}`;
}

/**
 * Leichtgewichtige Zählung echter und Beispiel-Kategorien.
 *
 * Für den Hinweis in der Fußzeile, die auf JEDER Seite steht – dort wäre
 * `loadHomeData()` mit Standings und Bootstrap maßlos übertrieben. Klassifiziert
 * wird trotzdem richtig, nicht nur die Deklaration gelesen.
 */
export function countCategoryDataSources(): { live: number; example: number; total: number } {
  let live = 0;
  let example = 0;
  for (const descriptor of categories.list()) {
    const events = fileFor(EVENT_FILES, descriptor.id, 'events.json');
    const predictions = fileFor(PREDICTION_FILES, descriptor.id, 'predictions.json');
    const result = classifyCategoryData(descriptor.dataSource, events, predictions);
    if (result.dataSource === 'live' && result.integrityCount === 0) live += 1;
    else example += 1;
  }
  return { live, example, total: live + example };
}

/** Nur für Tests. */
export const __internals = { commonSamples, resolvedEventsOf, median, percentile, isLiveNow, MIN_COVERAGE };
