import { avatarTextColor, modelInitials } from '../../lib/format';
import { modelName, modelProvider, type Locale } from '../lib/i18n/locales';
import { t } from '../lib/i18n/messages';
import type { ArenaModel } from '../lib/types';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
} as const;

/**
 * Initialen-Avatar eines Modells. Nutzt dieselben reinen Helfer wie das
 * WM-Tippspiel (modelInitials/avatarTextColor), damit ein Modell überall
 * identisch aussieht. Sprachneutral – Initialen und Farbe kommen aus den Daten.
 */
export function ModelAvatar({
  model,
  size = 'sm',
}: {
  model: ArenaModel;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-bold ${SIZES[size]}`}
      style={{ backgroundColor: model.color, color: avatarTextColor(model.color) }}
    >
      {modelInitials(model.name)}
    </span>
  );
}

/** Avatar + Name + Provider, mit Kennzeichnung für Baseline und Early Access. */
export default function ModelBadge({
  model,
  locale,
  size = 'sm',
  showProvider = true,
}: {
  model: ArenaModel;
  locale: Locale;
  size?: keyof typeof SIZES;
  showProvider?: boolean;
}) {
  const translate = t(locale);
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <ModelAvatar model={model} size={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-ink-50">
            {modelName(model, locale)}
          </span>
          {model.access === 'early-access' && (
            <span
              className="shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'color-mix(in srgb, var(--arena-prerelease) 45%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--arena-prerelease) 12%, transparent)',
                color: 'var(--arena-prerelease)',
              }}
              title={translate('model.preReleaseTitle')}
            >
              {translate('model.preRelease')}
            </span>
          )}
          {model.baseline && (
            <span
              className="shrink-0 rounded-full border border-ink-600 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-ink-300"
              title={translate('model.baselineTitle')}
            >
              {translate('model.baseline')}
            </span>
          )}
        </span>
        {showProvider && (
          <span className="truncate text-[11px] text-ink-400">{modelProvider(model, locale)}</span>
        )}
      </span>
    </span>
  );
}
