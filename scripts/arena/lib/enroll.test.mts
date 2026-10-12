/**
 * Jede Enrollment-Regel hat hier einen Test – weil jede Regel entweder Geld
 * kostet (zu viel angelegt) oder Aufmerksamkeit (zu wenig).
 */
import { describe, expect, it } from 'vitest';
import { deriveName, isFrontRunner, labOf, planEnrollments, type OwnModel } from './enroll.mts';

const T = 1_760_000_000; // ein fester Zeitpunkt in Unix-Sekunden

const ours: OwnModel[] = [
  { id: 'gpt-6.1', api_model: 'gpt-6.1-sol', color: '#10a37f', price_input_usd: 2, price_output_usd: 10 },
  { id: 'gpt', api_model: 'gpt-5.5', color: '#10a37f', price_input_usd: 5, price_output_usd: 30 },
];

describe('deriveName', () => {
  it('macht aus Bezeichnern lesbare Namen', () => {
    expect(deriveName('gpt-6.1-sol')).toBe('GPT 6.1 Sol');
    expect(deriveName('claude-fable-5-1')).toBe('Claude Fable 5.1');
    expect(deriveName('x-ai/grok-4.7')).toBe('Grok 4.7');
    expect(deriveName('qwen/qwen3.8-max')).toBe('Qwen3.8 Max');
  });
});

describe('isFrontRunner', () => {
  it('lässt nur die vordere Reihe durch', () => {
    expect(isFrontRunner('gpt-6-astra')).toBe(true);
    for (const id of ['gpt-6-luna-mini', 'gpt-5.5-pro', 'gpt-5.6-cyber', 'gpt-realtime', 'text-embedding-4', 'gpt-6-astra-2026-10-01', 'grok-imagine-video']) {
      expect(isFrontRunner(id), id).toBe(false);
    }
    // Mittel- und Sparstufen mit Labor-eigenen Namen: Regression aus dem
    // ersten Live-Lauf, der Haiku und Sonnet 5.5 anlegte statt Opus 5.5.
    for (const id of ['claude-haiku-5-5', 'claude-sonnet-5-5', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gemini-3.6-flash']) {
      expect(isFrontRunner(id), id).toBe(false);
    }
    expect(isFrontRunner('claude-opus-5-5')).toBe(true);
    expect(isFrontRunner('claude-fable-5-1')).toBe(true);
  });
});

describe('planEnrollments', () => {
  const pricing = { 'gpt-6-astra': { input: 10, output: 40 } };

  it('legt nur an, was neuer ist als unser neuestes Modell des Labors', () => {
    const plan = planEnrollments({
      ours,
      pricing,
      catalog: [
        { id: 'gpt-6.1-sol', created: T },
        { id: 'gpt-5.5', created: T - 9000 },
        { id: 'gpt-5.4', created: T - 8000 }, // älter: ein Vorgänger, kein Nachfolger
        { id: 'gpt-6-astra', created: T + 100 },
      ],
    });
    expect(plan.proposals.map((p) => p.api_model)).toEqual(['gpt-6-astra']);
    expect(plan.proposals[0]).toMatchObject({
      id: 'gpt-6-astra',
      name: 'GPT 6 Astra',
      color: '#10a37f',
      price_input_usd: 10,
      price_output_usd: 40,
      priceSource: 'pricing.json',
    });
  });

  it('nimmt ohne Preisangabe den höchsten Preis des Labors – nie zu niedrig', () => {
    const plan = planEnrollments({
      ours,
      pricing: {},
      // "nova" ist kein bekanntes Stufenwort – terra/luna sind inzwischen
      // bewusst ausgeschlossen und taugen hier nicht mehr als Beispiel.
      catalog: [{ id: 'gpt-6.1-sol', created: T }, { id: 'gpt-6-nova', created: T + 1 }],
    });
    expect(plan.proposals[0]).toMatchObject({ price_input_usd: 5, price_output_usd: 30, priceSource: 'lab-max' });
  });

  it('legt nichts an, wenn der Preis die Obergrenze reißt – meldet es aber', () => {
    const plan = planEnrollments({
      ours,
      pricing: { 'gpt-6-astra': { input: 30, output: 180 } },
      catalog: [{ id: 'gpt-6.1-sol', created: T }, { id: 'gpt-6-astra', created: T + 1 }],
      maxOutputPriceUsd: 60,
    });
    expect(plan.proposals).toEqual([]);
    expect(plan.skipped.join(' ')).toMatch(/gpt-6-astra.*Obergrenze/);
  });

  it('hält das Tageslimit ein und nennt den Rest', () => {
    const plan = planEnrollments({
      ours,
      pricing: {},
      catalog: [
        { id: 'gpt-6.1-sol', created: T },
        { id: 'gpt-6-a', created: T + 3 },
        { id: 'gpt-6-b', created: T + 2 },
        { id: 'gpt-6-c', created: T + 1 },
      ],
      maxPerRun: 2,
    });
    // neueste zuerst
    expect(plan.proposals.map((p) => p.api_model)).toEqual(['gpt-6-a', 'gpt-6-b']);
    expect(plan.skipped.join(' ')).toMatch(/gpt-6-c.*Tageslimit/);
  });

  it('lässt stillgelegte Zeilen die Schwelle nicht anheben', () => {
    // Regression aus dem ersten Live-Lauf: Die am selben Tag erschienenen,
    // danach stillgelegten Haiku/Sonnet 5.5 hoben die Schwelle auf ihr
    // Datum – und Opus 5.5 galt plötzlich nicht mehr als "neuer".
    const withRetired: OwnModel[] = [
      { id: 'claude-5.1', api_model: 'claude-fable-5-1', color: '#d97757', price_input_usd: 10, price_output_usd: 50 },
      { id: 'claude-haiku-5-5', api_model: 'claude-haiku-5-5', color: '#d97757', price_input_usd: 10, price_output_usd: 50, enabled: false },
    ];
    const plan = planEnrollments({
      ours: withRetired,
      pricing: { 'claude-opus-5-5': { input: 4, output: 20 } },
      catalog: [
        { id: 'claude-fable-5-1', created: T },
        { id: 'claude-haiku-5-5', created: T + 500 },
        { id: 'claude-opus-5-5', created: T + 500 },
      ],
    });
    expect(plan.proposals.map((p) => p.api_model)).toEqual(['claude-opus-5-5']);
    expect(plan.proposals[0]).toMatchObject({ price_input_usd: 4, price_output_usd: 20, priceSource: 'pricing.json' });
  });

  it('legt nichts an, wenn keine Schwelle bestimmbar ist', () => {
    // Keines unserer Modelle im Katalog (etwa: alle verschwunden) – ohne
    // Vergleichspunkt würde "neuer als" alles anlegen.
    const plan = planEnrollments({ ours, pricing: {}, catalog: [{ id: 'gpt-6-astra', created: T }] });
    expect(plan.proposals).toEqual([]);
    expect(plan.skipped[0]).toMatch(/keine Schwelle/);
  });

  it('arbeitet je Lab-Präfix und fasst Gateway-Labore nicht zusammen', () => {
    const gateway: OwnModel[] = [
      { id: 'kimi-k3', api_model: 'moonshotai/kimi-k3', color: '#ec4899', price_input_usd: 3, price_output_usd: 15 },
      { id: 'glm', api_model: 'z-ai/glm-5.2', color: '#14b8a6', price_input_usd: 1.4, price_output_usd: 4.4 },
    ];
    const plan = planEnrollments({
      ours: gateway,
      pricing: {},
      catalog: [
        { id: 'moonshotai/kimi-k3', created: T },
        { id: 'moonshotai/kimi-k4', created: T + 5 },
        { id: 'z-ai/glm-5.2', created: T },
        { id: 'z-ai/glm-5.3', created: T + 5 },
        { id: 'qwen/qwen4-max', created: T + 9 }, // Labor nicht bei uns → nie automatisch
      ],
    });
    expect(plan.proposals.map((p) => p.api_model).sort()).toEqual(['moonshotai/kimi-k4', 'z-ai/glm-5.3']);
    expect(plan.proposals.find((p) => p.api_model === 'z-ai/glm-5.3')).toMatchObject({ id: 'glm-5.3', color: '#14b8a6', price_output_usd: 4.4 });
    expect(labOf('qwen/qwen4-max')).toBe('qwen');
  });
});
