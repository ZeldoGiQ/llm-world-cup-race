-- ============================================================================
-- 008 – xAI direkt vorbereiten, mit Grok 4.6
--
-- Dritter Direktzugang. Die Anbieterzeile existiert seit 001 mit der
-- richtigen Adresse (https://api.x.ai/v1) und wurde in 005 stillgelegt.
--
-- WICHTIG: Der Anbieter bleibt hier ABGESCHALTET. Der Schlüssel XAI_API_KEY
-- liegt noch nicht in den GitHub-Secrets, und ein aktiver Anbieter ohne
-- Schlüssel würde stündlich auf jedes offene Ereignis mit 401 auflaufen –
-- lauter Fehleinträge, die wie Modellversagen aussehen. Der Vorhersage-Job
-- überspringt Modelle mit inaktivem Anbieter dagegen sauber und protokolliert
-- den Grund. Aktiviert wird in einer eigenen Migration, sobald der Schlüssel
-- liegt.
--
-- search_mode = 'none' wie bei den anderen beiden: Sonst schickte der
-- openai-compat-Adapter xAIs Live-Search-Parameter mit, und die
-- Knowledge-Cap-Spur wäre für dieses Modell offen.
--
-- Bezeichner 'grok-4.6' ohne Präfix – 'x-ai/grok-4.6' war die Schreibweise
-- des Gateways. Verifiziert gegen die Modellübersicht von xAI, dort auch die
-- Preise: 2,00/6,00 unterhalb von 200k Tokens, darüber das Doppelte. Unsere
-- Prompts liegen bei rund 5k, der niedrige Tarif greift also immer.
-- ============================================================================

update providers
   set search_mode = 'none',
       secret_name = 'XAI_API_KEY'
 where id = 'xai';

insert into models (id, provider_id, api_model, name, color, version,
                    price_input_usd, price_output_usd, price_search_usd, access, enabled)
values ('grok-4.6', 'xai', 'grok-4.6', 'Grok 4.6', '#9b59b6', 'grok-4.6',
        2.00, 6.00, 0.000, 'early-access', true)
on conflict (id) do update
  set provider_id      = excluded.provider_id,
      api_model        = excluded.api_model,
      price_input_usd  = excluded.price_input_usd,
      price_output_usd = excluded.price_output_usd,
      access           = excluded.access,
      enabled          = excluded.enabled;

-- Grok 4.3 ist seit dem Gateway-Wechsel stillgelegt; jetzt auch als Archiv
-- gekennzeichnet, damit die Zeile im Frontend als beendet erkennbar ist.
update models
   set retired_at = coalesce(retired_at, now())
 where id = 'grok';
