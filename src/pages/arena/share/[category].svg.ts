/**
 * Share-Karte je Kategorie: /arena/share/<kategorie>.svg
 *
 * Statisch beim Build erzeugt, aus denselben Daten wie das Leaderboard.
 * Nur echte Kategorien mit gewerteten Ergebnissen bekommen eine Karte –
 * Beispieldaten werden hier genauso wenig verbreitet wie auf der Seite.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import '../../../arena/lib/plugins';
import { loadHomeData, uncertaintyFor } from '../../../arena/lib/home/home-data';
import { pick } from '../../../arena/lib/i18n/locales';
import { SCORE_VERSION } from '../../../arena/lib/scoring/score';
import { buildShareCardSvg, type ShareRow } from '../../../arena/lib/share/card';
import { modelLogoMarkup } from '../../../arena/lib/share/model-logo-markup';

const data = loadHomeData('en');
const shareable = data.live.filter((entry) => entry.scoredPairs > 0 && entry.standings);

export const getStaticPaths: GetStaticPaths = () =>
  shareable.map((entry) => ({ params: { category: entry.id } }));

export const GET: APIRoute = ({ params }) => {
  const entry = shareable.find((candidate) => candidate.id === params.category);
  if (!entry) return new Response('Not found', { status: 404 });

  const uncertainty = uncertaintyFor(entry);
  const rows: ShareRow[] = entry
    .standings!.rows.filter((row) => row.rank > 0)
    .slice(0, 5)
    .map((row) => {
      const scoreCell = row.cells.find(
        (cell) => cell.metricId === 'prediction-score' && cell.value !== null,
      );
      const interval = uncertainty?.valueInterval[row.model.id];
      return {
        name: row.model.name,
        color: row.model.color,
        score: scoreCell?.value?.value ?? 0,
        ciLow: interval?.[0] ?? null,
        ciHigh: interval?.[1] ?? null,
        logoMarkup: modelLogoMarkup(row.model.id) ?? null,
      };
    })
    .filter((row) => Number.isFinite(row.score));

  const svg = buildShareCardSvg({
    title: pick(entry.descriptor.label, 'en'),
    subtitle: `Prediction Score · Knowledge Cap · ${SCORE_VERSION}`,
    rows,
    footnote: `${entry.resolvedEvents} events · committed before each event · 90% CI · whiskers overlap = no clear leader`,
  });

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
