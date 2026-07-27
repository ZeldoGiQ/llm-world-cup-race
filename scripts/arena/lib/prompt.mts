/**
 * Prompt-Bau + Hash für den Runner.
 *
 * Der Text kommt aus src/arena/lib/harness/prompt-template.ts – dieselbe Datei,
 * die die Methodik-Seite rendert. Damit kann die veröffentlichte Methodik nie
 * von dem abweichen, was tatsächlich gesendet wurde.
 *
 * Der Hash deckt System- UND User-Prompt plus die Harness-Version ab: jede
 * Änderung am Wettkampf-Text ist an den Predictions erkennbar.
 */
import { createHash } from 'node:crypto';
import { HARNESS_VERSION } from '../../../src/arena/lib/harness/config.ts';
import {
  SYSTEM_PROMPT,
  buildRepairPrompt,
  buildUserPrompt,
  type PromptEvent,
  type PredictionTypeId,
} from '../../../src/arena/lib/harness/prompt-template.ts';

export { HARNESS_VERSION, SYSTEM_PROMPT, buildRepairPrompt, buildUserPrompt };
export type { PromptEvent, PredictionTypeId };

export function promptHash(systemPrompt: string, userPrompt: string): string {
  return createHash('sha256')
    .update(`${HARNESS_VERSION}\n\n${systemPrompt}\n\n${userPrompt}`)
    .digest('hex');
}

export interface BuiltPrompt {
  system: string;
  user: string;
  hash: string;
}

export function buildPrompt(event: PromptEvent): BuiltPrompt {
  const user = buildUserPrompt(event);
  return { system: SYSTEM_PROMPT, user, hash: promptHash(SYSTEM_PROMPT, user) };
}
