-- ============================================================================
-- 004 – Referenz-Teilnehmer „Random-Walk" als Modellzeile
--
-- Die Kategorien „Aktienindex" und „Krypto" ranken unter anderem nach
-- Skill-Score, also gegen den Random-Walk („nächster Wert = letzter Wert").
-- Dafür braucht es Baseline-Vorhersagen in der predictions-Tabelle, und die
-- verlangt per Fremdschlüssel eine Modellzeile.
--
-- enabled = false: der Referenz-Teilnehmer hat keine API und wird nie angefragt.
-- hidden  = true:  der Export soll die Zeile nicht aus der DB übernehmen – die
--                  dreisprachigen Namen der Baselines liegen handgepflegt in
--                  scripts/arena/lib/registry-export.mts. Ohne hidden würde der
--                  Eintrag in models.json doppelt erscheinen.
--
-- Der Ingest-Job schreibt danach für jedes neue numerische Event automatisch
-- die Random-Walk-Vorhersage – vor dem Lock, wie jede andere Vorhersage auch.
-- ============================================================================

insert into providers (id, api_kind, base_url, secret_name, search_mode, enabled) values
  ('reference', 'openai-compat', null, 'UNUSED_REFERENCE_KEY', 'none', false)
on conflict (id) do nothing;

insert into models (id, provider_id, api_model, name, color, access, enabled, hidden) values
  ('baseline-randomwalk', 'reference', 'n/a', 'Random walk', '#8b94a7', 'public', false, true)
on conflict (id) do nothing;
