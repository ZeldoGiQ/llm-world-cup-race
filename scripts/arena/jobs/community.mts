/**
 * Job "community" – Benchmark-Ergebnisse auf den öffentlichen Discord.
 *
 * Läuft im Publish-Workflow NACH dem Commit und NACH `npm run build`: Die
 * Share-Karten (Bild + JSON) entstehen nur im Site-Build, weil ihre Daten
 * über Vite-Globs geladen werden. Der Job liest dist/arena/share/<id>.json
 * und hängt dist/arena/share/<id>.png an – dieselbe Karte, die auch die
 * Seite ausliefert.
 *
 * Was hier NICHT landet: Betriebsmeldungen. Dafür ist notifyOps da.
 *
 *   node --experimental-strip-types scripts/arena/jobs/community.mts
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  communityMessage,
  markPosted,
  planCommunityPosts,
  type CommunityCard,
  type PostedState,
} from '../lib/community.mts';
import { opsConfig, setOpsConfig } from '../lib/db.mts';
import { ROOT } from '../lib/env.mts';
import { notifyCommunity } from '../lib/notify.mts';
import { runJob } from '../lib/runs.mts';

const SHARE_DIR = join(ROOT, 'dist', 'arena', 'share');

async function loadCards(): Promise<CommunityCard[]> {
  const files = (await readdir(SHARE_DIR)).filter((name) => name.endsWith('.json'));
  const cards: CommunityCard[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(join(SHARE_DIR, file), 'utf8')) as {
      id: string;
      title: string;
      footnote: string;
      resolvedEvents?: number;
      rows: CommunityCard['rows'];
    };
    // Ältere Builds haben resolvedEvents noch nicht; die Fußnote beginnt
    // immer mit der Zahl.
    const resolvedEvents = raw.resolvedEvents ?? Number(/^(\d+) /.exec(raw.footnote)?.[1] ?? 0);
    cards.push({ id: raw.id, title: raw.title, resolvedEvents, rows: raw.rows });
  }
  // Gesamtwertung zuerst – sie ist der Beitrag, der am weitesten trägt.
  return cards.sort((a, b) =>
    a.id === 'overall' ? -1 : b.id === 'overall' ? 1 : a.id.localeCompare(b.id),
  );
}

async function main(): Promise<void> {
  if (!existsSync(SHARE_DIR)) {
    console.log('Keine Share-Karten gefunden – erst "npm run build" laufen lassen.');
    return;
  }
  await runJob('community', async () => {
    const cards = await loadCards();
    let posted = await opsConfig<PostedState>('community_posted', {});
    const minNewResolved = await opsConfig<number>('community_min_new_resolved', 3);
    const now = new Date();
    const plan = planCommunityPosts({ cards, posted, now, minNewResolved });
    for (const reason of plan.skipped) console.log(`übersprungen: ${reason}`);

    let sent = 0;
    for (const card of plan.posts) {
      const png = join(SHARE_DIR, `${card.id}.png`);
      const attachment = existsSync(png)
        ? { filename: `${card.id}.png`, data: await readFile(png) }
        : undefined;
      const ok = await notifyCommunity(communityMessage(card), attachment);
      console.log(`${card.id}: ${ok ? 'gepostet' : 'NICHT gepostet (kein Webhook oder Fehler)'}`);
      if (!ok) continue;
      sent += 1;
      posted = markPosted(posted, card, now);
      await setOpsConfig('community_posted', posted);
    }
    return { cards: cards.length, planned: plan.posts.length, sent };
  });
}

await main();
