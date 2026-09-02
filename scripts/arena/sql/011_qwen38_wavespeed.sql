-- ============================================================================
-- 011 – Qwen3.8-Max über den Gateway statt direkt
--
-- 010 hatte den Direktzugang vorbereitet, weil die Übersichtsseite von
-- WaveSpeed das Modell nicht listete. Die Einzelseite gibt es aber:
-- qwen/qwen3.8-max, 2,00/6,00. Damit braucht es keinen DashScope-Schlüssel,
-- und das Modell kann sofort mittippen.
--
-- (Derselbe Irrtum wie zuvor bei xAI: Die Sammelseite verschweigt Anbieter,
-- die Einzelseiten führen sie. Der Katalog-Abgleich beantwortet genau das
-- automatisch – sobald der Analytics-Workflow wieder laufen darf.)
--
-- GLM-5.3 bleibt vorbereitet und abgeschaltet: Dort ist die Einzelseite
-- wirklich nicht vorhanden (404), das Modell gibt es beim Gateway nicht.
--
-- Die alte Zeile `qwen` (3.7 Max) bleibt bewusst noch aktiv. Stillgelegt
-- wird sie erst, wenn 3.8 nachweislich antwortet – sonst stünde das Feld
-- ohne Qwen da.
-- ============================================================================

update models
   set provider_id = 'wavespeed',
       api_model   = 'qwen/qwen3.8-max',
       price_input_usd  = 2.00,
       price_output_usd = 6.00
 where id = 'qwen-3.8';
