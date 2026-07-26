/**
 * Minimaler Registry-Helfer – das Herzstück der Erweiterbarkeit.
 *
 * Kategorien, Vorhersage-Typen und Metriken werden ausschliesslich über solche
 * Registries angemeldet. Der Core importiert nur die Registry, niemals ein
 * konkretes Plugin. Eine neue Metrik/Kategorie ist damit eine neue Datei plus
 * ein `register()`-Aufruf – ohne Änderung an Engine oder Komponenten.
 */
export class Registry<T extends { id: string }> {
  private readonly items = new Map<string, T>();

  constructor(private readonly kind: string) {}

  register(item: T): T {
    if (this.items.has(item.id)) {
      throw new Error(`${this.kind} "${item.id}" ist bereits registriert.`);
    }
    this.items.set(item.id, item);
    return item;
  }

  /** Wirft bei unbekannter ID – Programmierfehler sollen laut scheitern. */
  get(id: string): T {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(
        `Unbekannte ${this.kind}-ID "${id}". Registriert: ${[...this.items.keys()].join(', ') || '(keine)'}`,
      );
    }
    return item;
  }

  /** Wie get(), aber tolerant – für Daten aus JSON, die veraltet sein können. */
  find(id: string): T | undefined {
    return this.items.get(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  /** Registrierungsreihenfolge bleibt erhalten (Map-Semantik). */
  list(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }
}
