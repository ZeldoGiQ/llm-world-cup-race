/**
 * Run-Tracking: jede Job-Ausführung hinterlässt genau eine Zeile in `runs` –
 * die Monitoring-Wahrheit (verlinkt über gh_run_id in die Actions-Logs).
 */
import { db, unwrap } from './db.mts';

export type RunStatus = 'OK' | 'FAILED' | 'ABORTED_BUDGET';

export async function startRun(job: string): Promise<string> {
  const row = unwrap<{ id: string }>(
    await db()
      .from('runs')
      .insert({ job, gh_run_id: process.env.GITHUB_RUN_ID ?? null })
      .select('id')
      .single(),
    `Run "${job}" anlegen`,
  );
  return row.id;
}

export async function finishRun(
  runId: string,
  status: RunStatus,
  stats: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await db()
    .from('runs')
    .update({ status, stats, finished_at: new Date().toISOString() })
    .eq('id', runId);
  if (error) console.error(`Run ${runId} abschließen: ${error.message}`);
}

/**
 * Standard-Rahmen für jeden Job: Run anlegen, Arbeit ausführen, Status setzen.
 * BudgetExceeded (name-basiert erkannt) → ABORTED_BUDGET + Exit 0 (gewollt).
 * Jeder andere Fehler → FAILED + Exit 1 (roter Workflow, GitHub-Mail).
 */
export async function runJob(
  job: string,
  work: (runId: string) => Promise<Record<string, unknown>>,
): Promise<void> {
  const runId = await startRun(job);
  try {
    const stats = await work(runId);
    await finishRun(runId, 'OK', stats);
    console.log(`${job}: OK ${JSON.stringify(stats)}`);
  } catch (error) {
    if (error instanceof Error && error.name === 'BudgetExceeded') {
      await finishRun(runId, 'ABORTED_BUDGET', { message: error.message });
      console.log(`${job}: ABORTED_BUDGET – ${error.message}`);
      process.exit(0); // gewolltes Verhalten, kein roter Workflow
    }
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(runId, 'FAILED', { message });
    console.error(`${job}: FAILED – ${message}`);
    process.exit(1);
  }
}
