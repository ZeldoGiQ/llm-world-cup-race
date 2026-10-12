-- ============================================================================
-- 013 – GPT-6.1 Sol (OpenAI direkt)
--
-- Bezeichner 'gpt-6.1-sol', verifiziert gegen developers.openai.com am
-- 12.10.2026; Listenpreis 2,00/10,00 je Mio Tokens, 1,05M Kontext. Eigene
-- Zeile nach der Regel "ein Eintrag = eine Modellversion"; GPT-5.6 Sol wird
-- stillgelegt und behaelt seine Historie. early-access, damit der Neuzugang
-- die laufenden Kategorien nicht aus der Gesamtwertung kippt.
--
-- Hinweis fuers Protokoll: OpenAI fuehrt inzwischen gpt-6-astra als
-- Flaggschiff; 6.1 Sol ist die guenstigere Stufe darunter. Gemessen wird,
-- was bestellt wurde.
-- ============================================================================

insert into models (id, provider_id, api_model, name, color, version,
                    price_input_usd, price_output_usd, price_search_usd, access, enabled)
values ('gpt-6.1', 'openai', 'gpt-6.1-sol', 'GPT-6.1 Sol', '#10a37f', 'gpt-6.1-sol',
        2.00, 10.00, 0.000, 'early-access', true)
on conflict (id) do update
  set provider_id      = excluded.provider_id,
      api_model        = excluded.api_model,
      price_input_usd  = excluded.price_input_usd,
      price_output_usd = excluded.price_output_usd,
      access           = excluded.access,
      enabled          = excluded.enabled;

update models
   set enabled = false,
       retired_at = coalesce(retired_at, now())
 where id = 'gpt-5.6';
