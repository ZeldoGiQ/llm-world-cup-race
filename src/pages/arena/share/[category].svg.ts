/**
 * Share-Karten: /arena/share/<kategorie>.svg (+ -square, -portrait, -story)
 *
 * Statisch beim Build erzeugt, aus denselben Daten wie das Leaderboard.
 * Welche Kategorien eine Karte bekommen, entscheidet share/data.ts.
 *
 * Die Formate stecken im Dateinamen statt in einem Unterordner, damit die
 * eingeführte Adresse /arena/share/<kategorie>.svg unverändert das
 * Link-Vorschau-Format liefert. Aufgelöst wird über eine Tabelle, nicht
 * durch Zerlegen des Namens – Kategorie-Kennungen enthalten selbst
 * Bindestriche (football-worldcup).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import '../../../arena/lib/plugins';
import { buildShareCardSvg, type ShareFormatId } from '../../../arena/lib/share/card';
import { shareCards } from '../../../arena/lib/share/data';

const SUFFIX: Record<ShareFormatId, string> = {
  og: '',
  square: '-square',
  portrait: '-portrait',
  story: '-story',
};

const variants = shareCards().flatMap((card) =>
  (Object.keys(SUFFIX) as ShareFormatId[]).map((formatId) => ({
    slug: `${card.id}${SUFFIX[formatId]}`,
    card,
    formatId,
  })),
);

export const getStaticPaths: GetStaticPaths = () =>
  variants.map((variant) => ({ params: { category: variant.slug } }));

export const GET: APIRoute = ({ params }) => {
  const variant = variants.find((candidate) => candidate.slug === params.category);
  if (!variant) return new Response('Not found', { status: 404 });

  return new Response(buildShareCardSvg(variant.card, variant.formatId), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
