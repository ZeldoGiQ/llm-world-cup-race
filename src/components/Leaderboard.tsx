import { SCORING } from '../lib/config';
import type { StandingRow } from '../lib/scoring';
import Avatar from './Avatar';

/** Dezentes Podest: Top-3-Ränge bekommen Gold/Silber/Bronze-Akzente. */
function RankChip({ rank }: { rank: number }) {
  const podium: Record<number, string> = {
    1: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    2: 'border-slate-300/30 bg-slate-300/10 text-slate-200',
    3: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  };
  const classes = podium[rank] ?? 'border-ink-700 bg-ink-800/60 text-ink-300';
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs font-bold tabular ${classes}`}
    >
      {rank}
    </span>
  );
}

interface Props {
  standings: StandingRow[];
}

export default function Leaderboard({ standings }: Props) {
  const anyScored = standings.some((row) => row.scoredMatches > 0);

  return (
    <div>
      {!anyScored && (
        <div className="mb-4 rounded-2xl border border-ink-700/70 bg-ink-900/60 p-4 text-sm text-ink-300">
          Noch keine gewerteten Spiele – Punkte erscheinen automatisch nach dem ersten Abpfiff.
        </div>
      )}

      {/* Desktop: Tabelle */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-900/80 md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th scope="col" className="px-4 py-3 font-medium">
                Rang
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Modell
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Punkte
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium" title="Exakte Ergebnisse">
                Exakt
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right font-medium"
                title="Richtige Tordifferenz"
              >
                Differenz
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium" title="Richtige Tendenz">
                Tendenz
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium" title="Gewertete Spiele">
                Gewertet
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.model.id}
                className="border-t border-ink-700/60 transition-colors hover:bg-ink-800/40"
              >
                <td className="px-4 py-3">
                  <RankChip rank={row.rank} />
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar model={row.model} size="sm" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-ink-50">{row.model.name}</span>
                      <span className="text-xs text-ink-400">{row.model.provider}</span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-base font-bold text-signal-300">
                  {row.points}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-ink-200">
                  {row.exactHits}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-ink-200">
                  {row.goalDiffHits}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-ink-200">
                  {row.tendencyHits}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-ink-300">
                  {row.scoredMatches}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {standings.map((row) => (
          <li
            key={row.model.id}
            className="flex items-center gap-3 rounded-2xl border border-ink-700/70 bg-ink-900/80 p-3"
          >
            <RankChip rank={row.rank} />
            <Avatar model={row.model} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-50">{row.model.name}</p>
              <p className="text-[11px] text-ink-400">
                {row.exactHits}× exakt · {row.goalDiffHits}× Differenz · {row.tendencyHits}× Tendenz
                · {row.scoredMatches} gewertet
              </p>
            </div>
            <span className="font-mono tabular text-lg font-bold text-signal-300">
              {row.points}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-ink-400">
        Punktevergabe: {SCORING.exact} P. exaktes Ergebnis · {SCORING.goalDiff} P. richtige
        Tordifferenz · {SCORING.tendency} P. richtige Tendenz. Gewertet werden nur beendete Spiele;
        bei K.-o.-Spielen zählt das reguläre Ergebnis (Elfmeterschießen wird ignoriert). Tiebreaker:
        mehr exakte Treffer, dann mehr gewertete Spiele.
      </p>
    </div>
  );
}
