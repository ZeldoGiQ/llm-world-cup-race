import { useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  flagEmoji,
  formatDateHeading,
  formatKickoff,
  formatScore,
  formatTime,
  germanTeamName,
  stageLabel,
  STATUS_LABELS,
} from '../lib/format';
import { scoreForDisplay, type ScoreResult } from '../lib/scoring';
import type { Match, MatchPredictions, MatchStatus, Model, PredictionsFile } from '../lib/types';
import Avatar from './Avatar';

/* ------------------------------------------------------------------ */
/* Hilfskomponenten                                                    */
/* ------------------------------------------------------------------ */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-ink-700 bg-ink-800/80 px-3 py-2 text-sm text-ink-100 transition-colors focus:border-signal-400 focus:outline-none"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function StatusDot({ status }: { status: MatchStatus }) {
  const styles: Record<MatchStatus, string> = {
    LIVE: 'bg-clay-400',
    UPCOMING: 'bg-ink-500',
    FINISHED: 'bg-success-400/80',
    OTHER: 'bg-ink-600',
  };
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${styles[status]} ${
        status === 'LIVE' ? 'motion-safe:animate-pulse' : ''
      }`}
      title={STATUS_LABELS[status]}
      aria-label={STATUS_LABELS[status]}
      role="img"
    />
  );
}

function PointsBadge({
  evaluated,
  hasPrediction,
}: {
  evaluated: (ScoreResult & { provisional: boolean }) | null;
  hasPrediction: boolean;
}) {
  if (!hasPrediction) {
    return <span className="w-14 shrink-0 text-center text-xs text-ink-500">—</span>;
  }
  if (!evaluated) {
    return <span className="w-14 shrink-0" aria-hidden="true" />;
  }
  const styles =
    evaluated.category === 'exact'
      ? 'border-success-400/70 bg-success-400/15 text-success-300'
      : evaluated.category === 'goalDiff' || evaluated.category === 'tendency'
        ? 'border-success-400/40 bg-success-400/5 text-success-300/90'
        : 'border-ink-700 text-ink-400';
  return (
    <span
      className={`w-14 shrink-0 rounded-md border px-1 py-0.5 text-center font-mono tabular text-xs ${styles} ${
        evaluated.provisional ? 'border-dashed' : ''
      }`}
      title={`${CATEGORY_LABELS[evaluated.category]}${evaluated.provisional ? ' – vorläufig, Spiel läuft noch' : ''}`}
    >
      {evaluated.points > 0 ? `+${evaluated.points}` : '0'}
      {evaluated.provisional ? '*' : ''}
    </span>
  );
}

function ModelTipRow({
  model,
  match,
  predictions,
}: {
  model: Model;
  match: Match;
  predictions: MatchPredictions | undefined;
}) {
  const prediction = predictions?.[model.id];
  const evaluated = scoreForDisplay(match, prediction);
  const beforeKickoff =
    !!prediction?.createdAt &&
    new Date(prediction.createdAt).getTime() < new Date(match.utcDate).getTime();

  return (
    <li className="flex items-center gap-2.5 py-2 text-sm">
      <Avatar model={model} size="sm" />
      <span className="min-w-0 flex-1 truncate text-ink-100">
        {model.name}
        <span className="hidden text-xs text-ink-400 sm:inline"> · {model.provider}</span>
      </span>
      {beforeKickoff && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full border border-success-400/30 bg-success-400/5 px-1.5 py-0.5 text-[10px] text-success-300/90"
          title={`Tipp abgegeben vor Anpfiff (${new Date(prediction!.createdAt!).toLocaleString('de-DE')})`}
        >
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06l2.72 2.72 6.72-6.72a.75.75 0 0 1 1.06 0Z" />
          </svg>
          <span className="hidden sm:inline">vor Anpfiff</span>
          <span className="sr-only sm:hidden">vor Anpfiff getippt</span>
        </span>
      )}
      <span className="w-10 shrink-0 text-right font-mono tabular font-semibold text-ink-100">
        {prediction ? formatScore(prediction.home, prediction.away) : '—'}
      </span>
      <PointsBadge evaluated={evaluated} hasPrediction={!!prediction} />
    </li>
  );
}

function resultLine(match: Match): string {
  const names = `${germanTeamName(match.home.name)} – ${germanTeamName(match.away.name)}`;
  const hasScore = typeof match.score.home === 'number' && typeof match.score.away === 'number';
  if (match.status === 'FINISHED' && hasScore) {
    const extra =
      match.duration === 'PENALTY_SHOOTOUT' &&
      typeof match.penalties?.home === 'number' &&
      typeof match.penalties?.away === 'number'
        ? ` n. V. (${formatScore(match.penalties.home, match.penalties.away)} i. E.)`
        : match.duration === 'EXTRA_TIME'
          ? ' n. V.'
          : '';
    return `Endstand ${formatScore(match.score.home!, match.score.away!)}${extra} · ${names}`;
  }
  if (match.status === 'LIVE' && hasScore) {
    return `Live ${formatScore(match.score.home!, match.score.away!)} · ${names}`;
  }
  if (match.status === 'OTHER') {
    return `Verschoben/abgesagt – keine Wertung · ${names}`;
  }
  const kickoff = formatKickoff(match.utcDate);
  return `Anstoß ${kickoff.local}${kickoff.berlin ? ` (Berlin: ${kickoff.berlin})` : ''} · ${names}`;
}

function ScheduleRow({
  match,
  models,
  predictions,
  open,
  onToggle,
}: {
  match: Match;
  models: Model[];
  predictions: MatchPredictions | undefined;
  open: boolean;
  onToggle: () => void;
}) {
  const hasScore = typeof match.score.home === 'number' && typeof match.score.away === 'number';
  const showScore = hasScore && (match.status === 'LIVE' || match.status === 'FINISHED');
  const tipCount = models.filter((model) => predictions?.[model.id]).length;

  return (
    <li className="overflow-hidden rounded-xl border border-ink-700/60 bg-ink-900/70 transition-colors hover:border-ink-600">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-400 sm:gap-3"
      >
        <span className="w-11 shrink-0 font-mono tabular text-xs text-ink-300">
          {formatTime(match.utcDate)}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <span className="hidden truncate text-ink-200 md:inline">
              {germanTeamName(match.home.name)}
            </span>
            <span className="shrink-0 font-mono text-xs font-bold text-ink-50">
              {match.home.tla ?? '–'}
            </span>
            <span className="emoji-flag shrink-0" aria-hidden="true">
              {flagEmoji(match.home.tla)}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center px-0.5">
            <span
              className={`font-mono tabular text-sm font-bold ${
                showScore ? 'text-ink-50' : 'text-ink-500'
              }`}
            >
              {showScore ? formatScore(match.score.home!, match.score.away!) : '–:–'}
            </span>
            {showScore &&
              match.duration === 'PENALTY_SHOOTOUT' &&
              typeof match.penalties?.home === 'number' &&
              typeof match.penalties?.away === 'number' && (
                <span
                  className="text-[9px] leading-tight text-ink-400"
                  title="Entscheidung im Elfmeterschießen – gewertet wird das Ergebnis nach 120 Minuten"
                >
                  i. E. {formatScore(match.penalties.home, match.penalties.away)}
                </span>
              )}
            {showScore && match.duration === 'EXTRA_TIME' && (
              <span className="text-[9px] leading-tight text-ink-400" title="nach Verlängerung">
                n. V.
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="emoji-flag shrink-0" aria-hidden="true">
              {flagEmoji(match.away.tla)}
            </span>
            <span className="shrink-0 font-mono text-xs font-bold text-ink-50">
              {match.away.tla ?? '–'}
            </span>
            <span className="hidden truncate text-ink-200 md:inline">
              {germanTeamName(match.away.name)}
            </span>
          </span>
        </span>
        <span className="hidden shrink-0 text-[10px] text-ink-400 lg:inline">
          {match.group ? `Gr. ${match.group}` : stageLabel(match.stage)}
        </span>
        <span className="hidden shrink-0 text-[10px] text-ink-400 sm:inline">
          {tipCount}/{models.length} Tipps
        </span>
        <StatusDot status={match.status} />
        <svg
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-ink-700/60 bg-ink-950/40 px-3 py-3">
          <p className="mb-1 text-xs text-ink-300">{resultLine(match)}</p>
          <ul className="flex flex-col divide-y divide-ink-800/80">
            {models.map((model) => (
              <ModelTipRow key={model.id} model={model} match={match} predictions={predictions} />
            ))}
          </ul>
          {match.status === 'LIVE' && (
            <p className="mt-1 text-[11px] text-clay-300/90">
              * vorläufig – Punkte zählen erst nach Abpfiff
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Spielplan mit Filtern                                               */
/* ------------------------------------------------------------------ */

interface Props {
  matches: Match[];
  models: Model[];
  predictionsFile: PredictionsFile;
}

const ALL = 'ALL';

export default function Schedule({ matches, models, predictionsFile }: Props) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [modelId, setModelId] = useState(ALL);
  const [openIds, setOpenIds] = useState<ReadonlySet<number>>(new Set());

  // Phasen in Turnier-Reihenfolge (Reihenfolge des ersten Auftretens nach Datum)
  const stages = useMemo(() => {
    const seen = new Set<string>();
    return [...matches]
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
      .map((m) => m.stage)
      .filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
  }, [matches]);

  const groups = useMemo(
    () =>
      [...new Set(matches.map((m) => m.group).filter((g): g is string => !!g))].sort((a, b) =>
        a.localeCompare(b, 'de'),
      ),
    [matches],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return matches
      .filter((match) => {
        if (stage !== ALL && match.stage !== stage) return false;
        if (group !== ALL && match.group !== group) return false;
        if (status !== ALL && match.status !== status) return false;
        if (modelId !== ALL && !predictionsFile.predictions[String(match.id)]?.[modelId]) {
          return false;
        }
        if (needle) {
          const haystack = [
            match.home.name,
            match.away.name,
            germanTeamName(match.home.name),
            germanTeamName(match.away.name),
            match.home.tla ?? '',
            match.away.tla ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate) || a.id - b.id);
  }, [matches, predictionsFile, query, stage, group, status, modelId]);

  // Nach Kalendertag (lokale Zeitzone) gruppieren
  const days = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const match of filtered) {
      const heading = formatDateHeading(match.utcDate);
      const bucket = map.get(heading);
      if (bucket) bucket.push(match);
      else map.set(heading, [match]);
    }
    return [...map.entries()];
  }, [filtered]);

  const visibleModels = modelId === ALL ? models : models.filter((m) => m.id === modelId);
  const isFiltered =
    query !== '' || stage !== ALL || group !== ALL || status !== ALL || modelId !== ALL;

  const resetFilters = () => {
    setQuery('');
    setStage(ALL);
    setGroup(ALL);
    setStatus(ALL);
    setModelId(ALL);
  };

  const toggleRow = (id: number) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-3 grid gap-2 rounded-2xl border border-ink-700/70 bg-ink-900/80 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Team suchen (z. B. Deutschland, GER) …"
          aria-label="Team suchen"
          className="w-full rounded-lg border border-ink-700 bg-ink-800/80 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 transition-colors focus:border-signal-400 focus:outline-none sm:col-span-2 lg:col-span-1"
        />
        <FilterSelect
          label="Phase filtern"
          value={stage}
          onChange={setStage}
          options={[
            [ALL, 'Alle Phasen'],
            ...stages.map((s): [string, string] => [s, stageLabel(s)]),
          ]}
        />
        <FilterSelect
          label="Gruppe filtern"
          value={group}
          onChange={setGroup}
          options={[
            [ALL, 'Alle Gruppen'],
            ...groups.map((g): [string, string] => [g, `Gruppe ${g}`]),
          ]}
        />
        <FilterSelect
          label="Status filtern"
          value={status}
          onChange={setStatus}
          options={[
            [ALL, 'Alle Status'],
            ['LIVE', STATUS_LABELS.LIVE],
            ['UPCOMING', STATUS_LABELS.UPCOMING],
            ['FINISHED', STATUS_LABELS.FINISHED],
            ['OTHER', STATUS_LABELS.OTHER],
          ]}
        />
        <FilterSelect
          label="Modell filtern"
          value={modelId}
          onChange={setModelId}
          options={[
            [ALL, 'Alle Modelle'],
            ...models.map((m): [string, string] => [m.id, m.name]),
          ]}
        />
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-ink-400">
        <span aria-live="polite">
          {filtered.length} von {matches.length} Spielen
          {modelId !== ALL ? ` · Tipps von ${visibleModels[0]?.name ?? modelId}` : ''}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            className="font-medium text-signal-300 transition-colors hover:text-signal-400"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-ink-700/70 bg-ink-900/60 p-8 text-center text-sm text-ink-300">
          <p className="mb-3">Keine Spiele gefunden.</p>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-signal-400/60 bg-signal-400/10 px-4 py-1.5 text-sm font-medium text-signal-300 transition-colors hover:bg-signal-400/20"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        days.map(([heading, items]) => (
          <div key={heading} className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {heading}
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((match) => (
                <ScheduleRow
                  key={match.id}
                  match={match}
                  models={visibleModels}
                  predictions={predictionsFile.predictions[String(match.id)]}
                  open={openIds.has(match.id)}
                  onToggle={() => toggleRow(match.id)}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
