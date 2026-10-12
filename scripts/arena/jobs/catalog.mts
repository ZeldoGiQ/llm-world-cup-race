/**
 * Katalog-Abgleich: Was bietet der Anbieter an, und was davon fehlt uns?
 *
 * Der Grund, warum dieser Job existiert: Die Teilnehmerliste wurde einmal
 * gesetzt und danach nie mit der Wirklichkeit verglichen. Monate später
 * massen wir Modelle, die längst Nachfolger hatten – und ein Modell, das
 * beim Gateway verschwand, scheiterte wochenlang still.
 *
 * Was der Job tut:
 *   1. Fragt den Katalog jedes aktiven Anbieters ab (OpenAI-kompatibel
 *      GET /models, bei OpenAI und Anthropic die nativen Endpunkte).
 *   2. Vergleicht ihn mit der Tabelle `models`:
 *        VERSCHWUNDEN – bei uns aktiv, nicht mehr im Katalog. Das Modell
 *                       schweigt, und im Leaderboard sieht es aus wie
 *                       Modellversagen, nicht wie unser Konfigurationsfehler.
 *        NEU          – im Katalog, nicht bei uns.
 *   3. Legt NEUE Modelle unter festen Regeln von selbst an (lib/enroll.mts):
 *      nur bei Laboren, die wir schon messen; nur, was neuer ist als unser
 *      neuestes Modell dort; nur die vordere Reihe; mit verifiziertem oder
 *      konservativ geschätztem Preis; höchstens wenige pro Lauf; immer als
 *      early-access, damit die Gesamtwertung der anderen unberührt bleibt.
 *      Ab dem nächsten Vorhersagelauf tippt das Modell mit.
 *
 * Was eine Entscheidung bleibt: ein neues Labor (braucht einen Schlüssel),
 * teure Sonderstufen (pro, cyber) und alles, was die Preis-Obergrenze reißt.
 * Das wird gemeldet, nicht angelegt.
 */
import { db, opsConfig, setOpsConfig, unwrap, type ModelRow, type ProviderRow } from '../lib/db.mts';
import { getSecret } from '../lib/env.mts';
import { notifyCommunity, notifyOps } from '../lib/notify.mts';
import { isFrontRunner, labOf, planEnrollments, type Price } from '../lib/enroll.mts';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/env.mts';

interface CatalogEntry {
  id: string;
  ownedBy?: string;
  /** Erstellungszeit in Unix-Sekunden – OpenAI/xAI liefern `created`, Anthropic `created_at` */
  created?: number;
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

  // Die Direktadapter (OpenAI, Anthropic) tragen ihre Adresse im Code, die
  // Anbieterzeile hat keine base_url. Der Katalog muss sie genauso kennen -
  // sonst bleiben ausgerechnet die beiden groessten Labore unbeobachtet, wie
  // beim allerersten Lauf dieses Jobs ("Katalog nicht lesbar").
  const NATIVE: Record<string, { url: string; headers: Record<string, string> }> = {
    openai: {
      url: 'https://api.openai.com/v1/models',
      headers: { Authorization: `Bearer ${key}` },
    },
    anthropic: {
      url: 'https://api.anthropic.com/v1/models',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    },
  };
  const native = NATIVE[provider.api_kind];
  const base = (provider.base_url ?? '').replace(/\/$/, '');
  if (!native && !base) throw new Error(`Provider ${provider.id} hat keine base_url.`);
  const url = native ? native.url : `${base}/models`;

  const response = await fetch(url, {
    headers: native ? native.headers : { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GET ${url} antwortete ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { data?: unknown };
  if (!Array.isArray(payload.data)) {
    throw new Error(`GET ${url} lieferte kein data-Array.`);
  }

  // Zwei Formate, weil WaveSpeed zwei Oberflächen hat: Der
  // OpenAI-kompatible LLM-Endpunkt liefert data[].id, die hauseigene
  // Modell-Liste data[].model_id. Wir lesen beide, statt uns auf eine
  // Vermutung zu stützen – und melden es, wenn keines passt. Ein leeres
  // Ergebnis wäre die schlimmste Antwort: Es sähe aus, als wäre jedes
  // unserer Modelle aus dem Katalog verschwunden.
  const entries = payload.data.flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const row = raw as {
      id?: unknown; model_id?: unknown; owned_by?: unknown; created?: unknown; created_at?: unknown;
    };
    const id = typeof row.id === 'string' ? row.id : typeof row.model_id === 'string' ? row.model_id : null;
    if (!id) return [];
    const created =
      typeof row.created === 'number'
        ? row.created
        : typeof row.created_at === 'string' && !Number.isNaN(Date.parse(row.created_at))
          ? Math.floor(Date.parse(row.created_at) / 1000)
          : undefined;
    return [{ id, ownedBy: typeof row.owned_by === 'string' ? row.owned_by : undefined, created }];
  });

  if (entries.length === 0) {
    throw new Error(
      `GET ${url} lieferte ${payload.data.length} Einträge, aber keiner hatte ein Feld "id" oder "model_id". Format geändert?`,
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
const pricingFile = JSON.parse(
  readFileSync(join(ROOT, 'scripts/arena/config/pricing.json'), 'utf8'),
) as Record<string, unknown>;
const pricing: Record<string, Price> = {};
for (const [id, value] of Object.entries(pricingFile)) {
  if (typeof value === 'object' && value !== null && 'input' in value && 'output' in value) {
    pricing[id] = value as Price;
  }
}
// Obergrenze fuer den Ausgabepreis, ab der NICHT mehr automatisch angelegt
// wird. Im Studio aenderbar (ops_config), Standard knapp ueber Fable.
const maxOutputPriceUsd = await opsConfig<number>('enroll_max_output_price_usd', 60);

const lines: string[] = [];
const noteworthy: string[] = [];
const enrolled: { api_model: string; text: string }[] = [];
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
      // Direktanbieter (OpenAI, Anthropic, xAI direkt) haben kein Praefix –
      // dort IST der Anbieter das Labor.
      const lab = labOf(entry.id) || provider.id;
      byLab.set(lab, [...(byLab.get(lab) ?? []), entry.id]);
    }
    for (const [lab, ids] of [...byLab].sort((a, b) => a[0].localeCompare(b[0]))) {
      const known = ours.some((model) => (labOf(model.api_model) || provider.id) === lab);
      lines.push(`- **${lab}**${known ? ' (Lab ist bei uns vertreten)' : ''}: ${ids.sort().join(', ')}`);
      if (known) noteworthy.push(...ids.filter(isFrontRunner));
    }
  }

  // Auto-Enrollment: die Regeln stehen in lib/enroll.mts, hier nur die
  // Ausfuehrung. Vorschlaege werden als early-access angelegt und tippen ab
  // dem naechsten Vorhersagelauf; alles Uebersprungene steht im Bericht.
  const plan = planEnrollments({
    catalog,
    ours: ours.map((model) => ({
      id: model.id,
      api_model: model.api_model,
      color: model.color,
      price_input_usd: Number(model.price_input_usd),
      price_output_usd: Number(model.price_output_usd),
      enabled: Boolean(model.enabled),
    })),
    pricing,
    maxPerRun: 2,
    maxOutputPriceUsd,
  });
  for (const proposal of plan.proposals) {
    const { error } = await db().from('models').insert({
      id: proposal.id,
      provider_id: provider.id,
      api_model: proposal.api_model,
      name: proposal.name,
      color: proposal.color,
      version: proposal.api_model,
      price_input_usd: proposal.price_input_usd,
      price_output_usd: proposal.price_output_usd,
      price_search_usd: 0,
      access: 'early-access',
      enabled: true,
      release_date: new Date(proposal.created * 1000).toISOString().slice(0, 10),
      // NICHT in `extra`: das streut jeder Adapter in den API-Request, und
      // Anthropic lehnt unbekannte Felder mit 400 ab (so geschehen bei Opus 5.5).
      origin: { autoEnrolled: true, priceSource: proposal.priceSource, enrolledAt: new Date().toISOString() },
    });
    if (error) {
      lines.push(`- ANLEGEN FEHLGESCHLAGEN ${proposal.api_model}: ${error.message}`);
      continue;
    }
    enrolled.push({
      api_model: proposal.api_model,
      text: `${proposal.name} (${proposal.api_model}, ${proposal.price_input_usd}/${proposal.price_output_usd} $ via ${proposal.priceSource})`,
    });
    lines.push(
      `- ANGELEGT ${proposal.api_model} als "${proposal.name}", early-access, Preis ${proposal.price_input_usd}/${proposal.price_output_usd} (${proposal.priceSource})`,
    );
  }
  if (plan.skipped.length > 0) {
    lines.push('', '### Nicht angelegt', ...plan.skipped.map((reason) => `- ${reason}`));
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
  await notifyOps(
    `Katalog-Abgleich: ${missingCount} aktive(s) Modell(e) nicht mehr im Katalog des Anbieters. ` +
      `Sie tippen weiter und schlagen dabei fehl. Details im Job-Protokoll.`,
  );
}

// Neues Modell bei einem Labor, das wir messen: Das ist die Gelegenheit, früh
// dabei zu sein. Nur beim ersten Auftauchen melden – danach steht es im
// Bericht und muss nicht täglich wiederholt werden.
if (enrolled.length > 0) {
  await notifyOps(
    `Automatisch angelegt: ${enrolled.map((e) => e.text).join('; ')}. ` +
      `Der erste Vorhersagelauf startet jetzt; Start als early-access, eine erste Zahl gibt es nach den ersten aufgeloesten Ereignissen.`,
  );
  // Die Oeffentlichkeit erfaehrt es auch – ohne Preise und Regelwerk, das
  // ist Betrieb. Englisch wie Seite und Karten.
  for (const entry of enrolled) {
    const proposal = plan.proposals.find((p) => p.api_model === entry.api_model);
    await notifyCommunity(
      `🆕 **${proposal?.name ?? entry.api_model}** joins FutureBench. ` +
        `It is now locking in predictions on every open event; first scores appear once those events resolve. ` +
        `https://www.futurebench.ai/arena/leaderboards`,
    );
  }
  // Der Workflow liest diese Ausgabe und stoesst sofort einen Vorhersagelauf
  // an – sonst tippt das neue Modell erst beim naechsten Stundentakt, und der
  // laeuft wegen GitHubs Cron-Drosselung oft erst Stunden spaeter.
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `enrolled=${enrolled.map((e) => e.api_model).join(',')}
`);
  }
}

const alreadySeen = await opsConfig<string[]>('catalog_announced', []);
const enrolledIds = new Set(enrolled.map((e) => e.api_model));
const unseen = noteworthy.filter((id) => !alreadySeen.includes(id) && !enrolledIds.has(id)).sort();

if (unseen.length > 0) {
  const list = unseen.slice(0, 8).join(', ');
  const rest = unseen.length > 8 ? ` (+${unseen.length - 8} weitere)` : '';
  await notifyOps(
    `Neu im Katalog bei einem Labor, das wir messen: ${list}${rest}. ` +
      `Wer früh benchmarkt, misst mit der Aufmerksamkeit – Eintragen bleibt eine bewusste Entscheidung.`,
  );
  await setOpsConfig('catalog_announced', [...alreadySeen, ...unseen, ...enrolledIds]);
}
