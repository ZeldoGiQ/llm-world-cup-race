/**
 * Erzeugt public/arena-data/registry.json und src/arena/data/models.json.
 *
 * Richtung ist immer DB → Git: der Admin (Supabase Studio) ist die
 * Wahrheitsquelle, der Commit der Audit-Trail. Beide Dateien gehören zum
 * Frontend-Vertrag und werden deterministisch geschrieben.
 *
 * Warum hier eine eigene Kategorie-Liste steht und nicht die Frontend-Registry
 * importiert wird: die Frontend-Module importieren einander extensionslos
 * (Vite-Konvention), was `node --experimental-strip-types` nicht auflösen kann.
 * Drift ist trotzdem ausgeschlossen – registry-export.test.ts prüft, dass diese
 * Liste exakt den registrierten Kategorien entspricht. In registry.json ist
 * ohnehin nur die `id` funktional (getStaticPaths); die Labels der Oberfläche
 * kommen dreisprachig aus den Kategorie-Deskriptoren.
 */
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ModelRow } from './db.mts';
import { ROOT } from './env.mts';
import { writeIfChanged } from './export-json.mts';

/** Alle im Frontend registrierten Kategorien mit ihrem englischen Label. */
export const CATEGORY_LABELS: Record<string, string> = {
  'football-worldcup': 'FIFA World Cup 2026',
  'football-leagues': 'Football leagues',
  crypto: 'Crypto',
  'stocks-index': 'Stock index',
  elections: 'Elections & politics',
  'sports-mixed': 'Mixed sports',
};

/** Referenz-Teilnehmer: handgepflegt, weil sie keine API haben. */
const BASELINES = [
  {
    id: 'baseline-market',
    name: 'Bookmaker consensus',
    names: { en: 'Bookmaker consensus', de: 'Buchmacher-Konsens', es: 'Consenso de apuestas' },
    provider: 'Reference',
    providers: { en: 'Reference', de: 'Referenz', es: 'Referencia' },
    color: '#8b94a7',
    baseline: true,
  },
  {
    id: 'baseline-randomwalk',
    name: 'Random walk',
    names: { en: 'Random walk', de: 'Random-Walk', es: 'Camino aleatorio' },
    provider: 'Reference',
    providers: { en: 'Reference', de: 'Referenz', es: 'Referencia' },
    color: '#8b94a7',
    baseline: true,
  },
  {
    id: 'baseline-poll',
    name: 'Latest poll',
    names: { en: 'Latest poll', de: 'Letzte Umfrage', es: 'Última encuesta' },
    provider: 'Reference',
    providers: { en: 'Reference', de: 'Referenz', es: 'Referencia' },
    color: '#8b94a7',
    baseline: true,
  },
];

/** Anzeigenamen der Anbieter; unbekannte IDs erscheinen kapitalisiert. */
const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  alibaba: 'Alibaba',
  moonshot: 'Moonshot AI',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  meta: 'Meta',
  'example-lab': 'Example Lab',
};

export function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * models.json aus der models-Tabelle.
 *
 * `hidden` fliegt raus; `enabled=false` bleibt drin – ein ausgemustertes Modell
 * behält seine Leaderboard-Zeile und seine Historie (Benchmark-Integrität).
 */
export async function exportModels(models: ModelRow[]): Promise<boolean> {
  const llms = models
    .filter((model) => !model.hidden)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((model) => ({
      id: model.id,
      name: model.name,
      provider: providerLabel(model.provider_id),
      color: model.color,
      ...(model.version ? { version: model.version } : {}),
      ...(model.release_date ? { releaseDate: model.release_date } : {}),
      access: model.access,
      ...(model.retired_at ? { retiredAt: model.retired_at } : {}),
    }));

  return writeIfChanged(path.join(ROOT, 'src/arena/data/models.json'), [...llms, ...BASELINES]);
}

/**
 * Kategorien, die bereits als Dateien auf der Platte liegen, aber nicht von der
 * DB erzeugt werden: die abgeschlossene WM (historische Tipps ohne verlässliche
 * Zeitstempel – die gehören nicht in eine Lock-geprüfte DB) und die
 * Beispieldaten. Sie bleiben im Registry, bis ihr Ordner gelöscht wird.
 */
async function categoriesOnDisk(): Promise<string[]> {
  const root = path.join(ROOT, 'public/arena-data');
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }

  const found: string[] = [];
  for (const entry of entries) {
    try {
      if (!(await stat(path.join(root, entry, 'events.json'))).isFile()) continue;
      found.push(entry);
    } catch {
      // kein Kategorie-Ordner (z. B. registry.json selbst)
    }
  }
  return found;
}

/**
 * registry.json = Kategorien mit Events in der DB ∪ Kategorien mit Dateien auf
 * der Platte. So verschwinden WM und Beispieldaten nicht, sobald das Backend
 * übernimmt – und sie verschwinden zuverlässig, sobald ihr Ordner gelöscht wird.
 * Kategorien ohne Frontend-Datei werden ausgelassen und laut gemeldet.
 */
export async function exportRegistry(dbCategoryIds: string[]): Promise<boolean> {
  const all = [...new Set([...dbCategoryIds, ...(await categoriesOnDisk())])];
  const known = all.filter((id) => id in CATEGORY_LABELS).sort();
  const unknown = all.filter((id) => !(id in CATEGORY_LABELS));

  if (unknown.length > 0) {
    console.warn(
      `Achtung: Kategorien ohne Frontend-Datei: ${unknown.join(', ')}. ` +
        `Datei in src/arena/lib/categories/ anlegen, in plugins.ts eintragen ` +
        `und CATEGORY_LABELS ergänzen – sonst bleiben sie unsichtbar.`,
    );
  }

  return writeIfChanged(path.join(ROOT, 'public/arena-data/registry.json'), {
    categories: known.map((id) => ({ id, label: CATEGORY_LABELS[id] })),
  });
}
