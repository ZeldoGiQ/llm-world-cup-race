# FutureBench Backend – Einrichtung

Einmalig. Danach läuft alles per Cron; Betrieb nur noch über Supabase Studio.

## 1. Supabase-Projekt anlegen

1. https://supabase.com/dashboard → **New project**
2. Name: `futurebench` · Region: **Frankfurt (eu-central-1)** · DB-Passwort generieren und im
   Passwortmanager speichern (wird nur für direkten SQL-Zugriff gebraucht, nicht von den Jobs)
3. Plan: **Free** reicht (die Jobs schreiben wenige MB/Monat)
4. Warten bis „Project is ready" (~2 Min)

## 2. Schema einspielen

Dashboard → **SQL Editor** → **New query** → Inhalt von `scripts/arena/sql/001_init.sql`
einfügen → **Run**. Erwartet: „Success. No rows returned".

Prüfen: **Table Editor** zeigt 11 Tabellen; `models` enthält 6 Zeilen, `providers` 6.

## 3. Zugangsdaten als GitHub-Secrets setzen

Dashboard → **Project Settings → API**:

- `Project URL` → Secret `SUPABASE_URL`
- `service_role`-Key (nicht `anon`!) → Secret `SUPABASE_SERVICE_KEY`

```bash
gh secret set SUPABASE_URL
gh secret set SUPABASE_SERVICE_KEY
```

Der `service_role`-Key umgeht RLS und darf **nie** ins Frontend oder in Logs.

## 4. Provider-Keys setzen

Pro Anbieter, den du im Wettkampf haben willst — Name muss `providers.secret_name` entsprechen:

```bash
gh secret set OPENAI_API_KEY
gh secret set ANTHROPIC_API_KEY
gh secret set GOOGLE_API_KEY
gh secret set XAI_API_KEY
gh secret set QWEN_API_KEY
gh secret set MOONSHOT_API_KEY
```

Optional: `gh secret set DISCORD_WEBHOOK_URL` (Fehler- und Kosten-Meldungen).
`FOOTBALL_DATA_API_KEY` existiert bereits aus der WM.

Modelle ohne gesetztes Secret werden im Predict-Lauf einfach übersprungen (Log-Hinweis) —
es scheitert nichts.

## 5. Erster Lauf

Actions-Tab → Workflow manuell starten, in dieser Reihenfolge:

1. `arena-publish` — Round-Trip-Beweis: exportiert die DB in `public/arena-data/**`
2. `arena-ingest` — legt die ersten echten Events an
3. `arena-predict` — die Modelle tippen
4. `arena-publish` — Predictions landen im Git (= Lock-Beweis)

Prüfen: Supabase Studio → `runs` (Status OK) · `api_costs` (Kosten je Call) ·
https://www.futurebench.ai/arena

## Tagesbetrieb (Supabase Studio → Table Editor)

| Aufgabe | Handgriff |
|---|---|
| **Neues LLM** | Secret setzen, dann Zeile in `models` (id, provider_id, api_model, name, color, Preise, `enabled=true`) |
| **Neuer Anbieter** (OpenAI-kompatibel) | Zeile in `providers` (api_kind `openai-compat`, base_url, secret_name, search_mode) — kein Code |
| **LLM rauswerfen** | `models.enabled = false` (Historie und Leaderboard-Zeile bleiben) |
| **LLM archivieren** | zusätzlich `retired_at` setzen |
| **Budget ändern** | `budget.daily_cap_usd` / `monthly_cap_usd` |
| **Event-Volumen** | `ops_config` → `feed_caps`, `scout` |
| **Vorhersage-Fenster** | `ops_config` → `predict_window` |

Alle Werte werden zur Laufzeit gelesen — kein Deploy, kein Commit nötig.

## Lokal testen (Windows)

`.env` im Projektstamm (gitignored via `.env*`):

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

```bash
npm run arena:publish
```
