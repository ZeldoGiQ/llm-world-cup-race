-- ============================================================================
-- 000 – Bootstrap der automatischen Migrationen. DIE LETZTE HAND-MIGRATION.
--
-- Erschafft die Buchführung (schema_migrations) und die Funktion, über die der
-- Migrations-Job (scripts/arena/jobs/migrate.mts, Workflow arena-migrate.yml)
-- alle künftigen Dateien anwendet. Ab dann gilt: neue Migration = neue Datei
-- im Repo, der Push wendet sie an – niemand kopiert mehr SQL in den Editor.
--
-- Sicherheit: Die Funktion führt beliebiges SQL aus und ist deshalb allen
-- öffentlichen Rollen entzogen; nur der Service-Key (läuft ausschließlich in
-- GitHub Actions) darf sie aufrufen. Wer den Service-Key hat, kann ohnehin
-- alles – die Funktion erweitert also keine Rechte.
--
-- Angewendete Migrationen sind unveränderlich: Derselbe Name mit anderer
-- Prüfsumme wird abgewiesen. Eine Korrektur ist immer eine NEUE Datei.
-- ============================================================================

create table if not exists schema_migrations (
  name       text primary key,
  checksum   text not null,
  applied_at timestamptz not null default now()
);

alter table schema_migrations enable row level security;

create or replace function apply_migration(p_name text, p_checksum text, p_statements text[])
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  existing text;
  stmt     text;
begin
  select checksum into existing from schema_migrations where name = p_name;
  if existing is not null then
    if existing <> p_checksum and existing <> 'manual' then
      raise exception 'Migration % wurde bereits mit anderem Inhalt angewendet.', p_name;
    end if;
    return; -- schon angewendet: stiller Erfolg, der Job bleibt idempotent
  end if;

  foreach stmt in array p_statements loop
    execute stmt;
  end loop;

  insert into schema_migrations (name, checksum) values (p_name, p_checksum);
end $func$;

revoke all on function apply_migration(text, text, text[]) from public;
revoke all on function apply_migration(text, text, text[]) from anon;
revoke all on function apply_migration(text, text, text[]) from authenticated;
grant execute on function apply_migration(text, text, text[]) to service_role;

-- Alles bereits von Hand Eingespielte als angewendet verbuchen, damit der Job
-- es nie erneut anfasst. 'manual' statt Prüfsumme: der Wortlaut von damals ist
-- nicht mehr rekonstruierbar, und das ist in Ordnung.
insert into schema_migrations (name, checksum) values
  ('000_migrations_bootstrap.sql', 'manual'),
  ('001_init.sql', 'manual'),
  ('002_example_model.sql', 'manual'),
  ('003_feed_caps.sql', 'manual'),
  ('004_baseline_model.sql', 'manual'),
  ('005_wavespeed.sql', 'manual')
on conflict (name) do nothing;
