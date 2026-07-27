/**
 * Discord-Benachrichtigung (optional). Ohne DISCORD_WEBHOOK_URL ein No-op;
 * wirft nie – Monitoring darf keinen Job zum Scheitern bringen.
 */
import { getSecret } from './env.mts';

export async function notifyDiscord(message: string): Promise<void> {
  const webhook = getSecret('DISCORD_WEBHOOK_URL');
  if (!webhook) return;
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message.slice(0, 1900) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error(`Discord-Webhook: HTTP ${response.status}`);
  } catch (error) {
    console.error(`Discord-Webhook: ${error instanceof Error ? error.message : error}`);
  }
}
