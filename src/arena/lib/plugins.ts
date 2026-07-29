/**
 * Zentrale Plugin-Anmeldung.
 *
 * Jedes Plugin-Modul registriert sich beim Import selbst (Seiteneffekt). Wer mit
 * den Registries arbeitet, importiert diese Datei einmal – dann sind alle
 * Vorhersage-Typen, Metriken und Kategorien verfügbar.
 *
 * Eine neue Kategorie oder Metrik hinzufügen = Modul anlegen + hier eine Zeile.
 * Sonst ändert sich nichts: weder Engine, noch Komponenten, noch Daten-Layer.
 */

// Vorhersage-Typen
import './prediction-types/scoreline';
import './prediction-types/numeric';
import './prediction-types/binary';

// Metriken
import './metrics/accuracy';
import './metrics/error';
import './metrics/probabilistic';
import './metrics/skill';
import './metrics/score';

// Referenzregeln (Bezugslinie ohne Referenz-Teilnehmer)
import './references/constant-scoreline';

// Kategorien
import './categories/football-worldcup';
import './categories/football-leagues';
import './categories/crypto';
import './categories/stocks-index';
import './categories/elections';
import './categories/sports-mixed';

export { predictionTypes } from './prediction-types/index';
export { metrics, metricsFor } from './metrics/index';
export { categories } from './categories/index';
export { references } from './references/index';
