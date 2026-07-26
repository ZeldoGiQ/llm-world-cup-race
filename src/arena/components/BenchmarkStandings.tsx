import type { StandingRow, Standings } from '../lib/scoring/standings';
import ModelBadge from './ModelBadge';

/** Podest-Medaille für die ersten drei Ränge, sonst neutraler Kreis. */
function RankMedallion({ rank, provisional }: { rank: number; provisional?: boolean }) {
  if (rank === 0) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-ink-700 font-mono text-[11px] text-ink-500"
        title={
          provisional
            ? 'Zu wenige gewertete Events für einen belastbaren Rang – Werte vorläufig'
            : 'Ohne Wertung – keine gewerteten Events'
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
function ValueCell({ row, metricId, isPrimary }: { row: StandingRow; metricId: string; isPrimary: boolean }) {
  const cell = row.cells.find((c) => c.metricId === metricId);
  if (!cell) return <td className="px-4 py-3 text-right font-mono text-ink-500">—</td>;
  return (
    <td
      className={`px-4 py-3 text-right font-mono tabular ${
        isPrimary ? 'text-base font-bold text-signal-300' : 'text-ink-200'
      }`}
      title={cell.value ? `${cell.label} · n = ${cell.value.n}` : `${cell.label} · nicht berechenbar`}
    >
      {cell.formatted}
    </td>
  );
}

interface Props {
  standings: Standings;
  primaryMetric: string;
  /** Einheit der Ranking-Metrik, z. B. "Indexpunkte" */
  unit?: string;
}

/**
 * Leaderboard einer Kategorie – vollständig spaltengetrieben.
 *
 * Die Spalten kommen aus `standings.columns` (also aus `descriptor.metricIds`).
 * Diese Komponente kennt keine einzige konkrete Metrik: eine neue Metrik in der
 * Kategorie erscheint hier automatisch, ohne Änderung an dieser Datei.
 */
export default function BenchmarkStandings({ standings, primaryMetric, unit }: Props) {
  const { rows, baselineRows, columns } = standings;
  const hasScores = rows.some((row) => row.scored > 0);

  if (!hasScores) {
    return (
      <div className="rounded-2xl border border-ink-700/70 bg-ink-900/60 p-8 text-center text-sm text-ink-300">
        Noch keine aufgelösten Events – Werte erscheinen, sobald das erste Ergebnis feststeht.
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
            title="Referenzwert"
          >
            ø
          </span>
        ) : (
          <RankMedallion rank={row.rank} provisional={row.provisional} />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ModelBadge model={row.model} />
          {row.provisional && (
            <span
              className="shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'color-mix(in srgb, var(--arena-live) 45%, transparent)',
                color: 'var(--arena-live)',
              }}
              title={`Nur ${row.scored} gewertete Events – zu wenig für einen belastbaren Vergleich`}
            >
              vorläufig
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
                Rang
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Modell
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
              <th scope="col" className="px-4 py-3 text-right font-medium" title="Gewertete Events">
                Gewertet
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
                  <RankMedallion rank={row.rank} provisional={row.provisional} />
                )}
                <div className="min-w-0 flex-1">
                  <ModelBadge model={row.model} />
                  {row.provisional && (
                    <span className="mt-0.5 block text-[10px]" style={{ color: 'var(--arena-live)' }}>
                      vorläufig · nur {row.scored} Events
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
                  Gewertet <span className="font-mono text-ink-200">{row.scored}</span>
                </span>
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-ink-400">
        Gewertet werden nur aufgelöste Events. Spalten mit „—" sind für dieses Modell nicht
        berechenbar (keine Tipps oder keine Baseline). Modelle, die weniger als die Hälfte der
        aufgelösten Events getippt haben, gelten als{' '}
        <span style={{ color: 'var(--arena-live)' }}>vorläufig</span> und erhalten keinen Rang –
        Werte über unterschiedlich grosse Event-Mengen sind nicht vergleichbar.
      </p>
    </div>
  );
}
