/**
 * Referenz-Teilnehmer „Random-Walk" – die Messlatte für den Skill-Score.
 *
 * Die Prognose ist definitionsgemäß der letzte bekannte Wert („morgen ist wie
 * heute"). Genau der steht beim Anlegen eines Events in `metadata.previousClose`,
 * also lange vor dem Lock – die Baseline entsteht damit unter derselben Regel
 * wie jede Modell-Vorhersage und nicht im Nachhinein.
 *
 * Warum sofort beim Ingest und nicht später: Predictions dürfen nach dem Lock
 * nicht mehr entstehen (Invariante 2). Eine Baseline, die man erst nachträglich
 * berechnet, wäre für vergangene Events dauerhaft nicht mehr eintragbar – die
 * Skill-Score-Spalte bliebe für immer leer.
 */
import { db } from './db.mts';
import type { DraftEvent } from '../sources/types.mts';

/** Muss der Modell-ID entsprechen, auf die die Kategorie-Deskriptoren zeigen. */
export const RANDOM_WALK_MODEL_ID = 'baseline-randomwalk';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Random-Walk-Vorhersagen für neu angelegte numerische Events schreiben.
 *
 * Läuft still ins Leere, wenn die Baseline-Modellzeile fehlt (Migration 004
 * noch nicht eingespielt) – ein fehlender Referenz-Teilnehmer darf den Ingest
 * nicht stoppen.
 */
export async function writeRandomWalkPredictions(
  drafts: DraftEvent[],
  runId: string,
): Promise<number> {
  const candidates = drafts.filter(
    (draft) => draft.predictionType === 'numeric' && isFiniteNumber(draft.metadata.previousClose),
  );
  if (candidates.length === 0) return 0;

  const { data: model } = await db()
    .from('models')
    .select('id')
    .eq('id', RANDOM_WALK_MODEL_ID)
    .maybeSingle();
  if (!model) {
    console.log(
      `Baseline "${RANDOM_WALK_MODEL_ID}" fehlt in der models-Tabelle – ` +
        `Skill-Score bleibt leer. Migration scripts/arena/sql/004_baseline_model.sql einspielen.`,
    );
    return 0;
  }

  const rows = candidates.map((draft) => ({
    category: draft.category,
    event_id: draft.id,
    model_id: RANDOM_WALK_MODEL_ID,
    value: { kind: 'numeric', value: draft.metadata.previousClose as number },
    provenance: {
      baseline: 'random-walk',
      rule: 'Forecast equals the last known value at event creation.',
      previousCloseDate: draft.metadata.previousCloseDate ?? null,
    },
    run_id: runId,
  }));

  // Bestehende Baseline-Zeilen bleiben unberührt: Predictions sind immutabel,
  // ein zweiter Ingest darf sie nicht anfassen.
  const { error } = await db()
    .from('predictions')
    .upsert(rows, { onConflict: 'category,event_id,model_id', ignoreDuplicates: true });
  if (error) {
    console.error(`Baseline-Vorhersagen schreiben: ${error.message}`);
    return 0;
  }

  return rows.length;
}
