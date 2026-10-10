/**
 * Secrets-Zugriff für alle Backend-Jobs.
 *
 * In GitHub Actions übergibt jeder Workflow die Secrets EINZELN als
 * Umgebungsvariablen (env: NAME: ${{ secrets.NAME }}); `secret_name` aus der
 * providers-Tabelle wird in process.env nachgeschlagen.
 *
 * Früher lief das über SECRETS_CONTEXT: ${{ toJson(secrets) }} – alle Secrets
 * als ein JSON. Das sparte beim Anbinden eines Anbieters eine YML-Zeile, ist
 * aber exakt das Muster, mit dem Credential-Diebstahl-Malware arbeitet, und
 * GitHubs Heuristik hat die Workflows deshalb als „may be malicious" gesperrt:
 * fünf Wochen lang kein einziger Lauf. Eine YML-Zeile pro neuem Anbieter ist
 * der weitaus billigere Preis.
 *
 * Lokal (Windows-Entwicklung) greift derselbe Aufruf auf process.env zu; eine
 * vorhandene .env im Projektstamm wird einmalig nachgeladen, ohne gesetzte
 * Variablen zu überschreiben.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Projektstamm – von scripts/arena/lib drei Ebenen hoch. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let dotenvLoaded = false;

function loadDotEnv(): void {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  let raw: string;
  try {
    raw = readFileSync(path.join(ROOT, '.env'), 'utf8');
  } catch {
    return; // keine .env – normal in Actions
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue; // echte Umgebung gewinnt immer
    process.env[key] = rawValue.replace(/^(["'])(.*)\1$/, '$2');
  }
}

/** Secret nachschlagen: process.env (Actions und lokal), ergänzt um .env. */
export function getSecret(name: string): string | undefined {
  loadDotEnv();
  return process.env[name] || undefined;
}

/** Wie getSecret, wirft aber mit klarer Meldung, wenn das Secret fehlt. */
export function requireSecret(name: string): string {
  const value = getSecret(name);
  if (!value) {
    throw new Error(
      `Secret "${name}" fehlt. In Actions: gh secret set ${name} – lokal: .env-Eintrag.`,
    );
  }
  return value;
}
