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
import type { ArenaEvent } from '../types';
import { categories, type CategoryDescriptor } from './index';

interface ElectionMetadata {
  region: string;
  topic: string;
}

export const elections: CategoryDescriptor = {
  id: 'elections',
  label: 'Wahlen & Politik',
  blurb:
    'Ja/Nein-Fragen zu Wahlen und politischen Ereignissen. Die Modelle nennen eine Wahrscheinlichkeit – gewertet wird mit Brier-Score und Log-Loss, die ehrliche Unsicherheit belohnen und Overconfidence bestrafen.',
  question: 'Wahrscheinlichkeit, dass das Ereignis eintritt',
  accent: '#a78bfa',
  predictionType: 'binary',
  metricIds: ['brier', 'log-loss', 'accuracy-50', 'skill-score'],
  primaryMetric: 'brier',
  baselineModelId: 'baseline-poll',
  baselineNote:
    'Letzte Umfrage: die zuletzt veröffentlichte Erhebung vor dem Ereignis, unverändert als Wahrscheinlichkeit übernommen.',

  eventTitle(event) {
    const data = event.metadata as unknown as ElectionMetadata;
    return {
      primary: event.title,
      secondary: [data.region, data.topic].filter(Boolean).join(' · ') || undefined,
    };
  },

  groupOf(event) {
    return new Date(event.utcDate).toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric',
    });
  },
};

categories.register(elections);
