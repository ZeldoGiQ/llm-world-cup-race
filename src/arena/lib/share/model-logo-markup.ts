/**
 * Modell-Logos als eingebettetes Markup – für Bilder, die für sich stehen.
 *
 * Auf der Website reicht eine URL zum Logo (siehe lib/model-logos.ts). Eine
 * Share-Karte wird dagegen heruntergeladen, weitergeschickt und in fremde
 * Zeitleisten gestellt: Sie muss vollständig sein, ohne eine einzige externe
 * Datei nachzuladen. Deshalb wandert hier der Inhalt der Logo-Dateien direkt
 * in die Karte.
 */

const files = import.meta.glob<string>('../../assets/model-logos/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/**
 * Schält den Inhalt aus einer SVG-Datei: alles zwischen öffnendem und
 * schließendem svg-Tag. Nur so lässt sich ein Logo in eine andere Grafik
 * einsetzen, ohne ein zweites Wurzelelement zu erzeugen.
 *
 * Bewusst per Indexsuche statt per Parser: Unsere Logo-Dateien sind erzeugt
 * und enthalten keine spitzen Klammern in Attributwerten. Bei allem, was
 * nicht wie erwartet aussieht, gibt die Funktion null zurück – die Karte
 * fällt dann auf den Farbpunkt zurück, statt kaputtes SVG zu schreiben.
 */
export function innerSvgMarkup(source: string): string | null {
  const start = source.indexOf('<svg');
  if (start === -1) return null;
  const openEnd = source.indexOf('>', start);
  const close = source.lastIndexOf('</svg>');
  if (openEnd === -1 || close === -1 || close <= openEnd) return null;
  const inner = source.slice(openEnd + 1, close).trim();
  return inner.length > 0 ? inner : null;
}

const MARKUP: Record<string, string> = {};
for (const [path, source] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.svg$/i, '');
  const inner = innerSvgMarkup(source);
  if (inner) MARKUP[id] = inner;
}

/**
 * Logo-Inhalt eines Modells im 64×64-Koordinatenraum, oder undefined, wenn
 * es für dieses Modell keine eigene Datei gibt.
 */
export function modelLogoMarkup(modelId: string): string | undefined {
  return MARKUP[modelId];
}
