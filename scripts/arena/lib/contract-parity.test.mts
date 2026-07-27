/**
 * Paritätstest: Die Backend-Validierung (contract.mts) muss sich exakt wie die
 * Frontend-Handler verhalten.
 *
 * Warum es zwei Implementierungen gibt: Der Runner läuft über
 * `node --experimental-strip-types` und kann die extensionslosen Imports der
 * Frontend-Module nicht auflösen. Dieser Test macht Drift unmöglich – jeder
 * Unterschied schlägt sofort fehl.
 */
import { describe, expect, it } from 'vitest';
import { validatePredictionValue, validateResolution } from './contract.mts';
import { binaryHandler } from '../../../src/arena/lib/prediction-types/binary.ts';
import { numericHandler } from '../../../src/arena/lib/prediction-types/numeric.ts';
import { scorelineHandler } from '../../../src/arena/lib/prediction-types/scoreline.ts';

const HANDLERS = {
  scoreline: scorelineHandler,
  numeric: numericHandler,
  binary: binaryHandler,
} as const;

/** Fälle, die jede Implementierung gleich beurteilen muss. */
const CASES: unknown[] = [
  null,
  undefined,
  42,
  'scoreline',
  {},
  { kind: 'scoreline', home: 2, away: 1 },
  { kind: 'scoreline', home: 0, away: 0 },
  { kind: 'scoreline', home: 2 },
  { kind: 'scoreline', home: -1, away: 0 },
  { kind: 'scoreline', home: 1.5, away: 0 },
  { kind: 'scoreline', home: '2', away: '1' },
  { kind: 'scoreline', home: NaN, away: 0 },
  { kind: 'numeric', value: 4512.3 },
  { kind: 'numeric', value: -12 },
  { kind: 'numeric', value: 0 },
  { kind: 'numeric', value: NaN },
  { kind: 'numeric', value: Infinity },
  { kind: 'numeric' },
  { kind: 'numeric', value: '4512' },
  { kind: 'binary', probability: 0 },
  { kind: 'binary', probability: 1 },
  { kind: 'binary', probability: 0.62 },
  { kind: 'binary', probability: 1.2 },
  { kind: 'binary', probability: -0.1 },
  { kind: 'binary', probability: '0.5' },
  { kind: 'binary', outcome: true },
  { kind: 'binary', outcome: 'ja' },
];

describe('Datenvertrag: Backend spiegelt Frontend', () => {
  for (const [type, handler] of Object.entries(HANDLERS)) {
    it(`validate() stimmt für ${type} überein`, () => {
      for (const value of CASES) {
        expect(
          validatePredictionValue(type as keyof typeof HANDLERS, value),
          `validate(${JSON.stringify(value)})`,
        ).toBe(handler.validate(value));
      }
    });

    it(`validateResolution() stimmt für ${type} überein`, () => {
      for (const value of CASES) {
        expect(
          validateResolution(type as keyof typeof HANDLERS, value),
          `validateResolution(${JSON.stringify(value)})`,
        ).toBe(handler.validateResolution(value));
      }
    });
  }

  it('unterscheidet binary-Vorhersage (Wahrscheinlichkeit) von binary-Ergebnis (Boolean)', () => {
    expect(validatePredictionValue('binary', { kind: 'binary', probability: 0.7 })).toBe(true);
    expect(validatePredictionValue('binary', { kind: 'binary', outcome: true })).toBe(false);
    expect(validateResolution('binary', { kind: 'binary', outcome: true })).toBe(true);
    expect(validateResolution('binary', { kind: 'binary', probability: 0.7 })).toBe(false);
  });
});
