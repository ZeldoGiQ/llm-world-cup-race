/**
 * Unsicherheit einer Kategorie-Rangliste – gepaarter Event-Bootstrap.
 *
 * Warum das die wichtigste Zahl der Startseite ist: In der Fußball-WM liegen
 * 190 und 184 Punkte sechs Punkte auseinander. Bei einer Streuung von 1,4
 * Punkten pro Event über 104 Events ist dieser Abstand nicht von Rauschen zu
 * unterscheiden – das 95-Prozent-Intervall der Differenz enthält die Null.
 * Ein Leaderboard, das daraus „Modell X gewinnt" macht, behauptet mehr als die
 * Daten tragen. Genau das soll hier nicht passieren.
 *
 * Verfahren: Aus den n Events wird n-mal mit Zurücklegen gezogen – und zwar
 * **gepaart**, also mit denselben Event-Indizes für alle Modelle und die
 * Referenz. Nur so bleibt der Vergleich innerhalb einer Ziehung fair; zieht man
 * je Modell unabhängig, mischt man Event-Schwierigkeit in die Modell-Differenz
 * und überschätzt die Unsicherheit.
 *
 * Gerechnet wird über `metric.compute()` statt über eine eigene Formel. Das
 * kostet Rechenzeit, gilt dafür für JEDE Metrik – auch für nicht additiv
 * zerlegbare wie RMSE, bei der ein Mittelwert der Einzelwerte falsch wäre.
 *
 * Kein `Math.random`: Der Generator ist ein Seed-basierter xorshift32 und
 * injizierbar. Ein statischer Build muss byte-identisch reproduzierbar sein –
 * sonst erzeugt jeder Lauf neue Zahlen, der Publish-Job committet endlos, und
 * der Commit als Zeitbeweis verliert seinen Wert.
 *
 * Bewusst NICHT enthalten: Block-Bootstrap über Spieltage. Events derselben
 * Runde sind korreliert (gleiche Mannschaften, gleicher Informationsstand),
 * die Intervalle hier sind deshalb Untergrenzen. Ohne definierte Blöcke wäre
 * ein Block-Bootstrap aber nur Scheinpräzision; die Einschränkung wird lieber
 * benannt als schlecht behoben.
 */
import type { Metric } from '../metrics/index';
import type { Sample } from '../types';

/**
 * Kleiner, schneller PRNG mit voller Reproduzierbarkeit.
 * Liefert Werte in [0, 1). Seed 0 ist unzulässig (xorshift bleibt dort hängen)
 * und wird auf 1 gehoben.
 */
export function xorshift32(seed: number): () => number {
  let state = seed | 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // >>> 0 macht aus dem signed int einen positiven 32-Bit-Wert.
    return (state >>> 0) / 4_294_967_296;
  };
}

/** Quantil einer aufsteigend sortierten Liste, lineare Interpolation. */
export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0]!;
  const position = (sorted.length - 1) * Math.min(Math.max(p, 0), 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (position - lower) * (sorted[upper]! - sorted[lower]!);
}

export interface PairComparison {
  a: string;
  b: string;
  /** Beobachtete Differenz a − b in Metrik-Einheiten (positiv = a besser) */
  observed: number;
  /** 95-Prozent-Intervall der Differenz */
  interval: [number, number];
  /** true = Intervall enthält die Null nicht, die Ordnung ist belastbar */
  separated: boolean;
}

export interface CategoryUncertainty {
  /** Anteil der Ziehungen, in denen das Modell Rang 1 hält (geteilte Ränge zählen für beide) */
  probabilityFirst: Record<string, number>;
  /** 90-Prozent-Intervall des Rangs */
  rankInterval: Record<string, [number, number]>;
  /** 90-Prozent-Intervall des Metrik-Werts */
  valueInterval: Record<string, [number, number]>;
  pairs: PairComparison[];
  /** Anzahl der Events, über die alle verglichenen Modelle einen Tipp haben */
  commonEvents: number;
  draws: number;
  seed: number;
}

export const BOOTSTRAP_DRAWS = 4000;
export const BOOTSTRAP_SEED = 20260727;

export interface BootstrapParams {
  /**
   * Stichproben je Modell über die GEMEINSAME Event-Menge, in identischer
   * Reihenfolge. Der Aufrufer garantiert das; hier wird es geprüft.
   */
  samplesByModel: Map<string, Sample[]>;
  metric: Metric;
  /** Referenz-Stichprobe für Metriken mit `requiresBaseline` */
  baselineSamples?: Sample[];
  draws?: number;
  seed?: number;
  /** Für Tests injizierbar; sonst xorshift32(seed). */
  rng?: () => number;
}

/**
 * Ränge einer Ziehung bestimmen – identische Semantik wie standings.ts:
 * Standard-Wettkampf-Ranking, Gleichstand teilt den Rang.
 */
function ranksOf(values: Map<string, number>, lowerIsBetter: boolean): Map<string, number> {
  const entries = [...values.entries()].sort((a, b) =>
    lowerIsBetter ? a[1] - b[1] : b[1] - a[1],
  );
  const ranks = new Map<string, number>();
  let previousValue = Number.NaN;
  let previousRank = 0;
  entries.forEach(([id, value], index) => {
    const rank = value === previousValue ? previousRank : index + 1;
    ranks.set(id, rank);
    previousValue = value;
    previousRank = rank;
  });
  return ranks;
}

export function bootstrapCategory(params: BootstrapParams): CategoryUncertainty {
  const { samplesByModel, metric, baselineSamples } = params;
  const draws = params.draws ?? BOOTSTRAP_DRAWS;
  const seed = params.seed ?? BOOTSTRAP_SEED;
  const random = params.rng ?? xorshift32(seed);

  const modelIds = [...samplesByModel.keys()];
  const n = modelIds.length > 0 ? samplesByModel.get(modelIds[0]!)!.length : 0;

  const empty: CategoryUncertainty = {
    probabilityFirst: {},
    rankInterval: {},
    valueInterval: {},
    pairs: [],
    commonEvents: n,
    draws,
    seed,
  };
  if (modelIds.length === 0 || n === 0) return empty;

  // Gepaart heisst: gleiche Länge. Andernfalls wären die Indizes einer Ziehung
  // nicht auf alle Modelle anwendbar und der Vergleich stillschweigend falsch.
  for (const id of modelIds) {
    if (samplesByModel.get(id)!.length !== n) {
      throw new Error(
        `bootstrapCategory: Modell "${id}" hat ${samplesByModel.get(id)!.length} Stichproben, ` +
          `erwartet ${n}. Der gepaarte Bootstrap verlangt die gemeinsame Event-Menge.`,
      );
    }
  }
  if (baselineSamples && baselineSamples.length !== n) {
    throw new Error(
      `bootstrapCategory: Referenz hat ${baselineSamples.length} Stichproben, erwartet ${n}.`,
    );
  }

  const lowerIsBetter = metric.betterDirection === 'lower';
  const firstCount = new Map<string, number>(modelIds.map((id) => [id, 0]));
  const rankDraws = new Map<string, number[]>(modelIds.map((id) => [id, []]));
  const valueDraws = new Map<string, number[]>(modelIds.map((id) => [id, []]));
  const pairDraws = new Map<string, number[]>();
  for (let i = 0; i < modelIds.length; i += 1) {
    for (let j = i + 1; j < modelIds.length; j += 1) {
      pairDraws.set(`${modelIds[i]}|${modelIds[j]}`, []);
    }
  }

  const indices = new Array<number>(n);
  for (let draw = 0; draw < draws; draw += 1) {
    for (let k = 0; k < n; k += 1) indices[k] = Math.floor(random() * n);

    const resampledBaseline = baselineSamples
      ? indices.map((index) => baselineSamples[index]!)
      : undefined;

    const values = new Map<string, number>();
    for (const id of modelIds) {
      const samples = samplesByModel.get(id)!;
      const resampled = indices.map((index) => samples[index]!);
      const computed = metric.compute(resampled, { baselineSamples: resampledBaseline });
      // Nicht berechenbar (z. B. Referenzverlust 0 in dieser Ziehung): Ziehung
      // für dieses Modell überspringen, statt eine Null zu erfinden.
      if (computed === null || !Number.isFinite(computed.value)) continue;
      values.set(id, computed.value);
      valueDraws.get(id)!.push(computed.value);
    }
    if (values.size === 0) continue;

    const ranks = ranksOf(values, lowerIsBetter);
    for (const [id, rank] of ranks) {
      rankDraws.get(id)!.push(rank);
      if (rank === 1) firstCount.set(id, firstCount.get(id)! + 1);
    }

    for (const [key, list] of pairDraws) {
      const [a, b] = key.split('|') as [string, string];
      const va = values.get(a);
      const vb = values.get(b);
      if (va === undefined || vb === undefined) continue;
      // Vorzeichen so, dass positiv immer „a ist besser" heisst.
      list.push(lowerIsBetter ? vb - va : va - vb);
    }
  }

  const probabilityFirst: Record<string, number> = {};
  const rankInterval: Record<string, [number, number]> = {};
  const valueInterval: Record<string, [number, number]> = {};
  for (const id of modelIds) {
    const rl = rankDraws.get(id)!;
    const vl = valueDraws.get(id)!;
    probabilityFirst[id] = rl.length > 0 ? firstCount.get(id)! / rl.length : 0;
    const rs = [...rl].sort((a, b) => a - b);
    const vs = [...vl].sort((a, b) => a - b);
    rankInterval[id] = rl.length > 0 ? [Math.round(quantile(rs, 0.05)), Math.round(quantile(rs, 0.95))] : [0, 0];
    valueInterval[id] = vl.length > 0 ? [quantile(vs, 0.05), quantile(vs, 0.95)] : [Number.NaN, Number.NaN];
  }

  // Beobachtete Werte (ohne Ziehung) für die Paar-Differenzen.
  const observed = new Map<string, number>();
  for (const id of modelIds) {
    const computed = metric.compute(samplesByModel.get(id)!, { baselineSamples });
    if (computed !== null && Number.isFinite(computed.value)) observed.set(id, computed.value);
  }

  const pairs: PairComparison[] = [];
  for (const [key, list] of pairDraws) {
    const [a, b] = key.split('|') as [string, string];
    const va = observed.get(a);
    const vb = observed.get(b);
    if (va === undefined || vb === undefined || list.length === 0) continue;
    const sorted = [...list].sort((x, y) => x - y);
    const interval: [number, number] = [quantile(sorted, 0.025), quantile(sorted, 0.975)];
    pairs.push({
      a,
      b,
      observed: lowerIsBetter ? vb - va : va - vb,
      interval,
      // Getrennt = das Intervall der Differenz liegt vollständig auf einer Seite der Null.
      separated: interval[0] > 0 || interval[1] < 0,
    });
  }

  return { probabilityFirst, rankInterval, valueInterval, pairs, commonEvents: n, draws, seed };
}
