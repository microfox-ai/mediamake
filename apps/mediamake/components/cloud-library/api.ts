import type { DeviceFile, DeviceView } from '@/lib/cloud-library/devices';
import type { ListedCard, RequestView } from '@/lib/cloud-library/listing';
import type { ShareNotes, ShareRole, ShareView } from '@/lib/cloud-library/shares';
import type { CollectionView, EntryAnswer, EntryRow, SpaceOverview, TemplateCard } from '@/lib/cloud-library/view';

/** The Library's routes, as the page calls them. A refusal is thrown with the route's own words. */

export class LibraryError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new LibraryError(json.error ?? `It failed (${res.status})`, res.status);
  return json as T;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const libraryApi = {
  spaces: () => call<{ spaces: SpaceOverview[]; templates: TemplateCard[] }>('/api/library'),
  space: (space: string) => call<SpaceOverview>(`/api/library?space=${space}`),
  newCollection: (space: string, template: string, name?: string) => call<{ collection: CollectionView }>('/api/library', post({ action: 'new-collection', space, template, name })),
  setPrefs: (space: string, collection: string, prefs: string) => call<object>('/api/library', post({ action: 'prefs', space, collection, prefs })),
  setHeadshot: (space: string, collection: string, picture: { sha256?: string; url?: string }) => call<object>('/api/library', post({ action: 'headshot', space, collection, ...picture })),
  /** The grid's columns for everyone in the space (an empty list: the template's). Owners and editors. */
  setColumns: (space: string, collection: string, columns: string[]) => call<{ ok: true; columns: string[] }>('/api/library', post({ action: 'columns', space, collection, columns })),
  fill: (body: { space: string; collection: string; files: { name: string; slot?: string; text?: string }[]; have: Record<string, unknown> }) =>
    call<{ fields?: Record<string, unknown>; notes?: string; unread?: string[]; left?: number; off?: string }>('/api/library/fill', post({ ...body, device: 'web' })),
  list: (query: string) => call<{ total: number; results: EntryRow[] }>(`/api/library/entries?${query}`),
  entry: (space: string, ref: string) => call<EntryAnswer>(`/api/library/entries?space=${space}&ref=${ref}`),
  save: (body: { space: string; collection: string; slug?: string; fields?: Record<string, unknown>; files?: { slot: string; sha256: string; name: string }[]; removeFiles?: { slot: string; sha256: string }[]; rev?: number }) =>
    call<{ ref: string; created: boolean; changed: boolean; warnings: string[] }>('/api/library/entries', post(body)),
  trash: (space: string, ref: string) => call<{ ok: true; title: string }>(`/api/library/entries?space=${space}&ref=${ref}`, { method: 'DELETE' }),
  links: (space: string, ref: string, slot?: string) =>
    call<{ files: { slot: string; name: string; sha256: string; size: number; url: string }[] }>(`/api/library/files?space=${space}&ref=${ref}${slot ? `&slots=${slot}` : ''}&device=web`),
  shares: (space: string, collection: string) => call<{ shares: ShareView[]; since: string }>(`/api/library/shares?space=${space}&collection=${collection}`),
  share: (body: { space: string; collection: string; project?: string; email?: string; role: ShareRole; internal?: boolean }) => call<{ shared: ShareView; invited: boolean }>('/api/library/shares', post({ action: 'share', ...body })),
  unshare: (space: string, collection: string, to: string) => call<object>('/api/library/shares', post({ action: 'unshare', space, collection, to })),
  acceptShare: (space: string, from: string, collection: string) => call<{ as: string; name: string }>('/api/library/shares', post({ action: 'accept', space, from, collection })),
  leaveShare: (space: string, from: string, collection: string) => call<object>('/api/library/shares', post({ action: 'leave', space, from, collection })),
  listed: () => call<{ collections: ListedCard[] }>('/api/library/listed'),
  requests: (space: string, collection: string) => call<{ requests: RequestView[] }>(`/api/library/listed?space=${space}&collection=${collection}`),
  listCollection: (space: string, collection: string, listing: { about: string; rights: string }) => call<{ listed: boolean }>('/api/library/listed', post({ action: 'list', space, collection, ...listing })),
  unlist: (space: string, collection: string) => call<{ listed: boolean }>('/api/library/listed', post({ action: 'unlist', space, collection })),
  requestAccess: (from: string, collection: string, note: string) => call<{ asked: true; of: string }>('/api/library/listed', post({ action: 'request', from, collection, note })),
  withdrawRequest: (from: string, collection: string) => call<object>('/api/library/listed', post({ action: 'withdraw', from, collection })),
  decide: (space: string, collection: string, to: string, yes: boolean) => call<{ accepted: boolean }>('/api/library/listed', post({ action: yes ? 'accept' : 'decline', space, collection, to })),
  notes: (space: string, ref: string) => call<{ notes: ShareNotes }>(`/api/library/shares?space=${space}&notes=${ref}`),
  setNotes: (space: string, ref: string, notes: ShareNotes) => call<{ notes: ShareNotes }>('/api/library/shares', post({ action: 'notes', space, ref, ...notes })),
  devices: (space: string) => call<{ devices: DeviceView[] }>(`/api/library/devices?space=${space}`),
  deviceFiles: (space: string, device: string, ask: { q?: string; kind?: string; where?: string; limit?: number }) => {
    const query = new URLSearchParams({ space, of: device });
    for (const [key, value] of Object.entries(ask)) if (value) query.set(key, String(value));
    return call<{ total: number; results: DeviceFile[] }>(`/api/library/devices?${query}`);
  },
};

/** A browser hashes a file in memory, so past this size a file goes up with `mm library save` instead. */
export const MAX_BROWSER_FILE = 2_000_000_000;

async function sha256Of(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Sends files to a space's storage and answers with each one's SHA-256, in order. A content the
 * space already stores is not sent again. `collection` is named when the files are for an entry, so a
 * shared collection's files go to its owner's storage. `onStep` says what is happening, for the dialog.
 */
export async function uploadFiles(space: string, files: File[], onStep: (text: string) => void, collection?: string): Promise<string[]> {
  const shas: string[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_BROWSER_FILE) throw new Error(`${file.name} is too large to send from the browser: add it from a computer with mm library save`);
    onStep(`Reading ${file.name} (${index + 1} of ${files.length})`);
    shas.push(await sha256Of(file));
  }
  const started = await call<{ uploads: { sha256: string; uploadUrl: string; headers: Record<string, string> }[] }>(
    '/api/library/files',
    post({ action: 'start', space, collection, files: files.map((file, index) => ({ sha256: shas[index], size: file.size, name: file.name, ...(file.type && { contentType: file.type }) })) }),
  );
  for (const [index, upload] of started.uploads.entries()) {
    const file = files[shas.indexOf(upload.sha256)];
    onStep(`Uploading ${file.name} (${index + 1} of ${started.uploads.length})`);
    const put = await fetch(upload.uploadUrl, { method: 'PUT', headers: upload.headers, body: file });
    if (!put.ok) throw new Error(`${file.name}: the upload failed (${put.status})`);
  }
  onStep('Checking the files arrived');
  await call<object>('/api/library/files', post({ action: 'finish', space, collection, sha256s: [...new Set(shas)], device: 'web' }));
  return shas;
}
