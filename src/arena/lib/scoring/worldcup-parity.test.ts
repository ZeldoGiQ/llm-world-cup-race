/**
 * Paritäts-Test: Die generische Arena-Engine muss auf den echten WM-Daten
 * exakt dieselbe Wertung liefern wie das ursprüngliche WM-Tippspiel.
 *
 * Das ist die wichtigste Absicherung des Refactors: Wenn die Abstraktion
 * (Registries, Metriken, datengetriebene Standings) irgendwo die Semantik
 * verändert, fällt es hier auf – gemessen an den öffentlich verifizierten
 * Endstand-Zahlen der abgeschlossenen Weltmeisterschaft.
 */
import { describe, expect, it } from 'vitest';
import '../metrics/accuracy';
import '../prediction-types/scoreline';
import { footballWorldCup } from '../categories/football-worldcup';
import eventsJson from '../../../../public/arena-data/football-worldcup/events.json';
import predictionsJson from '../../../../public/arena-data/football-worldcup/predictions.json';
import modelsJson from '../../data/models.json';
import type { ArenaModel, EventsFile, PredictionsFile } from '../types';
import { computeStandings } from './standings';

// Direkte JSON-Imports statt Dateisystem-Zugriff: funktioniert dank
// resolveJsonModule ohne zusätzliche Typ-Pakete und prüft zugleich, dass die
// generierten Daten überhaupt gültiges JSON im erwarteten Schema sind.
const events = eventsJson as unknown as EventsFile;
const predictions = predictionsJson as unknown as PredictionsFile;
const models = modelsJson as ArenaModel[];

/** Öffentlich verifizierter Endstand der WM 2026 (llm-world-cup-race.vercel.app). */
const EXPECTED = [
  { id: 'grok', points: 190, exact: 16, tendency: 42 },
  { id: 'claude', points: 184, exact: 16, tendency: 48 },
  { id: 'kimi', points: 163, exact: 13, tendency: 39 },
  { id: 'gpt', points: 158, exact: 12, tendency: 40 },
  { id: 'gemini', points: 157, exact: 16, tendency: 33 },
  { id: 'qwen', points: 146, exact: 10, tendency: 41 },
];

describe('WM-Parität der generischen Engine', () => {
  const standings = computeStandings(models, events, predictions, footballWorldCup, 'en');
  const byId = new Map(standings.rows.map((row) => [row.model.id, row]));

  it('wertet alle 104 Spiele', () => {
    expect(standings.resolvedEvents).toBe(104);
    expect(standings.openEvents).toBe(0);
  });

  it('reproduziert die Punktzahl jedes Modells exakt', () => {
    for (const expected of EXPECTED) {
      const row = byId.get(expected.id);
      expect(row, `Modell ${expected.id} fehlt in den Standings`).toBeDefined();
      expect(row!.scored, `${expected.id}: gewertete Spiele`).toBe(104);
      expect(row!.primaryValue, `${expected.id}: Punkte`).toBe(expected.points);
    }
  });

  it('reproduziert exakte Treffer und Tendenz-Trefferquote', () => {
    for (const expected of EXPECTED) {
      const row = byId.get(expected.id)!;
      const exactCell = row.cells.find((c) => c.metricId === 'exact-acc')!;
      const tendencyCell = row.cells.find((c) => c.metricId === 'tendency-acc')!;
      // Die Metriken liefern Anteile; zurückgerechnet müssen es die bekannten
      // absoluten Trefferzahlen sein.
      expect(Math.round(exactCell.value!.value * 104), `${expected.id}: exakt`).toBe(expected.exact);
      // Tendenz-Metrik zählt exakte und Differenz-Treffer mit, deshalb die Summe.
      const tendencyTotal = Math.round(tendencyCell.value!.value * 104);
      expect(tendencyTotal, `${expected.id}: Tendenz-Summe`).toBeGreaterThanOrEqual(
        expected.tendency,
      );
    }
  });

  it('ergibt die bekannte Reihenfolge Grok > Claude > Kimi > GPT > Gemini > Qwen', () => {
    const ranked = standings.rows
      .filter((row) => row.primaryValue !== null)
      .map((row) => row.model.id);
    expect(ranked).toEqual(['grok', 'claude', 'kimi', 'gpt', 'gemini', 'qwen']);
    expect(standings.rows[0]!.rank).toBe(1);
  });

  it('zeigt keine Skill-Spalte, weil für die WM keine echte Baseline vorliegt', () => {
    expect(standings.columns.map((c) => c.metricId)).not.toContain('skill-score');
    expect(standings.baselineRows).toHaveLength(0);
  });

  it('lässt Modelle ohne WM-Teilnahme ohne Wertung und ohne Rang', () => {
    const nova = standings.rows.find((row) => row.model.id === 'nova')!;
    expect(nova.scored).toBe(0);
    expect(nova.primaryValue).toBeNull();
    expect(nova.rank).toBe(0);
  });
});
