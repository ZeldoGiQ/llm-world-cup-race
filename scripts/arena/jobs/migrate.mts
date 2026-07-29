/**
 * Migrations-Job: wendet ausstehende SQL-Dateien automatisch an.
 *
 * Damit endet das Kopieren in den Supabase-SQL-Editor: Eine neue Migration ist
 * eine Datei unter scripts/arena/sql/, der Push wendet sie an. Welche Datei
 * schon lief, steht in `schema_migrations`; angewendete Dateien sind
 * unveränderlich (Prüfsummen-Vergleich in der Datenbank-Funktion).
 *
 * Einmalige Voraussetzung: `000_migrations_bootstrap.sql` muss von Hand
 * eingespielt sein – sie erschafft genau die Funktion, über die alle weiteren
 * Migrationen laufen. Ohne sie meldet dieser Job freundlich „Bootstrap fehlt"
 * und tut nichts, statt rot zu werden.
 *
 * Anwendung je Datei geschieht in EINER Transaktion (die Funktion ist eine),
 * eine halb angewendete Migration kann also nicht entstehen.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../lib/db.mts';
import { ROOT } from '../lib/env.mts';
import { runJob } from '../lib/runs.mts';
import { splitSqlStatements } from '../lib/sql-split.mts';

const SQL_DIR = path.join(ROOT, 'scripts/arena/sql');

async function main(): Promise<void> {
  await runJob('migrate', async () => {
    const files = (await readdir(SQL_DIR))
      .filter((name) => /^\d{3}_.+\.sql$/.test(name))
      .sort();

    const { data, error } = await db().from('schema_migrations').select('name, checksum');
    if (error) {
      // Tabelle fehlt: Bootstrap noch nicht eingespielt. Kein Fehler – der
      // Zustand ist erwartbar und selbsterklärend.
      console.log(
        `schema_migrations nicht lesbar (${error.message}). ` +
          `000_migrations_bootstrap.sql einmalig im SQL-Editor ausführen, danach läuft alles automatisch.`,
      );
      return { bootstrap: false, pending: files.length };
    }
    const applied = new Set((data ?? []).map((row) => (row as { name: string }).name));

    const appliedNow: string[] = [];
    for (const name of files) {
      if (applied.has(name)) continue;

      const sql = await readFile(path.join(SQL_DIR, name), 'utf8');
      const statements = splitSqlStatements(sql);
      const checksum = createHash('sha256').update(sql).digest('hex');

      const { error: rpcError } = await db().rpc('apply_migration', {
        p_name: name,
        p_checksum: checksum,
        p_statements: statements,
      });
      if (rpcError) throw new Error(`${name}: ${rpcError.message}`);

      console.log(`${name}: angewendet (${statements.length} Anweisungen).`);
      appliedNow.push(name);
    }

    if (appliedNow.length === 0) console.log('Keine ausstehenden Migrationen.');
    return { bootstrap: true, applied: appliedNow, total: files.length };
  });
}

main();
