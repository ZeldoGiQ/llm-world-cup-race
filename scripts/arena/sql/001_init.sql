-- ============================================================================
-- FutureBench Arena – Supabase-Schema (001_init)
--
-- Einmalig im Supabase SQL-Editor ausführen (Dashboard → SQL Editor → Run).
-- Idempotent: läuft auch auf einer bereits initialisierten DB durch.
--
-- Rollenverteilung: Supabase = Zustand, GitHub Actions = Compute, Git = Beweis.
-- Zugriff ausschließlich über den Service-Key aus Actions-Secrets; RLS ist auf
-- allen Tabellen aktiv mit NULL Policies (Default-Deny) – der Anon-Key kann
-- also nichts lesen oder schreiben und wird nirgends verwendet.
--
-- Admin-Bereich: Supabase Studio (Table Editor). providers/models/budget/
-- ops_config sind die Stellschrauben des Betreibers – Jobs lesen sie zur
-- Laufzeit, Änderungen wirken ohne Deploy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- providers – ein API-Anbieter (OpenAI, Anthropic, … oder OpenAI-kompatibel)
-- ----------------------------------------------------------------------------
create table if not exists providers (
  id          text primary key,
  api_kind    text not null check (api_kind in ('openai', 'openai-compat', 'anthropic', 'google')),
  -- Nur für openai-compat: Basis-URL der API (z. B. https://api.x.ai/v1)
  base_url    text,
  -- Name des GitHub-Actions-Secrets mit dem API-Key (nie der Key selbst!)
  secret_name text not null,
  -- Wie Web-Suche aktiviert wird: none | native | xai-params | qwen-flag | kimi-builtin
  search_mode text not null default 'none',
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- models – ein Leaderboard-Teilnehmer (eine Zeile = eine Modellversion)
--
-- Neues LLM anbinden = 1 Secret + 1 Zeile hier. Rauswerfen = enabled=false
-- (Historie bleibt). retired_at markiert die Zeile im Frontend als Archiv;
-- hidden=true versteckt sie ganz (Ausnahmefall, z. B. Testläufe).
-- ----------------------------------------------------------------------------
create table if not exists models (
  id                text primary key,                 -- Frontend-ID, z. B. 'gpt'
  provider_id       text not null references providers (id),
  api_model         text not null,                    -- API-Modell-ID, z. B. 'gpt-5.5'
  name              text not null,                    -- Anzeigename, z. B. 'GPT-5.5'
  color             text not null,                    -- Akzentfarbe (Hex)
  version           text,                             -- angezeigte Versionskennung
  release_date      date,
  access            text not null default 'public' check (access in ('public', 'early-access')),
  -- Preise zur Kostenschätzung (USD; Input/Output je 1M Tokens, Suche je Aufruf)
  price_input_usd   numeric not null default 0,
  price_output_usd  numeric not null default 0,
  price_search_usd  numeric not null default 0,
  max_output_tokens integer not null default 16000,
  -- Freiform-Extras für Adapter (z. B. {"reasoningEffort":"low"})
  extra             jsonb not null default '{}'::jsonb,
  enabled           boolean not null default true,
  hidden            boolean not null default false,
  retired_at        timestamptz,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- events – der Event-Lifecycle (Quelle: Feeds oder Scout)
--
-- utc_date = T_lock (Vorhersage-Schluss). resolution/metadata folgen exakt dem
-- Frontend-Datenvertrag (ArenaEvent); der Export übernimmt sie unverändert.
-- ----------------------------------------------------------------------------
create table if not exists events (
  category               text not null,
  id                     text not null,
  title                  text not null,
  titles                 jsonb,                       -- {en,de,es} oder NULL (Eigennamen)
  utc_date               timestamptz not null,
  status                 text not null default 'UPCOMING'
                         check (status in ('UPCOMING', 'LIVE', 'RESOLVED', 'VOID')),
  prediction_type        text not null check (prediction_type in ('scoreline', 'numeric', 'binary')),
  resolution             jsonb,
  metadata               jsonb not null default '{}'::jsonb,
  source                 text not null,               -- Feed-ID (z. B. 'football-data') oder 'scout'
  open_at                timestamptz,                 -- T_open; NULL = Default der Kategorie
  expected_resolution_at timestamptz,
  resolved_at            timestamptz,
  void_reason            text,
  created_at             timestamptz not null default now(),
  primary key (category, id)
);

create index if not exists events_due_predict
  on events (status, utc_date) where status = 'UPCOMING';
create index if not exists events_due_resolve
  on events (status, utc_date) where status in ('UPCOMING', 'LIVE');

-- ----------------------------------------------------------------------------
-- predictions – immutabel; value ist exakt der Datenvertrag (PredictionValue)
-- ----------------------------------------------------------------------------
create table if not exists predictions (
  category   text not null,
  event_id   text not null,
  model_id   text not null references models (id),
  value      jsonb not null,                          -- Datenvertrag, unverändert exportiert
  raw        jsonb not null default '{}'::jsonb,      -- Audit: Roh-Antwort (nie öffentlich geloggt)
  provenance jsonb not null default '{}'::jsonb,      -- harnessVersion, promptHash, Tokens, …
  run_id     uuid,
  created_at timestamptz not null default now(),
  primary key (category, event_id, model_id),
  foreign key (category, event_id) references events (category, id)
);

-- Lock-Integrität auf DB-Ebene: Predictions sind unveränderlich.
create or replace function forbid_prediction_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Predictions sind immutabel (Lock-Beweis) – % nicht erlaubt.', tg_op;
end $$;

drop trigger if exists predictions_immutable on predictions;
create trigger predictions_immutable
  before update or delete on predictions
  for each row execute function forbid_prediction_mutation();

-- ----------------------------------------------------------------------------
-- prediction_failures – append-only. "Kein Tipp" ist ein Ergebnis:
-- Nach dem Lock wird der letzte Code je (Event, Modell) ohne Prediction
-- als öffentlicher Failure-Record exportiert.
-- ----------------------------------------------------------------------------
create table if not exists prediction_failures (
  id         bigint generated always as identity primary key,
  category   text not null,
  event_id   text not null,
  model_id   text not null,
  code       text not null check (code in
             ('refusal', 'invalid-output', 'timeout', 'api-error', 'rate-limited', 'late')),
  detail     text,                                    -- kurz, ohne Roh-Antwort
  run_id     uuid,
  created_at timestamptz not null default now()
);

create index if not exists failures_by_pair
  on prediction_failures (category, event_id, model_id);

-- ----------------------------------------------------------------------------
-- runs – jede Job-Ausführung (Monitoring-Wahrheit)
-- ----------------------------------------------------------------------------
create table if not exists runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,                          -- ingest | predict | resolve | publish | analytics | scout
  status      text not null default 'RUNNING'
              check (status in ('RUNNING', 'OK', 'FAILED', 'ABORTED_BUDGET')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  stats       jsonb not null default '{}'::jsonb,
  gh_run_id   text                                    -- Link in die Actions-Logs
);

create index if not exists runs_recent on runs (job, started_at desc);

-- ----------------------------------------------------------------------------
-- api_costs – jeder LLM-Call (auch Fehlversuche); Basis für Budget-Guard
-- ----------------------------------------------------------------------------
create table if not exists api_costs (
  id            bigint generated always as identity primary key,
  run_id        uuid references runs (id),
  model_id      text,                                 -- bewusst ohne FK: auch Scout-/Resolver-Modelle
  purpose       text not null check (purpose in ('predict', 'repair', 'resolve', 'scout', 'gate')),
  category      text,
  event_id      text,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  search_calls  integer not null default 0,
  cost_usd      numeric not null default 0,
  latency_ms    integer,
  status        text not null,                        -- ok | timeout | api-error | parse-error | …
  created_at    timestamptz not null default now()
);

create index if not exists api_costs_by_day on api_costs (created_at);

-- Ausgaben heute / im laufenden Monat – Grundlage von assertBudget()
create or replace view v_spend as
select
  coalesce(sum(cost_usd) filter (where created_at >= date_trunc('day', now())), 0)   as today_usd,
  coalesce(sum(cost_usd) filter (where created_at >= date_trunc('month', now())), 0) as month_usd
from api_costs;

-- ----------------------------------------------------------------------------
-- budget – die eine Zeile mit den Caps (im Studio ohne Deploy änderbar)
-- ----------------------------------------------------------------------------
create table if not exists budget (
  id              integer primary key default 1 check (id = 1),
  monthly_cap_usd numeric not null default 270,
  daily_cap_usd   numeric not null default 10,
  warn_ratio      numeric not null default 0.8
);

insert into budget (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- ops_config – Betriebsparameter als Key/Value (Feed-Caps, Fenster, Quoten)
-- ----------------------------------------------------------------------------
create table if not exists ops_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into ops_config (key, value) values
  ('predict_window',   '{"minLeadHours": 2, "maxLeadHours": 48}'),
  ('predict_attempts', '{"maxAttempts": 3}'),
  ('max_calls_per_run','400'),
  ('feed_caps',        '{"football-data": 30, "coingecko": 2, "stooq": 3}'),
  ('scout',            '{"dailyQuota": 6, "overproduce": 2, "minLeadHours": 48, "maxHorizonDays": 90, "explorationShare": 0.2}')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- resolutions – Audit jeder (auch verworfener) Auflösung
-- ----------------------------------------------------------------------------
create table if not exists resolutions (
  id         bigint generated always as identity primary key,
  category   text not null,
  event_id   text not null,
  proposed   jsonb not null,                          -- vorgeschlagene resolution oder {"void": "<grund>"}
  resolver   text not null,                           -- 'deterministic:<feed>' | 'llm-quorum'
  evidence   jsonb not null default '{}'::jsonb,      -- Beleg-Zitate, Modell-Antworten
  accepted   boolean not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- analytics_daily – ein Tages-Snapshot für Digest & Trends
-- ----------------------------------------------------------------------------
create table if not exists analytics_daily (
  day   date primary key,
  stats jsonb not null
);

-- ----------------------------------------------------------------------------
-- RLS: Default-Deny auf allem. Der Service-Key umgeht RLS; sonst kommt niemand ran.
-- ----------------------------------------------------------------------------
alter table providers            enable row level security;
alter table models               enable row level security;
alter table events               enable row level security;
alter table predictions          enable row level security;
alter table prediction_failures  enable row level security;
alter table runs                 enable row level security;
alter table api_costs            enable row level security;
alter table budget               enable row level security;
alter table ops_config           enable row level security;
alter table resolutions          enable row level security;
alter table analytics_daily      enable row level security;

-- ----------------------------------------------------------------------------
-- Seeds: Provider + die 6 aktuellen Modelle.
-- api_model / Preise im Studio prüfen und anpassen – das sind Startwerte.
-- ----------------------------------------------------------------------------
insert into providers (id, api_kind, base_url, secret_name, search_mode) values
  ('openai',    'openai',        null,                            'OPENAI_API_KEY',    'native'),
  ('anthropic', 'anthropic',     null,                            'ANTHROPIC_API_KEY', 'native'),
  ('google',    'google',        null,                            'GOOGLE_API_KEY',    'native'),
  ('xai',       'openai-compat', 'https://api.x.ai/v1',           'XAI_API_KEY',       'xai-params'),
  ('alibaba',   'openai-compat', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', 'QWEN_API_KEY', 'qwen-flag'),
  ('moonshot',  'openai-compat', 'https://api.moonshot.ai/v1',    'MOONSHOT_API_KEY',  'kimi-builtin')
on conflict (id) do nothing;

insert into models (id, provider_id, api_model, name, color, version, release_date,
                    price_input_usd, price_output_usd, price_search_usd) values
  ('gpt',    'openai',    'gpt-5.5',        'GPT-5.5',       '#10a37f', 'gpt-5.5',        '2026-04-18', 1.25, 10.00, 0.010),
  ('gemini', 'google',    'gemini-3.5-pro', 'Gemini 3.5',    '#4285f4', 'gemini-3.5-pro', '2026-03-27', 1.25, 10.00, 0.005),
  ('claude', 'anthropic', 'claude-fable-5', 'Claude Fable 5','#d97757', 'claude-fable-5', '2026-05-06', 3.00, 15.00, 0.010),
  ('grok',   'xai',       'grok-4.3',       'Grok 4.3',      '#9b59b6', 'grok-4.3',       '2026-02-11', 3.00, 15.00, 0.025),
  ('qwen',   'alibaba',   'qwen3.7-max',    'Qwen 3.7 Max',  '#eab308', 'qwen-3.7-max',   '2026-05-22', 1.60,  6.40, 0.010),
  ('kimi',   'moonshot',  'kimi-k2.6',      'Kimi K2.6',     '#ec4899', 'kimi-k2.6',      '2026-04-02', 0.60,  2.50, 0.005)
on conflict (id) do nothing;
