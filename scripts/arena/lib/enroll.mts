/**
 * Auto-Enrollment: Welche neuen Katalogmodelle legen wir von selbst an?
 *
 * Reine Entscheidungslogik, ohne Datenbank und ohne Netz – damit jede Regel
 * hier einen Test haben kann. Der Katalog-Job (jobs/catalog.mts) liefert die
 * Eingaben und führt die Vorschläge aus.
 *
 * Die Regeln, jede mit ihrem Grund:
 *
 *  1. Nur Labore, die wir schon messen. Ein neues Labor braucht einen
 *     Schlüssel, den nur der Betreiber beschaffen kann – das bleibt eine
 *     Entscheidung.
 *  2. Nur Modelle, die NEUER sind als unser neuestes Modell dieses Labors
 *     (nach dem Erstellungsdatum, das der Katalog mitliefert). Der Katalog
 *     führt auch alle alten Versionen; ohne diese Schwelle würden wir ein
 *     Dutzend Vorgänger anlegen statt den einen Nachfolger.
 *  3. Nur die vordere Reihe: keine mini/nano/lite-Sparstufen, keine
 *     Sonderzwecke (audio, image, embed …) – und keine pro/cyber-Stufen,
 *     weil deren Preis ein Vielfaches des Normalen ist und der
 *     Preis-Rückfall sie unterschätzen würde.
 *  4. Keine datierten Snapshots (…-2026-10-01). Der Alias ist der Eintrag,
 *     der Snapshot nur seine Momentaufnahme.
 *  5. Preis aus pricing.json, sonst der höchste bekannte Preis des Labors –
 *     nie zu niedrig, damit der Budget-Wächter konservativ rechnet. Liegt
 *     selbst das über der Obergrenze, wird nicht angelegt, sondern gemeldet.
 *  6. Höchstens wenige pro Lauf. Ein Katalog kann an einem Tag mehrere
 *     Modelle nachreichen; das Feld soll nicht an einem Morgen kippen.
 *
 * Alles Angelegte startet als early-access: So beschädigt ein Neuzugang die
 * Gesamtwertung der anderen nicht (siehe scoring/overall.ts).
 */

export interface CatalogItem {
  id: string;
  /** Erstellungszeit als Unix-Sekunden, falls der Katalog sie liefert */
  created?: number;
}

export interface OwnModel {
  id: string;
  api_model: string;
  color: string;
  price_input_usd: number;
  price_output_usd: number;
}

export interface Price {
  input: number;
  output: number;
}

export interface EnrollmentProposal {
  id: string;
  api_model: string;
  name: string;
  color: string;
  price_input_usd: number;
  price_output_usd: number;
  priceSource: 'pricing.json' | 'lab-max';
  created: number;
}

export interface EnrollmentPlan {
  proposals: EnrollmentProposal[];
  /** Was NICHT angelegt wurde und warum – gehört in den Bericht */
  skipped: string[];
}

/** Erkennbare Spar-, Sonder- und Hochpreis-Varianten: nie automatisch. */
export const SIDE_VARIANT =
  /-(mini|nano|lite|preview|chat|image|audio|tts|transcribe|realtime|embed(ding)?s?|moderation|coder|codex|search|pro|cyber|build|imagine|vision|instruct)\b/i;

const SNAPSHOT = /-(\d{4}-\d{2}-\d{2}|\d{8}|\d{4})$/;

export function isFrontRunner(id: string): boolean {
  return !SIDE_VARIANT.test(id) && !SNAPSHOT.test(id);
}

/** Lab-Präfix eines Gateway-Bezeichners ("x-ai/grok-4.7" → "x-ai"), sonst "". */
export function labOf(apiModel: string): string {
  const slash = apiModel.indexOf('/');
  return slash === -1 ? '' : apiModel.slice(0, slash);
}

const BRAND: Record<string, string> = {
  gpt: 'GPT',
  glm: 'GLM',
  grok: 'Grok',
  claude: 'Claude',
  qwen: 'Qwen',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
  llama: 'Llama',
  mistral: 'Mistral',
};

/**
 * Anzeigename aus dem Bezeichner: "gpt-6.1-sol" → "GPT 6.1 Sol",
 * "claude-fable-5-1" → "Claude Fable 5.1". Eine Näherung – der Name ist im
 * Studio jederzeit änderbar, der Bezeichner nicht.
 */
export function deriveName(apiModel: string): string {
  const bare = apiModel.includes('/') ? apiModel.slice(apiModel.indexOf('/') + 1) : apiModel;
  const tokens = bare.split('-').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    if (/^\d+$/.test(token) && /^\d+$/.test(tokens[i + 1] ?? '')) {
      out.push(`${token}.${tokens[i + 1]}`);
      i += 1;
      continue;
    }
    const brand = BRAND[token.toLowerCase()];
    out.push(brand ?? (/^\d/.test(token) ? token : token.charAt(0).toUpperCase() + token.slice(1)));
  }
  return out.join(' ');
}

export function planEnrollments(params: {
  catalog: CatalogItem[];
  ours: OwnModel[];
  pricing: Record<string, Price>;
  maxPerRun?: number;
  maxOutputPriceUsd?: number;
}): EnrollmentPlan {
  const maxPerRun = params.maxPerRun ?? 2;
  const maxOutput = params.maxOutputPriceUsd ?? 60;
  const skipped: string[] = [];
  const proposals: EnrollmentProposal[] = [];

  const byId = new Map(params.catalog.map((item) => [item.id, item]));
  const labs = new Set(params.ours.map((model) => labOf(model.api_model)));

  for (const lab of labs) {
    const oursHere = params.ours.filter((model) => labOf(model.api_model) === lab);
    const known = oursHere
      .map((model) => byId.get(model.api_model)?.created)
      .filter((created): created is number => typeof created === 'number');
    if (known.length === 0) {
      skipped.push(`${lab || 'direkt'}: keines unserer Modelle im Katalog mit Datum gefunden – keine Schwelle, nichts angelegt`);
      continue;
    }
    const baseline = Math.max(...known);
    const ourIds = new Set(oursHere.map((model) => model.api_model));
    const ourRowIds = new Set(params.ours.map((model) => model.id));
    const labMax: Price = {
      input: Math.max(...oursHere.map((model) => model.price_input_usd)),
      output: Math.max(...oursHere.map((model) => model.price_output_usd)),
    };
    const color = oursHere[0]!.color;

    const candidates = params.catalog
      .filter((item) => labOf(item.id) === lab && !ourIds.has(item.id))
      .filter((item) => typeof item.created === 'number' && item.created > baseline)
      .filter((item) => {
        if (isFrontRunner(item.id)) return true;
        skipped.push(`${item.id}: Spar-, Sonder- oder Hochpreis-Variante`);
        return false;
      })
      .sort((a, b) => b.created! - a.created!);

    for (const item of candidates) {
      const rowId = item.id.includes('/') ? item.id.slice(item.id.indexOf('/') + 1) : item.id;
      if (ourRowIds.has(rowId)) {
        skipped.push(`${item.id}: Zeilen-ID "${rowId}" existiert schon`);
        continue;
      }
      const price = params.pricing[item.id];
      const priceSource: EnrollmentProposal['priceSource'] = price ? 'pricing.json' : 'lab-max';
      const effective = price ?? labMax;
      if (effective.output > maxOutput) {
        skipped.push(`${item.id}: Ausgabepreis ${effective.output} $/Mio über der Obergrenze ${maxOutput} $ (${priceSource})`);
        continue;
      }
      if (proposals.length >= maxPerRun) {
        skipped.push(`${item.id}: Tageslimit von ${maxPerRun} erreicht – nächster Lauf`);
        continue;
      }
      proposals.push({
        id: rowId,
        api_model: item.id,
        name: deriveName(item.id),
        color,
        price_input_usd: effective.input,
        price_output_usd: effective.output,
        priceSource,
        created: item.created!,
      });
    }
  }

  return { proposals, skipped };
}
