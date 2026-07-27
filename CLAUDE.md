# FutureBench — Prediction Benchmark Arena

Live: **https://www.futurebench.ai** · Repo: `ZeldoGiQ/llm-world-cup-race` · Hosting: Vercel
(Deploy bei jedem Push auf `main`)

## Was das ist

Öffentliche Arena, die Sprachmodelle auf Vorhersagen benchmarkt. Modelle recherchieren
selbstständig per Web-Suche und tippen echte Ereignisse (Fußball, Aktienindizes, Krypto).
Vorhersagen werden **vor** dem Ereignis in Git veröffentlicht, nach der Auflösung gewertet und
zu einem Leaderboard aggregiert. Ziel ist Zitierfähigkeit: jede Zahl muss von außen
nachrechenbar sein.

**Zwei Anwendungen liegen im selben Repo:**

1. **WM-Tipprunde 2026** (`/`) — abgeschlossen, echte Daten, **eingefroren**. Siehe Never Touch.
2. **Arena** (`/arena`, `/arena/de`, `/arena/es`) — aktiv, dreisprachig (en Standard).

## Architektur

Astro 5 (statisch) + eine React-19-Insel · Tailwind v4 über `@tailwindcss/vite` ·
TypeScript strict · Vitest.

Backend: **Supabase Postgres = Zustand, GitHub Actions = Compute, Git-Commit = Beweis.**
Das Frontend spricht **nie** mit Supabase; es liest ausschließlich statische JSON-Dateien.

| Bereich | Ort |
|---|---|
| Arena-Frontend | `src/arena/**` |
| Plugin-Registries | `src/arena/lib/{prediction-types,metrics,categories}/`, angemeldet in `src/arena/lib/plugins.ts` |
| Wertung (Arena) | `src/arena/lib/metrics/**` + `src/arena/lib/scoring/standings.ts` |
| Wettkampf-Harness | `src/arena/lib/harness/{config,prompt-template}.ts` |
| Übersetzungen | `src/arena/lib/i18n/messages.ts` (UI-Chrome), Fachtexte in der jeweiligen Plugin-Datei |
| Backend-Jobs | `scripts/arena/jobs/*.mts` |
| Model-Calls | `scripts/arena/providers/*.mts` |
| Datenquellen | `scripts/arena/sources/*.mts` |
| DB-Schema | `scripts/arena/sql/*.sql` (aufsteigend numeriert, nie rückdatiert) |
| Cron-Workflows | `.github/workflows/arena-*.yml` |
| Betreiber-Anleitung | `scripts/arena/SETUP.md` |

**Alle Model-Calls laufen über `scripts/arena/providers/`, nie direkt.** Vier Adapter decken
alles ab; OpenAI-kompatible Anbieter (xAI, Alibaba, Moonshot, DeepSeek …) brauchen **nie** neuen
Code — nur eine Zeile in der `providers`-Tabelle.

Backend-Laufzeit ist `node --experimental-strip-types` (Node ≥ 22.6): Typen werden nur
**entfernt**, nicht transformiert. Daher **keine** Enums, **keine** Parameter-Properties, **keine**
Namespaces, und relative Imports brauchen **explizite Endungen** (`./foo.mts`, `./bar.ts`).

## Befehle

```bash
npm test              # 190 Tests (Frontend + Backend)
npm run check:arena   # Typcheck Backend (nodenext)
npx tsc --noEmit      # Typcheck Frontend (bundler)
npm run build         # Astro-Build
```

Vor jedem Commit müssen alle vier grün sein. Dev-Server nie über Bash starten, sondern über die
Preview-Tools.

## Regeln

- TypeScript strikt, **kein `any`**. Externe Daten kommen als `unknown` an und werden validiert.
- Jeder neue Feed, Adapter, Job und Endpoint braucht einen Test.
- Fehlschlagende Tests werden gefixt, **nie geskippt** und nie durch Anpassen der Erwartung
  „grün gemacht", solange die Erwartung richtig war.
- Neue Kategorie/Metrik = **eine neue Datei + eine Zeile in `plugins.ts`**. Kein `switch` im Kern.
  Der Erweiterbarkeitstest erzwingt das.
- Kommentare erklären **warum**, nicht was. Sprache im Code: Deutsch (wie der Bestand).
- Der Ordner `ops/` und `public/arena-data/**` werden von Jobs geschrieben — nicht von Hand.

## Never Touch

**WM-Bestand — eingefroren, echte historische Daten, keine Änderung ohne ausdrücklichen Auftrag:**

```
src/lib/**                          src/components/**
src/pages/index.astro               src/layouts/Layout.astro
src/styles/global.css               src/data/models.json
public/data/**                      scripts/*.mjs (oberste Ebene)
scripts/lib/**                      .github/workflows/update-results.yml
public/arena-data/football-worldcup/**
astro.config.mjs
```

`src/lib/scoring.ts` ist die Kicktipp-Wertung der WM. Die Arena nutzt sie **lesend** wieder
(`src/arena/lib/prediction-types/scoreline.ts`). Eine Änderung dort verfälscht rückwirkend
104 Spiele und das gesamte WM-Leaderboard. `worldcup-parity.test.ts` prüft die exakten
Endzahlen — dieser Test darf nie angepasst werden, um eine Änderung durchzulassen.

**Secrets:** `.env` und API-Keys nie lesen, nie ausgeben, nie loggen. Das Repo ist **öffentlich**.
Roh-Antworten von Modellen gehören in die DB, nie in Logs. Keys werden ausschließlich zur
Laufzeit über `scripts/arena/lib/env.mts` nachgeschlagen.

## Unverhandelbare Invarianten

1. **Der Datenvertrag ist heilig.** `public/arena-data/registry.json` und
   `<kategorie>/{events,predictions}.json`. Format-Änderung nur mit gleichzeitiger
   Frontend-Anpassung und Test. Das Backend ist ein *Erzeuger* dieser Dateien, nichts weiter.
2. **Lock-Beweis.** Keine Prediction mit `created_at > utc_date` darf je exportiert werden.
   Der Publish-Job verweigert sie, der Analytics-Job prüft die Invariante täglich gegen die
   ganze DB. Hierauf ruht die Zitierfähigkeit.
3. **Predictions sind immutabel.** Ein DB-Trigger verbietet UPDATE und DELETE. Es gibt keinen
   legitimen Weg, eine abgegebene Vorhersage zu ändern — auch nicht „nur zum Testen".
4. **Werte werden nie koerziert.** Eine Wahrscheinlichkeit von 1.3 bleibt ungültig und wird nicht
   zu 1.0. Ein Formatfehler wird über den festen Repair-Prompt behandelt, ein *Wert* nie.
5. **Kein Ermessen nach dem Lock.** Auflösungsquelle und Leseregel werden bei Event-Erstellung
   fixiert und stehen wörtlich im Prompt. Mehrdeutigkeit → **VOID**, sichtbar mit Grund. Eine
   Resolution wird nie umgeschrieben.
6. **Harness-Änderung = neue Version.** Wer `src/arena/lib/harness/prompt-template.ts` oder
   `config.ts` ändert, ändert die Wettkampfbedingungen: `HARNESS_VERSION` hochziehen, Werte
   verschiedener Versionen nie mischen. Der Prompt-Hash je Prediction macht das prüfbar.
7. **Ein Leaderboard-Eintrag = eine Modellversion.** Ausgemusterte Modelle behalten Zeile und
   Historie (`enabled = false`). Nichts wird gelöscht — nachträglich schwache Ergebnisse zu
   entfernen wäre genau der Selektionseffekt, den ein Benchmark ausschließen muss.
8. **Budget ist ein Hard-Cap.** Caps liegen in der DB (`budget`), der Guard greift auch mitten
   im Lauf. Überschreitung = sauberer Abbruch mit Exit 0, kein roter Workflow.

## Betrieb

Admin ist **Supabase Studio** (Table Editor), nicht Code:

| Aufgabe | Handgriff |
|---|---|
| Neues LLM | Secret setzen + eine Zeile in `models` (`enabled = true`) |
| LLM rauswerfen | `models.enabled = false` (Historie bleibt) |
| Budget/Caps | Tabelle `budget` |
| Event-Volumen, Fenster, Quoten | Tabelle `ops_config` |

Jobs lesen alles zur Laufzeit — kein Deploy, kein Commit nötig. Der **Publish-Job ist der
einzige Committer** (Single Writer, keine Push-Races).

### Routing (`vercel.json`)

| Adresse | Ziel |
|---|---|
| `/` | Weiterleitung auf `/arena` — die Domain gehört dem Benchmark, nicht der Pilotrunde |
| `/wm` | Rewrite auf die gebaute `index.html` (WM-Tipprunde) |
| `/arena`, `/arena/de`, `/arena/es` | unverändert; canonical und hreflang zeigen auf `/arena` |

`/wm` ist bewusst ein Rewrite und keine zweite Astro-Seite: so bleibt die abgeschlossene
Runde byte-identisch und `src/pages/index.astro` unangetastet. Rewrites laufen bei Vercel nach
den Redirects und greifen direkt aufs Dateisystem — die Weiterleitung von `/` trifft dieses
Ziel also nicht. Die Weiterleitung ist absichtlich temporär (307), damit sie zurücknehmbar
bleibt, falls die Arena später ganz auf `/` umzieht.

**`vercel.json` verträgt keine Kommentare und keine unbekannten Felder.** Ein zusätzlicher
Schlüssel (auch `"comment"`) macht die ganze Datei ungültig, und Vercel bricht den Build ab —
die Begründungen gehören deshalb hierher, nicht in die Datei. Nach jeder Änderung an
`vercel.json` den Deploy prüfen:

```bash
gh api repos/ZeldoGiQ/llm-world-cup-race/commits/HEAD/status --jq .state
```

## Bei Unsicherheit

Nachfragen statt annehmen. **Keine stillen Schema-Änderungen** — weder am Datenvertrag, noch am
DB-Schema, noch am Harness. Wenn eine Änderung historische Zahlen bewegen könnte: erst fragen,
dann handeln.

Umgebung ist **Windows**; Pfade und Shell-Syntax entsprechend. Flaggen-Emojis werden hier nicht
gerendert (siehe `src/lib/flagSupport.ts`).
