/**
 * SQL-Datei in Einzelanweisungen zerlegen – für den Migrations-Job.
 *
 * Warum nötig: Migrationen werden über eine Datenbank-Funktion angewendet, und
 * plpgsql-EXECUTE verarbeitet nur EINE Anweisung je Aufruf. Eine Datei mit
 * vielen Anweisungen muss also vorher zerlegt werden – aber ein naives
 * split(';') zerreißt Funktionskörper ($$ … ; … $$), Strings und Kommentare.
 *
 * Dieser Zerleger respektiert:
 *   - Zeilenkommentare (--) und Blockkommentare
 *   - String-Literale mit '' als Escape
 *   - Dollar-Quoting ($$ … $$ und $tag$ … $tag$)
 *
 * Bewusst NICHT behandelt: Semikolons in doppelt zitierten Bezeichnern
 * ("mein;name") – wer so etwas in eine Migration schreibt, verdient den Fehler.
 * Der Test läuft gegen die echten Migrationsdateien des Projekts.
 */

function isOnlyComments(statement: string): boolean {
  const stripped = statement
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  return stripped.length === 0;
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);

    // Zeilenkommentar bis zum Zeilenende übernehmen.
    if (rest.startsWith('--')) {
      const newline = sql.indexOf('\n', i);
      const end = newline === -1 ? sql.length : newline + 1;
      current += sql.slice(i, end);
      i = end;
      continue;
    }

    // Blockkommentar am Stück übernehmen.
    if (rest.startsWith('/*')) {
      const close = sql.indexOf('*/', i + 2);
      const end = close === -1 ? sql.length : close + 2;
      current += sql.slice(i, end);
      i = end;
      continue;
    }

    // Dollar-Quoting: alles bis zum passenden End-Tag ist EIN Inhalt –
    // Semikolons darin (Funktionskörper!) trennen nichts.
    const dollar = /^\$[A-Za-z_]*\$/.exec(rest);
    if (dollar) {
      const tag = dollar[0];
      const close = sql.indexOf(tag, i + tag.length);
      const end = close === -1 ? sql.length : close + tag.length;
      current += sql.slice(i, end);
      i = end;
      continue;
    }

    // String-Literal; '' ist das Escape für ein Apostroph.
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }

    if (sql[i] === ';') {
      statements.push(current.trim());
      current = '';
      i += 1;
      continue;
    }

    current += sql[i];
    i += 1;
  }

  if (current.trim()) statements.push(current.trim());

  // Reine Kommentar-Reste wären für EXECUTE leere Anweisungen – raus damit.
  return statements.filter((statement) => statement.length > 0 && !isOnlyComments(statement));
}
