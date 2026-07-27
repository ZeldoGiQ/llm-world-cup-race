/**
 * Backend-Spiegel der Frontend-Validierung (H3: Output = Speicherformat).
 *
 * Die Regeln sind exakt die der PredictionType-Handler in
 * src/arena/lib/prediction-types/ – dorthin kann der Node-Runner nicht direkt
 * importieren (extensionslose Imports im Frontend, strip-types verlangt
 * explizite Endungen). Drift ist trotzdem unmöglich: der Paritätstest
 * scripts/arena/lib/contract-parity.test.ts prüft beide Implementierungen
 * gegen dieselbe Fall-Tabelle.
 */

export type PredictionTypeId = 'scoreline' | 'numeric' | 'binary';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Ganzzahl >= 0 – für Tore/Score-Werte. */
function isGoalCount(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

/** Spiegel von handler.validate() – niemals koerzieren, nur prüfen. */
export function validatePredictionValue(type: PredictionTypeId, value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (type) {
    case 'scoreline':
      return v.kind === 'scoreline' && isGoalCount(v.home) && isGoalCount(v.away);
    case 'numeric':
      return v.kind === 'numeric' && isFiniteNumber(v.value);
    case 'binary':
      return v.kind === 'binary' && isProbability(v.probability);
  }
}

/** Spiegel von handler.validateResolution(). */
export function validateResolution(type: PredictionTypeId, value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (type) {
    case 'scoreline':
      return v.kind === 'scoreline' && isGoalCount(v.home) && isGoalCount(v.away);
    case 'numeric':
      return v.kind === 'numeric' && isFiniteNumber(v.value);
    case 'binary':
      return v.kind === 'binary' && typeof v.outcome === 'boolean';
  }
}
