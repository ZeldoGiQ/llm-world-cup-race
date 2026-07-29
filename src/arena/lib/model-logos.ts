/**
 * Eigene Modell-Logos – die Einwurf-Schiene.
 *
 * Konvention: Eine Datei `src/arena/assets/model-logos/<modell-id>.svg`
 * (auch .png/.webp) wird automatisch zum Avatar dieses Modells – ohne eine
 * Zeile Code. Fehlt sie, fällt die Anzeige auf die Lab-Glyphe zurück, fehlt
 * auch die, auf die Initialen. Ein Logo entfernen = Datei löschen.
 *
 * Der Vite-Glob läuft beim Bauen UND im Insel-Bundle – Astro-Ansichten und
 * React-Komponenten sehen dieselbe Zuordnung.
 */

const files = import.meta.glob<string>('../assets/model-logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const MODEL_LOGOS: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.(svg|png|webp)$/i, '');
  MODEL_LOGOS[id] = url;
}

/** Logo-URL eines Modells; undefined = keins hinterlegt. */
export function modelLogo(modelId: string): string | undefined {
  return MODEL_LOGOS[modelId];
}
