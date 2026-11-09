/**
 * cloud: the MediaMake site a channel's team shares through (`media sync`). The site is
 * MEDIAMAKE_API_URL, else `url` in ~/.mediamake/config.json; the API key is MEDIAMAKE_API_KEY, else
 * the one `media cloud login` keeps in the macOS Keychain. The key is never written to the config,
 * printed or put in a URL. A local dev server takes requests without one (its DEV_API_KEY).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { cloudUrl } from './config.ts';

const SERVICE = 'mediamake-api-key';
const accountOf = (url: string) => new URL(url).origin;
export const isLocal = (url: string) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(url).hostname);

export class CloudError extends Error {
  readonly status: number;
  /** the answer was the API's JSON (not a page from a server without the route) */
  readonly json: boolean;
  constructor(message: string, status: number, json = false) {
    super(message);
    this.status = status;
    this.json = json;
  }
}

/** The key `media cloud login` saved for this site, if any (macOS only). */
export const keychainKey = (url: string) => {
  if (process.platform !== 'darwin') return undefined;
  const r = spawnSync('security', ['find-generic-password', '-s', SERVICE, '-a', accountOf(url), '-w'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() || undefined : undefined;
};

/** Save the key in the Keychain. It goes in on stdin (`security -i`), never on a command line `ps` would show. */
export const saveKeychainKey = (url: string, key: string) => {
  if (process.platform !== 'darwin') throw new Error('media cloud login keeps the key in the macOS Keychain; elsewhere set MEDIAMAKE_API_KEY');
  const q = (s: string) => `"${s.replace(/(["\\])/g, '\\$1')}"`;
  const r = spawnSync('security', ['-i'], { input: `add-generic-password -U -s ${SERVICE} -a ${q(accountOf(url))} -l ${q('MediaMake API key')} -w ${q(key)}\n`, encoding: 'utf8' });
  if (r.status !== 0 || /error/i.test(r.stderr)) throw new Error('The Keychain refused to save the key');
};

export const deleteKeychainKey = (url: string) => process.platform === 'darwin' && spawnSync('security', ['delete-generic-password', '-s', SERVICE, '-a', accountOf(url)], { stdio: 'ignore' }).status === 0;

/** Where the key comes from, never the key. */
export const keySource = (url: string) => (process.env.MEDIAMAKE_API_KEY?.trim() ? 'MEDIAMAKE_API_KEY' : keychainKey(url) ? 'Keychain' : isLocal(url) ? 'none (local dev server)' : null);

export type Cloud = ReturnType<typeof connect>;

export const connect = (opts: { url?: string; key?: string } = {}) => {
  const url = (opts.url ?? cloudUrl())?.replace(/\/+$/, '');
  if (!url) throw new Error('No MediaMake site yet: run media cloud login --url=<your MediaMake site>, or set MEDIAMAKE_API_URL');
  const key = opts.key ?? (process.env.MEDIAMAKE_API_KEY?.trim() || keychainKey(url));
  if (!key && !isLocal(url)) throw new Error(`Not signed in to ${url}: run media cloud login (or set MEDIAMAKE_API_KEY)`);

  const request = async <T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', route: string, opts: { query?: Record<string, string | undefined>; body?: unknown; timeoutMs?: number } = {}): Promise<T> => {
    const u = new URL(route, `${url}/`);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== '') u.searchParams.set(k, v);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await fetch(u, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000) });
    } catch (err) {
      throw new CloudError(`${url} didn't answer (${err instanceof Error ? err.message : err})`, 0);
    }
    const text = await res.text();
    let data: unknown = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const json = !!data && typeof data === 'object';
      const detail = json ? ((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message) : undefined;
      throw new CloudError(`${method} ${route} answered ${res.status}${detail ? `: ${detail}` : ''}`, res.status, json);
    }
    return data as T;
  };

  return {
    url,
    get: <T = any>(route: string, query?: Record<string, string | undefined>) => request<T>('GET', route, { query }),
    put: <T = any>(route: string, body: unknown) => request<T>('PUT', route, { body }),
    /** timeoutMs for a route that works before it answers (starting a Lambda render takes minutes) */
    post: <T = any>(route: string, body: unknown, timeoutMs?: number) => request<T>('POST', route, { body, timeoutMs }),
    del: <T = any>(route: string, query?: Record<string, string | undefined>) => request<T>('DELETE', route, { query }),
    /** PUT a file to a presigned storage URL (signed public-read, so the header must match). */
    upload: async (uploadUrl: string, file: string, contentType: string) => {
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType, 'x-amz-acl': 'public-read' }, body: await fs.promises.readFile(file) });
      if (!res.ok) throw new CloudError(`storage answered ${res.status}`, res.status);
    },
    /** A public file into dest, through a temp file beside it. */
    download: async (fileUrl: string, dest: string) => {
      const res = await fetch(fileUrl, { signal: AbortSignal.timeout(30 * 60_000) });
      if (!res.ok || !res.body) throw new CloudError(`${new URL(fileUrl).host} answered ${res.status}`, res.status);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.${process.pid}.part`;
      try {
        await pipeline(Readable.fromWeb(res.body as never), fs.createWriteStream(tmp));
        fs.renameSync(tmp, dest);
      } finally {
        fs.rmSync(tmp, { force: true });
      }
    },
  };
};

/** Read a key typed at the terminal without showing it, or piped in. */
export const readSecret = async (prompt: string) => {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    let text = '';
    for await (const chunk of stdin) text += chunk;
    return text.trim();
  }
  process.stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise<string>((resolve, reject) => {
    let text = '';
    const done = (err?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
      process.stdout.write('\n');
      if (err) reject(err);
      else resolve(text.trim());
    };
    const onData = (s: string) => {
      for (const ch of s) {
        if (ch === '\r' || ch === '\n') return done();
        if (ch === '\u0003') return done(new Error('cancelled'));
        if (ch === '\u007f' || ch === '\b') text = text.slice(0, -1);
        else text += ch;
      }
    };
    stdin.on('data', onData);
  });
};
