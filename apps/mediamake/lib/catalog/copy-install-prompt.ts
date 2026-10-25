'use client';

/**
 * Copies an item's install prompt with a fresh install code in it, so Claude
 * won't need the person's API key. Falls back to the plain prompt when no
 * code can be made (signed out, offline).
 *
 * The clipboard write starts inside the click (ClipboardItem with a promise)
 * because Safari refuses writes that begin after an await.
 */
export async function copyInstallPrompt(itemId: string, fallbackPrompt: string): Promise<void> {
  const prompt = fetch('/api/catalog/install-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: itemId }),
  })
    .then(res => (res.ok ? res.json() : null))
    .then(json => (typeof json?.prompt === 'string' ? json.prompt : fallbackPrompt))
    .catch(() => fallbackPrompt);

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': prompt.then(text => new Blob([text], { type: 'text/plain' })) }),
      ]);
      return;
    } catch {
      // Some browsers don't take a promise here; try the plain way.
    }
  }
  await navigator.clipboard.writeText(await prompt);
}
