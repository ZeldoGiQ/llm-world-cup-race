/**
 * Discord-Benachrichtigungen – zwei Kanäle, zwei Zielgruppen.
 *
 *   notifyOps        → DISCORD_OPS_WEBHOOK_URL   Betrieb: Digest, Fehlerquoten,
 *                                                Feed-Ausfälle, Katalog-Abgleich.
 *   notifyCommunity  → DISCORD_WEBHOOK_URL       Öffentlichkeit: Benchmark-
 *                                                Ergebnisse mit Share-Karte,
 *                                                neue Modelle im Feld.
 *
 * Warum getrennt: Der Community-Server ist eine Bühne, kein Monitoring. Eine
 * Warnung über Fehlerquoten zwischen zwei Ranglisten sieht aus, als wäre der
 * Benchmark kaputt – und sie ist für niemanden dort von Nutzen. Betrieb und
 * Bühne haben deshalb je eine eigene URL; fehlt eine, ist der Kanal still.
 *
 * Beide Funktionen werfen nie – Monitoring darf keinen Job scheitern lassen.
 */
import { getSecret } from './env.mts';

export interface Attachment {
  filename: string;
  data: Buffer | Uint8Array;
  contentType?: string;
}

async function postWebhook(webhook: string, message: string, attachment?: Attachment): Promise<boolean> {
  const content = message.slice(0, 1900);
  try {
    let body: BodyInit;
    let headers: Record<string, string> | undefined;
    if (attachment) {
      // Bild als Anhang, nicht als URL: So hängt der Beitrag nicht davon ab,
      // ob die Seite schon neu ausgeliefert wurde – Discord bekommt genau die
      // Karte, die zu diesen Zahlen gehört.
      const form = new FormData();
      form.append(
        'payload_json',
        JSON.stringify({ content, embeds: [{ image: { url: `attachment://${attachment.filename}` } }] }),
      );
      form.append(
        'files[0]',
        new Blob([attachment.data as BlobPart], { type: attachment.contentType ?? 'image/png' }),
        attachment.filename,
      );
      body = form;
    } else {
      body = JSON.stringify({ content });
      headers = { 'Content-Type': 'application/json' };
    }
    const response = await fetch(webhook, { method: 'POST', headers, body, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      console.error(`Discord-Webhook: HTTP ${response.status} ${(await response.text().catch(() => '')).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Discord-Webhook: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

/** Betriebsmeldung. Ohne DISCORD_OPS_WEBHOOK_URL ein No-op (steht im Job-Log). */
export async function notifyOps(message: string): Promise<boolean> {
  const webhook = getSecret('DISCORD_OPS_WEBHOOK_URL');
  if (!webhook) return false;
  return postWebhook(webhook, message);
}

/** Öffentlicher Beitrag für den Community-Server. Ohne DISCORD_WEBHOOK_URL ein No-op. */
export async function notifyCommunity(message: string, attachment?: Attachment): Promise<boolean> {
  const webhook = getSecret('DISCORD_WEBHOOK_URL');
  if (!webhook) return false;
  return postWebhook(webhook, message, attachment);
}
