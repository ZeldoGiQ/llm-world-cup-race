/**
 * Lab-Glyphen – eine Quelle für Astro-Ansichten UND React-Insel.
 *
 * Die Formen stammen aus dem FutureBench-Design-System (Claude Design,
 * assets/logos/): bewusst KEINE Marken-Logos, sondern neutrale geometrische
 * Zeichen je Lab – markenrechtlich unbedenklich und im Stil der Seite.
 * DeepSeek und Z.ai sind im selben Formvokabular ergänzt.
 *
 * Alle Pfade nutzen `currentColor` und viewBox 0 0 24 24; die Farbe bestimmt
 * der Verwender (im Avatar-Kreis: die Kontrastfarbe zur Modellfarbe).
 */

export const PROVIDER_MARKS: Record<string, string> = {
  Anthropic:
    '<rect x="3" y="4" width="4" height="16" rx="2" fill="currentColor"/><rect x="10" y="8" width="4" height="12" rx="2" fill="currentColor"/><rect x="17" y="2" width="4" height="18" rx="2" fill="currentColor"/>',
  OpenAI:
    '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  Google:
    '<circle cx="12" cy="4.6" r="2.6" fill="currentColor"/><circle cx="19.4" cy="12" r="2.6" fill="currentColor"/><circle cx="12" cy="19.4" r="2.6" fill="currentColor"/><circle cx="4.6" cy="12" r="2.6" fill="currentColor"/>',
  'Moonshot AI':
    '<path d="M15.4 2.6a9.6 9.6 0 1 0 5 8.2 7.4 7.4 0 1 1-5-8.2z" fill="currentColor"/>',
  Alibaba:
    '<path d="M12 2.2 20.5 7v10L12 21.8 3.5 17V7z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
  xAI: '<rect x="10.2" y="1.5" width="3.6" height="21" rx="1.8" transform="rotate(45 12 12)" fill="currentColor"/><rect x="10.2" y="1.5" width="3.6" height="21" rx="1.8" transform="rotate(-45 12 12)" fill="currentColor"/>',
  DeepSeek:
    '<path d="M3 15c3-6.5 6-6.5 9 0s6 6.5 9 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  'Z.ai':
    '<path d="M5 5.8h14L5 18.2h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  'Example Lab':
    '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="3.5 3.5"/>',
};

export function providerMark(provider: string): string | undefined {
  return PROVIDER_MARKS[provider];
}
