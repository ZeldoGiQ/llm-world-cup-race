-- ============================================================================
-- 012 – Qwen3.8-Max stilllegen, Grok 4.7 anbinden
--
-- Beides sind Funde des ersten Laufs nach dem fuenfwoechigen Stillstand.
--
-- qwen-3.8: WaveSpeed liefert fuer qwen/qwen3.8-max inzwischen 404 ("does not
-- exist"), die Modellseite ist ebenfalls verschwunden. Seit der Reparatur
-- scheitert die Zeile stuendlich auf jedem Ereignis - lauter Fehleintraege,
-- die im Leaderboard wie Modellversagen aussehen. Sie wird stillgelegt; die
-- aeltere Zeile qwen (3.7 Max) war nie abgeschaltet worden und traegt Qwen
-- weiter. Genau dafuer war sie aktiv geblieben.
--
-- Lehre: Der Gateway meldet weder Verschwinden noch Umbenennung - sein
-- Katalog-Endpunkt liefert kein lesbares Format. Nur Direktzugaenge sind
-- beobachtbar.
--
-- grok-4.7: xAIs Katalog fuehrt es, der Abgleich hat es gemeldet. Gleicher
-- Preis wie 4.6 (2,00/6,00), von xAI als faehigstes Modell empfohlen. Eigene
-- Zeile, early-access, wie bei GPT-5.6 und Fable 5.1; 4.6 behaelt seine
-- Historie und hoert auf zu tippen.
-- ============================================================================

update models
   set enabled = false,
       retired_at = coalesce(retired_at, now())
 where id = 'qwen-3.8';

insert into models (id, provider_id, api_model, name, color, version,
                    price_input_usd, price_output_usd, price_search_usd, access, enabled)
values ('grok-4.7', 'xai', 'grok-4.7', 'Grok 4.7', '#9b59b6', 'grok-4.7',
        2.00, 6.00, 0.000, 'early-access', true)
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
 where id = 'grok-4.6';
