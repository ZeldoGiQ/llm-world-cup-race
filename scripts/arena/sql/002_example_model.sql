-- ============================================================================
-- 002 – Beispiel-Teilnehmer „Nova Preview" (Early Access)
--
-- Zeigt auf der Seite, wie ein noch unveröffentlichtes Modell eines Labs
-- erscheint: sichtbar im Leaderboard, aber `enabled = false` – es wird also
-- nie angefragt und kostet nichts. Sobald ein echtes Lab teilnimmt, wird diese
-- Zeile durch die echte ersetzt (Studio: api_model + secret setzen, enabled=true).
--
-- Ohne diese Zeile verschwindet die Early-Access-Demo beim ersten Publish aus
-- models.json, weil der Export ausschließlich die DB spiegelt.
-- ============================================================================

insert into providers (id, api_kind, base_url, secret_name, search_mode, enabled) values
  ('example-lab', 'openai-compat', null, 'EXAMPLE_LAB_API_KEY', 'none', false)
on conflict (id) do nothing;

insert into models (id, provider_id, api_model, name, color, version, access, enabled) values
  ('nova', 'example-lab', 'nova-preview-0.9', 'Nova Preview', '#a78bfa',
   'nova-preview-0.9', 'early-access', false)
on conflict (id) do nothing;
