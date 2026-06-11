import { CATEGORY_LABELS, formatScore } from '../lib/format';
import { scoreForDisplay } from '../lib/scoring';
import type { Match, Model, Prediction } from '../lib/types';
import Avatar from './Avatar';

interface Props {
  model: Model;
  prediction: Prediction | undefined;
  match: Match;
}

/**
 * Kompakter Tipp-Chip (Modell-Initiale + getipptes Ergebnis).
 * Bei LIVE/FINISHED werden korrekte Tipps grün hervorgehoben:
 * exakt = kräftig, Differenz/Tendenz = dezent. LIVE zählt als vorläufig.
 */
export default function PredictionChip({ model, prediction, match }: Props) {
  const evaluated = scoreForDisplay(match, prediction);

  let chipClasses = 'border-ink-700 bg-ink-800/70 text-ink-100';
  if (!prediction) {
    chipClasses = 'border-ink-700/50 bg-transparent text-ink-500';
  } else if (evaluated) {
    if (evaluated.category === 'exact') {
      chipClasses = 'border-success-400/80 bg-success-400/15 text-success-300';
    } else if (evaluated.category === 'goalDiff' || evaluated.category === 'tendency') {
      chipClasses = 'border-success-400/40 bg-success-400/5 text-success-300/90';
    } else {
      chipClasses = 'border-ink-700 bg-transparent text-ink-400';
    }
  }

  const tipText = prediction ? formatScore(prediction.home, prediction.away) : 'kein Tipp';
  let title = `${model.name}: ${tipText}`;
  if (evaluated) {
    title += ` · ${evaluated.points} P. (${CATEGORY_LABELS[evaluated.category]}${
      evaluated.provisional ? ', vorläufig' : ''
    })`;
  }

  return (
    <li
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${chipClasses}`}
      title={title}
    >
      <Avatar model={model} size="xs" />
      <span className="font-mono tabular font-semibold">
        {prediction ? formatScore(prediction.home, prediction.away) : '—'}
        <span className="sr-only">{` – ${title}`}</span>
      </span>
      {evaluated && !evaluated.provisional && evaluated.points > 0 && (
        <span className="font-mono text-[10px] opacity-80">+{evaluated.points}</span>
      )}
    </li>
  );
}
