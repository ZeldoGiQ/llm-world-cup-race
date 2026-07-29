/**
 * Share-Karte je Kategorie: /arena/share/<kategorie>.svg
 *
 * Statisch beim Build erzeugt, aus denselben Daten wie das Leaderboard.
 * Welche Kategorien eine Karte bekommen, entscheidet share/data.ts.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import '../../../arena/lib/plugins';
import { buildShareCardSvg } from '../../../arena/lib/share/card';
import { shareCards } from '../../../arena/lib/share/data';

const cards = shareCards();

export const getStaticPaths: GetStaticPaths = () =>
  cards.map((card) => ({ params: { category: card.id } }));

export const GET: APIRoute = ({ params }) => {
  const card = cards.find((candidate) => candidate.id === params.category);
  if (!card) return new Response('Not found', { status: 404 });

  return new Response(buildShareCardSvg(card), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
