/**
 * Community-Beiträge: Wann bekommt der öffentliche Discord eine Rangliste?
 *
 * Reine Entscheidungslogik ohne Netz und Datenbank, damit jede Regel einen
 * Test hat. Der Job (jobs/community.mts) liefert die Karten aus dem Build
 * und führt die Beiträge aus.
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
 * Die Überschrift kommt aus verdictFor – derselben Regel wie auf der Karte:
 * Ohne getrennte Konfidenzintervalle wird kein Vorsprung behauptet.
 */
import { verdictFor } from '../../../src/arena/lib/share/card.ts';

export interface CommunityRow {
  name: string;
  score: number;
  ciLow: number | null;
  ciHigh: number | null;
}

export interface CommunityCard {
  id: string;
  title: string;
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

function formatScore(score: number): string {
  const text = score.toFixed(2);
  return score > 0 ? `+${text}` : text.replace('-', '−');
}

/**
 * Der Beitragstext, englisch wie die Karte und die Seite. Die Reihenfolge ist
 * die der Rangliste (nach der Kategorie-Metrik), die Zahl der Prediction
 * Score – genau wie auf der Karte, die darunter hängt.
 */
export function communityMessage(card: CommunityCard): string {
  const verdict = verdictFor(card.rows.map((row) => ({ ...row, color: '', logoMarkup: null })));
  const headline = verdict ? ` — ${verdict.text}` : '';
  const lines = [
    `**${card.title}**${headline}`,
    `${card.resolvedEvents} events resolved · every prediction published before its event · knowledge cap`,
    ...card.rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.name} ${formatScore(row.score)}`),
    `Full leaderboard: ${LEADERBOARD_URL}`,
  ];
  return lines.join('\n');
}
