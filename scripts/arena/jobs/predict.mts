/**
 * Job "predict" – die Modelle treten an.
 *
 * Wählt alle (Event × Modell)-Paare im Vorhersagefenster, für die noch keine
 * Prediction existiert, und lässt jedes aktive Modell unter HARNESS_V1 antworten.
 *
 * Fairness: Alle Modelle eines Events werden im selben Batch zum selben
 * requestedAt befragt – niemand bekommt frischere Informationen als ein anderer.
 *
 * Budget: assertBudget() vor dem Start und nach jedem Event-Batch. MAX_CALLS_PER_RUN
 * ist ein zweiter, DB-unabhängiger Hard-Stop.
 *
 *   node --experimental-strip-types scripts/arena/jobs/predict.mts
 */
import { assertBudget } from '../lib/budget.mts';
import { db, opsConfig, unwrap, type EventRow, type ModelRow, type ProviderRow } from '../lib/db.mts';
import { getSecret } from '../lib/env.mts';
import { notifyDiscord } from '../lib/notify.mts';
import { runJob } from '../lib/runs.mts';
import { askModel } from '../providers/index.mts';
import { CATEGORY_LABELS } from '../lib/registry-export.mts';
import type { PromptEvent } from '../lib/prompt.mts';

/** Wie viele Modelle gleichzeitig antworten (verschiedene Anbieter, daher parallel). */
const MODEL_CONCURRENCY = 3;

/** Was genau vorhergesagt wird – muss zur `question` des Deskriptors passen. */
const CATEGORY_QUESTIONS: Record<string, string> = {
  'football-worldcup': 'Score after 120 minutes (penalty shootouts excluded)',
  'football-leagues': 'Score after 90 minutes',
  crypto: 'Closing price at 00:00 UTC, in USD',
  'stocks-index': 'Friday closing level, in index points',
  elections: 'Probability that the statement turns out true',
  'sports-mixed': 'Score after 90 minutes',
};

function promptEvent(event: EventRow, requestedAt: string): PromptEvent {
  const metadata = event.metadata ?? {};
  const context = Array.isArray(metadata.context)
    ? (metadata.context as unknown[]).filter((line): line is string => typeof line === 'string')
    : undefined;

  return {
    category: event.category,
    categoryLabel: CATEGORY_LABELS[event.category] ?? event.category,
    question: CATEGORY_QUESTIONS[event.category] ?? 'Outcome of this event',
    title: event.title,
    predictionType: event.prediction_type,
    utcDate: event.utc_date,
    requestedAt,
    resolutionRule: typeof metadata.resolutionRule === 'string' ? metadata.resolutionRule : undefined,
    context,
  };
}

/** Arbeitspakete in Blöcken abarbeiten – begrenzte Parallelität, klare Logs. */
async function inChunks<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(work));
  }
}

async function main(): Promise<void> {
  await runJob('predict', async (runId) => {
    await assertBudget();

    const window = await opsConfig<{ minLeadHours: number; maxLeadHours: number }>(
      'predict_window',
      { minLeadHours: 2, maxLeadHours: 48 },
    );
    const maxCalls = Number(await opsConfig<number>('max_calls_per_run', 400));

    const now = Date.now();
    const from = new Date(now + window.minLeadHours * 3_600_000).toISOString();
    const to = new Date(now + window.maxLeadHours * 3_600_000).toISOString();

    const events = unwrap(
      await db()
        .from('events')
        .select('*')
        .eq('status', 'UPCOMING')
        .gte('utc_date', from)
        .lte('utc_date', to)
        .order('utc_date'),
      'fällige Events lesen',
    ) as EventRow[];

    const models = (
      unwrap(await db().from('models').select('*').eq('enabled', true).order('id'), 'models lesen') as ModelRow[]
    ).filter((model) => !model.retired_at);

    const providers = unwrap(
      await db().from('providers').select('*').eq('enabled', true),
      'providers lesen',
    ) as ProviderRow[];
    const providerById = new Map(providers.map((p) => [p.id, p]));

    if (events.length === 0 || models.length === 0) {
      return { events: events.length, models: models.length, predictions: 0 };
    }

    // Bereits vorhandene Predictions und Failures: nichts doppelt anfragen.
    const eventIds = events.map((e) => e.id);
    const existing = unwrap(
      await db().from('predictions').select('category, event_id, model_id').in('event_id', eventIds),
      'vorhandene Predictions lesen',
    ) as { category: string; event_id: string; model_id: string }[];
    const done = new Set(existing.map((p) => `${p.category} ${p.event_id} ${p.model_id}`));

    let predictions = 0;
    let failures = 0;
    let calls = 0;
    const skippedModels = new Set<string>();

    for (const event of events) {
      // Letzte Schranke vor dem Geldausgeben: Zwischen Abfrage und Bearbeitung
      // können Minuten liegen, und der Ingest-Job kann einen Termin
      // vorgezogen haben. Ein Tipp nach dem Lock wäre wertlos und würde nur
      // Kosten erzeugen.
      if (Date.parse(event.utc_date) <= Date.now()) {
        console.log(`${event.category}/${event.id}: Lock bereits vorbei – übersprungen.`);
        continue;
      }

      // Ein Zeitstempel für ALLE Modelle dieses Events – gleiche Informationslage.
      const requestedAt = new Date().toISOString();
      const built = promptEvent(event, requestedAt);
      const todo = models.filter((model) => !done.has(`${event.category} ${event.id} ${model.id}`));
      if (todo.length === 0) continue;

      if (calls >= maxCalls) {
        console.log(`MAX_CALLS_PER_RUN (${maxCalls}) erreicht – Rest im nächsten Lauf.`);
        break;
      }

      console.log(`${event.category}/${event.id}: ${event.title} → ${todo.length} Modelle`);

      await inChunks(todo, MODEL_CONCURRENCY, async (model) => {
        const provider = providerById.get(model.provider_id);
        if (!provider) {
          skippedModels.add(`${model.id} (Provider ${model.provider_id} inaktiv)`);
          return;
        }
        if (!getSecret(provider.secret_name)) {
          skippedModels.add(`${model.id} (Secret ${provider.secret_name} fehlt)`);
          return;
        }

        calls += 1;
        const result = await askModel({ runId, provider, model, event: built, eventId: event.id });

        if (result.ok) {
          const { error } = await db().from('predictions').insert({
            category: event.category,
            event_id: event.id,
            model_id: model.id,
            value: result.value,
            // raw = Audit-Spur der tatsächlichen Antwort. Bleibt in der DB und
            // wird nie exportiert oder geloggt (öffentliches Repo).
            raw: result.raw,
            provenance: result.provenance,
            run_id: runId,
          });
          if (error) {
            // Duplikat (paralleler Lauf) ist kein Fehler; alles andere schon.
            if (!error.message.includes('duplicate key')) {
              console.error(`  ${model.id}: Speichern fehlgeschlagen – ${error.message}`);
            }
          } else {
            predictions += 1;
            console.log(`  ${model.id}: ${JSON.stringify(result.value)}`);
          }
        } else {
          failures += 1;
          console.log(`  ${model.id}: kein Tipp (${result.code})`);
          await db().from('prediction_failures').insert({
            category: event.category,
            event_id: event.id,
            model_id: model.id,
            code: result.code,
            detail: result.detail.slice(0, 300),
            run_id: runId,
          });
        }
      });

      // Nach jedem Event-Batch prüfen: der Guard greift mitten im Lauf.
      await assertBudget();
    }

    if (skippedModels.size > 0) {
      console.log(`Übersprungen: ${[...skippedModels].join(', ')}`);
    }

    const budget = await assertBudget().catch(() => null);
    if (budget?.warn) {
      await notifyDiscord(
        `⚠️ FutureBench Budget: ${budget.monthUsd.toFixed(2)} $ von ${budget.monthlyCapUsd} $ ` +
          `im laufenden Monat verbraucht.`,
      );
    }

    return {
      events: events.length,
      models: models.length,
      predictions,
      failures,
      calls,
      skipped: [...skippedModels],
    };
  });
}

await main();
