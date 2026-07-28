# Fahrplan: vom stillen Betrieb zum laufenden Benchmark

Stand 28. Juli 2026. Das Backend läuft seit dem 27. Juli vollautomatisch: fünf Crons, seitdem
ohne einen Fehlschlag, 30 echte Events beschafft, alle noch vor ihrem Lock. Es fehlt genau
eine Sache — **kein einziger echter LLM-Aufruf hat je stattgefunden**, weil keine Provider-Keys
gesetzt sind. Der Predict-Job überspringt jedes Modell mit „Secret … fehlt".

Dieser Fahrplan beschreibt den Weg von dort bis zu einem Benchmark, das ein Labor zitieren kann.

---

## Phase A — Der erste echte Aufruf

**Ziel:** Ein Modell tippt ein echtes Event, die Vorhersage landet vor dem Ereignis in Git.

Der riskanteste Moment des ganzen Projekts. Die vier Provider-Adapter wurden geschrieben, ohne
je eine Antwort einer echten API gesehen zu haben, und Predictions sind per Datenbank-Trigger
unveränderlich: Ein falsch geparster Wert ist nicht korrigierbar, eine falsch berechnete
Kostenzeile macht den Budget-Wächter blind.

### Betreiber

1. **Migration 003+004 einspielen** (Supabase → SQL Editor). Zeitkritisch: ohne sie fehlt die
   Referenz-Modellzeile, der Ingest schreibt keine Random-Walk-Vorhersagen, und die
   Skill-Spalte bleibt bei Krypto und Aktien **pro Event unumkehrbar** leer — Vorhersagen
   dürfen nach dem Lock nicht mehr entstehen.
   Erkennbar am Zustand vorher: der Yahoo-Feed arbeitet mit „Cap 10" (Vorgabewert) statt 3.
2. **Einen** API-Key setzen. Namen, die der Code erwartet:
   `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `QWEN_API_KEY`,
   `MOONSHOT_API_KEY`. Modelle ohne Key werden weiter still übersprungen — Einzelzuschaltung
   ist also ausdrücklich vorgesehen und der sichere Weg.
3. **Erst einen, dann alle.** Der erste Lauf mit einem Modell kostet Cents und zeigt, ob der
   Adapter trägt. Danach die übrigen dazuschalten.

### Umsetzung

- **Adapter-Abnahme.** Fünf Prüfer lesen die Adapter gegen die aktuellen Anbieter-Dokumen-
  tationen: Endpunkte, Pflicht-Header, Suchwerkzeug-Syntax, Namen der Token-Zähler,
  Modell-Bezeichner und Preise. Ergebnis ist eine Änderungsliste nach Risiko geordnet, plus
  eine Tabelle „im Studio zu prüfen".
- **Baselines für die schon offenen Events.** `writeRandomWalkPredictions()` läuft heute nur
  für neu angelegte Events. Die sieben bereits existierenden numerischen Events bekämen damit
  nie eine Referenz. Solange sie offen sind, ist das nachholbar — danach nie mehr.
- **Ein Modell zur Probe**, manuell per `workflow_dispatch`, mit Blick auf: Parse-Erfolg,
  Token-Zähler ≠ 0, Suchanfragen ≠ 0, Kosten pro Aufruf, Latenz, Provenance vollständig.

### Abnahmekriterien

- `predictions` enthält Zeilen mit vollständiger `provenance` (Prompt-Hash, Tokens, Suche).
- `api_costs` zeigt plausible Beträge je Aufruf; `v_spend` wächst mit.
- Der nächste Publish-Lauf committet die Vorhersagen, und zwar **vor** dem Lock des Events.
- Der Invarianten-Check im Analytics-Job meldet 0 Verstöße.

---

## Phase B — Die erste vollständige Runde

**Ziel:** Ein Event durchläuft den ganzen Weg: beschafft, getippt, gesperrt, aufgelöst, gewertet.

Zuerst fällig sind die Krypto-Events (Lock 00:00 UTC, Auflösung 24 h später) — der kürzeste
Zyklus und damit der beste erste Beweis. Danach die Fußball-Ligen (Auflösung ~3 h nach Abpfiff).

### Zu beobachten

| Was | Woran erkennbar |
|---|---|
| Ein Adapter läuft still falsch | Token-Zähler dauerhaft 0, Suchanfragen dauerhaft 0, oder Parse-Fehlerquote bei genau einem Anbieter |
| Modell verweigert systematisch | `prediction_failures` mit Code `refusal` gehäuft bei einem Modell |
| Auflösung greift zu früh | Resolution weicht vom offiziellen Endstand ab (Fußball: 90 Minuten, nicht 120) |
| Budget läuft aus dem Ruder | `v_spend.today_usd` gegen den Cap von 10 $ |

### Danach

Sobald eine zweite Kategorie 20 aufgelöste Events erreicht, kippt die Gesamtwertung von
„gesperrt" auf „berechnet" — ohne eine Zeile Änderung. Die Sektion wandert automatisch nach
oben und der Titel zählt sich selbst hoch.

---

## Phase C — Zitierfähigkeit vollenden

**Ziel:** Die Startseite behauptet nichts, was sie nicht belegt — und belegt alles, was sie kann.

- **Attestierungs-Schritt im Publish-Job.** Auf der Startseite steht „0 von 624 Vorhersagen
  tragen einen unabhängigen Commit-Beweis". Ab der ersten automatischen Runde ist dieser
  Beweis tatsächlich vorhanden, aber die *Zahl* ist im Code hart auf 0 gesetzt, weil der
  Vergleich von Git-Historie und Ereigniszeitpunkt fehlt. Ohne diesen Schritt bleibt die
  stärkste Zahl der Seite für immer 0.
  Gehört **in** den Publish-Job (nicht in einen zweiten Workflow), weil nur ein einziger
  Committer existieren darf. Braucht `fetch-depth: 0` beim Checkout.
- **Benchmark-Grafik als echtes SVG** aus den echten Bootstrap-Daten: Säulenhöhen und
  Unsicherheits-Whisker exakt statt ungefähr, im Designsystem der Seite, als Datei zum
  Einbetten und als Download. Ein Bildmodell erfindet Zahlen — für ein Benchmark ist das
  genau die falsche Art von Grafik.
- **Deutsche Beugung** in der Antwortzeile („mit 190 Punkte" → „Punkten").
- **Nova Preview entfernen**, sobald ein echtes Early-Access-Modell existiert. Ein erfundenes
  Modell in einer Liste, die Glaubwürdigkeit herstellt, ist die teuerste Kleinigkeit der Seite.

---

## Phase D — Breite (aus dem genehmigten Backend-Plan)

Erst wenn A–C stehen. Reihenfolge nach Nutzen pro Aufwand:

1. **Weitere Feeds, alle gratis:** MLB und NHL (offizielle APIs), NBA, Formel 1 über den
   Ergast-Nachfolger, FOMC und CPI über FRED und BLS. Jeder Feed ist eine Datei plus eine
   Zeile in der Registry.
2. **LLM-Event-Scout** mit zweistufigem Validierungs-Gate (mechanische Prüfung, dann ein
   adversarischer Zweit-Prüfer, der fürs Ablehnen belohnt wird) und Zwei-Modell-Auflösung.
   Erschließt alles, was kein Feed liefert: Wahlen, Preisverleihungen, Produktvorstellungen.
3. **Adaptive Schicht:** cookielose Reichweitenmessung → Wochenaggregation → Themengewichte
   für den Scout und Feed-Caps. Mit 20 % Explorations-Reserve, sonst lernt das System nie
   Neues.

---

## Was bewusst nicht gebaut wird

- **Kein Live-Ticker, keine Relativzeiten.** Ein statischer Build ohne Rebuild würde einfrieren
  und lügen. Alle Zeitpunkte absolut in UTC.
- **Kein JavaScript auf der Startseite.** Die einzige Interaktivität ist das native `<details>`.
- **Keine Gesamtwertung bei einer qualifizierten Kategorie.** Der Zustand „gesperrt" ist ein
  Merkmal, kein Mangel.
- **Kein Dispute-Prozess, der eine Auflösung ändern kann.** Der einzige Ausgang eines
  berechtigten Streits ist VOID.
