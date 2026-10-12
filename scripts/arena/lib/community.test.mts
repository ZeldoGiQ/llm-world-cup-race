import { describe, expect, it } from 'vitest';
import { communityMessage, markPosted, planCommunityPosts, type CommunityCard } from './community.mts';

const now = new Date('2026-10-12T12:00:00Z');
const leagues: CommunityCard = {
  id: 'football-leagues',
  title: 'Football leagues',
  label: 'Right outcome',
  headline: 'GPT-5.5 called 58.2 % of matches right',
  closeCall: true,
  reference: { label: 'Always home win', formatted: '45.0 %' },
  resolvedEvents: 201,
  rows: [
    { name: 'GPT-5.5', formatted: '58.2 %' },
    { name: 'Kimi K3', formatted: '57.0 %' },
  ],
};

describe('planCommunityPosts', () => {
  it('postet eine Karte beim ersten Mal und merkt sich den Stand', () => {
    const plan = planCommunityPosts({ cards: [leagues], posted: {}, now });
    expect(plan.posts.map((c) => c.id)).toEqual(['football-leagues']);
    const state = markPosted({}, leagues, now);
    expect(state['football-leagues']).toEqual({ resolvedEvents: 201, at: now.toISOString() });
  });

  it('wartet auf genug neue Ereignisse', () => {
    const posted = { 'football-leagues': { resolvedEvents: 199, at: '2026-10-01T00:00:00Z' } };
    const plan = planCommunityPosts({ cards: [leagues], posted, now, minNewResolved: 3 });
    expect(plan.posts).toEqual([]);
    expect(plan.skipped[0]).toMatch(/erst 2 neue/);
    const later = planCommunityPosts({ cards: [{ ...leagues, resolvedEvents: 202 }], posted, now, minNewResolved: 3 });
    expect(later.posts).toHaveLength(1);
  });

  it('hält den Mindestabstand auch bei vielen neuen Ereignissen', () => {
    const posted = { 'football-leagues': { resolvedEvents: 50, at: '2026-10-12T02:00:00Z' } };
    const plan = planCommunityPosts({ cards: [leagues], posted, now, minHoursBetween: 20 });
    expect(plan.posts).toEqual([]);
    expect(plan.skipped[0]).toMatch(/Mindestabstand/);
  });

  it('überspringt Karten mit nur einem Teilnehmer', () => {
    const plan = planCommunityPosts({ cards: [{ ...leagues, rows: leagues.rows.slice(0, 1) }], posted: {}, now });
    expect(plan.posts).toEqual([]);
  });
});

describe('communityMessage', () => {
  it('spricht in der Alltagszahl mit Vergleichswert und nennt den knappen Ausgang', () => {
    const text = communityMessage(leagues);
    expect(text).toContain('**Football leagues** — GPT-5.5 called 58.2 % of matches right');
    expect(text).toContain('Always home win: 45.0 % · 201 events · every prediction published before the event');
    expect(text).toContain('1. GPT-5.5 58.2 %');
    expect(text).toContain('2. Kimi K3 57.0 %');
    expect(text).toContain('Places 1 and 2 are close enough that the order may still flip.');
    expect(text).toContain('https://www.futurebench.ai/arena/leaderboards');
    expect(text).not.toMatch(/score/i);
  });

  it('lässt den Knapp-Satz weg, wenn die Führung klar ist, und fällt ohne Überschrift auf das Label zurück', () => {
    const clear = communityMessage({ ...leagues, closeCall: false, headline: null, reference: null });
    expect(clear).not.toContain('may still flip');
    expect(clear).toContain('**Football leagues** — Right outcome');
    expect(clear).toContain('201 events · every prediction');
  });
});
