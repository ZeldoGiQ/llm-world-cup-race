/**
 * wawoff2 bringt keine eigenen Typen mit (@types/wawoff2 existiert nicht).
 * Wir benutzen genau eine Funktion daraus – die wird hier deklariert,
 * statt den Aufruf mit any zu entschärfen.
 */
declare module 'wawoff2' {
  /** woff2 → ttf. Nimmt und liefert Rohdaten. */
  export function decompress(input: Uint8Array): Promise<Uint8Array>;
  /** ttf → woff2. Benutzen wir nicht, gehört aber zur Modul-Oberfläche. */
  export function compress(input: Uint8Array): Promise<Uint8Array>;
}
