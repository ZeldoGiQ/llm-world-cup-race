import { avatarTextColor, modelInitials } from '../../lib/format';
import { modelName, modelProvider, type Locale } from '../lib/i18n/locales';
import { t } from '../lib/i18n/messages';
import { modelLogo } from '../lib/model-logos';
import { providerMark } from '../lib/provider-marks';
import type { ArenaModel } from '../lib/types';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
} as const;

const GLYPH_SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
} as const;

/**
 * Modell-Avatar: farbiger Kreis mit der Lab-Glyphe aus dem Design-System,
 * Initialen nur noch als Rückfall (unbekannte Labs, Referenz-Teilnehmer).
 * Farbe und Kontrast kommen weiter aus denselben reinen Helfern wie im
 * WM-Tippspiel, damit ein Modell überall identisch aussieht.
 *
 * Die Glyphe wird über die kanonische (englische) Anbieter-Bezeichnung
 * aufgelöst, nicht über die übersetzte – Marken übersetzen sich nicht.
 */
export function ModelAvatar({
  model,
  size = 'sm',
}: {
  model: ArenaModel;
  size?: keyof typeof SIZES;
}) {
  // Rangfolge: eigenes Logo → Lab-Glyphe → Initialen.
  const logo = model.baseline ? undefined : modelLogo(model.id);
  const mark = model.baseline ? undefined : providerMark(model.provider);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-sans font-bold ${SIZES[size]}`}
      style={{ backgroundColor: model.color, color: avatarTextColor(model.color) }}
    >
      {logo ? (
        <img src={logo} alt="" className="h-full w-full rounded-full object-cover" />
      ) : mark ? (
        <svg
          viewBox="0 0 24 24"
          className={GLYPH_SIZES[size]}
          dangerouslySetInnerHTML={{ __html: mark }}
        />
      ) : (
        modelInitials(model.name)
      )}
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
