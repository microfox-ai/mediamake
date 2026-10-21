/**
 * Page side of the local media service worker (public/local-media-sw.js):
 * registers it, makes sure it controls this page, and answers its requests
 * for files.
 */

const SW_URL = '/local-media-sw.js';

export type LocalMediaWorkerState = 'unsupported' | 'starting' | 'ready' | 'needs-reload' | 'failed';

export type FileRelayAnswer = { file: File } | { error: 'missing' | 'permission' | 'unknown' };

function waitForController(timeoutMs: number): Promise<boolean> {
  if (navigator.serviceWorker.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(Boolean(navigator.serviceWorker.controller));
    }, timeoutMs);
    const onChange = () => {
      clearTimeout(timer);
      resolve(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange, { once: true });
  });
}

/**
 * Registers the worker and waits until it controls this page. A hard reload
 * (Shift+Reload) opts the page out of service workers, so ask the worker to
 * claim it; if that doesn't take, the page needs a normal reload.
 */
export async function startLocalMediaWorker(): Promise<LocalMediaWorkerState> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    if (navigator.serviceWorker.controller) return 'ready';
    // First visit: the worker claims open pages when it activates.
    // Shift+Reload: it is already active, so ask it to claim this page.
    const ready = await navigator.serviceWorker.ready;
    (ready.active ?? registration.active)?.postMessage({ type: 'local-media:claim' });
    return (await waitForController(3000)) ? 'ready' : 'needs-reload';
  } catch (err) {
    console.warn('[local-media] service worker registration failed', err);
    return 'failed';
  }
}

/** Answers the worker's file requests. Returns an unsubscribe function. */
export function installFileRelay(resolveFile: (id: string) => Promise<FileRelayAnswer>): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => undefined;
  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== 'local-media:get-file') return;
    const port = event.ports[0];
    if (!port) return;
    resolveFile(String(data.id))
      .catch((): FileRelayAnswer => ({ error: 'unknown' }))
      .then((answer) => port.postMessage(answer));
  };
  navigator.serviceWorker.addEventListener('message', onMessage);
  // Messages sent before this listener existed are queued until this call.
  navigator.serviceWorker.startMessages?.();
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}

/** Drops the worker's cached File for `id` (or all) after a relink/removal. */
export function invalidateLocalMediaCache(id?: string): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: 'local-media:invalidate', id });
}
