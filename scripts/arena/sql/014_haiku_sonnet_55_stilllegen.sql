-- ============================================================================
-- 014 – Fehlanlagen des ersten Auto-Enrollment-Laufs stilllegen
--
-- Der erste Live-Lauf der Enrollment-Regeln kannte Anthropics Stufenwoerter
-- nicht und legte claude-haiku-5-5 und claude-sonnet-5-5 an - Spar- und
-- Mittelstufe, nicht die vordere Reihe. Beide noch bevor sie einen Tipp
-- abgeben stilllegen. Die Zeilen bleiben stehen: So weiss der Abgleich, dass
-- er sie kennt, und legt sie nicht erneut an.
-- ============================================================================

update models
   set enabled = false,
       retired_at = coalesce(retired_at, now()),
       hidden = true
 where id in ('claude-haiku-5-5', 'claude-sonnet-5-5');
