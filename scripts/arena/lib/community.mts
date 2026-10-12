/**
 * Community-Beiträge: Wann bekommt der öffentliche Discord eine Rangliste,
 * und wie klingt sie?
 *
 * Reine Entscheidungslogik ohne Netz und Datenbank, damit jede Regel einen
 * Test hat. Der Job (jobs/community.mts) liefert die Karten aus dem Build
 * (dist/arena/share/<id>.json) und führt die Beiträge aus.
 *
 * Die Regeln, jede mit ihrem Grund:
 *
 *  1. Nur Karten mit mindestens zwei Teilnehmern – eine Rangliste mit einem
 *     Eintrag ist keine.
 *  2. Erst wieder, wenn seit dem letzten Beitrag MIN_NEW_RESOLVED weitere
 *     Ereignisse aufgelöst sind. Ein Beitrag pro Ereignis wäre bei täglichen
 *     Krypto-Schlusskursen Lärm; nach drei neuen Datenpunkten hat sich die
 *     Rangliste wirklich bewegt – oder bemerkenswert nicht.
 *  3. Nie zweimal binnen MIN_HOURS_BETWEEN Stunden für dieselbe Karte, auch
 *     wenn viele Ereignisse auf einmal auflösen (Liga-Wochenende).
 *
 * Der Text spricht in der Alltagszahl (src/arena/lib/plain): „58 % der
 * Spiele richtig", daneben, was die stumpfe Regel schafft. Kein Score, kein
 * Fachwort. Überschrift und Vergleichswert kommen fertig aus dem Build –
 * derselben Quelle wie das Bild darunter.
 */

export interface CommunityRow {
  name: string;
  /** Die Alltagszahl, fertig formatiert: "58.2 %" */
  formatted: string;
}

export interface CommunityCard {
  id: string;
  title: string;
  /** Die Alltagszahl als Spaltenkopf: "Right outcome" */
  label: string;
  headline: string | null;
  /** true = Reihenfolge der ersten beiden kann noch kippen */
  closeCall: boolean;
  reference: { label: string; formatted: string } | null;
  resolvedEvents: number;
  rows: CommunityRow[];
}

export interface PostedEntry {
  resolvedEvents: number;
  at: string;
}

export type PostedState = Record<string, PostedEntry>;

export const LEADERBOARD_URL = 'https://www.futurebench.ai/arena/leaderboards';

export function planCommunityPosts(params: {
  cards: CommunityCard[];
  posted: PostedState;
  now: Date;
  minNewResolved?: number;
  minHoursBetween?: number;
}): { posts: CommunityCard[]; skipped: string[] } {
  const minNew = params.minNewResolved ?? 3;
  const minHours = params.minHoursBetween ?? 20;
  const posts: CommunityCard[] = [];
  const skipped: string[] = [];

  for (const card of params.cards) {
    if (card.rows.length < 2) {
      skipped.push(`${card.id}: nur ${card.rows.length} Teilnehmer`);
      continue;
    }
    const previous = params.posted[card.id];
    const delta = card.resolvedEvents - (previous?.resolvedEvents ?? 0);
    if (delta < minNew) {
      skipped.push(`${card.id}: erst ${delta} neue Ereignisse seit dem letzten Beitrag (Schwelle ${minNew})`);
      continue;
    }
    if (previous) {
      const hours = (params.now.getTime() - Date.parse(previous.at)) / 3_600_000;
      if (hours < minHours) {
        skipped.push(`${card.id}: letzter Beitrag vor ${hours.toFixed(1)} h (Mindestabstand ${minHours} h)`);
        continue;
      }
    }
    posts.push(card);
  }
  return { posts, skipped };
}

/** Nach einem erfolgreichen Beitrag: der neue Merkzustand für diese Karte. */
export function markPosted(state: PostedState, card: CommunityCard, now: Date): PostedState {
  return { ...state, [card.id]: { resolvedEvents: card.resolvedEvents, at: now.toISOString() } };
}

const PROMISE = 'every prediction published before the event · no internet access';
const CLOSE_CALL = 'Places 1 and 2 are close enough that the order may still flip.';

/**
 * Der Beitragstext, englisch wie die Karte und die Seite.
 *
 *   **Football leagues** — GPT-5.5 called 58.2 % of matches right
 *   Always home win: 45.0 % · 201 events · every prediction published …
 *   1. GPT-5.5 58.2 %
 *   …
 *   Places 1 and 2 are close enough that the order may still flip.
 *   Full leaderboard: …
 */
export function communityMessage(card: CommunityCard): string {
  const headline = card.headline ?? card.label;
  const context = [
    card.reference ? `${card.reference.label}: ${card.reference.formatted}` : null,
    `${card.resolvedEvents} events`,
    PROMISE,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
  const lines = [
    `**${card.title}** — ${headline}`,
    context,
    ...card.rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.name} ${row.formatted}`),
  ];
  if (card.closeCall) lines.push(CLOSE_CALL);
  lines.push(`Full leaderboard: ${LEADERBOARD_URL}`);
  return lines.join('\n');
}
