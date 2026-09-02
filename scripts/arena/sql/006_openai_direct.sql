-- ============================================================================
-- 006 – OpenAI direkt statt über den Gateway, mit GPT-5.6 Sol
--
-- Erster Schritt weg vom einen Zugang für alles: OpenAI wird wieder direkt
-- angebunden. Die Anbieterzeile stand seit 005 nur stillgelegt da, genau für
-- diesen Fall.
--
-- search_mode = 'none' ist hier KEIN Detail, sondern die Bedingung dafür, dass
-- die Messung gültig bleibt. Der direkte OpenAI-Adapter kann natives
-- web_search anhängen; die Knowledge-Cap-Spur verlangt aber, dass kein Modell
-- recherchiert. Seit der Ausführer die Freigabe an search_mode koppelt
-- (searchEnabledFor in providers/index.mts), hält diese eine Spalte die Spur
-- geschlossen. Stünde hier 'native', bekäme GPT als einziges Modell Websuche –
-- im Leaderboard sähe das aus wie ein sprunghaft besseres Modell, und an den
-- Zahlen wäre es nicht zu erkennen.
--
-- GPT-5.6 Sol kommt als EIGENE Zeile: ein Eintrag ist eine Modellversion. Die
-- 104 WM-Spiele gehören GPT-5.5 und werden nicht übertragen. Bezeichner ohne
-- Anbieterpräfix – das war die Schreibweise des Gateways.
--
-- access = 'early-access': Ein Neuzugang gilt sonst sofort als Teilnehmer, und
-- die Gesamtwertung rechnet über die Schnittmenge ALLER Teilnehmer. Die fiele
-- damit auf die wenigen neuen Ereignisse zusammen, und die Kategorie verlöre
-- ihre Qualifikation – für jedes Modell, nicht nur für das neue.
--
-- Preise: Listenpreise von developers.openai.com, kurzer Kontext. Direkt ist
-- günstiger als über den Gateway (dort 5,00/30,00 für dieselbe Klasse).
-- ============================================================================

update providers
   set enabled     = true,
       search_mode = 'none',
       secret_name = 'OPENAI_API_KEY'
 where id = 'openai';

insert into models (id, provider_id, api_model, name, color, version,
                    price_input_usd, price_output_usd, price_search_usd, access, enabled)
values ('gpt-5.6', 'openai', 'gpt-5.6-sol', 'GPT-5.6 Sol', '#10a37f', 'gpt-5.6-sol',
        4.00, 20.00, 0.000, 'early-access', true)
on conflict (id) do update
  set provider_id      = excluded.provider_id,
      api_model        = excluded.api_model,
      price_input_usd  = excluded.price_input_usd,
      price_output_usd = excluded.price_output_usd,
      access           = excluded.access,
      enabled          = excluded.enabled;

-- GPT-5.5 hört auf zu tippen, bleibt aber sichtbar: Die Historie gehört ihm.
update models
   set enabled = false,
       retired_at = now()
 where id = 'gpt';
