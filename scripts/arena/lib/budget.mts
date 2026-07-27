/**
 * Budget-Guard: harte Ausgaben-Caps aus der budget-Tabelle (im Studio ohne
 * Deploy änderbar). assertBudget() läuft vor Run-Start UND nach jedem
 * Event-Batch – Überschreitung wirft BudgetExceeded, runJob() macht daraus
 * ABORTED_BUDGET mit Exit 0.
 */
import { db, unwrap } from './db.mts';

export class BudgetExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceeded';
  }
}

export interface BudgetState {
  todayUsd: number;
  monthUsd: number;
  dailyCapUsd: number;
  monthlyCapUsd: number;
  /** true ab warn_ratio (Default 80 %) des Monats-Caps */
  warn: boolean;
}

export async function readBudget(): Promise<BudgetState> {
  const caps = unwrap(
    await db().from('budget').select('monthly_cap_usd, daily_cap_usd, warn_ratio').eq('id', 1).single(),
    'budget lesen',
  ) as { monthly_cap_usd: number; daily_cap_usd: number; warn_ratio: number };
  const spend = unwrap(
    await db().from('v_spend').select('today_usd, month_usd').single(),
    'v_spend lesen',
  ) as { today_usd: number; month_usd: number };

  return {
    todayUsd: Number(spend.today_usd),
    monthUsd: Number(spend.month_usd),
    dailyCapUsd: Number(caps.daily_cap_usd),
    monthlyCapUsd: Number(caps.monthly_cap_usd),
    warn: Number(spend.month_usd) >= Number(caps.monthly_cap_usd) * Number(caps.warn_ratio),
  };
}

export async function assertBudget(): Promise<BudgetState> {
  const state = await readBudget();
  if (state.todayUsd >= state.dailyCapUsd) {
    throw new BudgetExceeded(
      `Tages-Cap erreicht: ${state.todayUsd.toFixed(2)} $ von ${state.dailyCapUsd} $.`,
    );
  }
  if (state.monthUsd >= state.monthlyCapUsd) {
    throw new BudgetExceeded(
      `Monats-Cap erreicht: ${state.monthUsd.toFixed(2)} $ von ${state.monthlyCapUsd} $.`,
    );
  }
  return state;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  searchCalls: number;
}

/** Kosten eines Calls aus den Preisspalten des Modells (USD, Preise je 1M Tokens). */
export function costUsd(
  prices: { price_input_usd: number; price_output_usd: number; price_search_usd: number },
  usage: Usage,
): number {
  return (
    (usage.inputTokens / 1_000_000) * Number(prices.price_input_usd) +
    (usage.outputTokens / 1_000_000) * Number(prices.price_output_usd) +
    usage.searchCalls * Number(prices.price_search_usd)
  );
}

export interface CostRecord {
  runId: string;
  modelId: string | null;
  purpose: 'predict' | 'repair' | 'resolve' | 'scout' | 'gate';
  category?: string;
  eventId?: string;
  usage: Usage;
  costUsd: number;
  latencyMs?: number;
  status: string;
}

/** Jeder Call (auch Fehlversuche) wird erfasst – Basis des Budget-Guards. */
export async function recordCost(cost: CostRecord): Promise<void> {
  const { error } = await db().from('api_costs').insert({
    run_id: cost.runId,
    model_id: cost.modelId,
    purpose: cost.purpose,
    category: cost.category ?? null,
    event_id: cost.eventId ?? null,
    input_tokens: cost.usage.inputTokens,
    output_tokens: cost.usage.outputTokens,
    search_calls: cost.usage.searchCalls,
    cost_usd: cost.costUsd,
    latency_ms: cost.latencyMs ?? null,
    status: cost.status,
  });
  // Kosten-Logging darf einen Lauf nie stoppen – aber laut sein.
  if (error) console.error(`api_costs schreiben: ${error.message}`);
}
