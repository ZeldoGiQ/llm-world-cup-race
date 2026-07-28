/**
 * HARNESS_V2 – das eine Prompt-Template für ALLE Modelle, ohne Recherche.
 *
 * H1 Ein Template, versioniert: Der Text steht hier und nur hier; der Runner
 *    hasht den fertigen Prompt (SHA-256) und speichert den Hash je Prediction.
 * H2 Identisch bis auf Syntax: Alle Modelle bekommen denselben System- und
 *    User-Prompt; einzige Abweichung ist der Structured-Output-Mechanismus.
 * H3 Output = Speicherformat: Das geforderte JSON ist exakt die
 *    PredictionValue-Union des Datenvertrags.
 * H5 Anreize offenlegen: Jedes Modell erfährt die Scoring-Regel seines
 *    Event-Typs. Bei Proper Scoring Rules ist das methodisch geboten – ein
 *    Modell, das die Regel nicht kennt, wird für Unwissen bestraft, nicht für
 *    schlechte Prognosen.
 *
 * V2 nimmt allen Modellen die Web-Suche und sagt ihnen das ausdrücklich. Damit
 * arbeiten alle auf exakt derselben Informationsgrundlage: Frage,
 * Auflösungsregel und der Kontextblock des Feeds. Das Feld `sources` ist
 * bewusst aus den Schemata verschwunden – ohne Abrufmöglichkeit wäre es eine
 * Einladung, URLs zu erfinden, und erfundene Quellen im öffentlichen Protokoll
 * wären schlimmer als gar keine.
 *
 * Englisch, weil es die gemeinsame Sprache aller Anbieter ist und Übersetzungen
 * die Vergleichbarkeit brechen würden. Die Methodik-Seite zeigt den Volltext.
 */
// Explizite .ts-Endung: so kann derselbe Modulpfad vom Frontend (Vite,
// allowImportingTsExtensions) UND vom Backend-Runner (node
// --experimental-strip-types verlangt exakte Specifier) geladen werden.
import { HARNESS_VERSION } from './config.ts';

export type PredictionTypeId = 'scoreline' | 'numeric' | 'binary';

export const SYSTEM_PROMPT = `You are competing in FutureBench, a public prediction benchmark for language models.

Real events are scored publicly. Your prediction is committed to a public git repository BEFORE the event begins, so it cannot be changed afterwards. Other frontier models answer the exact same question under the exact same protocol, and the leaderboard is citable.

You have NO access to the internet, to search, or to any tool. Every competitor runs under this same restriction, so nobody can look anything up. The only external information anyone gets is what appears in this message: the question, how it will be resolved, and the context block below. Everything else must come from what you already know.

How to compete well:
- Your knowledge has a cutoff and this event lies after it. Reason from durable structure — relative strength, base rates, historical distributions, how such things usually resolve — rather than from any specific recent report you think you remember.
- Use the context block as the anchor when it gives you one. A stated last known value is the single most informative number you have.
- Do not invent sources, headlines or figures to justify an answer. A confident fabrication scores no better than an honest guess and is visible in the published record.
- Commit to the single answer that maximises your expected score under the stated scoring rule.
- Be calibrated, not brave. Overconfidence is punished by the scoring rule; so is refusing to commit.
- Answer even when uncertain. A missing answer scores nothing at all and is recorded publicly as a failure to answer.

Output discipline:
- End your reply with exactly one fenced \`\`\`json code block containing your answer.
- The JSON schema is fixed and given below. No extra fields, no comments, no trailing text after the block.
- Your reasoning may precede the block in plain prose; only the JSON block is stored as your prediction.`;

/** Typ-spezifischer Block: Scoring-Regel + optimale Strategie + Schema. */
const TYPE_BLOCKS: Record<PredictionTypeId, string> = {
  scoreline: `PREDICTION TYPE: scoreline (final score of a two-sided match)

SCORING RULE (Kicktipp scheme, higher is better):
- 4 points: exact score
- 3 points: correct goal difference (but not the exact score)
- 2 points: correct outcome only (home win / draw / away win)
- 0 points: wrong outcome

Both goal counts must be non-negative integers. Predict the score at the end of the
period the question names — do not add extra time or penalties unless the question
explicitly asks for the result after them.

OUTPUT SCHEMA:
{
  "prediction": { "kind": "scoreline", "home": <integer >= 0>, "away": <integer >= 0> },
  "rationale": "<optional, max 500 characters>"
}`,

  numeric: `PREDICTION TYPE: numeric (a single point estimate)

SCORING RULE (lower is better): absolute error |your value − actual value|.
Aggregated across events as MAE, MAPE and RMSE, and compared against a reference
baseline via a skill score.

Because absolute error is minimised by the MEDIAN of your belief distribution — not
by the mean and not by a dramatic outlier — state the value you consider equally
likely to be too high as too low. Use the exact unit and precision the question
states. Give a plain number: no thousands separators, no currency symbols, no ranges.

OUTPUT SCHEMA:
{
  "prediction": { "kind": "numeric", "value": <number> },
  "rationale": "<optional, max 500 characters>"
}`,

  binary: `PREDICTION TYPE: binary (probability that the statement turns out TRUE)

SCORING RULE (lower is better): Brier score (p − outcome)², plus log loss and
accuracy at the 0.5 threshold as secondary metrics.

These are proper scoring rules: your expected score is best when you report your
TRUE probability. Note that 0 and 1 are almost never optimal — under log loss a
confident wrong answer at exactly 0 or 1 is catastrophic. Do not round to 0.5 to
play safe either; that discards what you do know.

OUTPUT SCHEMA:
{
  "prediction": { "kind": "binary", "probability": <number between 0 and 1> },
  "rationale": "<optional, max 500 characters>"
}`,
};

export interface PromptEvent {
  category: string;
  categoryLabel: string;
  /** Was genau vorhergesagt wird, z. B. "Friday closing price" */
  question: string;
  title: string;
  predictionType: PredictionTypeId;
  /** T_lock in ISO-8601 (UTC) – nach diesem Zeitpunkt zählt keine Antwort mehr. */
  utcDate: string;
  /** Zeitpunkt der Anfrage in ISO-8601 (UTC) – für alle Modelle eines Batches gleich. */
  requestedAt: string;
  /** Wörtlich die bei Event-Erstellung fixierte Auflösungsregel. */
  resolutionRule?: string;
  /** Kategoriespezifischer Kontext (Vorwoche, Liga, Baseline …) als Klartext. */
  context?: string[];
}

/** Baut den User-Prompt. Identisch für alle Modelle – nur Event-Daten variieren. */
export function buildUserPrompt(event: PromptEvent): string {
  const lines = [
    `EVENT: ${event.title}`,
    `CATEGORY: ${event.categoryLabel} (${event.category})`,
    `WHAT TO PREDICT: ${event.question}`,
    `PREDICTION DEADLINE (UTC): ${event.utcDate} — this is when the event locks.`,
    `CURRENT TIME (UTC): ${event.requestedAt}`,
  ];

  if (event.context && event.context.length > 0) {
    lines.push('', 'KNOWN CONTEXT:', ...event.context.map((line) => `- ${line}`));
  }

  if (event.resolutionRule) {
    lines.push(
      '',
      'HOW THIS WILL BE RESOLVED (fixed when the event was created, applied mechanically):',
      event.resolutionRule,
      'If this rule cannot produce exactly one value, the event is voided and scores nothing for anyone.',
    );
  }

  lines.push(
    '',
    TYPE_BLOCKS[event.predictionType],
    '',
    `PROTOCOL: ${HARNESS_VERSION}. No search, no tools, no internet — for you and for every ` +
      `other competitor alike. Answer within this one reply.`,
  );

  return lines.join('\n');
}

/**
 * Repair-Prompt – fest, für alle Modelle identisch, ohne neue Suche.
 *
 * Repariert wird ausschließlich das FORMAT. Der Wert selbst wird nie
 * korrigiert oder gerundet: eine Wahrscheinlichkeit von 1.3 bleibt ungültig,
 * anstatt heimlich zu 1.0 zu werden. Der Fehler ist die Strafe.
 */
export function buildRepairPrompt(type: PredictionTypeId, problem: string): string {
  return [
    `Your previous reply could not be stored: ${problem}`,
    '',
    'Reply again with your prediction, unchanged in substance.',
    'Output exactly one fenced ```json block, nothing after it, matching this schema:',
    '',
    TYPE_BLOCKS[type].split('OUTPUT SCHEMA:')[1].trim(),
  ].join('\n');
}

/** Volltext des Typ-Blocks – für die Methodik-Seite (generiert, nicht kopiert). */
export function typeBlock(type: PredictionTypeId): string {
  return TYPE_BLOCKS[type];
}
