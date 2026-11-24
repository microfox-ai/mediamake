/*
 * A folder on this computer opened by its path, through the dev server (/api/dev-ladder,
 * development only), shaped like a FileSystemDirectoryHandle so the store reads and writes it the
 * way it does a folder from the picker. It lets a review link name the ladder outright
 * (`?path=/Users/…/remaster/v1`) while the app runs locally; the deployed app has no such route and
 * says so. These handles can't be kept in IndexedDB (they aren't real handles).
 */

const API = '/api/dev-ladder';

interface Entry {
  name: string;
  kind: 'file' | 'directory';
  size: number;
  lastModified: number;
}

const notFoundError = (what: string) => new DOMException(`${what} not found`, 'NotFoundError');
const q = (params: Record<string, string>) => `${API}?${new URLSearchParams(params)}`;

export class DevFileHandle {
  readonly kind = 'file' as const;
  constructor(
    readonly folder: string,
    readonly name: string,
  ) {}

  async getFile(): Promise<File> {
    const res = await fetch(q({ path: this.folder, file: this.name }));
    if (res.status === 404) throw notFoundError(this.name);
    if (!res.ok) throw new Error(`Could not read ${this.name} (${res.status})`);
    const lastModified = Number(res.headers.get('X-Last-Modified-Ms')) || Date.now();
    return new File([await res.blob()], this.name, { type: res.headers.get('Content-Type') ?? '', lastModified });
  }

  async createWritable() {
    const parts: BlobPart[] = [];
    const { folder, name } = this;
    return {
      async write(data: Blob | string | ArrayBuffer | ArrayBufferView) {
        parts.push(data as BlobPart);
      },
      async close() {
        const res = await fetch(q({ path: folder, file: name }), { method: 'PUT', body: new Blob(parts) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? `Could not write ${name} (${res.status})`);
      },
      async abort() {},
    };
  }

  async isSameEntry(other: unknown) {
    return other instanceof DevFileHandle && other.folder === this.folder && other.name === this.name;
  }
  async queryPermission(): Promise<PermissionState> {
    return 'granted';
  }
  async requestPermission(): Promise<PermissionState> {
    return 'granted';
  }
}

export class DevDirectoryHandle {
  readonly kind = 'directory' as const;
  readonly name: string;
  constructor(readonly path: string) {
    this.name = path.replace(/\/$/, '').split('/').pop() || path;
  }

  private async list(): Promise<Entry[]> {
    const res = await fetch(q({ path: this.path }));
    if (res.status === 404) throw notFoundError(this.path);
    if (!res.ok) throw new Error(`Could not list ${this.path} (${res.status})`);
    return ((await res.json()) as { entries: Entry[] }).entries;
  }

  async *values(): AsyncGenerator<DevDirectoryHandle | DevFileHandle> {
    for (const e of await this.list()) yield e.kind === 'directory' ? new DevDirectoryHandle(`${this.path}/${e.name}`) : new DevFileHandle(this.path, e.name);
  }
  async *entries(): AsyncGenerator<[string, DevDirectoryHandle | DevFileHandle]> {
    for await (const h of this.values()) yield [h.name, h];
  }
  async *keys(): AsyncGenerator<string> {
    for (const e of await this.list()) yield e.name;
  }

  async getFileHandle(name: string, opts: { create?: boolean } = {}): Promise<DevFileHandle> {
    const entry = (await this.list()).find(e => e.name === name);
    if (entry?.kind === 'directory') throw new DOMException(`${name} is a folder`, 'TypeMismatchError');
    if (!entry && !opts.create) throw notFoundError(name);
    return new DevFileHandle(this.path, name);
  }

  async getDirectoryHandle(name: string, opts: { create?: boolean } = {}): Promise<DevDirectoryHandle> {
    const entry = (await this.list()).find(e => e.name === name);
    if (entry?.kind === 'file') throw new DOMException(`${name} is a file`, 'TypeMismatchError');
    if (!entry) {
      if (!opts.create) throw notFoundError(name);
      const res = await fetch(q({ path: this.path, dir: name }), { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? `Could not create ${name}`);
    }
    return new DevDirectoryHandle(`${this.path}/${name}`);
  }

  async removeEntry(name: string) {
    const res = await fetch(q({ path: this.path, file: name }), { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message ?? `Could not remove ${name}`);
  }

  async resolve(other: DevFileHandle | DevDirectoryHandle): Promise<string[] | null> {
    const otherPath = other instanceof DevFileHandle ? `${other.folder}/${other.name}` : other.path;
    return otherPath.startsWith(`${this.path}/`) ? otherPath.slice(this.path.length + 1).split('/') : null;
  }
  async isSameEntry(other: unknown) {
    return other instanceof DevDirectoryHandle && other.path === this.path;
  }
  async queryPermission(): Promise<PermissionState> {
    return 'granted';
  }
  async requestPermission(): Promise<PermissionState> {
    return 'granted';
  }
}

export const isDevHandle = (h: unknown): h is DevDirectoryHandle => h instanceof DevDirectoryHandle;

/** The folder at an absolute path, or null when the dev server isn't there (the deployed app) or the path isn't a folder. */
export async function openDevFolder(path: string): Promise<{ handle: FileSystemDirectoryHandle; path: string } | { error: 'no-dev-server' | 'not-found' }> {
  const res = await fetch(q({ path })).catch(() => null);
  if (!res) return { error: 'no-dev-server' };
  if (res.status === 404) {
    // the route itself answers 404 outside development: tell the two apart by its JSON
    const body = await res.json().catch(() => null);
    return { error: body?.message === 'Not found' && process.env.NODE_ENV === 'development' ? 'not-found' : 'no-dev-server' };
  }
  if (!res.ok) return { error: 'not-found' };
  const data = (await res.json()) as { path: string };
  return { handle: new DevDirectoryHandle(data.path) as unknown as FileSystemDirectoryHandle, path: data.path };
}

/** The review-link name of a folder opened by its path: its path under ~/Downloads, else its last four folders. */
export function linkNameOf(absPath: string): string {
  const m = /\/Downloads\/(.+)$/.exec(absPath);
  return m ? m[1] : absPath.split('/').filter(Boolean).slice(-4).join('/');
}
