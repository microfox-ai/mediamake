/**
 * Local media URLs.
 *
 * A local file is referenced in timeline JSON as an ordinary same-origin URL:
 *
 *   https://<app-origin>/__local-media/<id>/<encoded file name>
 *
 * The local-media service worker (public/local-media-sw.js) answers these
 * requests from the file on disk, so the Player, the web renderer, thumbnail
 * and duration probes all treat it like any other http(s) media. The id is
 * stable across relinks, so saved timelines keep working when a file moves.
 * Nothing outside this browser can fetch it — Lambda renders must not see it.
 */

export const LOCAL_MEDIA_PATH_PREFIX = '/__local-media/';

/** `_id` prefix for local items surfaced as MediaFile-shaped objects. */
export const LOCAL_MEDIA_ID_PREFIX = 'local:';

export interface LocalMediaRef {
  id: string;
  fileName: string;
  url: string;
}

export function buildLocalMediaUrl(origin: string, id: string, fileName: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}${LOCAL_MEDIA_PATH_PREFIX}${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;
}

export function parseLocalMediaUrl(url: string): { id: string; fileName: string } | null {
  if (typeof url !== 'string') return null;
  const at = url.indexOf(LOCAL_MEDIA_PATH_PREFIX);
  if (at === -1) return null;
  const rest = url.slice(at + LOCAL_MEDIA_PATH_PREFIX.length).split(/[?#]/)[0];
  const slash = rest.indexOf('/');
  const rawId = slash === -1 ? rest : rest.slice(0, slash);
  if (!rawId) return null;
  try {
    return {
      id: decodeURIComponent(rawId),
      fileName: slash === -1 ? '' : decodeURIComponent(rest.slice(slash + 1)),
    };
  } catch {
    return null;
  }
}

export function isLocalMediaUrl(value: unknown): value is string {
  return typeof value === 'string' && parseLocalMediaUrl(value) !== null;
}

// Absolute or root-relative; stops at characters that end a JSON string or URL.
const LOCAL_URL_PATTERN = /(?:https?:\/\/[^\s"'\\<>/]+)?\/__local-media\/[^\s"'\\<>]+/g;

/**
 * Every distinct local media URL in a JSON string (or any value, which is
 * stringified). Cheap enough to run on each inputProps change.
 */
export function findLocalMediaRefs(json: unknown): LocalMediaRef[] {
  const text = typeof json === 'string' ? json : JSON.stringify(json ?? null);
  if (!text || !text.includes(LOCAL_MEDIA_PATH_PREFIX)) return [];
  const byId = new Map<string, LocalMediaRef>();
  for (const match of text.matchAll(LOCAL_URL_PATTERN)) {
    const url = match[0];
    const parsed = parseLocalMediaUrl(url);
    if (parsed && !byId.has(parsed.id)) {
      byId.set(parsed.id, { id: parsed.id, fileName: parsed.fileName, url });
    }
  }
  return [...byId.values()];
}

export function containsLocalMedia(json: unknown): boolean {
  return findLocalMediaRefs(json).length > 0;
}

/**
 * Replaces local media URLs by id. Every URL form of a replaced id is
 * swapped (any origin), others are left alone.
 */
export function replaceLocalMediaUrls(json: string, replacements: Map<string, string>): string {
  if (replacements.size === 0 || !json.includes(LOCAL_MEDIA_PATH_PREFIX)) return json;
  return json.replace(LOCAL_URL_PATTERN, (url) => {
    const parsed = parseLocalMediaUrl(url);
    const next = parsed ? replacements.get(parsed.id) : undefined;
    return next ?? url;
  });
}
