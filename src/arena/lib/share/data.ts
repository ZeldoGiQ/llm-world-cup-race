/**
 * Die Zahlen hinter jeder Share-Karte – einmal berechnet, mehrfach ausgegeben.
 *
 * Es gibt genau eine Stelle, an der aus den Standings eine teilbare Rangliste
 * wird. Daran hängen die SVG-Karte (das Bild) und die JSON-Datei (dieselben
 * Zahlen zum Weiterverarbeiten, etwa für Prompt-Texte). Zwei Ausgaben, eine
 * Wahrheit – sonst driften Bild und Text irgendwann auseinander.
 */
import { loadHomeData, uncertaintyFor } from '../home/home-data';
import { pick } from '../i18n/locales';
import { SCORE_VERSION } from '../scoring/score';
import type { ShareRow } from './card';
import { modelLogoMarkup } from './model-logo-markup';

export interface ShareCardData {
  /** Kategorie-Kennung, zugleich Dateiname */
  id: string;
  title: string;
  subtitle: string;
  footnote: string;
  rows: ShareRow[];
}

/**
 * Wie viele aufgelöste Ereignisse eine Kategorie mindestens braucht, bevor
 * sie ein teilbares Bild bekommt. Darunter ist die Rangliste Rauschen, und
 * ein Bild verbreitet sich weiter als eine Tabelle.
 */
const MIN_RESOLVED_FOR_CARD = 3;

/**
 * Alle Kategorien, die eine Karte verdienen: echte Daten, genug aufgelöste
 * Ereignisse, mindestens zwei Teilnehmer und wenigstens ein Score, der nicht
 * null ist. Beispieldaten werden hier so wenig verbreitet wie auf der Seite.
 *
 * Der Null-Test ist kein Schönheitsfilter: Eine Kategorie, in der alle
 * Modelle exakt auf der Referenz liegen, ergibt eine Karte mit fünf Balken
 * der Länge null – eine große leere Fläche unter einer Überschrift. Als
 * Beitrag gelesen sagt sie „hier wurde nichts gemessen", und das ist
 * schlimmer als gar kein Beitrag.
 */
export function shareCards(): ShareCardData[] {
  const data = loadHomeData('en');

  return data.live
    .filter((entry) => entry.scoredPairs > 0 && entry.standings)
    .filter((entry) => entry.resolvedEvents >= MIN_RESOLVED_FOR_CARD)
    .map((entry) => {
      const uncertainty = uncertaintyFor(entry);
      const rows: ShareRow[] = entry
        .standings!.rows.filter((row) => row.rank > 0)
        .slice(0, 5)
        .map((row) => {
          const scoreCell = row.cells.find(
            (cell) => cell.metricId === 'prediction-score' && cell.value !== null,
          );
          const interval = uncertainty?.valueInterval[row.model.id];
          return {
            name: row.model.name,
            color: row.model.color,
            score: scoreCell?.value?.value ?? 0,
            ciLow: interval?.[0] ?? null,
            ciHigh: interval?.[1] ?? null,
            logoMarkup: modelLogoMarkup(row.model.id) ?? null,
          };
        })
        .filter((row) => Number.isFinite(row.score));

      return {
        id: entry.id,
        title: pick(entry.descriptor.label, 'en'),
        subtitle: `Prediction Score · Knowledge Cap · ${SCORE_VERSION}`,
        footnote: `${entry.resolvedEvents} events · every prediction published before its event · 90% CI`,
        rows,
      };
    })
    .filter((card) => card.rows.length >= 2 && card.rows.some((row) => row.score !== 0));
}
