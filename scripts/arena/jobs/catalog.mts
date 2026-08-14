/**
 * Katalog-Abgleich: Was bietet das Gateway an, und was davon fehlt uns?
 *
 * Der Grund, warum dieser Job existiert: Die Teilnehmerliste des Benchmarks
 * wurde einmal gesetzt und danach nie mit der Wirklichkeit verglichen. Sie
 * stammt aus dem Vorgängerprojekt, und beim Wechsel auf das Gateway wurde
 * geprüft, ob die BESTEHENDEN Teilnehmer dort verfügbar sind – nicht, was
 * der Katalog sonst hergibt. Ergebnis: Monate später messen wir Modelle,
 * die längst Nachfolger haben.
 *
 * Was der Job tut:
 *   1. Fragt den Katalog des Anbieters ab (OpenAI-kompatibel: GET /models).
 *   2. Vergleicht ihn mit der Tabelle `models`.
 *   3. Meldet drei Dinge, die alle drei wehtun, wenn man sie nicht merkt:
 *        NEU        – im Katalog, aber nicht bei uns (verpasste Modelle)
 *        VERSCHWUNDEN – bei uns aktiv, aber nicht mehr im Katalog. Das ist
 *                     der teuerste Fall: Das Modell schweigt, und im
 *                     Leaderboard sieht es aus wie ein Ausfall des Modells,
 *                     nicht wie unser Konfigurationsfehler.
 *        DRIFT      – der Alias zeigt inzwischen auf eine andere Version,
 *                     erkennbar an der von der API zurückgemeldeten ID.
 *
 * Was der Job bewusst NICHT tut: Modelle anlegen oder aktivieren. Preise
 * sind aus einem Katalog oft nicht ablesbar, und ein automatisch
 * mittippendes Modell kostet Geld und verändert das Leaderboard. Vor allem
 * aber gilt die Regel „ein Eintrag = eine Modellversion": Ob ein neues
 * Modell eine neue Zeile oder den Nachfolger einer alten darstellt, ist eine
 * Entscheidung, keine Ableitung. Der Job schreibt einen Bericht; eintragen
 * bleibt ein bewusster Handgriff.
 */
import { db, opsConfig, setOpsConfig, unwrap, type ModelRow, type ProviderRow } from '../lib/db.mts';
import { getSecret } from '../lib/env.mts';
import { notifyDiscord } from '../lib/notify.mts';

interface CatalogEntry {
  id: string;
  ownedBy?: string;
}

/**
 * Liest den Katalog eines OpenAI-kompatiblen Anbieters. Der Endpunkt ist Teil
 * der Spezifikation; liefert er etwas anderes als erwartet, brechen wir mit
 * klarer Meldung ab statt still eine leere Liste zu melden – eine leere Liste
 * sähe aus wie „alle unsere Modelle sind verschwunden".
 */
async function fetchCatalog(provider: ProviderRow): Promise<CatalogEntry[]> {
  const key = getSecret(provider.secret_name);
  if (!key) throw new Error(`Secret ${provider.secret_name} fehlt.`);
  const base = (provider.base_url ?? '').replace(/\/$/, '');
  if (!base) throw new Error(`Provider ${provider.id} hat keine base_url.`);

  const response = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GET ${base}/models antwortete ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { data?: unknown };
  if (!Array.isArray(payload.data)) {
    throw new Error(`GET ${base}/models lieferte kein data-Array.`);
  }

  // Zwei Formate, weil WaveSpeed zwei Oberflächen hat: Der
  // OpenAI-kompatible LLM-Endpunkt liefert data[].id, die hauseigene
  // Modell-Liste data[].model_id. Wir lesen beide, statt uns auf eine
  // Vermutung zu stützen – und melden es, wenn keines passt. Ein leeres
  // Ergebnis wäre die schlimmste Antwort: Es sähe aus, als wäre jedes
  // unserer Modelle aus dem Katalog verschwunden.
  const entries = payload.data.flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const row = raw as { id?: unknown; model_id?: unknown; owned_by?: unknown; name?: unknown };
    const id = typeof row.id === 'string' ? row.id : typeof row.model_id === 'string' ? row.model_id : null;
    if (!id) return [];
    return [{ id, ownedBy: typeof row.owned_by === 'string' ? row.owned_by : undefined }];
  });

  if (entries.length === 0) {
    throw new Error(
      `GET ${base}/models lieferte ${payload.data.length} Einträge, aber keiner hatte ein Feld "id" oder "model_id". Format geändert?`,
    );
  }
  return entries;
}

const providers = unwrap(
  await db().from('providers').select('*').eq('enabled', true),
  'providers lesen',
) as ProviderRow[];

const models = unwrap(await db().from('models').select('*').order('id'), 'models lesen') as ModelRow[];

/**
 * Zeitkritischer Teil: Erscheint bei einem Labor, das wir ohnehin messen, ein
 * neues Modell, ist das die Gelegenheit, es früh zu benchmarken – und die
 * Aufmerksamkeit hält nur wenige Tage. Deshalb wird dieser Fall gemeldet und
 * nicht nur protokolliert.
 *
 * Zwei Filter, damit die Meldung eine Meldung bleibt und kein Rauschen:
 *   1. Nur Labore, von denen wir schon ein Modell führen. Der Katalog hat
 *      hunderte Einträge; die meisten sind für uns bedeutungslos.
 *   2. Nur Kandidaten für die vordere Reihe. Was erkennbar eine Spar- oder
 *      Sondervariante ist, taugt nicht als Nachfolger eines Teilnehmers.
 * Gemeldet wird jeder Bezeichner genau einmal – wiederholte Meldungen werden
 * nach zwei Tagen nicht mehr gelesen.
 */
const SIDE_VARIANT = /-(mini|nano|lite|preview|chat|image|audio|tts|embed|coder|search)\b/i;

function isFrontRunner(id: string): boolean {
  return !SIDE_VARIANT.test(id);
}

const lines: string[] = [];
const noteworthy: string[] = [];
let missingCount = 0;
let newCount = 0;

for (const provider of providers) {
  const ours = models.filter((model) => model.provider_id === provider.id);
  let catalog: CatalogEntry[];
  try {
    catalog = await fetchCatalog(provider);
  } catch (error) {
    lines.push(`## ${provider.id}: Katalog nicht lesbar – ${(error as Error).message}`);
    continue;
  }

  const catalogIds = new Set(catalog.map((entry) => entry.id));
  const ourIds = new Set(ours.map((model) => model.api_model));

  const gone = ours.filter((model) => model.enabled && !catalogIds.has(model.api_model));
  const fresh = catalog.filter((entry) => !ourIds.has(entry.id));

  missingCount += gone.length;
  newCount += fresh.length;

  lines.push(`## ${provider.id} — ${catalog.length} Modelle im Katalog, ${ours.length} bei uns`);

  if (gone.length > 0) {
    lines.push('', '### VERSCHWUNDEN (aktiv bei uns, nicht mehr im Katalog)');
    for (const model of gone) {
      lines.push(`- ${model.id} → api_model "${model.api_model}" existiert dort nicht mehr`);
    }
  }

  if (fresh.length > 0) {
    lines.push('', `### NEU im Katalog (${fresh.length})`);
    // Gruppiert nach Lab-Präfix, damit man auf einen Blick sieht, wo ein
    // Nachfolger für einen bestehenden Teilnehmer bereitliegt.
    const byLab = new Map<string, string[]>();
    for (const entry of fresh) {
      const lab = entry.id.includes('/') ? entry.id.split('/')[0]! : (entry.ownedBy ?? 'sonstige');
      byLab.set(lab, [...(byLab.get(lab) ?? []), entry.id]);
    }
    for (const [lab, ids] of [...byLab].sort((a, b) => a[0].localeCompare(b[0]))) {
      const known = ours.some((model) => model.api_model.startsWith(`${lab}/`));
      lines.push(`- **${lab}**${known ? ' (Lab ist bei uns vertreten)' : ''}: ${ids.sort().join(', ')}`);
      if (known) noteworthy.push(...ids.filter(isFrontRunner));
    }
  }

  lines.push('');
}

const report = [
  `# Katalog-Abgleich ${new Date().toISOString().slice(0, 10)}`,
  '',
  `${newCount} Modelle im Katalog ohne Eintrag bei uns, ${missingCount} unserer aktiven Modelle nicht mehr im Katalog.`,
  '',
  ...lines,
].join('\n');

console.log(report);

// Verschwundene Modelle sind ein Betriebsfehler und gehören gemeldet: Bis das
// bemerkt wird, sammelt das Leaderboard Ausfälle, die wie Modellschwäche
// aussehen.
if (missingCount > 0) {
  await notifyDiscord(
    `Katalog-Abgleich: ${missingCount} aktive(s) Modell(e) nicht mehr im Katalog des Anbieters. ` +
      `Sie tippen weiter und schlagen dabei fehl. Details im Job-Protokoll.`,
  );
}

// Neues Modell bei einem Labor, das wir messen: Das ist die Gelegenheit, früh
// dabei zu sein. Nur beim ersten Auftauchen melden – danach steht es im
// Bericht und muss nicht täglich wiederholt werden.
const alreadySeen = await opsConfig<string[]>('catalog_announced', []);
const unseen = noteworthy.filter((id) => !alreadySeen.includes(id)).sort();

if (unseen.length > 0) {
  const list = unseen.slice(0, 8).join(', ');
  const rest = unseen.length > 8 ? ` (+${unseen.length - 8} weitere)` : '';
  await notifyDiscord(
    `Neu im Katalog bei einem Labor, das wir messen: ${list}${rest}. ` +
      `Wer früh benchmarkt, misst mit der Aufmerksamkeit – Eintragen bleibt eine bewusste Entscheidung.`,
  );
  await setOpsConfig('catalog_announced', [...alreadySeen, ...unseen]);
}
