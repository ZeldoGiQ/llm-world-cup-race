import { describe, expect, it } from 'vitest';
import { communityMessage, markPosted, planCommunityPosts, type CommunityCard } from './community.mts';

const now = new Date('2026-10-12T12:00:00Z');
const crypto: CommunityCard = {
  id: 'crypto',
  title: 'Crypto',
  resolvedEvents: 84,
  rows: [
    { name: 'GLM-5.2', score: -0.7, ciLow: null, ciHigh: null },
    { name: 'Qwen 3.7 Max', score: -0.31, ciLow: null, ciHigh: null },
  ],
};

describe('planCommunityPosts', () => {
  it('postet eine Karte beim ersten Mal und merkt sich den Stand', () => {
    const plan = planCommunityPosts({ cards: [crypto], posted: {}, now });
    expect(plan.posts.map((c) => c.id)).toEqual(['crypto']);
    const state = markPosted({}, crypto, now);
    expect(state.crypto).toEqual({ resolvedEvents: 84, at: now.toISOString() });
  });

  it('wartet auf genug neue Ereignisse', () => {
    const posted = { crypto: { resolvedEvents: 82, at: '2026-10-01T00:00:00Z' } };
    const plan = planCommunityPosts({ cards: [crypto], posted, now, minNewResolved: 3 });
    expect(plan.posts).toEqual([]);
    expect(plan.skipped[0]).toMatch(/erst 2 neue/);
    const later = planCommunityPosts({ cards: [{ ...crypto, resolvedEvents: 85 }], posted, now, minNewResolved: 3 });
    expect(later.posts).toHaveLength(1);
  });

  it('hält den Mindestabstand auch bei vielen neuen Ereignissen', () => {
    const posted = { crypto: { resolvedEvents: 50, at: '2026-10-12T02:00:00Z' } };
    const plan = planCommunityPosts({ cards: [crypto], posted, now, minHoursBetween: 20 });
    expect(plan.posts).toEqual([]);
    expect(plan.skipped[0]).toMatch(/Mindestabstand/);
  });

  it('überspringt Karten mit nur einem Teilnehmer', () => {
    const plan = planCommunityPosts({ cards: [{ ...crypto, rows: crypto.rows.slice(0, 1) }], posted: {}, now });
    expect(plan.posts).toEqual([]);
  });
});

describe('communityMessage', () => {
  it('behauptet ohne Intervalle keinen Vorsprung und zeigt die Rangfolge', () => {
    const text = communityMessage(crypto);
    expect(text).toContain('**Crypto** — GLM-5.2 ahead');
    expect(text).not.toContain('leads by');
    expect(text).toContain('1. GLM-5.2 −0.70');
    expect(text).toContain('2. Qwen 3.7 Max −0.31');
    expect(text).toContain('84 events resolved');
    expect(text).toContain('https://www.futurebench.ai/arena/leaderboards');
  });

  it('nennt einen Vorsprung nur bei getrennten Intervallen', () => {
    const separated: CommunityCard = {
      ...crypto,
      rows: [
        { name: 'A', score: 5, ciLow: 4, ciHigh: 6 },
        { name: 'B', score: 2, ciLow: 1, ciHigh: 3 },
      ],
    };
    expect(communityMessage(separated)).toContain('A leads by 3.0 points');
  });
});
