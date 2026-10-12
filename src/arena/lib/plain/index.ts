/**
 * Die Alltagszahl – je Kategorie die eine Kennzahl, die ohne Vorwissen
 * verständlich ist.
 *
 * Der Prediction Score ist die Währung für Labore und die Methodik-Seite:
 * skalenfrei, kategorienübergreifend vergleichbar – und ohne Formel im Kopf
 * eine Zahl ohne Einheit. Wer einen Beitrag auf Discord oder X sieht, hat
 * die Formel nicht. Deshalb steht dort, auf den Karten und vorn in jeder
 * Tabelle die Alltagszahl: „58 % der Spiele richtig", „im Schnitt 1,8 %
 * daneben". Sie ist nichts Neues, sondern die Ranking-Metrik der Kategorie,
 * nur in Alltagssprache beschriftet und mit dem Vergleichswert daneben.
 *
 * Der Vergleichswert ist das, was die Zahl ehrlich hält: 58 % Tendenz
 * klingt gut, bis danebensteht, dass stures „Heimsieg" 45 % schafft.
 *
 * Invariante: Die Alltagszahl IST `descriptor.primaryMetric`. Dadurch ist
 * die Reihenfolge überall dieselbe – Tabelle, Karte, Beitrag sortieren nach
 * genau der Zahl, die sie zeigen. Ein Test in index.test.ts sichert das.
 */
import type { CategoryHome } from '../home/home-data';
import { pick, type Locale, type Localized } from '../i18n/locales';
import type { Metric } from '../metrics/index';
import type { CategoryUncertainty } from '../scoring/bootstrap';
import type { OverallRow } from '../scoring/overall';
import type { ArenaModel } from '../types';

export interface PlainPhrasing {
  /** Spaltenkopf und Karten-Eyebrow, z. B. "Right outcome" */
  label: Localized<string>;
  /** Die Überschrift eines Beitrags; Platzhalter {model} und {value} */
  headline: Localized<string>;
}

/**
 * Alltagssprache je Metrik. Metriken ohne Eintrag fallen auf ihr eigenes
 * Label zurück und bekommen eine neutrale Überschrift – lesbar, aber ohne
 * Satzbau. Wer eine neue Ranking-Metrik einführt, trägt sie hier ein.
 */
export const PLAIN_PHRASINGS: Record<string, PlainPhrasing> = {
  'tendency-acc': {
    label: { en: 'Right outcome', de: 'Tendenz richtig', es: 'Resultado acertado' },
    headline: {
      en: '{model} called {value} of matches right',
      de: '{model} lag bei {value} der Spiele richtig',
      es: '{model} acertó el resultado en {value} de los partidos',
    },
  },
  'exact-acc': {
    label: { en: 'Exact score', de: 'Exaktes Ergebnis', es: 'Marcador exacto' },
    headline: {
      en: '{model} hit the exact score in {value} of matches',
      de: '{model} traf in {value} der Spiele das exakte Ergebnis',
      es: '{model} acertó el marcador exacto en {value} de los partidos',
    },
  },
  'kicktipp-points': {
    label: { en: 'Points', de: 'Punkte', es: 'Puntos' },
    headline: {
      en: '{model} collected the most points: {value}',
      de: '{model} holte die meisten Punkte: {value}',
      es: '{model} sumó más puntos: {value}',
    },
  },
  'points-per-event': {
    label: { en: 'Points per match', de: 'Punkte pro Spiel', es: 'Puntos por partido' },
    headline: {
      en: '{model} scores {value} points per match',
      de: '{model} holt {value} Punkte pro Spiel',
      es: '{model} suma {value} puntos por partido',
    },
  },
  mape: {
    label: { en: 'Average miss', de: 'Ø Abweichung', es: 'Desvío medio' },
    headline: {
      en: '{model} comes closest: {value} off on average',
      de: '{model} liegt am nächsten dran: im Schnitt {value} daneben',
      es: '{model} se acerca más: {value} de desvío medio',
    },
  },
  mae: {
    label: { en: 'Average miss', de: 'Ø Abweichung', es: 'Desvío medio' },
    headline: {
      en: '{model} comes closest: {value} off on average',
      de: '{model} liegt am nächsten dran: im Schnitt {value} daneben',
      es: '{model} se acerca más: {value} de desvío medio',
    },
  },
  'accuracy-50': {
    label: { en: 'Calls right', de: 'Treffer', es: 'Aciertos' },
    headline: {
      en: '{model} got {value} of calls right',
      de: '{model} lag bei {value} der Fragen richtig',
      es: '{model} acertó {value} de las preguntas',
    },
  },
};

function fill(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) out = out.split(`{${key}}`).join(value);
  return out;
}

export function plainLabel(metric: Metric, locale: Locale): string {
  const phrasing = PLAIN_PHRASINGS[metric.id];
  return pick(phrasing ? phrasing.label : metric.label, locale);
}

export function plainHeadline(
  metricId: string,
  locale: Locale,
  values: { model: string; value: string },
): string {
  const phrasing = PLAIN_PHRASINGS[metricId];
  if (phrasing) return fill(pick(phrasing.headline, locale), values);
  const neutral: Localized<string> = {
    en: '{model} leads with {value}',
    de: '{model} führt mit {value}',
    es: '{model} lidera con {value}',
  };
  return fill(pick(neutral, locale), values);
}

/**
 * Wenn die stumpfe Regel alle Modelle schlägt, darf die Überschrift das
 * nicht verstecken. „GLM-5.2 kommt am nächsten: 2,24 % daneben" klingt nach
 * Leistung – bis danebensteht, dass „Kurs bleibt gleich" 2,23 % schafft.
 * Genau dann ist die Nachricht eine andere, und sie steht vorn.
 */
const REFERENCE_WINS: Localized<string> = {
  // Kurz genug für die Querformat-Karte; der Wert der Referenz steht dort
  // ohnehin an der gestrichelten Linie.
  en: 'No model beats "{reference}" — {model} comes closest at {value}',
  de: 'Kein Modell schlägt „{reference}" – {model} kommt mit {value} am nächsten',
  es: 'Ningún modelo supera «{reference}»; {model} es el más cercano con {value}',
};

/**
 * Die Überschrift für den Führenden – mit Blick auf die Referenz: Liegt die
 * stumpfe Regel vorn, sagt der Satz das zuerst.
 */
export function headlineFor(params: {
  metricId: string;
  locale: Locale;
  betterDirection: Metric['betterDirection'];
  model: string;
  value: number;
  formatted: string;
  reference: PlainReference | null;
}): string {
  const { reference } = params;
  if (reference && reference.value !== null) {
    const beatsReference =
      params.betterDirection === 'lower'
        ? params.value < reference.value
        : params.value > reference.value;
    if (!beatsReference) {
      return fill(pick(REFERENCE_WINS, params.locale), {
        reference: reference.label,
        referenceValue: reference.formatted,
        model: params.model,
        value: params.formatted,
      });
    }
  }
  return plainHeadline(params.metricId, params.locale, { model: params.model, value: params.formatted });
}

/** Ab dieser P(#1) gilt eine Führung als klar – dieselbe Schwelle wie die Medaillen der Startseite. */
export const CLEAR_LEADER_PROBABILITY = 0.9;

export interface PlainRow {
  model: ArenaModel;
  rank: number;
  provisional: boolean;
  scored: number;
  value: number | null;
  formatted: string;
  /** 90-%-Intervall in der Einheit der Alltagszahl; null = keine Unsicherheitsdaten */
  interval: [number, number] | null;
}

export interface PlainReference {
  /** Alltagsname der Referenz, z. B. "Immer Heimsieg" */
  label: string;
  value: number | null;
  formatted: string;
}

export interface PlainBoard {
  metricId: string;
  label: string;
  betterDirection: Metric['betterDirection'];
  rows: PlainRow[];
  reference: PlainReference | null;
  /** Ein Satz über den Führenden; null, wenn niemand eindeutig vorn liegt */
  headline: string | null;
  /** true = das führende Modell hält Platz eins in ≥ 90 % der Neuziehungen */
  clear: boolean;
  /** true = Reihenfolge der ersten beiden kann noch kippen (gehört in den Text) */
  closeCall: boolean;
  resolvedEvents: number;
}

/**
 * Die Alltagszahl einer Kategorie für alle Teilnehmer – aus den Standings,
 * die bereits nach genau dieser Zahl sortiert sind.
 */
export function plainBoard(
  entry: CategoryHome,
  locale: Locale,
  uncertainty: CategoryUncertainty | null,
): PlainBoard | null {
  const { standings, primaryMetric: metric } = entry;
  if (!standings || !metric) return null;

  const rows: PlainRow[] = standings.rows
    .filter((row) => row.scored > 0)
    .map((row) => {
      const cell = row.cells.find((candidate) => candidate.metricId === metric.id);
      return {
        model: row.model,
        rank: row.rank,
        provisional: row.provisional,
        scored: row.scored,
        value: cell?.value?.value ?? null,
        formatted: cell?.formatted ?? '—',
        interval:
          uncertainty?.metricId === metric.id ? (uncertainty.valueInterval[row.model.id] ?? null) : null,
      };
    });

  // Vergleichswert: aus dem Referenz-Teilnehmer (eigene Tipps in den Daten)
  // oder aus der Referenzregel (deterministisch zur Laufzeit) – in beiden
  // Fällen in derselben Einheit wie die Alltagszahl.
  let reference: PlainReference | null = null;
  const plainName = entry.descriptor.plainReference
    ? pick(entry.descriptor.plainReference, locale)
    : null;
  if (entry.descriptor.baselineModelId) {
    const baselineRow = standings.baselineRows.find(
      (row) => row.model.id === entry.descriptor.baselineModelId,
    );
    const cell = baselineRow?.cells.find((candidate) => candidate.metricId === metric.id);
    if (baselineRow && cell?.value) {
      reference = {
        label: plainName ?? baselineRow.model.name,
        value: cell.value.value,
        formatted: cell.formatted,
      };
    }
  } else if (entry.reference && entry.reference.value !== null) {
    reference = {
      label: plainName ?? entry.reference.label,
      value: entry.reference.value,
      formatted: entry.reference.formatted,
    };
  }

  const leaders = rows.filter((row) => row.rank === 1);
  const leader = leaders.length === 1 ? leaders[0]! : null;
  const probabilityFirst = leader ? (uncertainty?.probabilityFirst[leader.model.id] ?? 0) : 0;
  const clear = leader !== null && probabilityFirst >= CLEAR_LEADER_PROBABILITY;

  return {
    metricId: metric.id,
    label: plainLabel(metric, locale),
    betterDirection: metric.betterDirection,
    rows,
    reference,
    headline:
      leader && leader.value !== null
        ? headlineFor({
            metricId: metric.id,
            locale,
            betterDirection: metric.betterDirection,
            model: leader.model.name,
            value: leader.value,
            formatted: leader.formatted,
            reference,
          })
        : null,
    clear,
    closeCall: rows.filter((row) => row.rank > 0).length > 1 && !clear,
    resolvedEvents: standings.resolvedEvents,
  };
}

/**
 * Gesamtwertung in Alltagssprache: „schlägt die Referenz in 4 von 5
 * Kategorien". Prozent korrekt gibt es hier nicht – die Kategorien messen in
 * verschiedenen Einheiten. Was die Gesamtwertung wirklich aussagt, ist, in
 * wie vielen Kategorien das Modell besser war als die simple Referenz
 * (Verlust-Quotient unter 1). Genau das wird gezeigt.
 */
export function overallPlain(row: OverallRow): { beats: number; counted: number; fraction: number } {
  const counted = row.cells.length;
  const beats = row.cells.filter((cell) => cell.ratio < 1).length;
  return { beats, counted, fraction: counted === 0 ? 0 : beats / counted };
}
