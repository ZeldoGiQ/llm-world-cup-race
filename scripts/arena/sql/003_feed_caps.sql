-- ============================================================================
-- 003 – Feed-Caps auf die tatsächlichen Feed-IDs bringen
--
-- Stooq stellte seine CSV-Abrufe hinter eine JavaScript-Bot-Prüfung; die
-- Aktienindizes kommen jetzt über den Chart-Endpunkt von Yahoo Finance.
-- Der Cap-Schlüssel muss der Feed-ID entsprechen, sonst greift der
-- Vorgabewert statt des gewünschten Volumens.
--
-- Optional: ohne diese Migration nutzt der Feed den Standard-Cap (10), was bei
-- drei Indizes ohnehin nicht limitiert.
-- ============================================================================

update ops_config
set value = '{"football-data": 30, "yahoo-finance": 3, "coingecko": 2}'::jsonb,
    updated_at = now()
where key = 'feed_caps';
