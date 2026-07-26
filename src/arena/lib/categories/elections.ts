/**
 * Kategorie "Wahlen & Politik" – Wahrscheinlichkeiten für Ja/Nein-Fragen
 * (DUMMY-DATEN).
 *
 * Methodisch die wertvollste Kategorie: Weil Modelle hier eine
 * Wahrscheinlichkeit nennen statt eines Ergebnisses, lässt sich mit Proper
 * Scoring Rules (Brier, Log-Loss) messen, ob ein Modell seine eigene Unsicherheit
 * realistisch einschätzt. Ein Modell, das ständig "95 Prozent" sagt und dann
 * irrt, fällt hier auf – bei reiner Trefferquote nicht.
 *
 * Baseline: die letzte veröffentlichte Umfrage vor dem Ereignis.
 */
import { formatMonthYear } from '../i18n/format';
import type { Locale } from '../i18n/locales';
import { DEFAULT_LOCALE } from '../i18n/locales';
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface ElectionMetadata {
  region: string;
  /** Schlüssel statt Klartext, damit das Thema lokalisiert werden kann. */
  topicKey?: string;
  topic?: string;
}

const TOPIC_LABELS: Record<string, Record<Locale, string>> = {
  elections: { en: 'Elections', de: 'Wahlen', es: 'Elecciones' },
  politics: { en: 'Politics', de: 'Politik', es: 'Política' },
};

export const elections: CategoryDescriptor = {
  id: 'elections',
  label: { en: 'Elections & politics', de: 'Wahlen & Politik', es: 'Elecciones y política' },
  blurb: {
    en: 'Yes/no questions on elections and political events. Models state a probability, and scoring uses the Brier score and log loss, which reward honest uncertainty and penalise overconfidence.',
    de: 'Ja/Nein-Fragen zu Wahlen und politischen Ereignissen. Die Modelle nennen eine Wahrscheinlichkeit – gewertet wird mit Brier-Score und Log-Loss, die ehrliche Unsicherheit belohnen und Overconfidence bestrafen.',
    es: 'Preguntas de sí/no sobre elecciones y acontecimientos políticos. Los modelos indican una probabilidad y la evaluación usa la puntuación de Brier y la pérdida logarítmica, que premian la incertidumbre honesta y penalizan el exceso de confianza.',
  },
  question: {
    en: 'Probability that the event occurs',
    de: 'Wahrscheinlichkeit, dass das Ereignis eintritt',
    es: 'Probabilidad de que el evento ocurra',
  },
  accent: '#a78bfa',
  predictionType: 'binary',
  metricIds: ['brier', 'log-loss', 'accuracy-50', 'skill-score'],
  primaryMetric: 'brier',
  baselineModelId: 'baseline-poll',
  baselineNote: {
    en: 'Latest poll: the most recent published survey before the event, carried over unchanged as a probability.',
    de: 'Letzte Umfrage: die zuletzt veröffentlichte Erhebung vor dem Ereignis, unverändert als Wahrscheinlichkeit übernommen.',
    es: 'Última encuesta: el sondeo publicado más reciente antes del evento, trasladado sin cambios como probabilidad.',
  },

  eventTitle(event: ArenaEvent, locale) {
    const data = event.metadata as unknown as ElectionMetadata;
    const topicKey = data.topicKey ?? 'elections';
    const topic = TOPIC_LABELS[topicKey]?.[locale] ?? TOPIC_LABELS[topicKey]?.[DEFAULT_LOCALE];
    return {
      // Titel aus der Datenquelle, sofern für diese Sprache vorhanden.
      primary: event.titles?.[locale] ?? event.title,
      secondary: [data.region, topic].filter(Boolean).join(' · ') || undefined,
    };
  },

  groupOf(event, locale) {
    return formatMonthYear(event.utcDate, locale);
  },
};

categories.register(elections);
