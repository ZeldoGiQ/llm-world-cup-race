import { useEffect, useMemo, useState } from 'react';
import modelsJson from '../data/models.json';
import { formatAgo, formatDateTime } from '../lib/i18n/format';
import { pick, type Locale } from '../lib/i18n/locales';
import { t, type Translate } from '../lib/i18n/messages';
import { categories } from '../lib/plugins';
import { computeStandings } from '../lib/scoring/standings';
import { useArenaData } from '../lib/useArenaData';
import type { ArenaModel } from '../lib/types';
import BenchmarkStandings from './BenchmarkStandings';
import EventList from './EventList';

const MODELS = modelsJson as ArenaModel[];

function ArenaSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="h-64 rounded-2xl bg-ink-800/60 motion-safe:animate-pulse" />
      <div className="h-96 rounded-2xl bg-ink-800/60 motion-safe:animate-pulse" />
    </div>
  );
}

/** "Loaded 3 minutes ago" – tickt getrennt, um Re-Renders klein zu halten. */
function UpdatedAgo({
  fetchedAt,
  dataUpdatedAt,
  locale,
  translate,
}: {
  fetchedAt: number | null;
  dataUpdatedAt?: string;
  locale: Locale;
  translate: Translate;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!fetchedAt) return <span className="text-xs text-ink-400">{translate('data.loading')}</span>;
  return (
    <span
      className="text-xs tabular text-ink-400"
      title={
        dataUpdatedAt
          ? translate('data.asOf', { time: formatDateTime(dataUpdatedAt, locale) })
          : undefined
      }
    >
      {translate('data.loadedAgo', { ago: formatAgo(Date.now() - fetchedAt, locale) })}
    </span>
  );
}

/**
 * Die React-Island einer Kategorieseite.
 *
 * Kennt keine Kategorie konkret: Sie holt den Deskriptor aus der Registry und
 * gibt ihn samt Sprache an die Komponenten weiter. Dieselbe Island bedient damit
 * alle Kategorien in allen Sprachen.
 */
export default function ArenaApp({
  categoryId,
  locale,
}: {
  categoryId: string;
  locale: Locale;
}) {
  const translate = t(locale);
  const descriptor = categories.find(categoryId);
  const { data, fetchedAt, lastFailed, refreshing, refresh } = useArenaData(categoryId);

  const standings = useMemo(() => {
    if (!data || !descriptor) return null;
    return computeStandings(MODELS, data.eventsFile, data.predictionsFile, descriptor, locale);
  }, [data, descriptor, locale]);

  if (!descriptor) {
    return (
      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-8 text-center text-sm text-ink-300">
        {translate('category.unknown', { id: categoryId })}
      </div>
    );
  }

  if (!data && lastFailed) {
    return (
      <div
        className="rounded-2xl border p-8 text-center"
        style={{
          borderColor: 'color-mix(in srgb, var(--arena-danger) 40%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--arena-danger) 6%, transparent)',
        }}
      >
        <p className="mb-1 font-display text-xl text-ink-50">{translate('data.errorTitle')}</p>
        <p className="mb-4 text-sm text-ink-300">{translate('data.errorBody')}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-signal-400/60 bg-signal-400/10 px-4 py-1.5 text-sm font-medium text-signal-300 transition-colors hover:bg-signal-400/20"
        >
          {translate('data.retry')}
        </button>
      </div>
    );
  }

  if (!data || !standings) return <ArenaSkeleton />;

  const models = MODELS.filter(
    (model) => model.baseline !== true || model.id === descriptor.baselineModelId,
  );
  const primaryLabel =
    standings.columns.find((column) => column.metricId === descriptor.primaryMetric)?.label ??
    descriptor.primaryMetric;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
          <span>
            <span className="font-mono text-signal-300">{standings.resolvedEvents}</span>{' '}
            {translate('category.resolved')}
          </span>
          <span>
            <span className="font-mono text-ink-200">{standings.openEvents}</span>{' '}
            {translate('category.open')}
          </span>
          <span>
            {translate('category.rankedBy')} <span className="text-ink-200">{primaryLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {lastFailed && (
            <span
              className="rounded-md border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: 'color-mix(in srgb, var(--arena-live) 40%, transparent)',
                color: 'var(--arena-live)',
              }}
              title={translate('data.updateFailedTitle')}
            >
              {translate('data.updateFailed')}
            </span>
          )}
          <UpdatedAgo
            fetchedAt={fetchedAt}
            dataUpdatedAt={data.eventsFile.updatedAt}
            locale={locale}
            translate={translate}
          />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label={translate('data.refresh')}
            title={translate('data.refresh')}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 bg-ink-900 text-ink-200 transition-all hover:border-signal-400/60 hover:text-signal-300 active:scale-90 disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`h-4 w-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>

      <section aria-labelledby="arena-leaderboard">
        <h2
          id="arena-leaderboard"
          className="mb-4 border-l-2 border-signal-400/80 pl-4 font-display text-2xl font-semibold text-ink-50"
        >
          {translate('standings.heading')}
        </h2>
        <BenchmarkStandings
          standings={standings}
          primaryMetric={descriptor.primaryMetric}
          locale={locale}
          unit={descriptor.unit ? pick(descriptor.unit, locale) : undefined}
        />
      </section>

      <section aria-labelledby="arena-events">
        <h2
          id="arena-events"
          className="mb-4 border-l-2 border-clay-500/80 pl-4 font-display text-2xl font-semibold text-ink-50"
        >
          {translate('events.heading')}
        </h2>
        <EventList
          events={data.eventsFile.events}
          models={models}
          predictionsFile={data.predictionsFile}
          descriptor={descriptor}
          locale={locale}
        />
      </section>
    </div>
  );
}
