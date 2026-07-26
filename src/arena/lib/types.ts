/**
 * Prediction Benchmark Arena — generisches Datenmodell.
 *
 * Bewusst kategorie-agnostisch: Der Core kennt weder Fussball noch Aktien noch
 * Wahlen. Alles Domänenspezifische steckt in `Event.metadata` (vom Core
 * ignoriert) und in den Kategorie-Deskriptoren.
 *
 * `Resolution` und `PredictionValue` sind Discriminated Unions über `kind` –
 * ein neuer Vorhersage-Typ erzeugt an unbehandelten Stellen damit einen
 * Compile-Fehler statt eines Laufzeitfehlers.
 */

/** Lebenszyklus eines Events. Gewertet wird ausschliesslich RESOLVED. */
export type EventStatus = 'UPCOMING' | 'LIVE' | 'RESOLVED' | 'VOID';

/** Bekannte Vorhersage-Typen. Erweiterbar: neuer Handler + neue ID. */
export type PredictionTypeId = 'scoreline' | 'numeric' | 'binary';

/** Tatsächlicher Ausgang eines aufgelösten Events. */
export type Resolution =
  | { kind: 'scoreline'; home: number; away: number }
  | { kind: 'numeric'; value: number }
  | { kind: 'binary'; outcome: boolean };

/** Was ein Modell vorhergesagt hat. */
export type PredictionValue =
  | { kind: 'scoreline'; home: number; away: number }
  /** Punktschätzung, z. B. Indexstand oder Prozentwert */
  | { kind: 'numeric'; value: number }
  /** Wahrscheinlichkeit für "tritt ein", 0..1 – Basis für Brier/Log-Loss */
  | { kind: 'binary'; probability: number };

export interface Prediction {
  value: PredictionValue;
  /** Abgabezeitpunkt (ISO-8601 UTC) – Basis für den "vor dem Event"-Nachweis */
  createdAt: string;
}

export interface ArenaEvent<M = Record<string, unknown>> {
  /** innerhalb der Kategorie eindeutig */
  id: string;
  /**
   * Kanonischer Titel in der Standardsprache (Englisch).
   * Bei Kategorien, deren Titel aus Metadaten entstehen (Teamnamen, Ticker,
   * Datum), dient er nur als Rückfall.
   */
  title: string;
  /**
   * Übersetzungen des Titels, soweit die Datenquelle sie liefert.
   * Fehlt eine Sprache, wird `title` angezeigt – eine Kategorie mit
   * Prosa-Fragen (z. B. Wahlen) kann so schrittweise lokalisiert werden,
   * ohne das Schema zu brechen.
   */
  titles?: Partial<Record<'en' | 'de' | 'es', string>>;
  /** Anstoss-/Auflösungszeitpunkt in UTC; nach diesem Zeitpunkt ist der Tipp gesperrt */
  utcDate: string;
  status: EventStatus;
  predictionType: PredictionTypeId;
  /** null, solange nicht RESOLVED */
  resolution: Resolution | null;
  /** kategoriespezifische Zusatzdaten – der Core liest sie nie */
  metadata: M;
}

export interface EventsFile {
  category: string;
  updatedAt: string;
  events: ArenaEvent[];
}

/** eventId -> modelId -> Prediction */
export type EventPredictions = Record<string, Prediction>;

export interface PredictionsFile {
  category: string;
  predictions: Record<string, EventPredictions>;
}

export interface ArenaModel {
  id: string;
  /**
   * Kanonischer Name in der Standardsprache.
   * Bei echten Sprachmodellen ein Eigenname, der nie übersetzt wird.
   */
  name: string;
  /**
   * Übersetzungen des Namens – nur für Referenz-Teilnehmer nötig
   * („Random walk" / „Random-Walk" / „Camino aleatorio").
   */
  names?: Partial<Record<'en' | 'de' | 'es', string>>;
  provider: string;
  /** Übersetzungen des Anbieters, z. B. „Reference" / „Referenz". */
  providers?: Partial<Record<'en' | 'de' | 'es', string>>;
  /** Akzentfarbe für Avatar/Chips (Hex) */
  color: string;
  version?: string;
  /** Veröffentlichungsdatum des Modells (ISO) */
  releaseDate?: string;
  /** 'early-access' = vor Release getestet, Werte als vorläufig kennzeichnen */
  access?: 'public' | 'early-access';
  /**
   * Referenz-Teilnehmer statt LLM (Buchmacher-Konsens, Random-Walk, Umfrage).
   * Baselines erscheinen im Leaderboard separat und sind die Bezugsgrösse
   * für den Skill-Score.
   */
  baseline?: boolean;
}

/** Ein gewertetes (Vorhersage, Ergebnis)-Paar – Eingabe jeder Metrik. */
export interface Sample {
  prediction: PredictionValue;
  resolution: Resolution;
}

/** Eintrag in public/arena-data/registry.json */
export interface RegistryEntry {
  id: string;
  label: string;
}

export interface ArenaRegistryFile {
  categories: RegistryEntry[];
}
