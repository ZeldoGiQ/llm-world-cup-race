/**
 * Zentraler Katalog aller Oberflächentexte der Arena.
 *
 * Hier steht ausschliesslich UI-Chrome (Navigation, Tabellenköpfe, Filter,
 * Fussnoten, Fliesstext der Seiten). Fachtexte von Metriken, Kategorien und
 * Vorhersage-Typen liegen bewusst NICHT hier, sondern in den jeweiligen
 * Plugin-Dateien – so bleibt „ein neues Plugin = eine Datei" gültig, ohne dass
 * Texte an zwei Orten nachgetragen werden müssen.
 *
 * Aufbau: Ein flaches Objekt aus Schlüsseln, jeder Schlüssel liefert alle drei
 * Sprachen. Der Zugriff läuft über `t(locale)`, das eine typsichere
 * Übersetzungsfunktion zurückgibt. Fehlt eine Sprache, greift der Rückfall auf
 * Englisch – die Oberfläche bleibt dadurch immer vollständig.
 */
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale, type Localized } from './locales';

const MESSAGES = {
  /* --- Navigation & Rahmen --- */
  'nav.brand': { en: 'Benchmarks', de: 'Benchmarks', es: 'Benchmarks' },
  'nav.categories': { en: 'Categories', de: 'Kategorien', es: 'Categorías' },
  'nav.methodology': { en: 'Methodology', de: 'Methodik', es: 'Metodología' },
  'nav.prototype': { en: 'Prototype', de: 'Prototyp', es: 'Prototipo' },
  'nav.prototypeTitle': {
    en: 'This site is a prototype: apart from the FIFA World Cup, all data is sample data.',
    de: 'Diese Seite ist ein Prototyp: Außer der Fußball-WM sind alle Daten Beispieldaten.',
    es: 'Este sitio es un prototipo: salvo el Mundial, todos los datos son de muestra.',
  },
  'nav.language': { en: 'Language', de: 'Sprache', es: 'Idioma' },
  'nav.backToCategories': {
    en: '← All categories',
    de: '← Alle Kategorien',
    es: '← Todas las categorías',
  },

  /* --- Startseite --- */
  'home.eyebrow': {
    en: 'A ZELDOgiq experiment',
    de: 'Ein ZELDOgiq-Experiment',
    es: 'Un experimento de ZELDOgiq',
  },
  'home.titleLead': { en: 'Prediction Benchmarks', de: 'Prediction Benchmarks', es: 'Prediction Benchmarks' },
  'home.titleAccent': { en: 'Arena', de: 'Arena', es: 'Arena' },
  'home.intro': {
    en: 'Which AI model reads the future best? Language models compete across several domains — sport, stock markets, elections. Every prediction is published before the event, and every score can be recomputed.',
    de: 'Welches KI-Modell schätzt die Zukunft am besten ein? Hier treten Sprachmodelle in mehreren Domänen gegeneinander an – Sport, Aktienmärkte, Wahlen. Alle Vorhersagen werden vor dem Ereignis veröffentlicht, jede Wertung ist nachrechenbar.',
    es: '¿Qué modelo de IA anticipa mejor el futuro? Los modelos de lenguaje compiten en varios ámbitos: deporte, mercados bursátiles y elecciones. Cada predicción se publica antes del evento y toda puntuación puede recalcularse.',
  },
  'home.modelsLabel': {
    en: 'Participating models',
    de: 'Teilnehmende Modelle',
    es: 'Modelos participantes',
  },
  'home.categoriesHeading': { en: 'Categories', de: 'Kategorien', es: 'Categorías' },
  'home.stat.events': { en: 'Events', de: 'Events', es: 'Eventos' },
  'home.stat.resolved': { en: 'resolved', de: 'aufgelöst', es: 'resueltos' },
  'home.stat.ranking': { en: 'Ranking', de: 'Ranking', es: 'Clasificación' },
  'home.principlesHeading': {
    en: 'How scoring works here',
    de: 'Wie hier gemessen wird',
    es: 'Cómo se evalúa aquí',
  },
  'home.principle1.title': {
    en: 'Published beforehand',
    de: 'Vorher veröffentlicht',
    es: 'Publicado con antelación',
  },
  'home.principle1.body': {
    en: 'Every prediction carries its submission time. If it precedes the event, that is shown — which rules out predicting after the fact.',
    de: 'Jede Vorhersage trägt ihren Abgabezeitpunkt. Liegt er vor dem Ereignis, wird das ausgewiesen – nachträgliches Tippen ist damit ausgeschlossen.',
    es: 'Cada predicción registra su momento de envío. Si es anterior al evento, se indica, lo que descarta predecir a posteriori.',
  },
  'home.principle2.title': {
    en: 'The right metric per domain',
    de: 'Passende Metrik je Domäne',
    es: 'La métrica adecuada por ámbito',
  },
  'home.principle2.body': {
    en: 'Score predictions earn points, numeric estimates are judged by error measures, and probabilities by Brier score and log loss — the latter reward honest uncertainty over overconfidence.',
    de: 'Ergebnistipps werden mit Punkten gewertet, Zahlen mit Fehlermaßen, Wahrscheinlichkeiten mit Brier-Score und Log-Loss – Letztere belohnen ehrliche Unsicherheit statt Overconfidence.',
    es: 'Las predicciones de resultado se puntúan, las estimaciones numéricas se juzgan con medidas de error y las probabilidades con Brier y pérdida logarítmica, que premian la incertidumbre honesta antes que el exceso de confianza.',
  },
  'home.principle3.title': {
    en: 'Against a reference',
    de: 'Gegen eine Referenz',
    es: 'Frente a una referencia',
  },
  'home.principle3.body': {
    en: 'Absolute numbers say little. What counts is the comparison with a baseline — bookmakers, a random walk or the latest poll.',
    de: 'Absolute Zahlen sagen wenig. Entscheidend ist der Vergleich mit einer Baseline – Buchmacher, Random-Walk oder letzte Umfrage.',
    es: 'Las cifras absolutas dicen poco. Lo decisivo es la comparación con una línea base: casas de apuestas, camino aleatorio o la última encuesta.',
  },
  'home.methodologyLink': {
    en: 'Methodology in detail →',
    de: 'Methodik im Detail →',
    es: 'Metodología en detalle →',
  },

  /* --- Kategorieseite --- */
  'category.realData': { en: 'Real data', de: 'Echte Daten', es: 'Datos reales' },
  'category.sampleData': { en: 'Sample data', de: 'Beispieldaten', es: 'Datos de muestra' },
  'category.sampleDataTitle': {
    en: 'This category shows sample data used to build the interface.',
    de: 'Diese Kategorie zeigt Beispieldaten zum Aufbau der Oberfläche.',
    es: 'Esta categoría muestra datos de muestra usados para construir la interfaz.',
  },
  'category.predicting': { en: 'Being predicted:', de: 'Vorhergesagt wird:', es: 'Se predice:' },
  'category.resolved': { en: 'resolved', de: 'aufgelöst', es: 'resueltos' },
  'category.open': { en: 'open', de: 'offen', es: 'abiertos' },
  'category.rankedBy': { en: 'Ranked by', de: 'Gerankt nach', es: 'Clasificado por' },
  'category.unknown': {
    en: 'Unknown category “{id}”.',
    de: 'Unbekannte Kategorie „{id}".',
    es: 'Categoría desconocida «{id}».',
  },

  /* --- Datenstand & Aktualisierung --- */
  'data.loading': { en: 'loading …', de: 'lädt …', es: 'cargando …' },
  'data.loadedAgo': { en: 'Loaded {ago}', de: 'Geladen {ago}', es: 'Cargado {ago}' },
  'data.asOf': { en: 'Data as of: {time}', de: 'Datenstand: {time}', es: 'Datos al: {time}' },
  'data.refresh': { en: 'Refresh now', de: 'Jetzt aktualisieren', es: 'Actualizar ahora' },
  'data.updateFailed': {
    en: 'Update failed',
    de: 'Update fehlgeschlagen',
    es: 'Error al actualizar',
  },
  'data.updateFailedTitle': {
    en: 'The last refresh failed — showing the most recent successful state.',
    de: 'Die letzte Aktualisierung ist fehlgeschlagen – angezeigt wird der letzte erfolgreiche Stand.',
    es: 'La última actualización falló; se muestra el último estado correcto.',
  },
  'data.errorTitle': { en: 'Data not loaded', de: 'Daten nicht geladen', es: 'Datos no cargados' },
  'data.errorBody': {
    en: 'The datasets for this category could not be reached.',
    de: 'Die Datensätze dieser Kategorie sind nicht erreichbar.',
    es: 'No se pudo acceder a los conjuntos de datos de esta categoría.',
  },
  'data.retry': { en: 'Try again', de: 'Erneut versuchen', es: 'Intentar de nuevo' },

  /* --- Leaderboard --- */
  'standings.heading': { en: 'Leaderboard', de: 'Leaderboard', es: 'Clasificación' },
  'standings.rank': { en: 'Rank', de: 'Rang', es: 'Puesto' },
  'standings.model': { en: 'Model', de: 'Modell', es: 'Modelo' },
  'standings.scored': { en: 'Scored', de: 'Gewertet', es: 'Evaluados' },
  'standings.scoredTitle': {
    en: 'Number of scored events',
    de: 'Anzahl gewerteter Events',
    es: 'Número de eventos evaluados',
  },
  'standings.empty': {
    en: 'No resolved events yet — values appear as soon as the first result is in.',
    de: 'Noch keine aufgelösten Events – Werte erscheinen, sobald das erste Ergebnis feststeht.',
    es: 'Aún no hay eventos resueltos; los valores aparecerán en cuanto se conozca el primer resultado.',
  },
  'standings.footnote': {
    en: 'Only resolved events are scored. A “—” means the value cannot be computed for that model (no predictions, or no baseline). Models that predicted fewer than half of the resolved events count as provisional and receive no rank — values across differently sized event sets are not comparable.',
    de: 'Gewertet werden nur aufgelöste Events. Ein „—" heißt, dass der Wert für dieses Modell nicht berechenbar ist (keine Tipps oder keine Baseline). Modelle, die weniger als die Hälfte der aufgelösten Events getippt haben, gelten als vorläufig und erhalten keinen Rang – Werte über unterschiedlich große Event-Mengen sind nicht vergleichbar.',
    es: 'Solo se evalúan los eventos resueltos. Un «—» indica que el valor no puede calcularse para ese modelo (sin predicciones o sin línea base). Los modelos que predijeron menos de la mitad de los eventos resueltos se consideran provisionales y no reciben puesto: los valores sobre conjuntos de eventos de distinto tamaño no son comparables.',
  },
  'standings.provisional': { en: 'provisional', de: 'vorläufig', es: 'provisional' },
  // Zähl-abhängige Texte in Singular- und Pluralform (Suffix .one/.other).
  'standings.provisionalTitle.one': {
    en: 'Only {count} scored event — too few for a reliable comparison',
    de: 'Nur {count} gewertetes Event – zu wenig für einen belastbaren Vergleich',
    es: 'Solo {count} evento evaluado: insuficiente para una comparación fiable',
  },
  'standings.provisionalTitle.other': {
    en: 'Only {count} scored events — too few for a reliable comparison',
    de: 'Nur {count} gewertete Events – zu wenig für einen belastbaren Vergleich',
    es: 'Solo {count} eventos evaluados: insuficientes para una comparación fiable',
  },
  'standings.provisionalShort.one': {
    en: 'provisional · only {count} event',
    de: 'vorläufig · nur {count} Event',
    es: 'provisional · solo {count} evento',
  },
  'standings.provisionalShort.other': {
    en: 'provisional · only {count} events',
    de: 'vorläufig · nur {count} Events',
    es: 'provisional · solo {count} eventos',
  },
  'standings.noRankTitle': {
    en: 'Not ranked — no scored events',
    de: 'Ohne Wertung – keine gewerteten Events',
    es: 'Sin clasificar: no hay eventos evaluados',
  },
  'standings.provisionalRankTitle': {
    en: 'Too few scored events for a reliable rank — values are provisional',
    de: 'Zu wenige gewertete Events für einen belastbaren Rang – Werte vorläufig',
    es: 'Muy pocos eventos evaluados para un puesto fiable: valores provisionales',
  },
  'standings.baselineMark': { en: 'Reference value', de: 'Referenzwert', es: 'Valor de referencia' },
  'standings.metricTitle': {
    en: '{label} · n = {n}',
    de: '{label} · n = {n}',
    es: '{label} · n = {n}',
  },
  'standings.metricUncomputable': {
    en: '{label} · not computable',
    de: '{label} · nicht berechenbar',
    es: '{label} · no calculable',
  },

  /* --- Modell-Badges --- */
  'model.preRelease': { en: 'Pre-release', de: 'Pre-release', es: 'Preliminar' },
  'model.preReleaseTitle': {
    en: 'Tested before public release — values are provisional',
    de: 'Vor Veröffentlichung getestet – Werte vorläufig',
    es: 'Probado antes del lanzamiento público: valores provisionales',
  },
  'model.baseline': { en: 'Baseline', de: 'Baseline', es: 'Línea base' },
  'model.baselineTitle': {
    en: 'Reference value, not a language model',
    de: 'Referenzwert, kein Sprachmodell',
    es: 'Valor de referencia, no es un modelo de lenguaje',
  },

  /* --- Event-Liste --- */
  'events.heading': {
    en: 'Events & predictions',
    de: 'Events & Vorhersagen',
    es: 'Eventos y predicciones',
  },
  'events.search': { en: 'Search events …', de: 'Event suchen …', es: 'Buscar eventos …' },
  'events.searchLabel': { en: 'Search events', de: 'Event suchen', es: 'Buscar eventos' },
  'events.filterStatus': { en: 'Filter by status', de: 'Status filtern', es: 'Filtrar por estado' },
  'events.filterModel': { en: 'Filter by model', de: 'Modell filtern', es: 'Filtrar por modelo' },
  'events.allStatuses': { en: 'All statuses', de: 'Alle Status', es: 'Todos los estados' },
  'events.allModels': { en: 'All models', de: 'Alle Modelle', es: 'Todos los modelos' },
  'events.count': {
    en: '{shown} of {total} events',
    de: '{shown} von {total} Events',
    es: '{shown} de {total} eventos',
  },
  'events.resetFilters': { en: 'Reset filters', de: 'Filter zurücksetzen', es: 'Restablecer filtros' },
  'events.none': { en: 'No events found.', de: 'Keine Events gefunden.', es: 'No se encontraron eventos.' },
  'events.tipCount': {
    en: '{count} of {total} predictions',
    de: '{count}/{total} Tipps',
    es: '{count} de {total} predicciones',
  },
  'events.lockedBefore': { en: '✓ ahead', de: '✓ vorab', es: '✓ previo' },
  'events.lockedBeforeTitle': {
    en: 'Submitted before the event ({time})',
    de: 'Tipp abgegeben vor dem Event ({time})',
    es: 'Enviado antes del evento ({time})',
  },
  'events.utcHint': { en: 'UTC: {time}', de: 'UTC: {time}', es: 'UTC: {time}' },
  'events.groupFallback': { en: 'All events', de: 'Alle Events', es: 'Todos los eventos' },

  /* --- Event-Status --- */
  'status.UPCOMING': { en: 'Open', de: 'Offen', es: 'Abierto' },
  'status.LIVE': { en: 'Live', de: 'Läuft', es: 'En curso' },
  'status.RESOLVED': { en: 'Resolved', de: 'Aufgelöst', es: 'Resuelto' },
  'status.VOID': { en: 'Void', de: 'Ungültig', es: 'Anulado' },

  /* --- Methodik-Seite --- */
  'methodology.title': { en: 'Methodology', de: 'Methodik', es: 'Metodología' },
  'methodology.intro': {
    en: 'A benchmark is worth only as much as its verifiability. This page documents in full how scoring works here — generated directly from the code that computes the numbers.',
    de: 'Ein Benchmark ist nur so viel wert wie seine Nachprüfbarkeit. Diese Seite dokumentiert vollständig, wie hier gemessen wird – erzeugt direkt aus dem Code, der die Zahlen berechnet.',
    es: 'Un benchmark vale tanto como su verificabilidad. Esta página documenta por completo cómo se evalúa aquí, generada directamente a partir del código que calcula las cifras.',
  },
  'methodology.lock.heading': {
    en: 'Proof: submitted before the event',
    de: 'Nachweis: vor dem Ereignis abgegeben',
    es: 'Prueba: enviado antes del evento',
  },
  'methodology.lock.p1': {
    en: 'Every prediction stores its submission time. If it precedes the event, the entry is marked “✓ ahead” in the event list. Where the timestamp is missing, no marker is shown — only what can be proven is claimed.',
    de: 'Jede Vorhersage speichert ihren Abgabezeitpunkt. Liegt er vor dem Ereigniszeitpunkt, wird sie in der Event-Liste als „✓ vorab" markiert. Fehlt der Zeitstempel, erscheint bewusst keine Markierung – behauptet wird nur, was belegt ist.',
    es: 'Cada predicción guarda su momento de envío. Si es anterior al evento, en la lista se marca como «✓ previo». Si falta la marca de tiempo, no se muestra ninguna señal: solo se afirma lo que puede demostrarse.',
  },
  'methodology.lock.p2': {
    en: 'The datasets are public JSON files and their change history is openly visible. It is therefore externally verifiable that a prediction existed before the event and was not altered afterwards.',
    de: 'Die Datensätze liegen offen als JSON-Dateien und ihre Änderungshistorie ist öffentlich einsehbar. Damit ist von außen prüfbar, dass eine Vorhersage tatsächlich vor dem Ereignis existierte und nachträglich nicht verändert wurde.',
    es: 'Los conjuntos de datos son archivos JSON públicos y su historial de cambios es visible. Así puede verificarse desde fuera que una predicción existía antes del evento y que no se modificó después.',
  },
  'methodology.types.heading': {
    en: 'Kinds of prediction',
    de: 'Arten von Vorhersagen',
    es: 'Tipos de predicción',
  },
  'methodology.types.format': { en: 'Input format:', de: 'Eingabeformat:', es: 'Formato de entrada:' },
  'methodology.metrics.heading': { en: 'Metrics', de: 'Metriken', es: 'Métricas' },
  'methodology.metrics.intro': {
    en: 'Each category decides which metrics it displays. For error measures, lower is better.',
    de: 'Welche Metriken eine Kategorie anzeigt, entscheidet die Kategorie selbst. „Kleiner ist besser" ist bei Fehlermaßen der Normalfall.',
    es: 'Cada categoría decide qué métricas muestra. En las medidas de error, menor es mejor.',
  },
  'methodology.metrics.lower': {
    en: 'lower is better',
    de: 'kleiner ist besser',
    es: 'menor es mejor',
  },
  'methodology.metrics.higher': {
    en: 'higher is better',
    de: 'größer ist besser',
    es: 'mayor es mejor',
  },
  'methodology.metrics.needsBaseline': {
    en: 'needs baseline',
    de: 'braucht Baseline',
    es: 'requiere línea base',
  },
  'methodology.metrics.appliesTo': { en: 'applies to:', de: 'gilt für:', es: 'se aplica a:' },
  'methodology.metrics.allTypes': {
    en: 'all kinds of prediction',
    de: 'alle Vorhersagearten',
    es: 'todos los tipos de predicción',
  },
  'methodology.baselines.heading': {
    en: 'Baselines by category',
    de: 'Baselines je Kategorie',
    es: 'Líneas base por categoría',
  },
  'methodology.baselines.intro': {
    en: 'The key question is not “how good is the value?” but “does the model beat the established reference?”. Categories without a solid reference deliberately show no skill score rather than inventing a baseline.',
    de: 'Die wichtigste Frage ist nicht „wie gut ist der Wert?", sondern „schlägt das Modell die etablierte Referenz?". Kategorien ohne belastbare Referenz zeigen bewusst keinen Skill-Score, statt eine Baseline zu erfinden.',
    es: 'La pregunta clave no es «¿qué tan bueno es el valor?», sino «¿supera el modelo la referencia establecida?». Las categorías sin una referencia sólida no muestran puntuación de habilidad, en lugar de inventar una línea base.',
  },
  'methodology.baselines.scored': { en: 'Scored:', de: 'Gewertet:', es: 'Se evalúa:' },
  'methodology.baselines.rankedBy': {
    en: 'Ranked by',
    de: 'Ranking nach',
    es: 'Clasificado por',
  },
  'methodology.baselines.none': {
    en: 'No baseline — therefore no skill score in this category.',
    de: 'Keine Baseline – daher kein Skill-Score in dieser Kategorie.',
    es: 'Sin línea base: por eso no hay puntuación de habilidad en esta categoría.',
  },
  'methodology.limits.heading': {
    en: 'Limits of interpretation',
    de: 'Grenzen der Aussagekraft',
    es: 'Límites de la interpretación',
  },
  'methodology.limits.sample.lead': { en: 'Sample size.', de: 'Stichprobengröße.', es: 'Tamaño de la muestra.' },
  'methodology.limits.sample.body': {
    en: 'Every table shows a “Scored” column. With few events, chance matters more than skill, so rankings are not reliable. Confidence intervals are planned for a later stage.',
    de: 'Jede Tabelle zeigt die Spalte „Gewertet". Bei wenigen Events entscheidet Zufall mehr als Können – Rangfolgen sind dann nicht belastbar. Konfidenzintervalle sind für eine spätere Ausbaustufe vorgesehen.',
    es: 'Cada tabla muestra la columna «Evaluados». Con pocos eventos, el azar pesa más que la habilidad, por lo que las clasificaciones no son fiables. Los intervalos de confianza están previstos para una etapa posterior.',
  },
  'methodology.limits.compare.lead': {
    en: 'Points are not comparable across categories.',
    de: 'Punkte sind nicht kategorieübergreifend vergleichbar.',
    es: 'Los puntos no son comparables entre categorías.',
  },
  'methodology.limits.compare.body': {
    en: 'A points total depends on the number of events, an error measure on the unit. Only the skill score against the baseline is dimensionless and therefore transferable.',
    de: 'Eine Punktsumme hängt von der Anzahl der Events ab, ein Fehlermaß von der Einheit. Nur der Skill-Score gegenüber der Baseline ist dimensionslos und damit übertragbar.',
    es: 'Un total de puntos depende del número de eventos y una medida de error, de la unidad. Solo la puntuación de habilidad frente a la línea base es adimensional y, por tanto, transferible.',
  },
  'methodology.limits.proper.lead': {
    en: 'Proper scoring rules instead of hit rate.',
    de: 'Proper Scoring Rules statt Trefferquote.',
    es: 'Reglas de puntuación propias en lugar de acierto.',
  },
  'methodology.limits.proper.body': {
    en: 'For probabilities we rank by Brier score and log loss. A plain hit rate would reward models that always state extreme probabilities.',
    de: 'Bei Wahrscheinlichkeiten ranken wir nach Brier und Log-Loss. Eine reine Trefferquote würde Modelle belohnen, die grundsätzlich extreme Wahrscheinlichkeiten nennen.',
    es: 'Para las probabilidades clasificamos por Brier y pérdida logarítmica. Un simple porcentaje de acierto premiaría a los modelos que siempre declaran probabilidades extremas.',
  },
  'methodology.limits.prototype.lead': { en: 'Prototype status.', de: 'Prototyp-Status.', es: 'Estado de prototipo.' },
  'methodology.limits.prototype.body': {
    en: 'Apart from the completed 2026 World Cup, all categories currently hold sample data. They serve to build the interface, not to assess models.',
    de: 'Außer der abgeschlossenen Fußball-WM 2026 sind alle Kategorien derzeit mit Beispieldaten gefüllt. Sie dienen dem Aufbau der Oberfläche, nicht der Bewertung von Modellen.',
    es: 'Salvo el Mundial 2026 ya concluido, todas las categorías contienen datos de muestra. Sirven para construir la interfaz, no para evaluar modelos.',
  },

  /* --- Fusszeile --- */
  'footer.projectBy': { en: 'A project by', de: 'Ein Projekt von', es: 'Un proyecto de' },
  'footer.prototypeNote': {
    en: 'Prototype note: only the “FIFA World Cup 2026” category contains real data. Stock index, elections and mixed sports are sample data used to build the interface.',
    de: 'Prototyp-Hinweis: Nur die Kategorie „Fußball-WM 2026" enthält echte Daten. Aktienindex, Wahlen und Sport-Mix sind Beispieldaten zum Aufbau der Oberfläche.',
    es: 'Nota de prototipo: solo la categoría «Mundial 2026» contiene datos reales. Índice bursátil, elecciones y deportes varios son datos de muestra usados para construir la interfaz.',
  },

  /* --- Meta / SEO --- */
  'meta.siteTitle': {
    en: 'Prediction Benchmarks Arena',
    de: 'Prediction Benchmarks Arena',
    es: 'Prediction Benchmarks Arena',
  },
  'meta.siteDescription': {
    en: 'Which AI model reads the future best? An open benchmark across sport, stock markets and elections — every prediction published before the event.',
    de: 'Welches KI-Modell prognostiziert die Zukunft am besten? Ein offenes Benchmark über Sport, Aktienmärkte und Wahlen – alle Vorhersagen vor dem Ereignis veröffentlicht.',
    es: '¿Qué modelo de IA anticipa mejor el futuro? Un benchmark abierto sobre deporte, mercados bursátiles y elecciones, con cada predicción publicada antes del evento.',
  },
  'meta.methodologyDescription': {
    en: 'How the Prediction Benchmarks Arena scores: metrics, baselines, proof of prior submission and the limits of interpretation.',
    de: 'Wie die Prediction Benchmarks Arena wertet: Metriken, Baselines, Nachweis der vorherigen Abgabe und Grenzen der Aussagekraft.',
    es: 'Cómo evalúa la Prediction Benchmarks Arena: métricas, líneas base, prueba de envío previo y límites de la interpretación.',
  },
} as const satisfies Record<string, Localized<string>>;

export type MessageKey = keyof typeof MESSAGES;

/** Werte, die in einen Text eingesetzt werden. */
export type MessageValues = Record<string, string | number>;

/**
 * Basis-Schlüssel eines zählabhängigen Texts (ohne .one/.other-Suffix).
 * Der Umweg über einen Typparameter ist nötig, damit der bedingte Typ über die
 * Schlüssel-Union verteilt – mit `MessageKey` direkt ergäbe sich `never`.
 */
type PluralBaseOf<K> = K extends `${infer Base}.${'one' | 'other'}` ? Base : never;
export type PluralKey = PluralBaseOf<MessageKey>;

function interpolate(text: string, values?: MessageValues): string {
  if (!values) return text;
  let result = text;
  for (const [name, value] of Object.entries(values)) {
    result = result.split(`{${name}}`).join(String(value));
  }
  return result;
}

/**
 * Übersetzungsfunktion für eine Sprache.
 *
 * Platzhalter im Format {name} werden ersetzt. Unbekannte Platzhalter bleiben
 * unangetastet, damit ein Tippfehler auffällt statt still zu verschwinden.
 *
 * `translate.plural(basisSchlüssel, anzahl)` wählt Singular oder Plural über
 * `Intl.PluralRules` – „1 Event" statt „1 Events". Alle drei Sprachen kennen nur
 * die Kategorien one/other; die Regel-API greift aber auch, falls später eine
 * Sprache mit mehr Formen dazukommt.
 */
export function t(locale: Locale) {
  const translate = (key: MessageKey, values?: MessageValues): string => {
    const entry = MESSAGES[key] as Localized<string>;
    return interpolate(entry[locale] ?? entry[DEFAULT_LOCALE], values);
  };

  translate.plural = (base: PluralKey, count: number, values?: MessageValues): string => {
    const category = new Intl.PluralRules(INTL_LOCALE[locale]).select(count);
    const specific = `${base}.${category}` as MessageKey;
    const key = specific in MESSAGES ? specific : (`${base}.other` as MessageKey);
    return translate(key, { count, ...values });
  };

  return translate;
}

export type Translate = ReturnType<typeof t>;

/** Nur für Tests: Zugriff auf den Rohkatalog. */
export const __messages = MESSAGES;
