-- ============================================================================
-- 005 – Ein Zugang statt sechs: WaveSpeed als einziger Anbieter
--
-- Statt bei sechs Anbietern je ein Konto, einen Schlüssel und eine Abrechnung
-- zu führen, läuft alles über einen OpenAI-kompatiblen Zugang. Der bestehende
-- Adapter `openai-compat` trifft die Schnittstelle exakt – es ist keine Zeile
-- Code nötig, nur diese Zeilen hier.
--
-- Preis-Warnung: Die Preise in 001_init.sql waren geschätzt und lagen um das
-- Drei- bis Vierfache daneben (gpt-5.5 mit 1,25/10 statt 5/30). Der
-- Budget-Wächter hätte damit mit einem Viertel der echten Kosten gerechnet und
-- viel zu spät gegriffen. Die Werte hier sind die abgelesenen Listenpreise je
-- 1 Mio Tokens – vor dem ersten großen Lauf im Studio gegen die Preisseite
-- prüfen, sie ändern sich.
--
-- Suche: search_mode 'none'. WaveSpeed reicht keine anbietereigene Web-Suche
-- durch, und genau das ist die bewusste Entscheidung hinter HARNESS_V2 – alle
-- Modelle bekommen dieselbe Informationsgrundlage.
--
-- Die alten Anbieterzeilen bleiben deaktiviert stehen, nicht gelöscht: Sie
-- tragen die Historie, und ein späterer Wechsel zurück ist damit ein Toggle.
-- ============================================================================

insert into providers (id, api_kind, base_url, secret_name, search_mode, enabled) values
  ('wavespeed', 'openai-compat', 'https://llm.wavespeed.ai/v1', 'WAVESPEED_API_KEY', 'none', true)
on conflict (id) do update
  set base_url    = excluded.base_url,
      secret_name = excluded.secret_name,
      search_mode = excluded.search_mode,
      enabled     = true;

-- Direktzugänge stilllegen (Zeilen bleiben für die Historie erhalten).
update providers set enabled = false
where id in ('openai', 'anthropic', 'google', 'xai', 'alibaba', 'moonshot');

-- Modelle auf den neuen Zugang umhängen: Bezeichner sind dort mit Anbieter-
-- Präfix geschrieben, und die Preise werden auf die echten Listenwerte gesetzt.
update models set provider_id = 'wavespeed', api_model = 'openai/gpt-5.5',
       price_input_usd = 5.00, price_output_usd = 30.00, price_search_usd = 0
where id = 'gpt';

update models set provider_id = 'wavespeed', api_model = 'anthropic/claude-fable-5',
       price_input_usd = 10.00, price_output_usd = 50.00, price_search_usd = 0
where id = 'claude';

update models set provider_id = 'wavespeed', api_model = 'qwen/qwen3.7-max',
       price_input_usd = 2.50, price_output_usd = 7.50, price_search_usd = 0
where id = 'qwen';

-- Gemini: dort ist derzeit kein 3.5-Pro gelistet. Flash ist ein anderes
-- Modell als das bisher geführte – deshalb bekommt es eine eigene Zeile statt
-- die alte zu überschreiben. Ein Leaderboard-Eintrag = eine Modellversion.
update models set enabled = false where id = 'gemini';
insert into models (id, provider_id, api_model, name, color, version, access,
                    price_input_usd, price_output_usd, price_search_usd) values
  ('gemini-flash', 'wavespeed', 'google/gemini-3.5-flash', 'Gemini 3.5 Flash', '#4285f4',
   'gemini-3.5-flash', 'public', 1.50, 9.00, 0)
on conflict (id) do nothing;

-- Kimi: K2.6 ist dort nicht gelistet, K3 schon – ebenfalls eine eigene Zeile.
update models set enabled = false where id = 'kimi';
insert into models (id, provider_id, api_model, name, color, version, access,
                    price_input_usd, price_output_usd, price_search_usd) values
  ('kimi-k3', 'wavespeed', 'moonshotai/kimi-k3', 'Kimi K3', '#ec4899',
   'kimi-k3', 'public', 3.00, 15.00, 0)
on conflict (id) do nothing;

-- Grok war auf der Preisliste nicht auffindbar; bleibt deaktiviert, bis der
-- Bezeichner im Playground bestätigt ist.
update models set enabled = false where id = 'grok';

-- Zwei zusätzliche starke Teilnehmer, die der Zugang ohnehin mitbringt.
insert into models (id, provider_id, api_model, name, color, version, access,
                    price_input_usd, price_output_usd, price_search_usd) values
  ('deepseek', 'wavespeed', 'deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro', '#4d6bfe',
   'deepseek-v4-pro', 'public', 1.80, 3.70, 0),
  ('glm', 'wavespeed', 'z-ai/glm-5.2', 'GLM-5.2', '#14b8a6',
   'glm-5.2', 'public', 1.40, 4.40, 0)
on conflict (id) do nothing;

-- Der Referenz-Teilnehmer hängt an einem Anbieter, der nie aufgerufen wird.
update providers set enabled = false where id = 'reference';
