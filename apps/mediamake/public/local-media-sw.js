/*
 * MediaMake local media service worker.
 *
 * Serves https://<origin>/__local-media/<id>/<name> from files on this
 * computer, so local media behaves like any other http(s) URL for the
 * Player, thumbnails and the browser renderer. Every other request is left
 * to the network untouched.
 *
 * Files are not read here directly: the page that owns the File System
 * Access handles (LocalMediaProvider) is asked for a File over a
 * MessageChannel. That keeps all permission handling in the page, where the
 * user can be prompted. Byte ranges are honoured so video seeking works.
 *
 * Bump SW_VERSION when changing this file.
 */
const SW_VERSION = 1;
const PREFIX = '/__local-media/';
const FILE_TTL_MS = 60 * 1000;
const RELAY_TIMEOUT_MS = 4000;

const MIME_BY_EXTENSION = {
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo', ogv: 'video/ogg',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml',
};

/**
 * Parses a single-range `Range` header.
 * Returns null (serve the whole file), { start, end } (inclusive), or
 * 'unsatisfiable'. Multi-range requests get the whole file.
 */
function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match) return null;
  const startText = match[1];
  const endText = match[2];
  if (startText === '' && endText === '') return null;
  let start;
  let end;
  if (startText === '') {
    const suffix = Number(endText);
    if (suffix === 0) return 'unsatisfiable';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startText);
    end = endText === '' ? size - 1 : Math.min(Number(endText), size - 1);
  }
  if (size === 0 || start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

function parseLocalPath(pathname) {
  const rest = pathname.slice(PREFIX.length);
  const slash = rest.indexOf('/');
  try {
    return {
      id: decodeURIComponent(slash === -1 ? rest : rest.slice(0, slash)),
      fileName: slash === -1 ? '' : decodeURIComponent(rest.slice(slash + 1)),
    };
  } catch {
    return { id: '', fileName: '' };
  }
}

function guessType(fileName) {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : MIME_BY_EXTENSION[fileName.slice(dot + 1).toLowerCase()] || '';
}

if (
  typeof self !== 'undefined' &&
  typeof ServiceWorkerGlobalScope !== 'undefined' &&
  self instanceof ServiceWorkerGlobalScope
) {
  /** id -> { file, at } — avoids a page round trip per range request. */
  const fileCache = new Map();

  const getCached = (id) => {
    const hit = fileCache.get(id);
    if (!hit) return null;
    if (Date.now() - hit.at > FILE_TTL_MS) {
      fileCache.delete(id);
      return null;
    }
    return hit.file;
  };

  const askClient = (client, id) =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), RELAY_TIMEOUT_MS);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        resolve(event.data || null);
      };
      try {
        client.postMessage({ type: 'local-media:get-file', id }, [channel.port2]);
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });

  const fileFromPages = async (id, clientId) => {
    const candidates = [];
    if (clientId) {
      const own = await self.clients.get(clientId);
      if (own && own.type === 'window') candidates.push(own);
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (!candidates.some((c) => c.id === client.id)) candidates.push(client);
    }
    let error = 'no-page';
    for (const client of candidates) {
      const reply = await askClient(client, id);
      if (reply && reply.file) return { file: reply.file };
      if (reply && reply.error) error = reply.error;
    }
    return { error };
  };

  const errorResponse = (status, code, message) =>
    new Response(JSON.stringify({ error: code, message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Local-Media-Error': code,
      },
    });

  const serve = async (request, clientId) => {
    const url = new URL(request.url);
    const { id, fileName } = parseLocalPath(url.pathname);
    if (!id) return errorResponse(404, 'unknown', 'Missing local media id');

    let file = getCached(id);
    if (!file) {
      const result = await fileFromPages(id, clientId);
      if (!result.file) {
        const code = result.error;
        if (code === 'permission') {
          return errorResponse(403, code, 'Local media needs access again — reconnect it in MediaMake.');
        }
        if (code === 'no-page') {
          return errorResponse(503, code, 'Open MediaMake in this browser to use local media.');
        }
        return errorResponse(404, code, 'This local file is missing — it may have been moved or deleted.');
      }
      file = result.file;
      fileCache.set(id, { file, at: Date.now() });
    }

    const size = file.size;
    const headers = {
      'Content-Type': file.type || guessType(fileName || file.name || '') || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'X-Local-Media': String(SW_VERSION),
    };
    const range = parseRange(request.headers.get('range'), size);
    if (range === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: Object.assign(headers, { 'Content-Range': `bytes */${size}` }),
      });
    }
    const head = request.method === 'HEAD';
    if (range) {
      return new Response(head ? null : file.slice(range.start, range.end + 1), {
        status: 206,
        headers: Object.assign(headers, {
          'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
          'Content-Length': String(range.end - range.start + 1),
        }),
      });
    }
    return new Response(head ? null : file, {
      status: 200,
      headers: Object.assign(headers, { 'Content-Length': String(size) }),
    });
  };

  self.addEventListener('install', (event) => {
    // Only local media goes through this worker; everything else skips it
    // entirely where the static routing API exists (Chrome 123+).
    if (typeof event.addRoutes === 'function') {
      event.waitUntil(
        event
          .addRoutes([
            { condition: { urlPattern: `${PREFIX}*` }, source: 'fetch-event' },
            { condition: { urlPattern: '/*' }, source: 'network' },
          ])
          .catch(() => undefined),
      );
    }
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'local-media:invalidate') {
      if (data.id) fileCache.delete(data.id);
      else fileCache.clear();
    } else if (data.type === 'local-media:claim') {
      event.waitUntil(self.clients.claim());
    }
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET' && request.method !== 'HEAD') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
    event.respondWith(serve(request, event.clientId || event.resultingClientId));
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseRange, parseLocalPath };
}
