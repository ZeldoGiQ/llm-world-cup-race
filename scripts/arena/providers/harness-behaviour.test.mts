/**
 * Verhalten des Wettkampf-Ausführers an den Stellen, wo ein Fehler
 * unumkehrbar wäre.
 *
 * Der wichtigste Test hier ist der Repair-Turn: Der Transport ist Single-Turn
 * und trägt keine Gesprächshistorie. Enthielte der zweite Versuch nur den
 * Repair-Prompt, wüsste das Modell nicht mehr, welches Ereignis gemeint ist –
 * es würde einen schemakonformen, aber erfundenen Wert liefern, und der landet
 * in einer per Trigger unlöschbaren Tabelle und im öffentlichen Leaderboard.
 */
import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../lib/prompt.mts';
import { HARNESS_VERSION } from '../../../src/arena/lib/harness/config.ts';
import {
  buildRepairPrompt,
  SYSTEM_PROMPT,
  typeBlock,
} from '../../../src/arena/lib/harness/prompt-template.ts';
import { costUsd } from '../lib/budget.mts';
import { ProviderError } from './types.mts';

const EVENT = {
  category: 'football-leagues',
  categoryLabel: 'Football leagues',
  question: 'Score after 90 minutes',
  title: 'Bayern München – Real Madrid',
  predictionType: 'scoreline' as const,
  utcDate: '2026-08-15T18:30:00.000Z',
  requestedAt: '2026-08-14T04:07:00.000Z',
};

describe('Repair-Turn', () => {
  it('trägt die Frage erneut mit, nicht nur die Formatanweisung', () => {
    const prompt = buildPrompt(EVENT);
    // Genau die Verkettung, die providers/index.mts aufbaut.
    const repairMessage = `${prompt.user}\n\n---\n\n${buildRepairPrompt('scoreline', 'kaputt')}`;

    expect(repairMessage).toContain('Bayern München – Real Madrid');
    expect(repairMessage).toContain('Score after 90 minutes');
    expect(repairMessage).toContain('2026-08-15T18:30:00.000Z');
    expect(repairMessage).toContain('unchanged in substance');
  });

  it('fordert dasselbe Schema wie der erste Versuch', () => {
    expect(buildRepairPrompt('numeric', 'kein JSON')).toContain('"kind": "numeric"');
  });
});

describe('HARNESS_V2: kein Abruf externer Quellen', () => {
  it('sagt dem Modell ausdrücklich, dass es nichts nachschlagen kann', () => {
    /*
     * Entscheidend für die Vergleichbarkeit: Alle Modelle laufen ohne
     * Suchwerkzeug. Wüsste ein Modell das nicht, würde es Recherche behaupten
     * oder darauf warten – und die Antworten wären nicht mehr unter gleichen
     * Bedingungen entstanden.
     */
    expect(SYSTEM_PROMPT).toContain('NO access to the internet');
    expect(SYSTEM_PROMPT).toContain('Every competitor runs under this same restriction');
    const prompt = buildPrompt(EVENT);
    expect(prompt.user).toContain('No search, no tools, no internet');
  });

  it('fordert keine Quellenangaben an – ohne Abruf wären sie erfunden', () => {
    for (const type of ['scoreline', 'numeric', 'binary'] as const) {
      expect(typeBlock(type), `${type} verlangt noch sources`).not.toContain('"sources"');
    }
    expect(SYSTEM_PROMPT).toContain('Do not invent sources');
  });

  it('trägt die Versionskennung, unter der die Werte entstanden sind', () => {
    // Werte verschiedener Harness-Versionen dürfen nie gemischt werden.
    expect(HARNESS_VERSION).toBe('HARNESS_V2');
    expect(buildPrompt(EVENT).user).toContain(HARNESS_VERSION);
  });
});

describe('costUsd', () => {
  const prices = { price_input_usd: 3, price_output_usd: 15, price_search_usd: 0.01 };

  it('rechnet Token-Preise je Million und Suchen je Aufruf', () => {
    const cost = costUsd(prices, { inputTokens: 1_000_000, outputTokens: 0, searchCalls: 0 });
    expect(cost).toBeCloseTo(3, 10);
    expect(costUsd(prices, { inputTokens: 0, outputTokens: 1_000_000, searchCalls: 0 })).toBeCloseTo(15, 10);
    expect(costUsd(prices, { inputTokens: 0, outputTokens: 0, searchCalls: 4 })).toBeCloseTo(0.04, 10);
  });

  it('summiert alle drei Anteile', () => {
    const cost = costUsd(prices, { inputTokens: 5_000, outputTokens: 800, searchCalls: 2 });
    expect(cost).toBeCloseTo(5_000 / 1e6 * 3 + 800 / 1e6 * 15 + 2 * 0.01, 10);
  });

  it('bleibt bei Nullverbrauch bei null', () => {
    expect(costUsd(prices, { inputTokens: 0, outputTokens: 0, searchCalls: 0 })).toBe(0);
  });
});

describe('ProviderError', () => {
  it('trägt bei einer Verweigerung den Verbrauch mit', () => {
    // Verweigerung kommt mit HTTP 200: der Call ist bezahlt, auch ohne Wert.
    const usage = { inputTokens: 4_000, outputTokens: 120, searchCalls: 3 };
    const error = new ProviderError('nope', 'refusal', false, usage);
    expect(error.retryable).toBe(false);
    expect(error.usage).toEqual(usage);
  });

  it('lässt den Verbrauch bei echten Transportfehlern weg', () => {
    const error = new ProviderError('Timeout nach 300000 ms', 'timeout', true);
    expect(error.usage).toBeUndefined();
    expect(error.retryable).toBe(true);
  });
});
