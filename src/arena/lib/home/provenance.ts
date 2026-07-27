/**
 * Provenienz einer Kategorie: echte Daten oder Beispieldaten?
 *
 * Diese Unterscheidung trägt die gesamte Ehrlichkeit der Startseite. Solange
 * sie nur im Kopf des Betreibers existiert, kann jede Kennzahl unbemerkt
 * Beispieldaten mitzählen – und das Benchmark wäre wertlos.
 *
 * Zwei Mechanismen, absichtlich in dieser Richtung:
 *
 * 1. **Deklaration** über `CategoryDescriptor.dataSource`. Pflichtfeld, kein
 *    Standardwert: Wer eine Kategorie anlegt und die Angabe vergisst, bekommt
 *    einen Typfehler und damit einen gebrochenen Build. Eine Konvention kann
 *    das nicht leisten, ein Pflichtfeld schon.
 *
 * 2. **Heuristik**, die nur ABSTUFEN darf (`live` → `example`), niemals
 *    aufwerten. Damit ist die Deklaration keine Selbstauskunft, der man glauben
 *    muss: Wer Beispieldaten als echt deklariert, wird von den Indizien
 *    eingefangen. Wer echte Daten als Beispiel deklariert, bleibt bei seiner
 *    vorsichtigeren Angabe – das ist die sichere Richtung.
 *
 * Streng getrennt davon: **Integritätsfehler**. Ein Tipp nach Ereignisbeginn
 * ist kein „Beispieldatum", sondern ein Regelbruch. Er wird nicht still
 * umetikettiert, sondern gemeldet, und die betroffene Kategorie fliegt sichtbar
 * aus jeder Zahl. Der Unterschied ist wichtig: Beispieldaten sind harmlos und
 * erwartbar, ein Integritätsfehler ist ein Alarm.
 */
import { predictionTypes } from '../prediction-types/index';
import type { EventsFile, PredictionsFile } from '../types';

export type DataSource = 'live' | 'example';

/** Indizien, die eine Kategorie von `live` auf `example` abstufen. */
export type ProvenanceFlag =
  | 'declared-example'
  | 'metadata-source-sample'
  | 'resolved-after-update'
  | 'prediction-after-update';

/** Regelbrüche – kein Abstufungsgrund, sondern Ausschluss mit Hinweis. */
export type IntegrityError = 'prediction-after-event' | 'invalid-resolution';

export interface ProvenanceResult {
  dataSource: DataSource;
  flags: ProvenanceFlag[];
  integrityErrors: IntegrityError[];
  integrityCount: number;
}

/**
 * Toleranz für Uhrenversatz zwischen Datenerzeuger und Zeitstempeln.
 * Eine Stunde ist grosszügig genug für Zeitzonenfehler bei den Erzeugern und
 * knapp genug, dass frei erfundene Daten (Tage bis Monate daneben) auffallen.
 */
export const CLOCK_TOLERANCE_MS = 3_600_000;

export function classifyCategoryData(
  declared: DataSource,
  events: EventsFile | null,
  predictions: PredictionsFile | null,
  toleranceMs: number = CLOCK_TOLERANCE_MS,
): ProvenanceResult {
  const flags: ProvenanceFlag[] = [];
  const integrityErrors: IntegrityError[] = [];
  let integrityCount = 0;

  if (declared === 'example') flags.push('declared-example');

  const list = events?.events ?? [];
  const updatedAt = events?.updatedAt ? Date.parse(events.updatedAt) : Number.NaN;
  const hasUpdatedAt = Number.isFinite(updatedAt);
  const byId = new Map(list.map((event) => [event.id, event]));

  // Indiz: irgendein Event nennt sich selbst Beispieldatum.
  if (list.some((event) => /sample/i.test(String(event.metadata?.['source'] ?? '')))) {
    flags.push('metadata-source-sample');
  }

  // Indiz: ein Event gilt als aufgelöst, obwohl es zum Datenstand noch nicht
  // stattgefunden hatte. Bei echten Daten unmöglich.
  if (
    hasUpdatedAt &&
    list.some(
      (event) =>
        event.status === 'RESOLVED' && Date.parse(event.utcDate) > updatedAt + toleranceMs,
    )
  ) {
    flags.push('resolved-after-update');
  }

  let predictionAfterUpdate = false;
  for (const [eventId, byModel] of Object.entries(predictions?.predictions ?? {})) {
    const event = byId.get(eventId);
    for (const prediction of Object.values(byModel)) {
      const createdAt = prediction?.createdAt ? Date.parse(prediction.createdAt) : Number.NaN;

      // Indiz: Tipp trägt einen Zeitstempel nach dem Datenstand der Datei.
      if (hasUpdatedAt && Number.isFinite(createdAt) && createdAt > updatedAt + toleranceMs) {
        predictionAfterUpdate = true;
      }

      // Regelbruch: Tipp zum oder nach Ereignisbeginn. Kein Zeitstempel heisst
      // „unbekannt" und ist kein Verstoss – die Oberfläche zeigt dann kein
      // Lock-Siegel, behauptet also nichts.
      if (event && Number.isFinite(createdAt) && createdAt >= Date.parse(event.utcDate)) {
        integrityCount += 1;
        if (!integrityErrors.includes('prediction-after-event')) {
          integrityErrors.push('prediction-after-event');
        }
      }
    }
  }
  if (predictionAfterUpdate) flags.push('prediction-after-update');

  // Regelbruch: aufgelöst, aber das Ergebnis passt nicht zum Vorhersage-Typ.
  for (const event of list) {
    if (event.status !== 'RESOLVED') continue;
    const handler = predictionTypes.find(event.predictionType);
    const valid = handler ? handler.validateResolution(event.resolution) : false;
    if (!valid) {
      integrityCount += 1;
      if (!integrityErrors.includes('invalid-resolution')) {
        integrityErrors.push('invalid-resolution');
      }
    }
  }

  // Nur abstufen, nie aufwerten.
  const dataSource: DataSource = flags.length > 0 ? 'example' : declared;
  return { dataSource, flags, integrityErrors, integrityCount };
}

/** Kurzer, übersetzbarer Grund für die sichtbare Abstufung. */
export const FLAG_REASON_KEY: Record<ProvenanceFlag, string> = {
  'declared-example': 'home.flag.declared',
  'metadata-source-sample': 'home.flag.metadataSample',
  'resolved-after-update': 'home.flag.resolvedAfterUpdate',
  'prediction-after-update': 'home.flag.predictionAfterUpdate',
};
