/**
 * Harness-Invarianten: Der Prompt ist für alle Modelle gleich, sein Hash ist
 * stabil, und der Repair-Prompt fordert nie eine inhaltliche Änderung.
 *
 * Zusätzlich: die Kategorie-Liste des Backends muss exakt den registrierten
 * Frontend-Kategorien entsprechen – sonst wäre eine Kategorie unsichtbar oder
 * das Backend würde für eine nicht existierende Kategorie tippen.
 */
import { describe, expect, it } from 'vitest';
import { buildPrompt, buildUserPrompt, promptHash, SYSTEM_PROMPT, type PromptEvent } from './prompt.mts';
import { CATEGORY_LABELS } from './registry-export.mts';
import { HARNESS_LIMITS, HARNESS_VERSION } from '../../../src/arena/lib/harness/config.ts';
import { buildRepairPrompt, typeBlock } from '../../../src/arena/lib/harness/prompt-template.ts';
import { categories } from '../../../src/arena/lib/plugins.ts';

function demoEvent(overrides: Partial<PromptEvent> = {}): PromptEvent {
  return {
    category: 'football-leagues',
    categoryLabel: 'Football leagues',
    question: 'Score after 90 minutes',
    title: 'Bayern München – Real Madrid',
    predictionType: 'scoreline',
    utcDate: '2026-08-15T18:30:00.000Z',
    requestedAt: '2026-08-14T04:07:00.000Z',
    ...overrides,
  };
}

describe('Prompt-Aufbau', () => {
  it('nennt Frage, Lock und aktuelle Zeit', () => {
    const prompt = buildUserPrompt(demoEvent());
    expect(prompt).toContain('Bayern München – Real Madrid');
    expect(prompt).toContain('Score after 90 minutes');
    expect(prompt).toContain('2026-08-15T18:30:00.000Z');
    expect(prompt).toContain('2026-08-14T04:07:00.000Z');
    expect(prompt).toContain(HARNESS_VERSION);
  });

  it('legt die Scoring-Regel offen (H5)', () => {
    expect(buildUserPrompt(demoEvent())).toContain('4 points: exact score');
    expect(buildUserPrompt(demoEvent({ predictionType: 'numeric' }))).toContain('absolute error');
    expect(buildUserPrompt(demoEvent({ predictionType: 'binary' }))).toContain('Brier score');
  });

  it('zitiert die Auflösungsregel wörtlich, wenn eine vorliegt', () => {
    const rule = 'Official full-time score as reported by football-data.org for match 42.';
    const prompt = buildUserPrompt(demoEvent({ resolutionRule: rule }));
    expect(prompt).toContain(rule);
    expect(prompt).toContain('voided');
  });

  it('lässt den Regel-Abschnitt weg, wenn keine Regel existiert', () => {
    expect(buildUserPrompt(demoEvent())).not.toContain('HOW THIS WILL BE RESOLVED');
  });

  it('nimmt Kontextzeilen auf', () => {
    const prompt = buildUserPrompt(demoEvent({ context: ['Competition: Bundesliga', 'Matchday: 3'] }));
    expect(prompt).toContain('- Competition: Bundesliga');
    expect(prompt).toContain('- Matchday: 3');
  });

  it('enthält für jeden Typ ein Ausgabe-Schema', () => {
    for (const type of ['scoreline', 'numeric', 'binary'] as const) {
      expect(typeBlock(type)).toContain('OUTPUT SCHEMA:');
      expect(typeBlock(type)).toContain(`"kind": "${type}"`);
    }
  });
});

describe('Prompt-Hash', () => {
  it('ist für identische Eingaben stabil', () => {
    expect(buildPrompt(demoEvent()).hash).toBe(buildPrompt(demoEvent()).hash);
  });

  it('ändert sich bei jeder inhaltlichen Abweichung', () => {
    const base = buildPrompt(demoEvent()).hash;
    expect(buildPrompt(demoEvent({ title: 'Anderes Spiel' })).hash).not.toBe(base);
    expect(buildPrompt(demoEvent({ requestedAt: '2026-08-14T05:07:00.000Z' })).hash).not.toBe(base);
    expect(promptHash('anderer System-Prompt', buildUserPrompt(demoEvent()))).not.toBe(base);
  });

  it('ist ein SHA-256-Hex-Wert', () => {
    expect(buildPrompt(demoEvent()).hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('nutzt für alle Modelle denselben System-Prompt', () => {
    expect(buildPrompt(demoEvent()).system).toBe(SYSTEM_PROMPT);
  });
});

describe('Repair-Prompt', () => {
  it('verlangt nur ein Format, keine inhaltliche Änderung', () => {
    const repair = buildRepairPrompt('binary', 'Kein parsbarer JSON-Block in der Antwort.');
    expect(repair).toContain('unchanged in substance');
    expect(repair).toContain('No new research needed');
    expect(repair).toContain('"kind": "binary"');
  });
});

describe('Limits', () => {
  it('erlaubt genau einen Erstversuch plus die dokumentierten Retries', () => {
    expect(HARNESS_LIMITS.maxTransportRetries).toBe(2);
    expect(HARNESS_LIMITS.maxRepairTurns).toBe(2);
    expect(HARNESS_LIMITS.maxToolCalls).toBe(20);
  });
});

describe('Kategorie-Liste des Backends', () => {
  it('deckt sich exakt mit der Frontend-Registry', () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...categories.ids()].sort());
  });
});
