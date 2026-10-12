-- ============================================================================
-- 016 - Community-Beitraege einmal neu ausspielen
--
-- Die ersten vier Discord-Beitraege zeigten den Prediction Score ohne
-- Erklaerung. Seit die Karten die Alltagszahl zeigen ("58 % der Spiele
-- richtig", mit Vergleichswert), sollen alle Kategorien einmal neu gepostet
-- werden, statt erst nach drei weiteren aufgeloesten Ereignissen.
-- Der Merkzustand wird geloescht; der naechste Publish-Lauf postet neu.
-- ============================================================================

delete from ops_config where key = 'community_posted';
