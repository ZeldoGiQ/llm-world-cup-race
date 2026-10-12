-- ============================================================================
-- 015 - Herkunft eines Modells gehoert nicht in die Adapter-Extras
--
-- `models.extra` wird von jedem Adapter 1:1 in den API-Request gestreut
-- (z. B. {"reasoningEffort":"low"}). Das Auto-Enrollment hatte dort seine
-- Herkunftsnotiz abgelegt - und Anthropic antwortete auf jeden Tipp von
-- Opus 5.5 mit 400 "autoEnrolled: Extra inputs are not permitted".
--
-- Neue Spalte `origin` fuer solche Notizen; die drei betroffenen Zeilen
-- werden umgezogen und ihre Extras geleert. Die Fehlversuche stehen in
-- prediction_failures; der naechste Vorhersagelauf holt die Tipps nach.
-- ============================================================================

alter table models
  add column if not exists origin jsonb not null default '{}'::jsonb;

comment on column models.origin is
  'Herkunft/Verwaltungsnotizen (z. B. autoEnrolled). Geht NIE in den API-Request - dafuer ist extra da.';

update models
   set origin = extra,
       extra  = '{}'::jsonb
 where extra ? 'autoEnrolled';
