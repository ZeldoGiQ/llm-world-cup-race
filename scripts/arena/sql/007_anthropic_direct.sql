-- ============================================================================
-- 007 – Anthropic direkt, mit Claude Fable 5.1
--
-- Zweiter Direktzugang nach OpenAI. Die Anbieterzeile steht seit 005
-- stillgelegt bereit.
--
-- search_mode = 'none': dieselbe Bedingung wie bei OpenAI. Der Anthropic-
-- Adapter haengt sonst das web_search-Server-Tool an, und die
-- Knowledge-Cap-Spur waere fuer dieses eine Modell offen.
--
-- Bezeichner: 'claude-fable-5-1' mit BINDESTRICHEN. Anthropic-Modell-IDs
-- enthalten keine Punkte; 'claude-fable-5.1' waere ein Fehlschlag bei jedem
-- Aufruf – und im Leaderboard saehe das aus wie ein schweigendes Modell.
-- Verifiziert gegen die Modelluebersicht von Anthropic.
--
-- Preis 10,00/50,00 – identisch zu dem, was wir fuer Fable 5 ueber den
-- Gateway schon zahlen. Die Umstellung kostet also nichts extra, misst aber
-- die neuere Version.
--
-- Eigenheit von Fable 5.1: Das Denken ist immer an und laesst sich nicht
-- abschalten. Denk-Tokens zaehlen als Ausgabe, eine Vorhersage kostet damit
-- mehr als die reine Antwortlaenge vermuten laesst. Wir setzen bewusst KEIN
-- effort-Feld: Anbietervorgabe ist Teil des gemessenen Produkts, so wie es
-- die Methodik fuer Sampling-Einstellungen ohnehin festhaelt.
-- ============================================================================

update providers
   set enabled     = true,
       search_mode = 'none',
       secret_name = 'ANTHROPIC_API_KEY'
 where id = 'anthropic';

insert into models (id, provider_id, api_model, name, color, version,
                    price_input_usd, price_output_usd, price_search_usd, access, enabled)
values ('claude-5.1', 'anthropic', 'claude-fable-5-1', 'Claude Fable 5.1', '#d97757',
        'claude-fable-5-1', 10.00, 50.00, 0.000, 'early-access', true)
on conflict (id) do update
  set provider_id      = excluded.provider_id,
      api_model        = excluded.api_model,
      price_input_usd  = excluded.price_input_usd,
      price_output_usd = excluded.price_output_usd,
      access           = excluded.access,
      enabled          = excluded.enabled;

-- Fable 5 hoert auf zu tippen, bleibt aber sichtbar: Die Historie gehoert ihm.
update models
   set enabled = false,
       retired_at = now()
 where id = 'claude';
