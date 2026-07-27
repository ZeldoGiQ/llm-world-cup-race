/**
 * Secrets-Zugriff für alle Backend-Jobs.
 *
 * In GitHub Actions liefert der Workflow `SECRETS_CONTEXT: ${{ toJson(secrets) }}` –
 * damit kann `secret_name` aus der models/providers-Tabelle dynamisch nachgeschlagen
 * werden, ohne dass je eine env:-Zeile ins YML muss (Kern des 2-Minuten-Onboardings).
 * GitHub maskiert die Werte in Logs weiterhin.
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

let secretsContext: Record<string, unknown> | null | undefined;
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

function fromSecretsContext(name: string): string | undefined {
  if (secretsContext === undefined) {
    const raw = process.env.SECRETS_CONTEXT;
    if (!raw) {
      secretsContext = null;
    } else {
      try {
        secretsContext = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        secretsContext = null; // defekter Kontext = wie nicht vorhanden
      }
    }
  }
  const value = secretsContext?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Secret nachschlagen: SECRETS_CONTEXT (Actions) vor process.env/.env (lokal). */
export function getSecret(name: string): string | undefined {
  loadDotEnv();
  return fromSecretsContext(name) ?? (process.env[name] || undefined);
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
