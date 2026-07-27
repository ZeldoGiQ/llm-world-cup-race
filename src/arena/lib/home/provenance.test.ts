/**
 * Der Klassifikator entscheidet, welche Daten überhaupt gezählt werden. Ein
 * Fehler hier weist entweder Beispieldaten als echt aus oder legt die einzige
 * echte Kategorie still – beides beschädigt die Glaubwürdigkeit sofort.
 */
import { describe, expect, it } from 'vitest';
import '../prediction-types/scoreline';
import type { EventsFile, PredictionsFile } from '../types';
import { classifyCategoryData } from './provenance';

const UPDATED = '2026-07-20T00:00:00.000Z';

function events(list: Array<Partial<EventsFile['events'][number]>>): EventsFile {
  return {
    category: 'test',
    updatedAt: UPDATED,
    events: list.map((event, index) => ({
      id: event.id ?? `e${index}`,
      title: 'Test',
      utcDate: event.utcDate ?? '2026-07-10T12:00:00.000Z',
      status: event.status ?? 'RESOLVED',
      predictionType: 'scoreline',
      resolution: event.resolution ?? { kind: 'scoreline', home: 1, away: 0 },
      metadata: event.metadata ?? {},
    })),
  } as EventsFile;
}

function predictions(
  entries: Array<{ event: string; model: string; createdAt: string }>,
): PredictionsFile {
  const map: PredictionsFile['predictions'] = {};
  for (const entry of entries) {
    map[entry.event] ??= {};
    map[entry.event]![entry.model] = {
      value: { kind: 'scoreline', home: 1, away: 0 },
      createdAt: entry.createdAt,
    };
  }
  return { category: 'test', predictions: map };
}

describe('classifyCategoryData', () => {
  it('lässt saubere echte Daten echt', () => {
    const result = classifyCategoryData(
      'live',
      events([{ id: 'a' }, { id: 'b' }]),
      predictions([{ event: 'a', model: 'm', createdAt: '2026-07-01T00:00:00.000Z' }]),
    );
    expect(result.dataSource).toBe('live');
    expect(result.flags).toEqual([]);
    expect(result.integrityCount).toBe(0);
  });

  it('wertet niemals auf – eine Beispiel-Deklaration bleibt bestehen', () => {
    // Selbst bei perfekten Daten und voller Abdeckung. Die vorsichtigere Angabe
    // gewinnt immer; sonst wäre die Deklaration eine Einladung zum Schönfärben.
    const many = Array.from({ length: 500 }, (_, index) => ({ id: `e${index}` }));
    const result = classifyCategoryData(
      'example',
      events(many),
      predictions(many.map((event) => ({ event: event.id, model: 'm', createdAt: '2026-07-01T00:00:00.000Z' }))),
    );
    expect(result.dataSource).toBe('example');
    expect(result.flags).toContain('declared-example');
  });

  it('stuft ab, wenn ein Event sich selbst als Beispiel bezeichnet', () => {
    const result = classifyCategoryData(
      'live',
      events([{ id: 'a', metadata: { source: 'sample data' } }]),
      predictions([]),
    );
    expect(result.dataSource).toBe('example');
    expect(result.flags).toContain('metadata-source-sample');
  });

  it('stuft ab, wenn ein Event als aufgelöst gilt, das noch nicht stattfand', () => {
    const result = classifyCategoryData(
      'live',
      // Zwei Stunden nach dem Datenstand – bei echten Daten unmöglich.
      events([{ id: 'a', utcDate: '2026-07-20T02:00:00.000Z' }]),
      predictions([]),
    );
    expect(result.dataSource).toBe('example');
    expect(result.flags).toContain('resolved-after-update');
  });

  it('verzeiht Uhrenversatz innerhalb einer Stunde', () => {
    const result = classifyCategoryData(
      'live',
      events([{ id: 'a', utcDate: '2026-07-20T00:30:00.000Z' }]),
      predictions([]),
    );
    expect(result.dataSource).toBe('live');
    expect(result.flags).toEqual([]);
  });

  it('stuft ab, wenn ein Tipp später datiert ist als der Datenstand', () => {
    const result = classifyCategoryData(
      'live',
      events([{ id: 'a' }]),
      predictions([{ event: 'a', model: 'm', createdAt: '2026-07-21T00:00:00.000Z' }]),
    );
    expect(result.dataSource).toBe('example');
    expect(result.flags).toContain('prediction-after-update');
  });

  it('behandelt einen Tipp nach Ereignisbeginn als Regelbruch, nicht als Beispieldatum', () => {
    /*
     * Der wichtigste Unterschied dieser Datei. Beispieldaten sind harmlos und
     * erwartbar; ein Tipp nach dem Ereignis ist ein Alarm. Würde man ihn still
     * zu „Beispieldaten" umetikettieren, verschwände der Verstoss aus der
     * Wahrnehmung – genau das darf nicht passieren.
     */
    const result = classifyCategoryData(
      'live',
      events([{ id: 'a', utcDate: '2026-07-10T12:00:00.000Z' }]),
      predictions([{ event: 'a', model: 'm', createdAt: '2026-07-10T13:00:00.000Z' }]),
    );
    expect(result.integrityErrors).toContain('prediction-after-event');
    expect(result.integrityCount).toBe(1);
    // Kein Abstufungsgrund:
    expect(result.flags).not.toContain('prediction-after-update');
  });

  it('erkennt ein Ergebnis, das nicht zum Vorhersage-Typ passt', () => {
    const broken = events([{ id: 'a' }]);
    // Typkonform, aber inhaltlich falsch: ein numerisches Ergebnis an einem
    // Ergebnistipp-Event. Genau so sieht ein Skriptfehler in den Daten aus, und
    // genau den kann der Compiler nicht abfangen – deshalb dieser Test.
    broken.events[0]!.resolution = { kind: 'numeric', value: 3 };
    const result = classifyCategoryData('live', broken, predictions([]));
    expect(result.integrityErrors).toContain('invalid-resolution');
  });

  it('wertet einen Tipp ohne Zeitstempel nicht als Verstoss', () => {
    // Unbekannt ist nicht dasselbe wie zu spät. Die Oberfläche zeigt dann kein
    // Lock-Siegel und behauptet damit nichts.
    const result = classifyCategoryData(
      'live',
      events([{ id: 'a' }]),
      predictions([{ event: 'a', model: 'm', createdAt: '' }]),
    );
    expect(result.integrityCount).toBe(0);
    expect(result.dataSource).toBe('live');
  });

  it('kommt mit fehlenden Dateien zurecht statt zu werfen', () => {
    const result = classifyCategoryData('live', null, null);
    expect(result.dataSource).toBe('live');
    expect(result.integrityCount).toBe(0);
  });
});
