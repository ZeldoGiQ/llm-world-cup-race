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
 * Alle Kategorien, die eine Karte verdienen: echte Daten, mindestens ein
 * gewertetes Paar. Beispieldaten werden hier so wenig verbreitet wie auf
 * der Seite selbst.
 */
export function shareCards(): ShareCardData[] {
  const data = loadHomeData('en');

  return data.live
    .filter((entry) => entry.scoredPairs > 0 && entry.standings)
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
        footnote: `${entry.resolvedEvents} events · committed before each event · 90% CI · whiskers overlap = no clear leader`,
        rows,
      };
    });
}
