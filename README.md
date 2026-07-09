# LLM WM-Tipprunde 2026

Eine öffentliche, statische Web-App: Mehrere LLMs (GPT, Gemini, Claude, Grok, DeepSeek, …)
tippen gegeneinander die Fußball-WM 2026. Alle Tipps werden vor Anpfiff veröffentlicht,
echte Ergebnisse kommen automatisch per API, das Leaderboard rechnet im Browser.
Read-only – Besucher schauen nur zu.

**Stack:** Astro + TypeScript + Tailwind CSS, eine React-Island für die Interaktivität.
Kein Server, keine Datenbank – alle Daten sind statische JSON-Dateien. Hosting auf
Vercel (Hobby, kostenlos), Ergebnis-Updates per GitHub Action (kostenlos im Public Repo),
Spieldaten von [football-data.org](https://www.football-data.org/) (Free-Tier).

## Wie es funktioniert

```
football-data.org ──(GitHub Action, alle 10 min)──> public/data/matches.json ──┐
                                                                               ├─ git push ──> Vercel-Redeploy
Betreiber ──(CSV-Template ausfüllen + Import-Script)──> public/data/predictions.json ──┘

Browser: lädt /data/*.json, pollt alle 90 s neu, berechnet Punkte & Leaderboard clientseitig.
```

- `src/data/models.json` – **einzige Quelle der teilnehmenden Modelle** (Name, Provider, Farbe).
  Modell hinzufügen/entfernen = nur diese Datei ändern, kein Code-Change.
- `public/data/predictions.json` – die Tipps, gepflegt über den CSV-Workflow (siehe unten).
- `public/data/matches.json` – Spielplan + Ergebnisse, schreibt der Cron-Job. Die Datei im
  Repo enthält anfangs **Demo-Daten**, die der erste echte Lauf ersetzt.

## Schnellstart (lokal)

Voraussetzung: Node.js ≥ 20.

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # Unit-Tests (Scoring)
npm run build      # Produktions-Build nach dist/
```

## Live schalten

Einmalige Voraussetzungen: GitHub-Account mit [GitHub CLI](https://cli.github.com/) (`gh auth login`),
[Vercel-Account](https://vercel.com) (Hobby reicht), kostenloser API-Key von
[football-data.org/client/register](https://www.football-data.org/client/register).

### 1. Repo anlegen & pushen

Dieses Projekt liegt unter **<https://github.com/ZeldoGiQ/llm-world-cup-race>**.
Für einen eigenen Fork/Neuaufbau:

```bash
git init                                   # falls noch kein Repo
git add -A && git commit -m "init: LLM WM-Tipprunde"
gh repo create <repo-name> --public --source=. --push
```

### 2. API-Key als Secret hinterlegen

```bash
gh secret set FOOTBALL_DATA_API_KEY       # Key einfügen, wenn gefragt
```

### 3. Erste echte Daten laden (empfohlen vor dem ersten Deploy)

PowerShell:

```powershell
$env:FOOTBALL_DATA_API_KEY = "dein-key"
node scripts/fetch-results.mjs
```

bash/zsh:

```bash
FOOTBALL_DATA_API_KEY="dein-key" node scripts/fetch-results.mjs
```

Danach committen & pushen – die Demo-Daten sind ersetzt.

### 4. Auf Vercel deployen – zwei Wege

- **Dashboard:** vercel.com → „Add New… → Project" → Repo `llm-world-cup-race` importieren →
  Deploy. Astro wird automatisch erkannt, keine weiteren Einstellungen nötig.
  Ab jetzt deployt **jeder Push automatisch** – auch die Auto-Commits der GitHub Action.
- **CLI:** `npm i -g vercel && vercel link && vercel --prod`

Die Seite ist dann unter `https://<projektname>.vercel.app` erreichbar. Eigene Domain
optional in den Vercel-Projekt-Settings („Domains") hinterlegen.

### 5. GitHub Action prüfen

Im Repo unter **Actions → „Ergebnisse aktualisieren" → Run workflow** einmal manuell
starten. Läuft der Job grün durch, aktualisiert er ab jetzt alle 10 Minuten die Ergebnisse
und pusht bei Änderungen → Vercel deployt automatisch, offene Tabs ziehen sich die neuen
Daten beim nächsten 90-Sekunden-Poll ohne Reload.

## Tipps verwalten (Predictions-Workflow)

```bash
node scripts/build-template.mjs --stage GROUP_STAGE
# predictions-template.csv im Spreadsheet ausfüllen (z. B. 2-1 pro Zelle)
node scripts/import-predictions.mjs predictions-template.csv
git add public/data/predictions.json && git commit -m "Tipps Gruppenphase" && git push
```

Details:

- `build-template.mjs` zieht den Spielplan von der API (ohne Key: lokale `matches.json`)
  und schreibt eine CSV mit den Spalten `matchId, utcDate, stage, group, home, away` plus
  einer leeren Spalte pro Modell. Bereits vorhandene Tipps sind vorbefüllt.
  `--stage` filtert auf eine Phase (z. B. nur `GROUP_STAGE`, oder kommagetrennt
  `LAST_16,QUARTER_FINALS` – praktisch für rundenweise K.-o.-Tipps, sobald die Paarungen
  feststehen). `--out datei.csv` ändert den Dateinamen.
- Zellenformat `2-1` (auch `2:1` wird akzeptiert). Leere Zellen werden übersprungen –
  fehlende Tipps zeigen im UI „—", geben 0 Punkte und zählen nicht als gewertetes Spiel.
- `import-predictions.mjs` merged in `predictions.json`: vorhandene Tipps bleiben, neue
  kommen dazu. **Nur neue/geänderte Tipps bekommen `createdAt` = jetzt** – unveränderte
  behalten ihren Zeitstempel. `createdAt < Anstoß` ergibt im UI das Badge „vor Anpfiff"
  (Transparenz-Feature). Unbekannte matchIds/Spalten werden gemeldet.
- Die CSV versteht Komma **und** Semikolon (deutsches Excel) und ist UTF-8 mit BOM.

## Modelle verwalten

`src/data/models.json`:

```json
{ "id": "gpt", "name": "GPT-5.2", "provider": "OpenAI", "color": "#10a37f" }
```

- `id` ist der Schlüssel in `predictions.json` und der CSV-Spaltenname – nicht ändern,
  wenn schon Tipps existieren.
- Avatare entstehen automatisch aus Initialen + Farbe, es gibt keine Logo-Dateien.
- Nach Änderung: committen & pushen (die Modell-Liste wird beim Build eingebacken).

## Scoring & Regeln (Kicktipp-Schema)

Pro Modell und beendetem Spiel:

| Treffer                                            | Punkte |
| -------------------------------------------------- | ------ |
| Exaktes Ergebnis                                   | 4      |
| Richtige Tordifferenz (kein Remis, nicht exakt)    | 3      |
| Richtige Tendenz (Sieg/Remis/Niederlage)           | 2      |
| Sonst                                              | 0      |

- Punktwerte zentral konfigurierbar in [`src/lib/config.ts`](src/lib/config.ts) (`SCORING`).
- Gewertet werden **nur Spiele mit Status FINISHED**; bei Live-Spielen zeigt das UI eine
  vorläufige Wertung.
- K.-o.-Spiele: Es zählt das **Ergebnis nach 120 Minuten** (reguläre Zeit + Verlängerung).
  **Elfmeterschießen wird ignoriert** – endet ein Spiel nach Verlängerung remis, wird das
  Remis gewertet, egal wer das Elfmeterschießen gewinnt. Achtung API-Detail: `fullTime`
  von football-data.org enthält bei `duration=PENALTY_SHOOTOUT` auch die Elfmeter-Tore;
  `fetch-results.mjs` rechnet deshalb auf den 120-Minuten-Stand zurück
  (`regularTime + extraTime`) und legt das Elfmeterschießen separat als `penalties` ab
  (UI zeigt es klein unter dem Ergebnis, z. B. „i. E. 6:5").
- Leaderboard-Sortierung: Punkte, dann mehr exakte Treffer, dann mehr gewertete Spiele.
- Die Scoring-Funktion ist isoliert in [`src/lib/scoring.ts`](src/lib/scoring.ts) und mit
  Unit-Tests abgedeckt (`npm test`).

## Status-Mapping (football-data.org → App)

| API-Status                          | App      |
| ----------------------------------- | -------- |
| `SCHEDULED`, `TIMED`                | UPCOMING |
| `IN_PLAY`, `PAUSED`                 | LIVE     |
| `FINISHED`, `AWARDED`               | FINISHED |
| `SUSPENDED`, `POSTPONED`, `CANCELLED` (und Unbekanntes) | OTHER (wird angezeigt, aber nie gewertet) |

## Automatische Ergebnis-Updates

[`.github/workflows/update-results.yml`](.github/workflows/update-results.yml) läuft alle
10 Minuten (plus manuell über „Run workflow"): checkout → Node → `npm ci` →
`node scripts/fetch-results.mjs` → bei Diff in `matches.json` Commit & Push als
`github-actions[bot]`. Der Push triggert das Vercel-Redeploy.

Das Fetch-Script ist defensiv: Bei API-Fehlern/Timeout bricht es mit Exit 1 ab, ohne die
bestehende Datei anzufassen – der alte Stand bleibt live. Es macht genau einen API-Call
pro Lauf (Free-Tier-Limit: 10/min, also unkritisch) und schreibt nur bei inhaltlichen
Änderungen (kein Commit-Spam).

## Troubleshooting

- **Action schlägt fehl („FOOTBALL_DATA_API_KEY ist nicht gesetzt")** → Secret fehlt,
  siehe Schritt 2.
- **Rote Action-Läufe bei API-Ausfällen** sind unkritisch: Die Seite zeigt einfach den
  letzten Stand weiter; der nächste Lauf heilt das.
- **Cron läuft nicht mehr** → GitHub deaktiviert schedule-Workflows nach 60 Tagen ohne
  Repo-Aktivität. Während des Turniers verhindern die Auto-Commits das; danach im
  Actions-Tab reaktivieren.
- **Ergebnisse erscheinen verzögert** → GitHub-Cron ist nicht sekundengenau (bis zu ein
  paar Minuten Versatz) + bis zu 90 s Client-Polling. Das ist normal.
- **Flaggen fehlen unter Windows** → gewollt: Windows kann keine Flaggen-Emojis; die App
  erkennt das und zeigt nur die Länderkürzel.
- **Demo-Daten noch sichtbar** → einmal `node scripts/fetch-results.mjs` mit Key laufen
  lassen (oder die Action manuell starten) und pushen.

## Limits & Kosten

Public GitHub-Repo → Actions gratis/unbegrenzt. Vercel Hobby gratis (offiziell für
nicht-kommerzielle Projekte – für eine Community-Seite ok, bei Monetarisierung wäre ein
bezahlter Plan nötig). football-data.org Free-Tier gratis (WM-Daten enthalten,
10 Calls/min – wir nutzen ~1 Call alle 10 Minuten).

## Projektstruktur

```
├── .github/workflows/update-results.yml   # Cron: Ergebnisse -> matches.json
├── public/data/
│   ├── matches.json                       # Spielplan + Ergebnisse (vom Cron-Job)
│   └── predictions.json                   # Tipps (via Import-Script)
├── scripts/
│   ├── fetch-results.mjs                  # API -> matches.json (defensiv)
│   ├── build-template.mjs                 # Spielplan -> CSV-Template
│   ├── import-predictions.mjs             # CSV -> predictions.json (Merge)
│   └── lib/csv.mjs                        # CSV-Helfer (BOM, ;/, Quotes)
├── src/
│   ├── data/models.json                   # Teilnehmende LLMs (einzige Quelle)
│   ├── lib/                               # Typen, Scoring (+Tests), Format, Polling
│   ├── components/                        # React-Island: Cards, Leaderboard, Spielplan
│   ├── layouts/Layout.astro               # Fonts, Meta, Grundgerüst
│   └── pages/index.astro                  # Single-Page (Hero + Island + Footer)
└── vitest.config.ts
```
