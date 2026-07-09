import {
  flagEmoji,
  formatDayShort,
  formatKickoff,
  formatScore,
  formatTime,
  germanTeamName,
  stageLabel,
  STATUS_LABELS,
} from '../lib/format';
import type { Match, MatchPredictions, Model, Team } from '../lib/types';
import PredictionChip from './PredictionChip';

function TeamBlock({ team }: { team: Team }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <span className="emoji-flag text-3xl leading-none" aria-hidden="true">
        {flagEmoji(team.tla)}
      </span>
      <span className="font-mono text-sm font-bold tracking-wide text-ink-50">
        {team.tla ?? '–'}
      </span>
      <span className="w-full max-w-[8.5rem] truncate text-[11px] text-ink-300">
        {germanTeamName(team.name)}
      </span>
    </div>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'LIVE') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-clay-500/50 bg-clay-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-clay-300">
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clay-400" />
        </span>
        Live
      </span>
    );
  }
  const styles =
    match.status === 'FINISHED'
      ? 'border-ink-700 text-ink-300'
      : match.status === 'OTHER'
        ? 'border-dashed border-ink-600 text-ink-400'
        : 'border-ink-700 text-ink-300';
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}
    >
      {STATUS_LABELS[match.status]}
    </span>
  );
}

function CenterBlock({ match }: { match: Match }) {
  const hasScore = typeof match.score.home === 'number' && typeof match.score.away === 'number';
  if ((match.status === 'LIVE' || match.status === 'FINISHED') && hasScore) {
    return (
      <div className="flex flex-col items-center px-1">
        <span className="font-mono tabular text-3xl font-bold text-ink-50">
          {formatScore(match.score.home!, match.score.away!)}
        </span>
        {match.duration === 'PENALTY_SHOOTOUT' &&
          typeof match.penalties?.home === 'number' &&
          typeof match.penalties?.away === 'number' && (
            <span
              className="mt-0.5 text-[10px] font-medium text-ink-400"
              title="Entscheidung im Elfmeterschießen – gewertet wird das Ergebnis nach 120 Minuten"
            >
              i. E. {formatScore(match.penalties.home, match.penalties.away)}
            </span>
          )}
        {match.duration === 'EXTRA_TIME' && (
          <span className="mt-0.5 text-[10px] font-medium text-ink-400" title="nach Verlängerung">
            n. V.
          </span>
        )}
        {match.status === 'LIVE' && (
          <span className="mt-0.5 text-[10px] font-medium text-clay-300">vorläufig</span>
        )}
      </div>
    );
  }
  const kickoff = formatKickoff(match.utcDate);
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 text-center">
      <span className="font-mono tabular text-xl font-semibold text-ink-100">
        {formatTime(match.utcDate)}
      </span>
      <span className="text-[10px] text-ink-400">{formatDayShort(match.utcDate)}</span>
      {kickoff.berlin && (
        <span className="text-[10px] text-ink-400" title="Anstoss in deutscher Zeit">
          Berlin: {kickoff.berlin}
        </span>
      )}
    </div>
  );
}

interface Props {
  match: Match;
  models: Model[];
  predictions: MatchPredictions | undefined;
}

/** Match-Card für "Live & als Nächstes": Teams, Score/Anstoss, Tipp-Chips. */
export default function MatchCard({ match, models, predictions }: Props) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-ink-700/70 bg-ink-900/80 p-4 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-600">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {stageLabel(match.stage)}
          {match.group ? ` · Gruppe ${match.group}` : ''}
        </span>
        <StatusBadge match={match} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <TeamBlock team={match.home} />
        <CenterBlock match={match} />
        <TeamBlock team={match.away} />
      </div>

      <div className="border-t border-ink-700/60 pt-3">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400">
          <span>Tipps</span>
          {match.status === 'LIVE' && (
            <span className="normal-case tracking-normal text-clay-300">vorläufige Wertung</span>
          )}
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {models.map((model) => (
            <PredictionChip
              key={model.id}
              model={model}
              prediction={predictions?.[model.id]}
              match={match}
            />
          ))}
        </ul>
      </div>
    </article>
  );
}
