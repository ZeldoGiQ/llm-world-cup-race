import { useEffect, useMemo, useState } from 'react';
import modelsJson from '../data/models.json';
import { supportsFlagEmoji } from '../lib/flagSupport';
import { formatAgo, formatTimestamp } from '../lib/format';
import { computeStandings } from '../lib/scoring';
import { useTipprundeData } from '../lib/useTipprundeData';
import type { Model } from '../lib/types';
import Leaderboard from './Leaderboard';
import Schedule from './Schedule';
import PageSkeleton from './Skeletons';
import SpotlightSection from './SpotlightSection';

/** models.json ist die einzige Quelle der teilnehmenden LLMs. */
const MODELS = modelsJson as Model[];

const SECTIONS = [
  { id: 'live', label: 'Live' },
  { id: 'tabelle', label: 'Tabelle' },
  { id: 'spielplan', label: 'Spielplan' },
] as const;

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${spinning ? 'motion-safe:animate-spin' : ''}`}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

/** "Aktualisiert vor Xs" – tickt sekündlich, isoliert vom Rest der App. */
function UpdatedAgo({
  fetchedAt,
  dataUpdatedAt,
}: {
  fetchedAt: number | null;
  dataUpdatedAt: string | undefined;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!fetchedAt) {
    return <span className="text-xs text-ink-400">lädt …</span>;
  }
  return (
    <span
      className="text-xs tabular text-ink-400"
      title={dataUpdatedAt ? `Datenstand matches.json: ${formatTimestamp(dataUpdatedAt)}` : undefined}
    >
      Aktualisiert {formatAgo(Date.now() - fetchedAt)}
    </span>
  );
}

function SectionHeading({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <div className="mb-5 border-l-2 border-signal-400/80 pl-4">
      <h2 id={id} className="font-display text-2xl font-semibold text-ink-50 sm:text-3xl">
        {title}
      </h2>
      {sub && <p className="mt-1 max-w-2xl text-sm text-ink-300">{sub}</p>}
    </div>
  );
}

/**
 * Die eine React-Island der Seite: lädt die JSONs, pollt alle 90 s,
 * berechnet das Leaderboard im Client und rendert alle Sektionen.
 */
export default function App() {
  const { data, fetchedAt, lastFailed, refreshing, refresh } = useTipprundeData();
  const [activeSection, setActiveSection] = useState<string>('live');

  // Ohne Flaggen-Emoji-Support (Windows) Flaggen ausblenden – TLA bleibt sichtbar
  useEffect(() => {
    if (!supportsFlagEmoji()) document.documentElement.classList.add('no-flag-emoji');
  }, []);

  const standings = useMemo(
    () => (data ? computeStandings(MODELS, data.matchesFile.matches, data.predictionsFile) : []),
    [data],
  );

  // Aktive Sektion für die Segmented-Control verfolgen
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) setActiveSection(mostVisible.target.id);
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.1, 0.5] },
    );
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [data]);

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* Sticky Toolbar: Navigation + Aktualisiert-Chip + manueller Refresh */}
      <div className="sticky top-0 z-40 border-y border-ink-800 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
          <nav
            aria-label="Bereiche der Seite"
            className="flex rounded-full border border-ink-700/80 bg-ink-900/80 p-0.5"
          >
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                aria-current={activeSection === section.id ? 'true' : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  activeSection === section.id
                    ? 'bg-ink-700 text-ink-50'
                    : 'text-ink-300 hover:text-ink-100'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            {lastFailed && data && (
              <span
                className="hidden rounded-full border border-clay-500/40 bg-clay-500/10 px-2 py-0.5 text-[10px] text-clay-300 md:inline"
                title="Die letzte Aktualisierung ist fehlgeschlagen – angezeigt wird der letzte erfolgreiche Stand. Nächster Versuch in spätestens 90 Sekunden."
              >
                Update fehlgeschlagen
              </span>
            )}
            <UpdatedAgo fetchedAt={fetchedAt} dataUpdatedAt={data?.matchesFile.updatedAt} />
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Jetzt aktualisieren"
              title="Jetzt aktualisieren"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-700 bg-ink-900 text-ink-200 transition-all hover:border-signal-400/60 hover:text-signal-300 active:scale-90 disabled:opacity-60"
            >
              <RefreshIcon spinning={refreshing} />
            </button>
          </div>
        </div>
      </div>

      <main
        className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-8 sm:gap-16"
        aria-busy={!data}
      >
        {!data && !lastFailed && (
          <>
            <p className="sr-only" role="status">
              Daten werden geladen …
            </p>
            <PageSkeleton />
          </>
        )}

        {!data && lastFailed && (
          <div className="rounded-2xl border border-clay-500/40 bg-clay-500/5 p-8 text-center">
            <p className="mb-1 font-display text-xl text-ink-50">
              Daten konnten nicht geladen werden
            </p>
            <p className="mb-4 text-sm text-ink-300">
              Bitte Verbindung prüfen – wir versuchen es alle 90 Sekunden automatisch erneut.
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-signal-400/60 bg-signal-400/10 px-4 py-1.5 text-sm font-medium text-signal-300 transition-colors hover:bg-signal-400/20"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {data && (
          <>
            <section id="live" aria-labelledby="live-heading" className="scroll-mt-20">
              <SectionHeading
                id="live-heading"
                title="Live & als Nächstes"
                sub="Aktuelle Spiele mit allen LLM-Tipps – grün markiert, was Stand jetzt Punkte bringt."
              />
              <SpotlightSection
                matches={data.matchesFile.matches}
                models={MODELS}
                predictionsFile={data.predictionsFile}
              />
            </section>

            <section id="tabelle" aria-labelledby="tabelle-heading" className="scroll-mt-20">
              <SectionHeading
                id="tabelle-heading"
                title="Leaderboard"
                sub="Welches Modell tippt am besten? Punkte nach Kicktipp-Schema, gewertet werden nur beendete Spiele."
              />
              <Leaderboard standings={standings} />
            </section>

            <section id="spielplan" aria-labelledby="spielplan-heading" className="scroll-mt-20">
              <SectionHeading
                id="spielplan-heading"
                title="Spielplan & alle Tipps"
                sub="Das komplette Turnier zum Durchsuchen – inklusive aller zukünftigen Tipps. Zeile aufklappen für Tipps und Punkte."
              />
              <Schedule
                matches={data.matchesFile.matches}
                models={MODELS}
                predictionsFile={data.predictionsFile}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
