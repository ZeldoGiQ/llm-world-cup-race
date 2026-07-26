import type { Locale } from '../lib/i18n/locales';
import { t, type Translate } from '../lib/i18n/messages';
import type { StandingRow, Standings } from '../lib/scoring/standings';
import ModelBadge from './ModelBadge';

/** Podest-Medaille für die ersten drei Ränge, sonst neutraler Kreis. */
function RankMedallion({
  rank,
  provisional,
  translate,
}: {
  rank: number;
  provisional?: boolean;
  translate: Translate;
}) {
  if (rank === 0) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-ink-700 font-mono text-[11px] text-ink-500"
        title={
          provisional
            ? translate('standings.provisionalRankTitle')
            : translate('standings.noRankTitle')
        }
      >
        {provisional ? '?' : '–'}
      </span>
    );
  }
  const podium = rank <= 3 ? `arena-rank-${rank}` : 'border-ink-700 bg-ink-800/60 text-ink-300';
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs font-bold tabular ${podium}`}
    >
      {rank}
    </span>
  );
}

/** Zahlenzelle; die Ranking-Metrik wird hervorgehoben. */
function ValueCell({
  row,
  metricId,
  isPrimary,
  translate,
}: {
  row: StandingRow;
  metricId: string;
  isPrimary: boolean;
  translate: Translate;
}) {
  const cell = row.cells.find((c) => c.metricId === metricId);
  if (!cell) return <td className="px-4 py-3 text-right font-mono text-ink-500">—</td>;
  return (
    <td
      className={`px-4 py-3 text-right font-mono tabular ${
        isPrimary ? 'text-base font-bold text-signal-300' : 'text-ink-200'
      }`}
      title={
        cell.value
          ? translate('standings.metricTitle', { label: cell.label, n: cell.value.n })
          : translate('standings.metricUncomputable', { label: cell.label })
      }
    >
      {cell.formatted}
    </td>
  );
}

interface Props {
  standings: Standings;
  primaryMetric: string;
  locale: Locale;
  /** Einheit der Ranking-Metrik, z. B. "index points" */
  unit?: string;
}

/**
 * Leaderboard einer Kategorie – vollständig spaltengetrieben.
 *
 * Die Spalten kommen aus `standings.columns` (also aus `descriptor.metricIds`)
 * und sind dort bereits in der aktiven Sprache aufgelöst. Diese Komponente kennt
 * keine einzige konkrete Metrik: eine neue Metrik erscheint automatisch.
 */
export default function BenchmarkStandings({ standings, primaryMetric, locale, unit }: Props) {
  const translate = t(locale);
  const { rows, baselineRows, columns } = standings;
  const hasScores = rows.some((row) => row.scored > 0);

  if (!hasScores) {
    return (
      <div className="rounded-2xl border border-ink-700/70 bg-ink-900/60 p-8 text-center text-sm text-ink-300">
        {translate('standings.empty')}
      </div>
    );
  }

  const renderRow = (row: StandingRow, isBaseline = false) => (
    <tr
      key={row.model.id}
      className={`border-t border-ink-700/60 transition-colors hover:bg-ink-800/40 ${
        isBaseline ? 'bg-ink-950/40' : ''
      }`}
    >
      <td className="px-4 py-3">
        {isBaseline ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink-700 font-mono text-[10px] text-ink-400"
            title={translate('standings.baselineMark')}
          >
            ø
          </span>
        ) : (
          <RankMedallion rank={row.rank} provisional={row.provisional} translate={translate} />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ModelBadge model={row.model} locale={locale} />
          {row.provisional && (
            <span
              className="shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'color-mix(in srgb, var(--arena-live) 45%, transparent)',
                color: 'var(--arena-live)',
              }}
              title={translate.plural('standings.provisionalTitle', row.scored)}
            >
              {translate('standings.provisional')}
            </span>
          )}
        </div>
      </td>
      {columns.map((column) => (
        <ValueCell
          key={column.metricId}
          row={row}
          metricId={column.metricId}
          isPrimary={column.metricId === primaryMetric}
          translate={translate}
        />
      ))}
      <td className="px-4 py-3 text-right font-mono tabular text-ink-400">{row.scored}</td>
    </tr>
  );

  return (
    <div>
      {/* Desktop: Tabelle */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-900/80 lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th scope="col" className="px-4 py-3 font-medium">
                {translate('standings.rank')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {translate('standings.model')}
              </th>
              {columns.map((column) => (
                <th
                  key={column.metricId}
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                  title={column.description}
                >
                  {column.label}
                  {column.metricId === primaryMetric && unit ? (
                    <span className="ml-1 normal-case text-ink-500">({unit})</span>
                  ) : null}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3 text-right font-medium"
                title={translate('standings.scoredTitle')}
              >
                {translate('standings.scored')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => renderRow(row))}
            {baselineRows.map((row) => renderRow(row, true))}
          </tbody>
        </table>
      </div>

      {/* Mobil: Karten */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {[...rows, ...baselineRows].map((row) => {
          const primary = row.cells.find((c) => c.metricId === primaryMetric);
          const others = row.cells.filter((c) => c.metricId !== primaryMetric);
          return (
            <li
              key={row.model.id}
              className="rounded-2xl border border-ink-700/70 bg-ink-900/80 p-3"
            >
              <div className="flex items-center gap-3">
                {row.isBaseline ? (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink-700 font-mono text-[10px] text-ink-400">
                    ø
                  </span>
                ) : (
                  <RankMedallion rank={row.rank} provisional={row.provisional} translate={translate} />
                )}
                <div className="min-w-0 flex-1">
                  <ModelBadge model={row.model} locale={locale} />
                  {row.provisional && (
                    <span className="mt-0.5 block text-[10px]" style={{ color: 'var(--arena-live)' }}>
                      {translate.plural('standings.provisionalShort', row.scored)}
                    </span>
                  )}
                </div>
                <span className="font-mono tabular text-lg font-bold text-signal-300">
                  {primary?.formatted ?? '—'}
                </span>
              </div>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-ink-800 pt-2 text-[11px] text-ink-400">
                {others.map((cell) => (
                  <span key={cell.metricId}>
                    {cell.label} <span className="font-mono text-ink-200">{cell.formatted}</span>
                  </span>
                ))}
                <span>
                  {translate('standings.scored')}{' '}
                  <span className="font-mono text-ink-200">{row.scored}</span>
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-ink-400">{translate('standings.footnote')}</p>
    </div>
  );
}
