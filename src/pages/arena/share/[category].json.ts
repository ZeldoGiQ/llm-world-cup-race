/**
 * Die Zahlen der Share-Karte als JSON: /arena/share/<kategorie>.json
 *
 * Dieselbe Rangliste wie im Bild, nur maschinenlesbar. Damit kann alles,
 * was außerhalb des Builds läuft, die echten Werte und Sätze übernehmen,
 * statt sie abzutippen oder – schlimmer – ein Modell raten zu lassen. Der
 * Community-Discord (scripts/arena/jobs/community.mts) und der
 * Prompt-Generator (scripts/arena/social-prompts.mts) lesen genau das.
 *
 * Das Logo-Markup bleibt draußen: Es gehört ins Bild, nicht in die Daten.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import '../../../arena/lib/plugins';
import { shareCards } from '../../../arena/lib/share/data';

const cards = shareCards();

export const getStaticPaths: GetStaticPaths = () =>
  cards.map((card) => ({ params: { category: card.id } }));

export const GET: APIRoute = ({ params }) => {
  const card = cards.find((candidate) => candidate.id === params.category);
  if (!card) return new Response('Not found', { status: 404 });

  const payload = {
    id: card.id,
    title: card.title,
    /** Die Alltagszahl, z. B. "Right outcome" */
    label: card.subtitle,
    headline: card.headline,
    clear: card.clear,
    closeCall: card.closeCall,
    reference: card.reference ? { label: card.reference.label, formatted: card.reference.formatted } : null,
    resolvedEvents: card.resolvedEvents,
    footnote: card.footnote,
    rows: card.rows.map(({ name, color, value, formatted, ciLow, ciHigh }) => ({
      name,
      color,
      value,
      formatted,
      ciLow,
      ciHigh,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
