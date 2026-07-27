/**
 * Job "analytics" – Tages-Snapshot, Kosten-Digest, Invarianten-Check, Janitor.
 *
 * Der Invarianten-Check ist der wichtigste Teil: er prüft täglich, dass keine
 * Prediction nach dem Lock ihres Events entstanden ist. Diese Invariante trägt
 * die ganze Zitierfähigkeit – sie wird nicht angenommen, sondern gemessen.
 *
 *   node --experimental-strip-types scripts/arena/jobs/analytics.mts
 */
import { readBudget } from '../lib/budget.mts';
import { db, unwrap } from '../lib/db.mts';
import { notifyDiscord } from '../lib/notify.mts';
import { runJob } from '../lib/runs.mts';

/** Läuft länger als das? Dann ist der Actions-Job abgestürzt, nicht aktiv. */
const STALE_RUN_HOURS = 6;

async function main(): Promise<void> {
  await runJob('analytics', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Hängende Runs aufräumen (Actions-Abbruch hinterlässt RUNNING).
    const staleBefore = new Date(Date.now() - STALE_RUN_HOURS * 3_600_000).toISOString();
    const { data: stale } = await db()
      .from('runs')
      .update({ status: 'FAILED', finished_at: new Date().toISOString() })
      .eq('status', 'RUNNING')
      .lt('started_at', staleBefore)
      .select('id');

    // 2. Invariante: keine Prediction nach dem Lock ihres Events.
    const predictions = unwrap(
      await db().from('predictions').select('category, event_id, model_id, created_at'),
      'predictions lesen',
    ) as { category: string; event_id: string; model_id: string; created_at: string }[];
    const events = unwrap(
      await db().from('events').select('category, id, utc_date, status'),
      'events lesen',
    ) as { category: string; id: string; utc_date: string; status: string }[];

    const lockByEvent = new Map(events.map((e) => [`${e.category} ${e.id}`, e.utc_date]));
    const violations = predictions.filter((p) => {
      const lock = lockByEvent.get(`${p.category} ${p.event_id}`);
      return lock !== undefined && p.created_at > lock;
    });

    // 3. Abdeckung: aufgelöste Events mit auffällig wenigen Tipps.
    const countByEvent = new Map<string, number>();
    for (const p of predictions) {
      const key = `${p.category} ${p.event_id}`;
      countByEvent.set(key, (countByEvent.get(key) ?? 0) + 1);
    }
    const resolvedEvents = events.filter((e) => e.status === 'RESOLVED');
    const thin = resolvedEvents.filter((e) => (countByEvent.get(`${e.category} ${e.id}`) ?? 0) < 2);

    // 4. Fehlerquote je Modell (letzte 24 h).
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const costs = unwrap(
      await db().from('api_costs').select('model_id, status, cost_usd').gte('created_at', since),
      'api_costs lesen',
    ) as { model_id: string | null; status: string; cost_usd: number }[];

    const byModel: Record<string, { calls: number; errors: number; costUsd: number }> = {};
    for (const cost of costs) {
      const key = cost.model_id ?? 'unknown';
      byModel[key] ??= { calls: 0, errors: 0, costUsd: 0 };
      byModel[key].calls += 1;
      if (cost.status !== 'ok') byModel[key].errors += 1;
      byModel[key].costUsd += Number(cost.cost_usd);
    }
    for (const key of Object.keys(byModel)) {
      byModel[key].costUsd = Math.round(byModel[key].costUsd * 10_000) / 10_000;
    }

    const budget = await readBudget();
    const dayOfMonth = new Date().getUTCDate();
    const forecastUsd = Math.round((budget.monthUsd / dayOfMonth) * 30 * 100) / 100;

    const stats = {
      events: events.length,
      resolved: resolvedEvents.length,
      predictions: predictions.length,
      lockViolations: violations.length,
      thinlyCovered: thin.length,
      staleRunsClosed: stale?.length ?? 0,
      spendTodayUsd: Math.round(budget.todayUsd * 100) / 100,
      spendMonthUsd: Math.round(budget.monthUsd * 100) / 100,
      forecastMonthUsd: forecastUsd,
      byModel,
    };

    await db().from('analytics_daily').upsert({ day: today, stats }, { onConflict: 'day' });

    // Digest nur mit Substanz: Kosten immer, Probleme hervorgehoben.
    const lines = [
      `**FutureBench Digest ${today}**`,
      `Spend: ${stats.spendMonthUsd} $ MTD (Prognose ${forecastUsd} $ / Cap ${budget.monthlyCapUsd} $), heute ${stats.spendTodayUsd} $`,
      `Events: ${stats.events} (${stats.resolved} aufgelöst) · Predictions: ${stats.predictions}`,
    ];
    if (violations.length > 0) {
      lines.push(
        `🚨 **${violations.length} Prediction(s) nach dem Lock** – nicht exportiert, Ursache prüfen: ` +
          violations.slice(0, 5).map((v) => `${v.category}/${v.event_id}/${v.model_id}`).join(', '),
      );
    }
    if (thin.length > 0) {
      lines.push(`⚠️ ${thin.length} aufgelöste Events mit weniger als 2 Tipps.`);
    }
    const badModels = Object.entries(byModel).filter(([, m]) => m.calls >= 3 && m.errors / m.calls > 0.3);
    if (badModels.length > 0) {
      lines.push(
        `⚠️ Hohe Fehlerquote: ` +
          badModels.map(([id, m]) => `${id} ${m.errors}/${m.calls}`).join(', '),
      );
    }
    if (budget.warn) lines.push(`⚠️ Budget-Warnschwelle erreicht.`);

    await notifyDiscord(lines.join('\n'));

    return stats;
  });
}

await main();
