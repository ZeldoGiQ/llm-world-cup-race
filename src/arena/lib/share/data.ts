/**
 * Die Zahlen hinter jeder Share-Karte – einmal berechnet, mehrfach ausgegeben.
 *
 * Es gibt genau eine Stelle, an der aus den Standings eine teilbare Rangliste
 * wird. Daran hängen die SVG-Karte (das Bild), die JSON-Datei (dieselben
 * Zahlen zum Weiterverarbeiten, etwa für Discord-Beiträge und Prompt-Texte)
 * und das Vorschaubild beim Teilen. Mehrere Ausgaben, eine Wahrheit – sonst
 * driften Bild und Text irgendwann auseinander.
 *
 * Gezeigt wird die Alltagszahl (lib/plain), nicht der Prediction Score.
 */
import { loadHomeData, uncertaintyFor } from '../home/home-data';
import { t } from '../i18n/messages';
import { modelLogoMarkup } from './model-logo-markup';
import { overallPlain, plainBoard } from '../plain/index';
import type { ShareReference, ShareRow } from './card';

export interface ShareCardData {
  /** Kategorie-Kennung, zugleich Dateiname */
  id: string;
  title: string;
  /** Eyebrow: die Alltagszahl */
  subtitle: string;
  footnote: string;
  /** Aufgelöste Ereignisse hinter der Karte – für Beitragsschwellen */
  resolvedEvents: number;
  headline: string | null;
  clear: boolean;
  /** true = Reihenfolge der ersten beiden kann noch kippen; gehört in jeden Beitragstext */
  closeCall: boolean;
  reference: ShareReference | null;
  rows: ShareRow[];
}

/**
 * Wie viele aufgelöste Ereignisse eine Kategorie mindestens braucht, bevor
 * sie ein teilbares Bild bekommt. Darunter ist die Rangliste Rauschen, und
 * ein Bild verbreitet sich weiter als eine Tabelle.
 */
const MIN_RESOLVED_FOR_CARD = 3;

// Kurz genug, dass Fußnote und Marke im Querformat in EINE Zeile passen –
// sonst stapeln sie und nehmen den fünf Zeilen den Platz.
const PROMISE = 'published before each event · no internet access';

/**
 * Alle Kategorien, die eine Karte verdienen: echte Daten, genug aufgelöste
 * Ereignisse und mindestens zwei gewertete Teilnehmer. Beispieldaten werden
 * hier so wenig verbreitet wie auf der Seite.
 */
export function shareCards(): ShareCardData[] {
  const data = loadHomeData('en');
  const translate = t('en');

  /* — Die Gesamtwertung: die Zahl, die ein Labor zitieren würde. In
       Alltagssprache heißt sie „schlägt die Referenz in 4 von 5 Kategorien".
       Es gibt sie erst, wenn genug Kategorien qualifiziert sind – vorher
       wäre sie eine Behauptung. Kein Bootstrap über Kategorien hinweg, also
       nie Rot und keine Vorsprungs-Behauptung. — */
  const overallCard: ShareCardData[] = [];
  if (data.overall.status === 'ready' && data.overall.rows.length >= 2) {
    const rows = data.overall.rows.filter((row) => row.rank > 0).slice(0, 5);
    const first = rows[0];
    const firstPlain = first ? overallPlain(first) : null;
    overallCard.push({
      id: 'overall',
      title: 'Overall — all categories',
      subtitle: translate('plain.overallLabel'),
      footnote: `${data.overall.qualifiedCount} categories · ${PROMISE}`,
      resolvedEvents: data.overall.qualifications
        .filter((q) => q.qualified)
        .reduce((sum, q) => sum + q.resolvedEvents, 0),
      headline:
        first && firstPlain
          ? translate('plain.overallHeadline', {
              model: first.model.name,
              beats: firstPlain.beats,
              counted: firstPlain.counted,
            })
          : null,
      clear: false,
      closeCall: false,
      reference: null,
      rows: rows.map((row) => {
        const plain = overallPlain(row);
        return {
          name: row.model.name,
          color: row.model.color,
          value: plain.fraction,
          formatted: translate('plain.overallValue', { beats: plain.beats, counted: plain.counted }),
          ciLow: null,
          ciHigh: null,
          logoMarkup: modelLogoMarkup(row.model.id) ?? null,
        };
      }),
    });
  }

  const categoryCards = data.live
    .filter((entry) => entry.scoredPairs > 0 && entry.standings)
    .filter((entry) => entry.resolvedEvents >= MIN_RESOLVED_FOR_CARD)
    .flatMap((entry): ShareCardData[] => {
      const board = plainBoard(entry, 'en', uncertaintyFor(entry));
      if (!board) return [];
      const rows: ShareRow[] = board.rows
        .filter((row) => row.rank > 0 && row.value !== null && Number.isFinite(row.value))
        .slice(0, 5)
        .map((row) => ({
          name: row.model.name,
          color: row.model.color,
          value: row.value!,
          formatted: row.formatted,
          ciLow: row.interval?.[0] ?? null,
          ciHigh: row.interval?.[1] ?? null,
          logoMarkup: modelLogoMarkup(row.model.id) ?? null,
        }));
      if (rows.length < 2) return [];
      return [
        {
          id: entry.id,
          title: entry.descriptor.label.en,
          subtitle: board.label,
          footnote: `${entry.resolvedEvents} events · ${PROMISE}`,
          resolvedEvents: entry.resolvedEvents,
          headline: board.headline,
          clear: board.clear,
          closeCall: board.closeCall,
          reference:
            board.reference && board.reference.value !== null
              ? { label: board.reference.label, value: board.reference.value, formatted: board.reference.formatted }
              : null,
          rows,
        },
      ];
    });

  return overallCard.concat(categoryCards);
}
