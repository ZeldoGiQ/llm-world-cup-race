/**
 * Minimaler CSV-Helfer ohne Dependencies.
 * - Schreiben: Komma-getrennt, korrektes Quoting, CRLF, UTF-8-BOM (Excel).
 * - Lesen: erkennt Komma ODER Semikolon (deutsches Excel exportiert mit ";"),
 *   versteht Anführungszeichen inkl. doppelter Quotes.
 */

const BOM = '﻿';

export function toCsvField(value) {
  const text = String(value ?? '');
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows) {
  // BOM, damit Excel die Datei als UTF-8 erkennt (Umlaute in Teamnamen)
  return BOM + rows.map((row) => row.map(toCsvField).join(',')).join('\r\n') + '\r\n';
}

function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

export function parseCsv(text) {
  const clean = text.startsWith(BOM) ? text.slice(1) : text;
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return {
    rows: rows.filter((cells) => cells.some((cell) => cell.trim() !== '')),
    delimiter,
  };
}
