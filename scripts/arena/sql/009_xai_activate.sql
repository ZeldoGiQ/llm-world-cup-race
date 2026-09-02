-- ============================================================================
-- 009 – xAI aktivieren
--
-- 008 hat alles vorbereitet und den Anbieter bewusst abgeschaltet gelassen,
-- weil der Schlüssel fehlte. Er liegt jetzt in den Actions-Secrets, also die
-- eine Zeile, die Grok 4.6 mittippen lässt.
--
-- Getrennt von 008, weil eine angewendete Migration unveränderlich ist: Eine
-- Korrektur ist immer eine neue Datei, nie eine Änderung an der alten.
-- ============================================================================

update providers set enabled = true where id = 'xai';
