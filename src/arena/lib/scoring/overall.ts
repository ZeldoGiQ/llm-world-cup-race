/**
 * Kategorienübergreifende Wertung – die Zahl, die ein Labor zitieren könnte.
 *
 * ## Warum nicht einfach Punkte addieren
 *
 * Die Kategorien messen in verschiedenen Einheiten: Kicktipp-Punkte (bis 416 in
 * der WM), MAPE in Prozent, Brier in [0,1]. Eine Summe daraus ist dimensionslos
 * falsch und wächst mit der Kategoriegrösse – wer in der grössten Kategorie
 * mitspielt, gewinnt. Ein Borda-Score wäre bei vollem Feld nur eine
 * Umrechnung des normalisierten Rangs, verletzt aber die Unabhängigkeit: ein
 * hinzukommendes siebtes Modell könnte die Reihenfolge der anderen sechs
 * umdrehen. Beides ist verworfen.
 *
 * ## Was stattdessen gerechnet wird
 *
 * Zwei Zahlen, beide veröffentlicht, weil sie verschiedene Fragen beantworten:
 *
 * 1. **Skill (geometrisch)** trägt die Effektstärke:
 *
 *        ratio_c = clamp(Verlust_Modell,c / Verlust_Referenz,c, 0.05, 4)
 *        skill   = 1 − exp(mean_c(ln ratio_c))
 *
 *    Geometrisches Mittel der Verlust-Quotienten, nicht arithmetisches Mittel
 *    der Skills: Das ist die Standard-Aggregation für Verhältniszahlen,
 *    skalenfrei und robuster gegen Ausreisser. Ein einzelner katastrophaler
 *    Krypto-Tipp kann den Mittelwert nicht dauerhaft dominieren. Sind Modell
 *    und Referenz überall gleich gut, ist das Ergebnis exakt 0 – die Referenz
 *    bleibt die Nulllinie.
 *
 * 2. **Mittlerer normalisierter Rang** trägt die Ordnung:
 *
 *        mean_c((rang_c − 1) / (N_c − 1))     0 = immer Erster
 *
 *    Benutzt nur die Reihenfolge innerhalb einer Kategorie und ist deshalb die
 *    einzige Grösse, die bei unterschiedlichen Metriken je Kategorie garantiert
 *    nicht bricht. Preis: die Effektstärke wird vollständig verworfen.
 *
 * Widersprechen sich die beiden Zahlen, ist das Information und gehört gezeigt.
 *
 * ## Der Angriffspunkt, offen benannt
 *
 * Innerhalb einer Kategorie kann die Wahl der Referenz die Reihenfolge nicht
 * verändern – alle Modelle werden durch denselben Referenzverlust geteilt.
 * ZWISCHEN Kategorien verschiebt sie aber das Gewicht: Eine schwache Referenz
 * lässt alle Modelle dort gut aussehen und wertet die Kategorie auf. Genau
 * deshalb steht der rangbasierte Wert daneben und nicht anstelle.
 *
 * ## Gewichtung
 *
 * Gleiches Gewicht je Kategorie, nicht nach Eventzahl. Das ist eine
 * Wertentscheidung, keine Statistik: 20 Krypto-Tage zählen so viel wie 104
 * WM-Spiele. Varianzgewichtung wäre der effizientere Schätzer, würde praktisch
 * aber auf „die grösste Kategorie entscheidet" zusammenfallen und dem Wort
 * „kategorienübergreifend" widersprechen. Die Pro-Kategorie-Werte werden
 * mitgeliefert, damit ein Labor selbst umgewichten kann.
 */
import type { CategoryDescriptor } from '../categories/index';
import { metrics } from '../metrics/index';
import { sampleLoss } from '../metrics/skill';
import { predictionTypes } from '../prediction-types/index';
import type { ReferenceRule } from '../references/index';
import type { ArenaEvent, ArenaModel, EventsFile, PredictionsFile, Sample } from '../types';

/** Untergrenze für die Zahl qualifizierter Kategorien. Unter 2 ist „kategorienübergreifend" ein leeres Wort. */
export const REQUIRED_CATEGORIES = 2;
/** Ab hier ist eine Kategorie messbar – nicht: ab hier steht die Reihenfolge fest (dafür braucht es 50+). */
export const MIN_RESOLVED = 20;
/** Anteil der gemeinsamen Events, den ein Modell getippt haben muss. */
export const MIN_MODEL_COVERAGE = 0.8;
/** Mindestzahl echter Teilnehmer (ohne Referenzen, ohne Vorab-Zugänge). */
export const MIN_MODELS = 3;
/**
 * Klemmgrenzen des Verlust-Quotienten.
 *
 * Nötig, weil der Verlust für `numeric` unbeschränkt ist: ein Modell, das den
 * Bitcoin-Kurs um eine Million daneben schätzt, würde sonst jede Aggregation
 * für immer dominieren. Jede geklemmte Zelle wird sichtbar markiert – die
 * Klemme darf nicht stillschweigend tragen.
 *
 * Falls das im Betrieb wirklich häufig feuert, ist die dokumentierte Eskalation:
 * numerische Kategorien aus der Skill-Aggregation nehmen (sie bleiben im
 * mittleren Rang), bis ein beschränkter Verlust definiert ist.
 */
export const RATIO_CLAMP: [number, number] = [0.05, 4];

export type QualificationFailure =
  | 'example-data'
  | 'integrity'
  | 'too-few-resolved'
  | 'no-predictions'
  | 'no-reference'
  | 'too-few-models';

export interface CategoryQualification {
  categoryId: string;
  qualified: boolean;
  reason: QualificationFailure | null;
  resolvedEvents: number;
  commonEvents: number;
  scoredModels: number;
  /** true = die Referenzregel wurde erst nachträglich festgeschrieben */
  retroactiveReference: boolean;
  integrityErrors: number;
}

export interface OverallCell {
  categoryId: string;
  /** Verlust-Quotient nach der Klemmung */
  ratio: number;
  clamped: boolean;
  rank: number;
  /** (rang − 1) / (N − 1); null wenn die Kategorie nur einen Rangplatz hat */
  normalizedRank: number | null;
  retroactiveReference: boolean;
}

export interface OverallRow {
  model: ArenaModel;
  rank: number;
  /** 1 − geometrisches Mittel der Verlust-Quotienten */
  overallSkill: number | null;
  /** Prediction Score (SCORE_V1): overallSkill × 100 – die Leitzahl der Seite */
  predictionScore: number | null;
  meanNormalizedRank: number | null;
  categoriesCounted: number;
  /** true = nicht in allen qualifizierten Kategorien angetreten -> kein Rang */
  provisional: boolean;
  cells: OverallCell[];
}

export interface OverallStandings {
  status: 'ready' | 'insufficient';
  rows: OverallRow[];
  /** Vorab-Zugänge: eigene Sektion, nie mit Rang */
  earlyAccessRows: OverallRow[];
  qualifications: CategoryQualification[];
  qualifiedCount: number;
  totalCategories: number;
  requiredCategories: number;
  clampedCells: number;
  /** Pro-Kategorie-Bezugswerte, damit Dritte selbst umgewichten können */
  perCategory: Array<{ categoryId: string; referenceLoss: number; commonEvents: number }>;
}

export interface OverallCategoryInput {
  descriptor: CategoryDescriptor;
  events: EventsFile | null;
  predictions: PredictionsFile | null;
  /** Ergebnis von classifyCategoryData() – nicht die Deklaration allein. */
  dataSource: 'live' | 'example';
  integrityErrors: number;
  /** Referenzregel, falls die Kategorie über sie statt über ein Baseline-Modell messt */
  reference?: ReferenceRule;
}

/** Wertbare Events: aufgelöst mit typvalidem Ergebnis. */
function resolvedEventsOf(events: ArenaEvent[]): ArenaEvent[] {
  return events.filter((event) => {
    if (event.status !== 'RESOLVED' || event.resolution === null) return false;
    const handler = predictionTypes.find(event.predictionType);
    return handler ? handler.validateResolution(event.resolution) : false;
  });
}

/** Verlust eines Modells über eine feste Event-Liste; null wenn ein Event fehlt. */
function lossesOver(
  modelId: string,
  events: ArenaEvent[],
  predictions: PredictionsFile['predictions'],
): number[] | null {
  const losses: number[] = [];
  for (const event of events) {
    const prediction = predictions[event.id]?.[modelId];
    if (!prediction) return null;
    const handler = predictionTypes.find(event.predictionType);
    if (!handler || !handler.validate(prediction.value)) return null;
    const loss = sampleLoss({ prediction: prediction.value, resolution: event.resolution! });
    if (loss === null) return null;
    losses.push(loss);
  }
  return losses;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Verlust der Referenzregel über eine Event-Liste. */
function referenceLosses(rule: ReferenceRule, events: ArenaEvent[]): number[] | null {
  const losses: number[] = [];
  for (const event of events) {
    if (!rule.appliesTo.includes(event.predictionType)) return null;
    const prediction = rule.predict(event);
    if (prediction === null) return null;
    const loss = sampleLoss({ prediction, resolution: event.resolution! });
    if (loss === null) return null;
    losses.push(loss);
  }
  return losses;
}

/**
 * Events, die ALLE gewerteten Teilnehmer getippt haben.
 *
 * Für eine Einzelkategorie genügt MIN_COVERAGE (halbe Abdeckung); für ein
 * Aggregat nicht: dort würden zwei Modelle über verschiedene Event-Hälften
 * verglichen, und die Zahl wäre wertlos. Hier wird deshalb streng über die
 * Schnittmenge gerechnet.
 */
function commonEventsOf(
  modelIds: string[],
  resolved: ArenaEvent[],
  predictions: PredictionsFile['predictions'],
): ArenaEvent[] {
  return resolved.filter((event) =>
    modelIds.every((modelId) => {
      const prediction = predictions[event.id]?.[modelId];
      if (!prediction) return false;
      const handler = predictionTypes.find(event.predictionType);
      return handler ? handler.validate(prediction.value) : false;
    }),
  );
}

export function computeOverall(
  models: ArenaModel[],
  inputs: OverallCategoryInput[],
): OverallStandings {
  const contenders = models.filter((model) => model.baseline !== true);
  const ranked = contenders.filter((model) => model.access !== 'early-access');
  const earlyAccess = contenders.filter((model) => model.access === 'early-access');

  const qualifications: CategoryQualification[] = [];
  const perCategory: OverallStandings['perCategory'] = [];
  /** categoryId -> modelId -> Zelle */
  const cellsByCategory = new Map<string, Map<string, OverallCell>>();

  for (const input of inputs) {
    const { descriptor, events, predictions, dataSource, integrityErrors } = input;
    const eventList = events?.events ?? [];
    const predictionMap = predictions?.predictions ?? {};
    const resolved = resolvedEventsOf(eventList);
    const retroactiveReference = input.reference?.retroactive === true;

    const fail = (reason: QualificationFailure, commonEvents = 0, scoredModels = 0) => {
      qualifications.push({
        categoryId: descriptor.id,
        qualified: false,
        reason,
        resolvedEvents: resolved.length,
        commonEvents,
        scoredModels,
        retroactiveReference,
        integrityErrors,
      });
    };

    if (dataSource === 'example') {
      fail('example-data');
      continue;
    }
    if (integrityErrors > 0) {
      fail('integrity');
      continue;
    }
    if (resolved.length < MIN_RESOLVED) {
      // Deckt auch den Fall „echte Events, aber noch keine Auflösung" ab; die
      // klarere Begründung dafür setzt der Aufrufer über die Kachel-Zustände.
      fail(resolved.length === 0 ? 'no-predictions' : 'too-few-resolved');
      continue;
    }

    // Teilnehmer, die überhaupt etwas Wertbares beigetragen haben.
    const participating = ranked.filter((model) =>
      resolved.some((event) => predictionMap[event.id]?.[model.id]),
    );
    if (participating.length < MIN_MODELS) {
      fail(participating.length === 0 ? 'no-predictions' : 'too-few-models', 0, participating.length);
      continue;
    }

    const common = commonEventsOf(
      participating.map((model) => model.id),
      resolved,
      predictionMap,
    );
    const required = Math.ceil(resolved.length * MIN_MODEL_COVERAGE);
    if (common.length < required) {
      fail('too-few-models', common.length, participating.length);
      continue;
    }

    // Bezugslinie: entweder ein Referenz-Teilnehmer mit eigenen Tipps oder eine
    // Referenzregel. Ohne eine von beiden ist kein Quotient bildbar.
    let refLosses: number[] | null = null;
    if (input.reference) {
      refLosses = referenceLosses(input.reference, common);
    } else if (descriptor.baselineModelId) {
      refLosses = lossesOver(descriptor.baselineModelId, common, predictionMap);
    }
    if (refLosses === null || refLosses.length === 0) {
      fail('no-reference', common.length, participating.length);
      continue;
    }
    const referenceLoss = mean(refLosses);
    // Eine perfekte Referenz macht jeden Quotienten unendlich – dann ist die
    // Kategorie nicht aggregierbar. Toleranz statt exakter Null, weil
    // Fliesskomma-Rundung sonst Infinity durchlässt.
    if (!(referenceLoss > 1e-12)) {
      fail('no-reference', common.length, participating.length);
      continue;
    }

    /*
     * Rangordnung innerhalb der Kategorie über den VERLUST, nicht über die
     * Anzeigemetrik. Der Verlust ist per Definition „kleiner ist besser" –
     * damit kann eine Kategorie mit `betterDirection: 'lower'` (etwa MAE) hier
     * nicht stillschweigend kippen. Genau daran scheitert eine naive
     * Implementierung, die die Metrikwerte sortiert.
     */
    const lossByModel = new Map<string, number>();
    for (const model of participating) {
      const losses = lossesOver(model.id, common, predictionMap);
      if (losses === null) continue;
      lossByModel.set(model.id, mean(losses));
    }

    const ordered = [...lossByModel.entries()].sort((a, b) => a[1] - b[1]);
    const rankByModel = new Map<string, number>();
    let previousLoss = Number.NaN;
    let previousRank = 0;
    ordered.forEach(([modelId, loss], index) => {
      const rank = loss === previousLoss ? previousRank : index + 1;
      rankByModel.set(modelId, rank);
      previousLoss = loss;
      previousRank = rank;
    });

    const cells = new Map<string, OverallCell>();
    const rankCount = ordered.length;
    for (const [modelId, loss] of lossByModel) {
      const rawRatio = loss / referenceLoss;
      const ratio = Math.min(Math.max(rawRatio, RATIO_CLAMP[0]), RATIO_CLAMP[1]);
      const rank = rankByModel.get(modelId)!;
      cells.set(modelId, {
        categoryId: descriptor.id,
        ratio,
        clamped: ratio !== rawRatio,
        rank,
        normalizedRank: rankCount > 1 ? (rank - 1) / (rankCount - 1) : null,
        retroactiveReference,
      });
    }

    // Vorab-Zugänge bekommen Zellen (für die eigene Sektion), zählen aber nicht
    // in die Rangvergabe der Kategorie.
    for (const model of earlyAccess) {
      const losses = lossesOver(model.id, common, predictionMap);
      if (losses === null) continue;
      const rawRatio = mean(losses) / referenceLoss;
      const ratio = Math.min(Math.max(rawRatio, RATIO_CLAMP[0]), RATIO_CLAMP[1]);
      cells.set(model.id, {
        categoryId: descriptor.id,
        ratio,
        clamped: ratio !== rawRatio,
        rank: 0,
        normalizedRank: null,
        retroactiveReference,
      });
    }

    cellsByCategory.set(descriptor.id, cells);
    perCategory.push({
      categoryId: descriptor.id,
      referenceLoss,
      commonEvents: common.length,
    });
    qualifications.push({
      categoryId: descriptor.id,
      qualified: true,
      reason: null,
      resolvedEvents: resolved.length,
      commonEvents: common.length,
      scoredModels: participating.length,
      retroactiveReference,
      integrityErrors,
    });
  }

  const qualifiedIds = qualifications.filter((q) => q.qualified).map((q) => q.categoryId);
  const base: OverallStandings = {
    status: qualifiedIds.length >= REQUIRED_CATEGORIES ? 'ready' : 'insufficient',
    rows: [],
    earlyAccessRows: [],
    qualifications,
    qualifiedCount: qualifiedIds.length,
    totalCategories: inputs.length,
    requiredCategories: REQUIRED_CATEGORIES,
    clampedCells: 0,
    perCategory,
  };

  // Unter zwei qualifizierten Kategorien entsteht bewusst KEINE Zahl. Ein
  // Mittelwert über eine Kategorie wäre deren Tabelle mit falschem Etikett.
  if (base.status === 'insufficient') return base;

  const buildRow = (model: ArenaModel, requireAll: boolean): OverallRow | null => {
    const cells: OverallCell[] = [];
    for (const categoryId of qualifiedIds) {
      const cell = cellsByCategory.get(categoryId)?.get(model.id);
      if (cell) cells.push(cell);
    }
    if (cells.length === 0) return null;

    // Kein Imputieren: Wer eine qualifizierte Kategorie auslässt, bekommt keinen
    // Rang. Ein Mittelwert über die bestrittenen Kategorien wäre ein Freibrief,
    // die schwierigen weglassen zu dürfen.
    const complete = cells.length === qualifiedIds.length;
    const logRatios = cells.map((cell) => Math.log(cell.ratio));
    const normalized = cells
      .map((cell) => cell.normalizedRank)
      .filter((value): value is number => value !== null);

    const overallSkill = 1 - Math.exp(mean(logRatios));
    return {
      model,
      rank: 0,
      overallSkill,
      predictionScore: 100 * overallSkill,
      meanNormalizedRank: normalized.length > 0 ? mean(normalized) : null,
      categoriesCounted: cells.length,
      provisional: requireAll ? !complete : true,
      cells,
    };
  };

  const rows = ranked
    .map((model) => buildRow(model, true))
    .filter((row): row is OverallRow => row !== null);
  const earlyAccessRows = earlyAccess
    .map((model) => buildRow(model, false))
    .filter((row): row is OverallRow => row !== null);

  base.clampedCells = [...rows, ...earlyAccessRows].reduce(
    (sum, row) => sum + row.cells.filter((cell) => cell.clamped).length,
    0,
  );

  const isRankable = (row: OverallRow) => !row.provisional && row.overallSkill !== null;
  rows.sort((a, b) => {
    const rankableDiff = Number(isRankable(b)) - Number(isRankable(a));
    if (rankableDiff !== 0) return rankableDiff;
    const skillDiff = (b.overallSkill ?? -Infinity) - (a.overallSkill ?? -Infinity);
    if (skillDiff !== 0) return skillDiff;
    const categoryDiff = b.categoriesCounted - a.categoriesCounted;
    if (categoryDiff !== 0) return categoryDiff;
    return a.model.name.localeCompare(b.model.name, 'de');
  });

  // Standard-Wettkampf-Ranking, identisch zu standings.ts.
  let previousKey = '';
  let previousRank = 0;
  let position = 0;
  for (const row of rows) {
    if (!isRankable(row)) {
      row.rank = 0;
      continue;
    }
    position += 1;
    const key = `${row.overallSkill}|${row.categoriesCounted}`;
    row.rank = key === previousKey ? previousRank : position;
    previousKey = key;
    previousRank = row.rank;
  }

  base.rows = rows;
  base.earlyAccessRows = earlyAccessRows;
  return base;
}
