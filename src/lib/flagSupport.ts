/**
 * Windows rendert Länderflaggen-Emojis nicht (es erscheinen Buchstabenpaare
 * wie "DE"). Da neben jeder Flagge ohnehin der TLA-Code steht, blenden wir
 * die Flaggen-Spans aus, wenn der Browser keine echten Flaggen zeichnet.
 * Detection: 🇩🇪 auf ein Canvas malen – echte Flaggen erzeugen farbige Pixel,
 * der Buchstaben-Fallback ist monochrom.
 */
let cached: boolean | null = null;

export function supportsFlagEmoji(): boolean {
  if (cached !== null) return cached;
  if (typeof document === 'undefined') return true; // SSR: optimistisch
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return (cached = true);
    context.textBaseline = 'top';
    context.font = '16px sans-serif';
    context.fillText('\u{1F1E9}\u{1F1EA}', 0, 0); // 🇩🇪
    const { data } = context.getImageData(0, 0, 20, 20);
    cached = false;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha! > 8 && (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2])) {
        cached = true;
        break;
      }
    }
  } catch {
    cached = true;
  }
  return cached;
}
