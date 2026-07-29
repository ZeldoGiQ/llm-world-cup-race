/**
 * Der SQL-Zerleger füttert die Migrations-Funktion – zerreißt er einen
 * Funktionskörper oder einen String, wendet der Job kaputtes SQL an. Getestet
 * wird deshalb gegen die ECHTEN Migrationsdateien des Projekts, nicht nur
 * gegen konstruierte Beispiele.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { splitSqlStatements } from './sql-split.mts';

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../sql');

describe('splitSqlStatements', () => {
  it('trennt einfache Anweisungen am Semikolon', () => {
    expect(splitSqlStatements('select 1; select 2;')).toEqual(['select 1', 'select 2']);
  });

  it('lässt Semikolons in Dollar-Quotes unangetastet – Funktionskörper bleiben ganz', () => {
    const sql = `create function f() returns void language plpgsql as $$
begin
  raise exception 'a; b';
end $$;
select 1;`;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('raise exception');
    expect(statements[0]).toContain('end $$');
  });

  it('lässt Semikolons in Strings und Kommentaren unangetastet', () => {
    const sql = `insert into t values ('a;b'); -- Kommentar; mit Semikolon
select 1;`;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("'a;b'");
  });

  it('behandelt \'\' als Escape, nicht als String-Ende', () => {
    const statements = splitSqlStatements("select 'it''s; fine'; select 2;");
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("it''s; fine");
  });

  it('verwirft reine Kommentar-Blöcke – EXECUTE kann keine leere Anweisung', () => {
    const sql = `-- nur ein Kommentar
;
select 1;`;
    expect(splitSqlStatements(sql)).toEqual(['select 1']);
  });

  it('zerlegt die echte 001_init.sql, ohne den Trigger-Funktionskörper zu zerreißen', () => {
    const sql = readFileSync(path.join(SQL_DIR, '001_init.sql'), 'utf8');
    const statements = splitSqlStatements(sql);

    expect(statements.length).toBeGreaterThan(20);
    // Der Funktionskörper enthält ein Semikolon – er muss EINE Anweisung bleiben.
    const fn = statements.find((s) => s.includes('forbid_prediction_mutation') && s.includes('$$'));
    expect(fn).toBeDefined();
    expect(fn).toContain('raise exception');
    expect(fn).toContain('end $$');
    // Keine Anweisung darf ein unbalanciertes Dollar-Quoting tragen.
    for (const statement of statements) {
      const dollars = (statement.match(/\$\$/g) ?? []).length;
      expect(dollars % 2, `unbalanciertes $$ in: ${statement.slice(0, 60)}`).toBe(0);
    }
  });

  it('zerlegt die echte 005_wavespeed.sql mit intakten URLs und Preisen', () => {
    const sql = readFileSync(path.join(SQL_DIR, '005_wavespeed.sql'), 'utf8');
    const statements = splitSqlStatements(sql);
    expect(statements.length).toBeGreaterThan(8);
    const wavespeed = statements.find((s) => s.includes('llm.wavespeed.ai'));
    expect(wavespeed).toContain("'https://llm.wavespeed.ai/v1'");
  });

  it('zerlegt die 000_bootstrap selbst korrekt (foreach-Schleife bleibt ganz)', () => {
    const sql = readFileSync(path.join(SQL_DIR, '000_migrations_bootstrap.sql'), 'utf8');
    const statements = splitSqlStatements(sql);
    const fn = statements.find((s) => s.includes('apply_migration') && s.includes('$func$'));
    expect(fn).toBeDefined();
    expect(fn).toContain('foreach stmt in array');
    expect(fn).toContain('end $func$');
  });
});
