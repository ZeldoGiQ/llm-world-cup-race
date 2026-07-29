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
    en: 'Some categories still run on sample data. They are marked and excluded from every figure on this site.',
    de: 'Einige Kategorien laufen noch auf Beispieldaten. Sie sind gekennzeichnet und zählen in keine Zahl dieser Seite.',
    es: 'Algunas categorías siguen con datos de muestra. Están marcadas y quedan fuera de todas las cifras.',
  },
  'nav.language': { en: 'Language', de: 'Sprache', es: 'Idioma' },
  'nav.proof': { en: 'Proof', de: 'Belege', es: 'Pruebas' },
  'nav.models': { en: 'Models', de: 'Modelle', es: 'Modelos' },

  /* --- Spuren (Tracks) ---
     Der Score existiert je Erhebungs-Spur und wird nie über Spuren gemischt. */
  'track.knowledge': { en: 'Knowledge Cap', de: 'Knowledge Cap', es: 'Knowledge Cap' },
  'track.web': { en: 'Web Search', de: 'Web Search', es: 'Web Search' },
  'track.soon': { en: 'soon', de: 'bald', es: 'pronto' },
  'track.hint': {
    en: 'Knowledge Cap: no retrieval — every model answers from what it already knows, on identical information. Web Search: the same protocol with native search enabled. Two boards, never mixed.',
    de: 'Knowledge Cap: keine Recherche – jedes Modell antwortet aus seinem Wissen, auf identischer Information. Web Search: dasselbe Protokoll mit eingeschalteter Suche. Zwei Boards, nie vermischt.',
    es: 'Knowledge Cap: sin recuperación — cada modelo responde con lo que ya sabe, con información idéntica. Web Search: el mismo protocolo con búsqueda nativa activada. Dos tablas, nunca mezcladas.',
  },

  /* --- „Next Predictions"-Zeile --- */
  'home.next.label': {
    en: 'Next predictions',
    de: 'Nächste Vorhersagen',
    es: 'Próximas predicciones',
  },
  'home.next.filed': {
    en: '{filed}/{slots} committed',
    de: '{filed}/{slots} abgegeben',
    es: '{filed}/{slots} enviadas',
  },

  /* --- Leaderboard-Tabs --- */
  'home.tabs.label': { en: 'Leaderboards', de: 'Leaderboards', es: 'Clasificaciones' },
  'home.tabs.overall': { en: 'Overall', de: 'Gesamt', es: 'General' },
  'home.tabs.locked': { en: 'locked', de: 'gesperrt', es: 'bloqueada' },

  /* --- Score-Beschriftung --- */
  'score.scale': {
    en: '0 = reference · 100 = perfect',
    de: '0 = Referenz · 100 = perfekt',
    es: '0 = referencia · 100 = perfecto',
  },

  /* --- Teilen --- */
  'share.heading': { en: 'Share this board', de: 'Board teilen', es: 'Compartir esta tabla' },
  'share.x': { en: 'Post on X', de: 'Auf X posten', es: 'Publicar en X' },
  'share.whatsapp': { en: 'WhatsApp', de: 'WhatsApp', es: 'WhatsApp' },
  'share.linkedin': { en: 'LinkedIn', de: 'LinkedIn', es: 'LinkedIn' },
  'share.card': { en: 'Download card (SVG)', de: 'Karte laden (SVG)', es: 'Descargar tarjeta (SVG)' },
  'share.data': { en: 'Data (JSON)', de: 'Daten (JSON)', es: 'Datos (JSON)' },
  'share.text': {
    en: 'Prediction Score {score}: {leader} leads the {category} board on FutureBench — with the error bars to prove how close it is.',
    de: 'Prediction Score {score}: {leader} führt das {category}-Board auf FutureBench – mit Fehlerbalken, die zeigen, wie knapp es ist.',
    es: 'Prediction Score {score}: {leader} lidera la tabla de {category} en FutureBench, con barras de error que muestran lo reñido que está.',
  },

  /* --- Unterseiten Proof & Models --- */
  'proof.metaTitle': { en: 'Proof', de: 'Belege', es: 'Pruebas' },
  'proof.metaDescription': {
    en: 'Every FutureBench figure is verifiable: commit history as time proof, lead-time distributions, a worked example you can recheck with git log.',
    de: 'Jede FutureBench-Zahl ist prüfbar: Commit-Historie als Zeitbeweis, Vorlaufzeit-Verteilungen und ein nachrechenbarer Einzelfall per git log.',
    es: 'Cada cifra de FutureBench es verificable: historial de commits como prueba temporal, distribuciones de antelación y un ejemplo comprobable con git log.',
  },
  'models.metaTitle': { en: 'Models', de: 'Modelle', es: 'Modelos' },
  'models.metaDescription': {
    en: 'The FutureBench field: every participant with API identifier, release date and scored events — including retired rows, which are never deleted.',
    de: 'Das FutureBench-Teilnehmerfeld: jedes Modell mit API-Kennung, Erscheinungsdatum und gewerteten Events – inklusive ausgemusterter Zeilen, die nie gelöscht werden.',
    es: 'Los participantes de FutureBench: cada modelo con identificador de API, fecha de lanzamiento y eventos puntuados, incluidas filas retiradas que nunca se borran.',
  },
  'nav.backToCategories': {
    en: '← All categories',
    de: '← Alle Kategorien',
    es: '← Todas las categorías',
  },

  /* --- Startseite --- */
  'home.eyebrow': {
    en: 'Open benchmark · every prediction committed before the event',
    de: 'Offenes Benchmark · jede Vorhersage vor dem Ereignis festgehalten',
    es: 'Benchmark abierto · cada predicción registrada antes del evento',
  },
  'home.titleLead': { en: 'Which model predicts', de: 'Welches Modell trifft', es: '¿Qué modelo predice' },
  'home.titleAccent': { en: 'reality best?', de: 'die Wirklichkeit?', es: 'mejor la realidad?' },
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

  /* --- Startseite: Antwortzeile ---
     Kein Superlativ ohne Intervall. „führt" ist erlaubt, „gewinnt" nicht –
     ein i18n-Test setzt das durch. */
  'home.answer.clear': {
    en: '{leader} leads the {category} board with {value} {metric} — clear of {runnerUp}, holding first place in {pLeader} of all resampled runs.',
    de: '{leader} führt die {category}-Tabelle mit {value} {metric} – vor {runnerUp}, und hält Platz eins in {pLeader} aller Neuziehungen.',
    es: '{leader} lidera la tabla de {category} con {value} {metric}, por delante de {runnerUp}, y mantiene el primer puesto en {pLeader} de las remuestras.',
  },
  'home.answer.tied': {
    en: '{leader} leads the {category} board with {value} {metric} — but {runnerUp} is only {gap} behind, which is inside the measurement error: first place goes to {leader} in {pLeader} of resampled runs and to {runnerUp} in {pRunnerUp}.',
    de: '{leader} führt die {category}-Tabelle mit {value} {metric} – doch {runnerUp} liegt nur {gap} zurück, und das liegt im Messfehler: Platz eins geht in {pLeader} der Neuziehungen an {leader}, in {pRunnerUp} an {runnerUp}.',
    es: '{leader} lidera la tabla de {category} con {value} {metric}, pero {runnerUp} está solo {gap} por detrás, dentro del error de medición: el primer puesto va a {leader} en {pLeader} de las remuestras y a {runnerUp} en {pRunnerUp}.',
  },
  'home.answer.coldStart': {
    en: 'No event has resolved yet. {events} upcoming events are already queued for prediction.',
    de: 'Noch ist kein Ereignis aufgelöst. {events} kommende Ereignisse stehen bereits zur Vorhersage an.',
    es: 'Aún no se ha resuelto ningún evento. Ya hay {events} eventos próximos en cola para predecir.',
  },

  /* --- Startseite: Leaderboard --- */
  'home.scope.single': {
    en: '{resolved} of {total} events resolved · {models} models · ranked by {metric}',
    de: '{resolved} von {total} Ereignissen aufgelöst · {models} Modelle · gerankt nach {metric}',
    es: '{resolved} de {total} eventos resueltos · {models} modelos · clasificados por {metric}',
  },
  'home.board.colInterval': { en: 'Rank (90%)', de: 'Rang (90 %)', es: 'Rango (90 %)' },
  'home.board.colProbFirst': { en: 'P(#1)', de: 'P(#1)', es: 'P(#1)' },
  'home.board.colProbFirstTitle': {
    en: 'Share of resampled runs in which this model holds first place. Shared ranks count for both models, so the column can sum above 1.',
    de: 'Anteil der Neuziehungen, in denen dieses Modell Platz eins hält. Geteilte Ränge zählen für beide Modelle, deshalb kann die Spalte über 1 summieren.',
    es: 'Proporción de remuestras en las que este modelo ocupa el primer puesto. Los empates cuentan para ambos, por lo que la columna puede sumar más de 1.',
  },
  'home.board.noClearLeader': {
    en: 'no clear leader',
    de: 'kein klarer Führender',
    es: 'sin líder claro',
  },
  'home.board.noClearLeaderTitle': {
    en: 'The top model holds first place in fewer than 90% of resampled runs, so no medal is shown.',
    de: 'Das führende Modell hält Platz eins in weniger als 90 % der Neuziehungen – deshalb keine Medaille.',
    es: 'El modelo principal ocupa el primer puesto en menos del 90 % de las remuestras, por eso no se muestra medalla.',
  },
  'home.board.partial': {
    en: '{scored}/{resolved} events — not ranked',
    de: '{scored}/{resolved} Ereignisse – ohne Rang',
    es: '{scored}/{resolved} eventos — sin rango',
  },
  'home.board.partialTitle': {
    en: 'Fewer than half the resolved events predicted. Values over different event sets are not comparable, so this row carries no rank.',
    de: 'Weniger als die Hälfte der aufgelösten Ereignisse getippt. Werte über unterschiedliche Ereignismengen sind nicht vergleichbar, deshalb trägt diese Zeile keinen Rang.',
    es: 'Predijo menos de la mitad de los eventos resueltos. Los valores sobre conjuntos distintos no son comparables, así que esta fila no lleva rango.',
  },
  'home.board.reference': { en: 'reference', de: 'Referenz', es: 'referencia' },
  'home.board.retroactive': {
    en: 'written down after the fact',
    de: 'nachträglich festgeschrieben',
    es: 'fijada a posteriori',
  },
  'home.board.separablePairs': {
    en: 'Separable at 95%: {separable} of {pairs} model pairs ({list}). Every other ordering in this table is within noise.',
    de: 'Bei 95 % trennbar: {separable} von {pairs} Modellpaaren ({list}). Jede andere Reihenfolge in dieser Tabelle liegt im Rauschen.',
    es: 'Separables al 95 %: {separable} de {pairs} pares de modelos ({list}). Cualquier otro orden de esta tabla está dentro del ruido.',
  },
  'home.board.bootstrapNote': {
    en: 'Rank intervals and P(#1) come from {draws} paired resamples of the {events} events, seed {seed} — same draw for every model, so the comparison stays fair. Events share context, which makes these intervals lower bounds.',
    de: 'Rangintervalle und P(#1) stammen aus {draws} gepaarten Neuziehungen über die {events} Ereignisse, Seed {seed} – dieselbe Ziehung für jedes Modell, damit der Vergleich fair bleibt. Ereignisse teilen Kontext, deshalb sind die Intervalle Untergrenzen.',
    es: 'Los rangos y P(#1) provienen de {draws} remuestras emparejadas de los {events} eventos, semilla {seed}: la misma extracción para cada modelo, para que la comparación sea justa. Los eventos comparten contexto, así que estos intervalos son cotas inferiores.',
  },
  'home.board.scrollHint': {
    en: 'Scroll sideways for more columns',
    de: 'Seitlich scrollen für weitere Spalten',
    es: 'Desplázate para ver más columnas',
  },
  'home.board.viewCategory': {
    en: 'All {count} events in {category} →',
    de: 'Alle {count} Ereignisse in {category} →',
    es: 'Todos los {count} eventos de {category} →',
  },

  /* --- Startseite: Kennzahlen --- */
  'home.kpi.scored': { en: 'events scored', de: 'Ereignisse gewertet', es: 'eventos puntuados' },
  'home.kpi.predictions': {
    en: 'predictions on record',
    de: 'Vorhersagen aktenkundig',
    es: 'predicciones registradas',
  },
  'home.kpi.models': { en: 'models ranked', de: 'Modelle gerankt', es: 'modelos clasificados' },
  'home.kpi.open.empty': {
    en: 'upcoming — no predictions committed yet',
    de: 'kommend – noch keine Vorhersage abgegeben',
    es: 'próximos — aún sin predicciones',
  },
  'home.kpi.open.filed': {
    en: 'upcoming — {filed} of {slots} predictions committed',
    de: 'kommend – {filed} von {slots} Vorhersagen abgegeben',
    es: 'próximos — {filed} de {slots} predicciones enviadas',
  },
  'home.kpi.nextLock': {
    en: 'Next lock {date} UTC',
    de: 'Nächster Schluss {date} UTC',
    es: 'Próximo cierre {date} UTC',
  },
  'home.kpi.onlyLive': {
    en: 'Sample-data categories are excluded from all four figures.',
    de: 'Kategorien mit Beispieldaten zählen in keine dieser vier Zahlen.',
    es: 'Las categorías con datos de muestra quedan fuera de las cuatro cifras.',
  },

  /* --- Startseite: Kategorien --- */
  'home.cat.state.scored': { en: 'real results', de: 'echte Ergebnisse', es: 'resultados reales' },
  'home.cat.state.armed': {
    en: 'real events, no predictions yet',
    de: 'echte Ereignisse, noch keine Tipps',
    es: 'eventos reales, aún sin predicciones',
  },
  'home.cat.state.awaiting': {
    en: 'first predictions filed',
    de: 'erste Tipps abgegeben',
    es: 'primeras predicciones enviadas',
  },
  'home.cat.state.sample': { en: 'sample data', de: 'Beispieldaten', es: 'datos de muestra' },
  'home.cat.state.sampleTitle': {
    en: 'Fabricated predictions, used to exercise the interface. Excluded from every figure on this page.',
    de: 'Erfundene Vorhersagen zum Erproben der Oberfläche. Zählen in keine Zahl dieser Seite.',
    es: 'Predicciones inventadas para probar la interfaz. Excluidas de todas las cifras de esta página.',
  },
  'home.cat.leader': { en: 'Leader', de: 'Führend', es: 'Líder' },
  'home.cat.nextLock': { en: 'Next lock', de: 'Nächster Schluss', es: 'Próximo cierre' },
  'home.cat.noEvents': { en: 'no events yet', de: 'noch keine Ereignisse', es: 'aún sin eventos' },
  'home.cat.demoted': {
    en: 'Declared as real data, downgraded automatically: {reason}',
    de: 'Als echte Daten deklariert, automatisch abgestuft: {reason}',
    es: 'Declarada como datos reales, degradada automáticamente: {reason}',
  },
  'home.cat.integrity': {
    en: 'Integrity check failed ({count} violations) — excluded from every figure.',
    de: 'Integritätsprüfung fehlgeschlagen ({count} Verstöße) – zählt in keine Zahl.',
    es: 'Falló la comprobación de integridad ({count} infracciones) — excluida de toda cifra.',
  },
  'home.cat.sampleGroupHeading': {
    en: 'Interface fixtures — never counted',
    de: 'Oberflächen-Attrappen – zählen nie',
    es: 'Maquetas de interfaz — nunca cuentan',
  },
  'home.cat.scored.one': { en: '{count} scored', de: '{count} gewertet', es: '{count} puntuado' },
  'home.cat.scored.other': { en: '{count} scored', de: '{count} gewertet', es: '{count} puntuados' },
  'home.cat.pending.one': {
    en: '{count} event pending',
    de: '{count} Ereignis offen',
    es: '{count} evento pendiente',
  },
  'home.cat.pending.other': {
    en: '{count} events pending',
    de: '{count} Ereignisse offen',
    es: '{count} eventos pendientes',
  },

  /* --- Startseite: Abstufungsgründe --- */
  'home.flag.declared': {
    en: 'declared as sample data',
    de: 'als Beispieldaten deklariert',
    es: 'declarada como datos de muestra',
  },
  'home.flag.metadataSample': {
    en: 'events label themselves as sample data',
    de: 'Ereignisse bezeichnen sich selbst als Beispieldaten',
    es: 'los eventos se declaran datos de muestra',
  },
  'home.flag.resolvedAfterUpdate': {
    en: 'an event counts as resolved although it had not happened at the data timestamp',
    de: 'ein Ereignis gilt als aufgelöst, obwohl es zum Datenstand nicht stattgefunden hatte',
    es: 'un evento consta como resuelto aunque no había ocurrido en la fecha de los datos',
  },
  'home.flag.predictionAfterUpdate': {
    en: 'a prediction is timestamped after the data snapshot',
    de: 'ein Tipp trägt einen Zeitstempel nach dem Datenstand',
    es: 'una predicción lleva fecha posterior a la instantánea de datos',
  },

  /* --- Startseite: offene Runde --- */
  'home.open.heading': { en: 'Open round', de: 'Offene Runde', es: 'Ronda abierta' },
  'home.open.oneLine': {
    en: '{events} upcoming events are queued across {categories} categories, next lock {date} UTC — no model has committed a prediction yet.',
    de: '{events} kommende Ereignisse stehen in {categories} Kategorien bereit, nächster Schluss {date} UTC – noch hat kein Modell getippt.',
    es: '{events} eventos próximos en {categories} categorías, próximo cierre {date} UTC — ningún modelo ha enviado predicción todavía.',
  },
  'home.open.header': {
    en: '{events} events open · next lock {date} UTC · {filed} of {slots} predictions committed',
    de: '{events} Ereignisse offen · nächster Schluss {date} UTC · {filed} von {slots} Vorhersagen abgegeben',
    es: '{events} eventos abiertos · próximo cierre {date} UTC · {filed} de {slots} predicciones enviadas',
  },
  'home.open.locks': { en: 'Locks {date} UTC', de: 'Schluss {date} UTC', es: 'Cierra {date} UTC' },
  'home.open.progress': {
    en: '{filed} of {slots} predictions',
    de: '{filed} von {slots} Vorhersagen',
    es: '{filed} de {slots} predicciones',
  },
  'home.open.awaiting': { en: 'awaiting entries', de: 'wartet auf Tipps', es: 'esperando entradas' },
  'home.open.showAll': { en: 'show all {count}', de: 'alle {count} zeigen', es: 'ver los {count}' },
  'home.open.footnote': {
    en: 'Predictions appear here only after a run has published them. The board above shows what a completed window looks like.',
    de: 'Vorhersagen erscheinen hier erst, wenn ein Lauf sie veröffentlicht hat. Die Tabelle oben zeigt, wie ein abgeschlossenes Fenster aussieht.',
    es: 'Las predicciones aparecen aquí solo después de que una ejecución las publique. La tabla de arriba muestra una ventana ya completada.',
  },

  /* --- Startseite: kategorienübergreifend --- */
  'home.overall.lockedTitle': {
    en: 'Cross-category skill — locked',
    de: 'Kategorienübergreifender Skill – gesperrt',
    es: 'Habilidad entre categorías — bloqueada',
  },
  'home.overall.lockedBody': {
    en: 'A cross-category number needs at least {required} qualified categories. {counted} qualifies today, so none is computed — an average over a single category would just be that category’s table under a grander name.',
    de: 'Eine kategorienübergreifende Zahl braucht mindestens {required} qualifizierte Kategorien. Heute qualifiziert sich {counted}, deshalb wird keine berechnet – ein Mittelwert über eine Kategorie wäre nur deren Tabelle mit größerem Etikett.',
    es: 'Una cifra entre categorías necesita al menos {required} categorías cualificadas. Hoy se cualifica {counted}, así que no se calcula ninguna: un promedio sobre una sola categoría sería su propia tabla con un nombre más grande.',
  },
  'home.overall.title': {
    en: 'Cross-category skill ({counted} of {total} categories)',
    de: 'Kategorienübergreifender Skill ({counted} von {total} Kategorien)',
    es: 'Habilidad entre categorías ({counted} de {total} categorías)',
  },
  'home.overall.rule': {
    en: 'A category qualifies with: real data, a clean integrity check, at least {minResolved} resolved events, at least {minModels} models scored on at least {minCoverage}% of the shared events, and a reference written down beforehand.',
    de: 'Eine Kategorie qualifiziert sich mit: echten Daten, bestandener Integritätsprüfung, mindestens {minResolved} aufgelösten Ereignissen, mindestens {minModels} Modellen mit Wertung auf mindestens {minCoverage} % der gemeinsamen Ereignisse und einer vorab festgeschriebenen Referenz.',
    es: 'Una categoría se cualifica con: datos reales, integridad correcta, al menos {minResolved} eventos resueltos, al menos {minModels} modelos puntuados en al menos el {minCoverage} % de los eventos comunes y una referencia fijada de antemano.',
  },
  'home.overall.reasonHeading': {
    en: 'Not qualified yet',
    de: 'Noch nicht qualifiziert',
    es: 'Aún no cualificadas',
  },
  'home.overall.reason.example-data': {
    en: 'sample data',
    de: 'Beispieldaten',
    es: 'datos de muestra',
  },
  'home.overall.reason.integrity': {
    en: 'integrity check failed',
    de: 'Integritätsprüfung fehlgeschlagen',
    es: 'falló la integridad',
  },
  'home.overall.reason.too-few-resolved': {
    en: 'only {resolved} resolved events',
    de: 'nur {resolved} aufgelöste Ereignisse',
    es: 'solo {resolved} eventos resueltos',
  },
  'home.overall.reason.no-predictions': {
    en: 'no predictions committed',
    de: 'noch keine Vorhersagen abgegeben',
    es: 'sin predicciones enviadas',
  },
  'home.overall.reason.no-reference': {
    en: 'no reference written down',
    de: 'keine Referenz festgeschrieben',
    es: 'sin referencia fijada',
  },
  'home.overall.reason.too-few-models': {
    en: 'too few models scored on the shared events',
    de: 'zu wenige Modelle auf den gemeinsamen Ereignissen gewertet',
    es: 'pocos modelos puntuados en los eventos comunes',
  },
  'home.overall.colSkill': {
    en: 'Skill (geometric)',
    de: 'Skill (geometrisch)',
    es: 'Habilidad (geométrica)',
  },
  'home.overall.colMeanRank': {
    en: 'Mean rank (0 = always first)',
    de: 'Mittlerer Rang (0 = immer Erster)',
    es: 'Rango medio (0 = siempre primero)',
  },
  'home.overall.colCategories': { en: 'Categories', de: 'Kategorien', es: 'Categorías' },
  'home.overall.formula': {
    en: 'skill = 1 − exp(mean(ln(loss_model / loss_reference))), each category counted once',
    de: 'Skill = 1 − exp(Mittel(ln(Verlust_Modell / Verlust_Referenz))), jede Kategorie zählt einmal',
    es: 'habilidad = 1 − exp(media(ln(pérdida_modelo / pérdida_referencia))), cada categoría cuenta una vez',
  },
  'home.overall.weighting': {
    en: 'Equal weight per category is a choice, not a statistic: 20 crypto days count as much as 104 World Cup matches. The per-category values are published so you can reweight them yourself.',
    de: 'Gleiches Gewicht je Kategorie ist eine Entscheidung, keine Statistik: 20 Krypto-Tage zählen so viel wie 104 WM-Spiele. Die Werte je Kategorie sind veröffentlicht, damit man selbst umgewichten kann.',
    es: 'El mismo peso por categoría es una decisión, no una estadística: 20 días de cripto cuentan igual que 104 partidos del Mundial. Los valores por categoría se publican para que puedas reponderarlos.',
  },
  'home.overall.clamped': { en: 'capped', de: 'geklemmt', es: 'limitado' },
  'home.overall.clampWarning': {
    en: '{count} cells were capped — read the skill column as a lower bound on the gap.',
    de: '{count} Zellen wurden geklemmt – lies die Skill-Spalte als Untergrenze des Abstands.',
    es: '{count} celdas se limitaron: lee la columna de habilidad como una cota inferior de la diferencia.',
  },
  'home.overall.missingCategory': {
    en: 'no rank — did not compete in every qualified category',
    de: 'kein Rang – nicht in jeder qualifizierten Kategorie angetreten',
    es: 'sin rango — no compitió en todas las categorías cualificadas',
  },
  'home.overall.earlyAccessHeading': {
    en: 'Early access — listed separately, values provisional',
    de: 'Vorab-Zugang – separat geführt, Werte vorläufig',
    es: 'Acceso anticipado — aparte, valores provisionales',
  },

  /* --- Startseite: Belege --- */
  'home.proof.heading': { en: 'Receipts', de: 'Belege', es: 'Comprobantes' },
  'home.proof.attestedNone': {
    en: '{attested} of {total} scored predictions carry an independent commit proof. The completed round was imported as a single snapshot, so its timestamps are self-reported by the runner — which is why it says {attested} here and not something flattering. The first round whose commit predates its events locks {nextLock} UTC.',
    de: '{attested} von {total} gewerteten Vorhersagen tragen einen unabhängigen Commit-Beweis. Die abgeschlossene Runde wurde als einzelner Schnappschuss übernommen, ihre Zeitstempel stammen also vom Runner selbst – deshalb steht hier {attested} und keine schönere Zahl. Die erste Runde, deren Commit vor ihren Ereignissen liegt, schließt {nextLock} UTC.',
    es: '{attested} de {total} predicciones puntuadas tienen prueba de commit independiente. La ronda completada se importó como una única instantánea, así que sus marcas de tiempo las declara el propio ejecutor: por eso aquí figura {attested} y no una cifra más halagadora. La primera ronda cuyo commit precede a sus eventos cierra el {nextLock} UTC.',
  },
  'home.proof.leadTime': {
    en: 'Lead time across {count} predictions: median {median}, tenth percentile {p10}, minimum {min}. {under24} were committed less than 24 hours before their event.',
    de: 'Vorlaufzeit über {count} Vorhersagen: Median {median}, zehntes Perzentil {p10}, Minimum {min}. {under24} wurden weniger als 24 Stunden vor dem Ereignis abgegeben.',
    es: 'Antelación en {count} predicciones: mediana {median}, percentil diez {p10}, mínimo {min}. {under24} se enviaron menos de 24 horas antes de su evento.',
  },
  'home.proof.batches': {
    en: 'Those {count} predictions carry {batches} distinct submission timestamps — they were filed in batches, not one by one.',
    de: 'Diese {count} Vorhersagen tragen {batches} verschiedene Abgabezeitpunkte – sie wurden in Stapeln eingereicht, nicht einzeln.',
    es: 'Esas {count} predicciones tienen {batches} marcas de envío distintas: se registraron por lotes, no una a una.',
  },
  'home.proof.release': {
    en: 'Contamination is ruled out by construction: every ranked model was published before the first scored event — {days} days between the newest release ({model}, {releaseDate}) and the first event ({firstEvent} UTC). The outcomes did not exist when these models were trained.',
    de: 'Kontamination ist konstruktiv ausgeschlossen: Jedes gerankte Modell erschien vor dem ersten gewerteten Ereignis – {days} Tage zwischen der jüngsten Veröffentlichung ({model}, {releaseDate}) und dem ersten Ereignis ({firstEvent} UTC). Die Ausgänge existierten beim Training dieser Modelle nicht.',
    es: 'La contaminación queda excluida por construcción: todo modelo clasificado se publicó antes del primer evento puntuado — {days} días entre el lanzamiento más reciente ({model}, {releaseDate}) y el primer evento ({firstEvent} UTC). Los resultados no existían cuando se entrenaron estos modelos.',
  },
  'home.proof.releaseExcluded': {
    en: 'Excludes {count} participant without a public release date.',
    de: 'Ohne {count} Teilnehmer ohne öffentliches Erscheinungsdatum.',
    es: 'Excluye {count} participante sin fecha de lanzamiento pública.',
  },
  'home.proof.harness': {
    en: 'One prompt template for every model, version {version}. The exact wording is on the methodology page.',
    de: 'Ein Prompt-Template für jedes Modell, Version {version}. Der genaue Wortlaut steht auf der Methodikseite.',
    es: 'Una única plantilla de prompt para cada modelo, versión {version}. El texto exacto está en la página de metodología.',
  },
  'home.proof.verifyHeading': {
    en: 'Check one prediction yourself',
    de: 'Eine Vorhersage selbst nachprüfen',
    es: 'Comprueba una predicción tú mismo',
  },
  'home.proof.verifyEvent': { en: 'event', de: 'Ereignis', es: 'evento' },
  'home.proof.verifyPrediction': { en: 'prediction', de: 'Vorhersage', es: 'predicción' },
  'home.proof.verifyOutcome': { en: 'outcome', de: 'Ergebnis', es: 'resultado' },
  'home.proof.verifyRecorded': {
    en: 'recorded {date} UTC, {lead} before the event',
    de: 'festgehalten {date} UTC, {lead} vor dem Ereignis',
    es: 'registrada el {date} UTC, {lead} antes del evento',
  },
  'home.proof.verifyCommand': {
    en: 'Every prediction file lives in a public repository. This command prints when its contents first appeared:',
    de: 'Jede Vorhersage-Datei liegt in einem öffentlichen Repository. Dieser Befehl zeigt, wann ihr Inhalt zuerst auftauchte:',
    es: 'Cada archivo de predicciones está en un repositorio público. Este comando muestra cuándo apareció su contenido:',
  },
  'home.proof.citeHeading': { en: 'How to cite', de: 'Zitieren', es: 'Cómo citar' },
  'home.proof.cite': {
    en: 'FutureBench, {domain} — {category} subset, {resolved} resolved events, data as of {date} UTC.',
    de: 'FutureBench, {domain} – Teilmenge {category}, {resolved} aufgelöste Ereignisse, Datenstand {date} UTC.',
    es: 'FutureBench, {domain} — subconjunto {category}, {resolved} eventos resueltos, datos a {date} UTC.',
  },
  'home.proof.earlyAccess': {
    en: 'Labs can have an unreleased model scored: the row stays hidden until you ship it, results are published once the model is public — or not at all — and the harness does not change for you.',
    de: 'Labore können ein unveröffentlichtes Modell werten lassen: Die Zeile bleibt verborgen, bis es erscheint, Ergebnisse werden veröffentlicht, sobald das Modell öffentlich ist – oder gar nicht – und das Harness ändert sich für niemanden.',
    es: 'Los laboratorios pueden evaluar un modelo no publicado: la fila permanece oculta hasta su lanzamiento, los resultados se publican cuando el modelo sea público — o no se publican — y el protocolo no cambia para nadie.',
  },

  /* --- Startseite: Teilnehmerfeld und Grenzen --- */
  'home.field.heading': { en: 'The field', de: 'Das Teilnehmerfeld', es: 'Los participantes' },
  'home.field.colVersion': {
    en: 'API identifier',
    de: 'API-Kennung',
    es: 'Identificador de API',
  },
  'home.field.colReleased': { en: 'Released', de: 'Erschienen', es: 'Lanzado' },
  'home.field.colScored': {
    en: 'Scored events',
    de: 'Gewertete Ereignisse',
    es: 'Eventos puntuados',
  },
  'home.field.earlyAccessHeading': {
    en: 'Early access',
    de: 'Vorab-Zugang',
    es: 'Acceso anticipado',
  },
  'home.field.referenceHeading': {
    en: 'Reference participants',
    de: 'Referenz-Teilnehmer',
    es: 'Participantes de referencia',
  },
  'home.field.exampleEntry': {
    en: 'example entry',
    de: 'Beispiel-Eintrag',
    es: 'entrada de ejemplo',
  },
  'home.field.exampleEntryTitle': {
    en: 'A placeholder showing how an unreleased model would appear. It has no predictions and enters no figure.',
    de: 'Ein Platzhalter, der zeigt, wie ein unveröffentlichtes Modell erscheinen würde. Er hat keine Vorhersagen und zählt in keine Zahl.',
    es: 'Un marcador que muestra cómo aparecería un modelo no publicado. No tiene predicciones ni entra en ninguna cifra.',
  },
  'home.limits.heading': {
    en: 'What this does not claim',
    de: 'Was das nicht behauptet',
    es: 'Lo que esto no afirma',
  },
  'home.limits.mix': {
    en: '{scored} of {total} categories carry real results, {armed} are connected to real events but hold no model answers yet, and {example} run on sample data.',
    de: '{scored} von {total} Kategorien tragen echte Ergebnisse, {armed} hängen an echten Ereignissen, haben aber noch keine Modellantworten, und {example} laufen auf Beispieldaten.',
    es: '{scored} de {total} categorías tienen resultados reales, {armed} están conectadas a eventos reales pero aún sin respuestas de modelos, y {example} funcionan con datos de muestra.',
  },
  'home.limits.correlation': {
    en: 'Events are not independent, and neither are the answers: {identical} of {pairs} model pairs predicted the identical outcome ({share}). The effective sample is smaller than the event count suggests.',
    de: 'Ereignisse sind nicht unabhängig, die Antworten auch nicht: {identical} von {pairs} Modellpaaren tippten dasselbe Ergebnis ({share}). Die effektive Stichprobe ist kleiner, als die Ereigniszahl vermuten lässt.',
    es: 'Los eventos no son independientes, y tampoco las respuestas: {identical} de {pairs} pares de modelos predijeron el mismo resultado ({share}). La muestra efectiva es menor de lo que sugiere el número de eventos.',
  },
  'home.limits.pipeline': {
    en: 'This measures a model answering from what it already knows: no search, no browsing, no tools — only the question and a short context block. There is one answer per model and event, so model variance cannot be separated from event difficulty.',
    de: 'Gemessen wird ein Modell, das aus dem antwortet, was es ohnehin weiß: keine Suche, kein Surfen, keine Werkzeuge – nur die Frage und ein kurzer Kontextblock. Es gibt eine Antwort je Modell und Ereignis, deshalb ist Modellstreuung nicht von Ereignisschwere zu trennen.',
    es: 'Se mide un modelo que responde con lo que ya sabe: sin búsqueda, sin navegación, sin herramientas, solo la pregunta y un breve bloque de contexto. Hay una respuesta por modelo y evento, así que la varianza del modelo no puede separarse de la dificultad del evento.',
  },
  'home.limits.link': {
    en: 'Full limitations →',
    de: 'Alle Einschränkungen →',
    es: 'Todas las limitaciones →',
  },

  /* --- Startseite: Datenstand --- */
  'home.footer.dataAs': {
    en: 'Data as of {date} UTC · {live} live categories, {example} sample · {events} events tracked · page built {built} UTC',
    de: 'Datenstand {date} UTC · {live} echte Kategorien, {example} Beispiel · {events} Ereignisse erfasst · Seite gebaut {built} UTC',
    es: 'Datos a {date} UTC · {live} categorías reales, {example} de muestra · {events} eventos registrados · página generada {built} UTC',
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

  /* --- Methodik: Wettkampf-Harness --- */
  'methodology.harness.heading': {
    en: 'The competition harness',
    de: 'Das Wettkampf-Harness',
    es: 'El protocolo de competición',
  },
  'methodology.harness.intro': {
    en: 'FutureBench scores the deployed product, not the bare model — every model answering from what it already knows, under one identical protocol: same prompt, same information, same time window, same validation, same retry budget. No model may look anything up. Nothing is ever backfilled, coerced, or reinterpreted after the lock.',
    de: 'FutureBench bewertet das ausgelieferte Produkt, nicht das nackte Modell – jedes Modell antwortet aus dem, was es ohnehin weiß, unter einem identischen Protokoll: gleicher Prompt, gleiche Informationen, gleiches Zeitfenster, gleiche Validierung, gleiches Wiederholungsbudget. Kein Modell darf etwas nachschlagen. Nach dem Lock wird nichts nachgereicht, nichts zurechtgebogen, nichts neu ausgelegt.',
    es: 'FutureBench evalúa a cada modelo respondiendo con lo que ya sabe, bajo un protocolo idéntico: mismo prompt, misma información, misma ventana temporal, misma validación, mismo presupuesto de reintentos. Ningún modelo puede consultar nada. Después del cierre nada se añade, se ajusta ni se reinterpreta.',
  },
  'methodology.harness.oneTemplate.lead': {
    en: 'One versioned template.',
    de: 'Ein versioniertes Template.',
    es: 'Una plantilla versionada.',
  },
  'methodology.harness.oneTemplate.body': {
    en: 'Every model receives the same system and user prompt; only the mechanism for structured output differs. Each prediction stores a SHA-256 hash of the prompt it was given, so any change to the wording is visible in the data.',
    de: 'Jedes Modell erhält denselben System- und User-Prompt; nur der Mechanismus für strukturierte Ausgabe unterscheidet sich. Zu jeder Vorhersage wird der SHA-256-Hash des gesendeten Prompts gespeichert – jede Wortänderung ist so in den Daten sichtbar.',
    es: 'Cada modelo recibe el mismo prompt de sistema y de usuario; solo difiere el mecanismo de salida estructurada. Cada predicción guarda un hash SHA-256 del prompt recibido, de modo que cualquier cambio de redacción es visible en los datos.',
  },
  'methodology.harness.incentives.lead': {
    en: 'The scoring rule is disclosed.',
    de: 'Die Wertungsregel wird offengelegt.',
    es: 'La regla de puntuación se revela.',
  },
  'methodology.harness.incentives.body': {
    en: 'Each model is told how its answer will be scored. With proper scoring rules this is methodologically required: a model that does not know the rule would be penalised for ignorance rather than for a poor forecast.',
    de: 'Jedes Modell erfährt, wie seine Antwort gewertet wird. Bei Proper Scoring Rules ist das methodisch geboten: Ein Modell, das die Regel nicht kennt, würde für Unwissen bestraft, nicht für eine schlechte Prognose.',
    es: 'Cada modelo conoce cómo se puntuará su respuesta. Con reglas de puntuación propias esto es metodológicamente necesario: un modelo que no conoce la regla sería penalizado por ignorancia, no por un mal pronóstico.',
  },
  'methodology.harness.output.lead': {
    en: 'The output is the stored format.',
    de: 'Die Ausgabe ist das Speicherformat.',
    es: 'La salida es el formato almacenado.',
  },
  'methodology.harness.output.body': {
    en: 'The requested JSON is exactly the value that ends up in the public data files. It is checked by the same validators the site uses and stored unchanged — there is no cleanup step in between.',
    de: 'Das geforderte JSON ist exakt der Wert, der in den öffentlichen Datendateien landet. Geprüft wird mit denselben Validatoren wie auf der Seite, gespeichert wird unverändert – es gibt keinen Zwischenschritt, der etwas glättet.',
    es: 'El JSON solicitado es exactamente el valor que acaba en los archivos públicos de datos. Se comprueba con los mismos validadores del sitio y se guarda sin cambios: no hay ningún paso de limpieza intermedio.',
  },
  'methodology.harness.limitsLabel': {
    en: 'Limits enforced by the runner',
    de: 'Vom Runner erzwungene Grenzen',
    es: 'Límites que aplica el ejecutor',
  },
  'methodology.harness.limit.toolCalls': {
    en: 'tool calls per prediction (none available in this version)',
    de: 'Werkzeugaufrufe je Vorhersage (in dieser Version keine verfügbar)',
    es: 'llamadas a herramientas por predicción (ninguna en esta versión)',
  },
  'methodology.harness.limit.timeout': {
    en: 'minutes per attempt',
    de: 'Minuten je Versuch',
    es: 'minutos por intento',
  },
  'methodology.harness.limit.retries': {
    en: 'retries on transport errors',
    de: 'Wiederholungen bei Transportfehlern',
    es: 'reintentos ante errores de transporte',
  },
  'methodology.harness.limit.repairs': {
    en: 'format repair turns (format only, never the value)',
    de: 'Format-Reparaturrunden (nur Format, nie der Wert)',
    es: 'rondas de reparación de formato (solo formato, nunca el valor)',
  },
  'methodology.harness.promptLabel': {
    en: 'System prompt, verbatim',
    de: 'System-Prompt im Wortlaut',
    es: 'Prompt de sistema, literal',
  },
  'methodology.harness.promptNote': {
    en: 'This text is read from the same file the runner sends. It cannot drift from what the models actually received.',
    de: 'Dieser Text wird aus derselben Datei gelesen, die der Runner sendet. Er kann nicht von dem abweichen, was die Modelle tatsächlich erhalten haben.',
    es: 'Este texto se lee del mismo archivo que envía el ejecutor. No puede divergir de lo que los modelos recibieron realmente.',
  },

  /* --- Methodik: Recherche --- */
  'methodology.search.heading': {
    en: 'Information: what every model gets',
    de: 'Informationsstand: was jedes Modell bekommt',
    es: 'Información: lo que recibe cada modelo',
  },
  'methodology.search.p1': {
    en: 'No model can search, browse or call a tool, and every model is told so plainly. The only external information anyone receives is the question, the resolution rule and a short context block from the data feed — for a market, that includes the last known value. Everything else has to come from what the model already knows.',
    de: 'Kein Modell kann suchen, surfen oder ein Werkzeug aufrufen, und jedes erfährt das ausdrücklich. Die einzige Information von außen sind die Frage, die Auflösungsregel und ein kurzer Kontextblock aus dem Datenfeed – bei einem Markt gehört der letzte bekannte Kurs dazu. Alles Weitere muss aus dem kommen, was das Modell ohnehin weiß.',
    es: 'Ningún modelo puede buscar, navegar ni usar herramientas, y a todos se les dice con claridad. La única información externa que recibe cualquiera es la pregunta, la regla de resolución y un breve bloque de contexto del feed de datos: en un mercado, eso incluye el último valor conocido. Todo lo demás debe salir de lo que el modelo ya sabe.',
  },
  'methodology.search.p2': {
    en: 'This is a deliberate narrowing. Letting each model use its provider’s own search would measure the search index as much as the model, and those indexes differ in ways nobody outside the labs can inspect. Removing retrieval costs realism and buys comparability: whatever separates two models here, it is not that one had a better search engine.',
    de: 'Das ist eine bewusste Verengung. Ließe man jedes Modell die Suche seines Anbieters nutzen, würde man den Suchindex mitmessen – und diese Indizes unterscheiden sich auf eine Weise, die außerhalb der Labore niemand prüfen kann. Der Verzicht auf Recherche kostet Realitätsnähe und kauft Vergleichbarkeit: Was zwei Modelle hier trennt, ist jedenfalls nicht die bessere Suchmaschine.',
    es: 'Es un estrechamiento deliberado. Permitir que cada modelo use la búsqueda de su proveedor mediría el índice de búsqueda tanto como al modelo, y esos índices difieren de formas que nadie fuera de los laboratorios puede inspeccionar. Renunciar a la recuperación cuesta realismo y compra comparabilidad: lo que separa a dos modelos aquí no es un buscador mejor.',
  },
  'methodology.search.p3': {
    en: 'Sampling settings are left at each provider’s default. Fixing a temperature would suggest a control we do not have, because several reasoning APIs ignore the parameter.',
    de: 'Sampling-Einstellungen bleiben beim Standard des jeweiligen Anbieters. Eine feste Temperatur würde eine Kontrolle vorgeben, die wir nicht haben – mehrere Reasoning-APIs ignorieren den Parameter.',
    es: 'Los ajustes de muestreo se dejan en el valor predeterminado de cada proveedor. Fijar una temperatura sugeriría un control que no tenemos, porque varias API de razonamiento ignoran el parámetro.',
  },

  /* --- Methodik: Zeitfenster --- */
  'methodology.window.heading': {
    en: 'Time window',
    de: 'Zeitfenster',
    es: 'Ventana temporal',
  },
  'methodology.window.p1': {
    en: 'Predictions are collected in a window that closes at the event’s lock time. All models of one event are queried in the same batch at the same moment, so no model gets fresher information than another.',
    de: 'Vorhersagen werden in einem Fenster erhoben, das mit dem Lock-Zeitpunkt des Events endet. Alle Modelle eines Events werden im selben Durchgang zum selben Moment befragt – niemand bekommt frischere Informationen als ein anderer.',
    es: 'Las predicciones se recogen en una ventana que se cierra en el momento de bloqueo del evento. Todos los modelos de un evento se consultan en el mismo lote y en el mismo instante, así que ninguno recibe información más reciente que otro.',
  },
  'methodology.window.p2': {
    en: 'An answer that arrives after the lock is discarded and never exported. A daily check verifies this invariant against the whole database, because the citability of the leaderboard rests on it.',
    de: 'Eine Antwort, die nach dem Lock eintrifft, wird verworfen und nie exportiert. Ein täglicher Check prüft diese Invariante gegen die gesamte Datenbank – die Zitierfähigkeit des Leaderboards hängt daran.',
    es: 'Una respuesta que llega después del cierre se descarta y nunca se exporta. Una comprobación diaria verifica esta invariante en toda la base de datos, porque de ella depende la citabilidad de la clasificación.',
  },

  /* --- Methodik: Fehlverhalten --- */
  'methodology.failures.heading': {
    en: 'Missing answers',
    de: 'Fehlende Antworten',
    es: 'Respuestas ausentes',
  },
  'methodology.failures.intro': {
    en: 'A refusal is a result. If a model produces no valid answer within its budget, the gap is published with its reason instead of being quietly filled. Values are never corrected: an impossible probability of 1.3 stays invalid rather than becoming 1.0.',
    de: 'Eine Verweigerung ist ein Ergebnis. Liefert ein Modell innerhalb seines Budgets keine gültige Antwort, wird die Lücke mit Grund veröffentlicht statt stillschweigend gefüllt. Werte werden nie korrigiert: Eine unmögliche Wahrscheinlichkeit von 1,3 bleibt ungültig, statt zu 1,0 zu werden.',
    es: 'Una negativa es un resultado. Si un modelo no produce una respuesta válida dentro de su presupuesto, el hueco se publica con su motivo en lugar de rellenarse en silencio. Los valores nunca se corrigen: una probabilidad imposible de 1,3 sigue siendo inválida en vez de convertirse en 1,0.',
  },
  'methodology.failures.codesLabel': {
    en: 'Published reason codes',
    de: 'Veröffentlichte Grund-Codes',
    es: 'Códigos de motivo publicados',
  },
  'methodology.failures.code.refusal': {
    en: 'the model declined to answer',
    de: 'das Modell hat die Antwort verweigert',
    es: 'el modelo se negó a responder',
  },
  'methodology.failures.code.invalidOutput': {
    en: 'no valid value even after the repair turns',
    de: 'auch nach den Reparaturrunden kein gültiger Wert',
    es: 'ningún valor válido ni tras las rondas de reparación',
  },
  'methodology.failures.code.timeout': {
    en: 'no reply within the time limit',
    de: 'keine Antwort innerhalb des Zeitlimits',
    es: 'sin respuesta dentro del límite de tiempo',
  },
  'methodology.failures.code.apiError': {
    en: 'the provider’s API returned an error',
    de: 'die API des Anbieters meldete einen Fehler',
    es: 'la API del proveedor devolvió un error',
  },
  'methodology.failures.code.rateLimited': {
    en: 'rate limit not cleared before the lock',
    de: 'Ratenlimit vor dem Lock nicht mehr freigegeben',
    es: 'límite de tasa no liberado antes del cierre',
  },
  'methodology.failures.code.late': {
    en: 'answer arrived after the lock',
    de: 'Antwort kam nach dem Lock',
    es: 'la respuesta llegó después del cierre',
  },

  /* --- Methodik: Auflösung --- */
  'methodology.resolution.heading': {
    en: 'How events are resolved',
    de: 'Wie Events aufgelöst werden',
    es: 'Cómo se resuelven los eventos',
  },
  'methodology.resolution.p1': {
    en: 'The resolution source and the rule for reading it are fixed when the event is created, before anyone has predicted. The models see that rule verbatim in their prompt — they read exactly what the operator will read later.',
    de: 'Auflösungsquelle und Leseregel werden bei der Erstellung des Events festgelegt, bevor irgendwer getippt hat. Die Modelle sehen diese Regel wörtlich in ihrem Prompt – sie lesen genau das, was später auch der Betreiber liest.',
    es: 'La fuente de resolución y la regla para leerla se fijan al crear el evento, antes de que nadie prediga. Los modelos ven esa regla literalmente en su prompt: leen exactamente lo que el operador leerá después.',
  },
  'methodology.resolution.p2': {
    en: 'There is no operator discretion after the lock. Where the rule cannot produce exactly one value, the event is voided — it stays visible with its reason and scores nothing for anyone. Voiding is the only possible outcome of a dispute; a resolution is never rewritten.',
    de: 'Nach dem Lock gibt es keinen Ermessensspielraum. Wo die Regel nicht genau einen Wert liefert, wird das Event ungültig – es bleibt mit Grund sichtbar und wird für niemanden gewertet. Ungültigkeit ist der einzige mögliche Ausgang eines Streitfalls; eine Auflösung wird nie umgeschrieben.',
    es: 'No hay discrecionalidad del operador tras el cierre. Cuando la regla no produce exactamente un valor, el evento se anula: permanece visible con su motivo y no puntúa para nadie. La anulación es el único resultado posible de una disputa; una resolución nunca se reescribe.',
  },
  'methodology.resolution.voidLabel': {
    en: 'An event is voided when',
    de: 'Ein Event wird ungültig, wenn',
    es: 'Un evento se anula cuando',
  },
  'methodology.resolution.void1': {
    en: 'the stated rule does not yield exactly one value',
    de: 'die festgelegte Regel nicht genau einen Wert liefert',
    es: 'la regla establecida no arroja exactamente un valor',
  },
  'methodology.resolution.void2': {
    en: 'the source is unavailable or contradicts itself',
    de: 'die Quelle nicht verfügbar ist oder sich widerspricht',
    es: 'la fuente no está disponible o se contradice',
  },
  'methodology.resolution.void3': {
    en: 'the event is cancelled, postponed, or started early',
    de: 'das Ereignis abgesagt, verschoben oder vorzeitig begonnen wurde',
    es: 'el evento se cancela, se posterga o comienza antes de lo previsto',
  },
  'methodology.resolution.void4': {
    en: 'the reported value violates the event type’s contract',
    de: 'der gemeldete Wert den Vertrag des Event-Typs verletzt',
    es: 'el valor informado incumple el contrato del tipo de evento',
  },

  /* --- Methodik: Versionierung --- */
  'methodology.versioning.heading': {
    en: 'Model versions',
    de: 'Modellversionen',
    es: 'Versiones de modelos',
  },
  'methodology.versioning.p1': {
    en: 'One leaderboard row is one model version. Every prediction records the model id the API reported back, so a silent change behind a floating alias becomes visible. When that happens the row is frozen and a new one starts — results from two versions are never mixed.',
    de: 'Eine Leaderboard-Zeile ist eine Modellversion. Zu jeder Vorhersage wird die von der API zurückgemeldete Modell-ID gespeichert, sodass eine stille Änderung hinter einem gleitenden Alias sichtbar wird. Tritt das ein, wird die Zeile eingefroren und eine neue beginnt – Ergebnisse zweier Versionen werden nie vermischt.',
    es: 'Una fila de la clasificación es una versión de modelo. Cada predicción registra el identificador de modelo que devolvió la API, de modo que un cambio silencioso detrás de un alias flotante se hace visible. Cuando ocurre, la fila se congela y comienza otra: los resultados de dos versiones nunca se mezclan.',
  },
  'methodology.versioning.p2': {
    en: 'A model that leaves the competition keeps its row and its history. Nothing is deleted — removing weak results afterwards would be exactly the selection effect a benchmark has to rule out.',
    de: 'Ein Modell, das den Wettkampf verlässt, behält seine Zeile und seine Historie. Gelöscht wird nichts – schwache Ergebnisse nachträglich zu entfernen wäre genau der Selektionseffekt, den ein Benchmark ausschließen muss.',
    es: 'Un modelo que abandona la competición conserva su fila y su historial. Nada se elimina: retirar después los resultados débiles sería exactamente el efecto de selección que un benchmark debe descartar.',
  },

  /* --- Fusszeile --- */
  'footer.projectBy': { en: 'A project by', de: 'Ein Projekt von', es: 'Un proyecto de' },
  // Zählt sich selbst aus den Daten und verschwindet, sobald keine
  // Beispielkategorie mehr existiert – kein handgepflegter Stand, der veraltet.
  'footer.prototypeNote': {
    en: '{example} of {total} categories still run on sample data and are marked as such. They are excluded from every figure on this site.',
    de: '{example} von {total} Kategorien laufen noch auf Beispieldaten und sind so gekennzeichnet. Sie zählen in keine Zahl dieser Seite.',
    es: '{example} de {total} categorías siguen con datos de muestra y están marcadas como tales. Quedan fuera de todas las cifras de este sitio.',
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
