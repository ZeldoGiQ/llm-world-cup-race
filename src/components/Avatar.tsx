import { avatarTextColor, modelInitials } from '../lib/format';
import type { Model } from '../lib/types';

const SIZE_CLASSES = {
  xs: 'h-4 w-4 text-[8px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-9 w-9 text-xs',
} as const;

/** Initialen-Avatar: farbiger Kreis aus model.color + Initialen aus model.name. */
export default function Avatar({
  model,
  size = 'md',
}: {
  model: Model;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-bold ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: model.color, color: avatarTextColor(model.color) }}
    >
      {modelInitials(model.name)}
    </span>
  );
}
