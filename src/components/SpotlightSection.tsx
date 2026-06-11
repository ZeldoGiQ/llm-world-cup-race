import { MAX_SPOTLIGHT_MATCHES } from '../lib/config';
import type { Match, Model, PredictionsFile } from '../lib/types';
import MatchCard from './MatchCard';

interface Props {
  matches: Match[];
  models: Model[];
  predictionsFile: PredictionsFile;
}

const byDateAsc = (a: Match, b: Match) => a.utcDate.localeCompare(b.utcDate) || a.id - b.id;
const byDateDesc = (a: Match, b: Match) => b.utcDate.localeCompare(a.utcDate) || a.id - b.id;

/**
 * "Live & als Nächstes": zuerst alle LIVE-Spiele, dann die nächsten Anstösse.
 * Bleibt Platz (max. 6 Karten), werden die zuletzt beendeten Spiele gezeigt.
 */
export default function SpotlightSection({ matches, models, predictionsFile }: Props) {
  const live = matches.filter((m) => m.status === 'LIVE').sort(byDateAsc);
  const upcoming = matches
    .filter((m) => m.status === 'UPCOMING')
    .sort(byDateAsc)
    .slice(0, Math.max(0, MAX_SPOTLIGHT_MATCHES - live.length));
  const recent = matches
    .filter((m) => m.status === 'FINISHED')
    .sort(byDateDesc)
    .slice(0, Math.max(0, MAX_SPOTLIGHT_MATCHES - live.length - upcoming.length));

  const groups = [
    { label: 'Jetzt live', items: live },
    { label: 'Als Nächstes', items: upcoming },
    { label: 'Zuletzt beendet', items: recent },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-700/70 bg-ink-900/60 p-8 text-center text-sm text-ink-300">
        Aktuell keine Spiele im Spielplan – schau später wieder vorbei.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
            {group.label}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                models={models}
                predictions={predictionsFile.predictions[String(match.id)]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
