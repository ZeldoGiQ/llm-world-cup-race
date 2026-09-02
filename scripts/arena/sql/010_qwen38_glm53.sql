-- ============================================================================
-- 010 – Qwen3.8-Max und GLM-5.3 vorbereiten (Direktzugänge)
--
-- Beide Modelle existieren, aber WaveSpeed führt keines von ihnen. Sie kommen
-- deshalb nur über Direktzugänge ins Feld.
--
-- Wie bei 008: Die Anbieter bleiben ABGESCHALTET, weil die Schlüssel noch
-- fehlen (QWEN_API_KEY, ZAI_API_KEY). Modelle mit inaktivem Anbieter
-- überspringt der Vorhersage-Job sauber und nennt den Grund; ein aktiver
-- Anbieter ohne Schlüssel liefe dagegen stündlich in 401-Fehler.
--
-- Die alten Zeilen `qwen` und `glm` bleiben vorerst AKTIV. Erst stilllegen,
-- wenn die neuen wirklich antworten – sonst verliert das Feld zwei Modelle,
-- ohne dass Ersatz da ist.
--
-- Bezeichner und Adressen verifiziert:
--   qwen3.8-max  über https://dashscope-intl.aliyuncs.com/compatible-mode/v1
--                (steht seit 001 korrekt in der alibaba-Zeile), 2,00/6,00
--   glm-5.3      über https://api.z.ai/api/paas/v4 – eine NEUE Anbieterzeile,
--                Z.ai gab es bisher nur über den Gateway. 1,40/4,40
--
-- Anlass für den Z.ai-Direktzugang ist nicht nur das neue Modell: Z.ai leitet
-- Anfragen für GLM-5.2 nach eigener Aussage automatisch auf GLM-5.3 um. Über
-- den Gateway ist das nicht erkennbar, weil dieser unsere eigene Modell-ID
-- zurückspiegelt statt der tatsächlich bedienten. Direkt angebunden meldet
-- der Anbieter, was wirklich geantwortet hat – und die Drift-Erkennung im
-- Vorhersage-Protokoll greift wieder.
-- ============================================================================

update providers
   set search_mode = 'none',
       secret_name = 'QWEN_API_KEY'
 where id = 'alibaba';

insert into providers (id, api_kind, base_url, secret_name, search_mode, enabled)
values ('z-ai', 'openai-compat', 'https://api.z.ai/api/paas/v4', 'ZAI_API_KEY', 'none', false)
on conflict (id) do update
  set base_url    = excluded.base_url,
      secret_name = excluded.secret_name,
      search_mode = excluded.search_mode;

insert into models (id, provider_id, api_model, name, color, version,
                    price_input_usd, price_output_usd, price_search_usd, access, enabled)
values
  ('qwen-3.8', 'alibaba', 'qwen3.8-max', 'Qwen3.8-Max', '#eab308', 'qwen3.8-max',
   2.00, 6.00, 0.000, 'early-access', true),
  ('glm-5.3', 'z-ai', 'glm-5.3', 'GLM-5.3', '#14b8a6', 'glm-5.3',
   1.40, 4.40, 0.000, 'early-access', true)
on conflict (id) do update
  set provider_id      = excluded.provider_id,
      api_model        = excluded.api_model,
      price_input_usd  = excluded.price_input_usd,
      price_output_usd = excluded.price_output_usd,
      access           = excluded.access,
      enabled          = excluded.enabled;
