import { useMemo, useState } from 'react';
import { formatKickoff } from '../../lib/format';
import type { CategoryDescriptor } from '../lib/categories/index';
import { predictionTypes, type OutcomeQuality } from '../lib/prediction-types/index';
import type { ArenaEvent, ArenaModel, EventStatus, PredictionsFile } from '../lib/types';
import { ModelAvatar } from './ModelBadge';

const STATUS_LABELS: Record<EventStatus, string> = {
  UPCOMING: 'Offen',
  LIVE: 'Läuft',
  RESOLVED: 'Aufgelöst',
  VOID: 'Ungültig',
};

/** Farbcode der Tipp-Qualität – einheitlich über alle Vorhersage-Typen. */
const QUALITY_CLASSES: Record<OutcomeQuality, string> = {
  exact: 'border-success-400/70 bg-success-400/15 text-success-300',
  close: 'border-success-400/35 bg-success-400/5 text-success-300/90',
  fair: 'border-ink-600 bg-ink-800/60 text-ink-200',
  miss: 'border-ink-700 text-ink-500',
};

function StatusPill({ status }: { status: EventStatus }) {
  if (status === 'LIVE') {
    return (
      <span
        className="flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          borderColor: 'color-mix(in srgb, var(--arena-live) 50%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--arena-live) 12%, transparent)',
          color: 'var(--arena-live)',
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
          style={{ backgroundColor: 'var(--arena-live)' }}
        />
        Läuft
      </span>
    );
  }
  const styles =
    status === 'RESOLVED'
      ? 'border-ink-700 text-ink-300'
      : status === 'VOID'
        ? 'border-dashed border-ink-600 text-ink-400'
        : 'border-ink-700 text-ink-300';
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface Props {
  events: ArenaEvent[];
  models: ArenaModel[];
  predictionsFile: PredictionsFile;
  descriptor: CategoryDescriptor;
}

const ALL = 'ALL';

/**
 * Event-Liste mit Filtern und aufklappbaren Tipp-Details.
 *
 * Vollständig typ-agnostisch: Titel kommen aus `descriptor.eventTitle`,
 * Werte und Bewertung aus dem PredictionType-Handler. Eine neue Kategorie
 * braucht hier keine Änderung.
 */
export default function EventList({ events, models, predictionsFile, descriptor }: Props) {
  const [status, setStatus] = useState(ALL);
  const [modelId, setModelId] = useState(ALL);
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  const handler = predictionTypes.find(descriptor.predictionType);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events
      .filter((event) => {
        if (status !== ALL && event.status !== status) return false;
        if (modelId !== ALL && !predictionsFile.predictions[event.id]?.[modelId]) return false;
        if (needle) {
          const title = descriptor.eventTitle(event);
          const haystack = [event.title, title.primary, title.secondary ?? '']
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate) || a.id.localeCompare(b.id));
  }, [events, predictionsFile, descriptor, status, modelId, query]);

  const groups = useMemo(() => {
    const map = new Map<string, ArenaEvent[]>();
    for (const event of filtered) {
      const key = descriptor.groupOf?.(event) ?? 'Alle Events';
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()];
  }, [filtered, descriptor]);

  const visibleModels = modelId === ALL ? models : models.filter((m) => m.id === modelId);
  const isFiltered = status !== ALL || modelId !== ALL || query !== '';
  const reset = () => {
    setStatus(ALL);
    setModelId(ALL);
    setQuery('');
  };

  const toggle = (id: string) =>
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectClasses =
    'w-full rounded-lg border border-ink-700 bg-ink-800/80 px-3 py-2 text-sm text-ink-100 transition-colors focus:border-signal-400 focus:outline-none';

  return (
    <div>
      <div className="mb-3 grid gap-2 rounded-2xl border border-ink-700/70 bg-ink-900/80 p-3 sm:grid-cols-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Event suchen …"
          aria-label="Event suchen"
          className={`${selectClasses} placeholder:text-ink-400`}
        />
        <select
          aria-label="Status filtern"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={selectClasses}
        >
          <option value={ALL}>Alle Status</option>
          {(['RESOLVED', 'LIVE', 'UPCOMING', 'VOID'] as EventStatus[]).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="Modell filtern"
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          className={selectClasses}
        >
          <option value={ALL}>Alle Modelle</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-ink-400">
        <span aria-live="polite">
          {filtered.length} von {events.length} Events
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={reset}
            className="font-medium text-signal-300 transition-colors hover:text-signal-400"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-ink-700/70 bg-ink-900/60 p-8 text-center text-sm text-ink-300">
          Keine Events gefunden.
        </div>
      ) : (
        groups.map(([groupName, groupEvents]) => (
          <div key={groupName} className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {groupName}
            </h3>
            <ul className="flex flex-col gap-2">
              {groupEvents.map((event) => {
                const title = descriptor.eventTitle(event);
                const open = openIds.has(event.id);
                const eventPredictions = predictionsFile.predictions[event.id] ?? {};
                const tipCount = visibleModels.filter((m) => eventPredictions[m.id]).length;
                const kickoff = formatKickoff(event.utcDate);

                return (
                  <li
                    key={event.id}
                    className="overflow-hidden rounded-xl border border-ink-700/60 bg-ink-900/70 transition-colors hover:border-ink-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(event.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-400"
                    >
                      {title.leading && (
                        <span className="shrink-0 text-base" aria-hidden="true">
                          {title.leading.join(' ')}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-ink-50">
                          {title.primary}
                        </span>
                        {title.secondary && (
                          <span className="truncate text-[11px] text-ink-400">
                            {title.secondary}
                          </span>
                        )}
                      </span>
                      <span className="hidden shrink-0 font-mono tabular text-xs text-ink-400 sm:inline">
                        {kickoff.local}
                      </span>
                      <span className="shrink-0 font-mono tabular text-sm font-bold text-ink-50">
                        {event.resolution && handler
                          ? handler.formatResolution(event.resolution)
                          : '–'}
                      </span>
                      <StatusPill status={event.status} />
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
                        <p className="mb-2 text-xs text-ink-300">
                          {descriptor.question}
                          {' · '}
                          {kickoff.local}
                          {kickoff.berlin ? ` (Berlin: ${kickoff.berlin})` : ''}
                          {' · '}
                          {tipCount}/{visibleModels.length} Tipps
                        </p>
                        <ul className="flex flex-col divide-y divide-ink-800/80">
                          {visibleModels.map((model) => {
                            const prediction = eventPredictions[model.id];
                            const outcome =
                              prediction && event.resolution && handler
                                ? handler.describeOutcome(prediction.value, event.resolution)
                                : null;
                            const lockedBeforeEvent =
                              !!prediction?.createdAt &&
                              new Date(prediction.createdAt).getTime() <
                                new Date(event.utcDate).getTime();

                            return (
                              <li key={model.id} className="flex items-center gap-2.5 py-2 text-sm">
                                <ModelAvatar model={model} size="xs" />
                                <span className="min-w-0 flex-1 truncate text-ink-100">
                                  {model.name}
                                </span>
                                {lockedBeforeEvent && (
                                  <span
                                    className="shrink-0 text-[10px] text-success-300/80"
                                    title={`Tipp abgegeben vor dem Event (${new Date(prediction!.createdAt).toLocaleString('de-DE')})`}
                                  >
                                    ✓ vorab
                                  </span>
                                )}
                                <span className="w-24 shrink-0 text-right font-mono tabular text-ink-100">
                                  {prediction && handler
                                    ? handler.formatValue(prediction.value)
                                    : '—'}
                                </span>
                                <span className="w-24 shrink-0 text-right">
                                  {outcome ? (
                                    <span
                                      className={`inline-block rounded-md border px-1.5 py-0.5 font-mono tabular text-xs ${QUALITY_CLASSES[outcome.quality]}`}
                                      title={outcome.detail}
                                    >
                                      {outcome.label}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-ink-500">—</span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
