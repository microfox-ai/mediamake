import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';

export const MB = 1_000_000;
/** A production carries its inputs only while they come to this much in all (the server checks too). */
export const INPUT_LIMIT_BYTES = 200 * MB;

export type FileRole = 'code' | 'output' | 'input' | 'file';

export interface LocalFile {
  /** Where it is on this computer. */
  abs: string;
  /** Where it goes in the bundle, with forward slashes. */
  path: string;
  role: FileRole;
  size: number;
}

/** Never uploaded: tooling, caches and hidden files. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.turbo', '.venv', '__pycache__', 'dist']);
/** A folder by these names inside a production's code is its inputs. */
const INPUT_DIRS = new Set(['input', 'inputs']);

const toSlash = (p: string) => p.split(sep).join('/');

async function walk(root: string, visit: (abs: string, rel: string, size: number) => void, rel = ''): Promise<void> {
  const here = join(root, rel);
  for (const entry of await readdir(here, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const childRel = rel ? join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(root, visit, childRel);
    } else if (entry.isFile()) {
      visit(join(root, childRel), childRel, (await stat(join(root, childRel))).size);
    }
  }
}

/**
 * Lists files under `paths` (files or folders) for one role, as they go in the bundle:
 * `<prefix>/<path in its folder>` (with the folder's name in between when several folders share
 * the prefix). `splitInputs` moves a folder named input/ or inputs/ to the `input` role.
 */
export async function collect(
  paths: string[],
  role: FileRole,
  options: { prefix?: string; splitInputs?: boolean } = {},
): Promise<LocalFile[]> {
  const files: LocalFile[] = [];
  const many = paths.length > 1;
  for (const raw of paths) {
    const abs = resolve(raw);
    const info = await stat(abs).catch(() => null);
    if (!info) throw new Error(`Not found: ${raw}`);
    const join2 = (...parts: (string | undefined)[]) => parts.filter(Boolean).join('/');
    if (info.isFile()) {
      files.push({ abs, path: join2(options.prefix, basename(abs)), role, size: info.size });
      continue;
    }
    const folder = many ? basename(abs) : undefined;
    await walk(abs, (fileAbs, rel, size) => {
      const parts = toSlash(rel).split('/');
      if (options.splitInputs && parts.length > 1 && INPUT_DIRS.has(parts[0].toLowerCase())) {
        files.push({ abs: fileAbs, path: join2('input', folder, parts.slice(1).join('/')), role: 'input', size });
      } else {
        files.push({ abs: fileAbs, path: join2(options.prefix, folder, parts.join('/')), role, size });
      }
    });
  }
  return files;
}

/** What a production uploads: its code and outputs always, its inputs only up to the 200 MB limit. */
export async function productionFiles(args: { code?: string[]; outputs?: string[]; inputs?: string[]; includeInputs?: boolean }) {
  const code = await collect(args.code ?? [], 'code', { prefix: 'code', splitInputs: true });
  const outputs = await collect(args.outputs ?? [], 'output', { prefix: 'output' });
  const inputs = [...code.filter(f => f.role === 'input'), ...(await collect(args.inputs ?? [], 'input', { prefix: 'input' }))];
  const inputBytes = inputs.reduce((sum, f) => sum + f.size, 0);
  const includeInputs = args.includeInputs !== false && inputBytes <= INPUT_LIMIT_BYTES;
  const files = [...code.filter(f => f.role !== 'input'), ...outputs, ...(includeInputs ? inputs : [])];
  return {
    files: dedupePaths(files),
    inputs: {
      files: inputs.length,
      bytes: inputBytes,
      included: includeInputs && inputs.length > 0,
      ...(inputs.length && !includeInputs
        ? {
            why:
              args.includeInputs === false
                ? 'left out, as asked'
                : `left out: they come to ${Math.round(inputBytes / MB)} MB and a production carries its inputs only up to ${INPUT_LIMIT_BYTES / MB} MB in all. Upload the ones that matter as media.`,
          }
        : {}),
    },
  };
}

/** A release kit: a folder as it is, plus single files at its top. */
export async function releaseFiles(args: { folder?: string; files?: string[] }) {
  const files = [...(args.folder ? await collect([args.folder], 'file') : []), ...(await collect(args.files ?? [], 'file'))];
  return dedupePaths(files);
}

function dedupePaths(files: LocalFile[]): LocalFile[] {
  const seen = new Map<string, LocalFile>();
  for (const f of files) {
    if (seen.has(f.path) && seen.get(f.path)!.abs !== f.abs) throw new Error(`Two files would both go to ${f.path}: ${seen.get(f.path)!.abs} and ${f.abs}`);
    seen.set(f.path, f);
  }
  return [...seen.values()];
}

export async function sha256File(abs: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(abs), hash);
  return hash.digest('hex');
}

/** Runs `fn` over `items`, `limit` at a time. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

function send(url: string, options: { method: string; headers?: Record<string, string | number> }, body?: () => NodeJS.ReadableStream): Promise<IncomingMessage> {
  const target = new URL(url);
  const request = target.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((done, failed) => {
    const req = request(target, { method: options.method, headers: options.headers }, done);
    req.on('error', failed);
    if (body) body().pipe(req);
    else req.end();
  });
}

async function readAll(res: IncomingMessage): Promise<string> {
  let text = '';
  for await (const chunk of res) text += chunk;
  return text;
}

/** PUTs a file to a signed link, streamed (files can be gigabytes), with the headers it was signed with. */
export async function putFile(uploadUrl: string, abs: string, size: number, headers: Record<string, string>) {
  const res = await send(uploadUrl, { method: 'PUT', headers: { ...headers, 'Content-Length': size } }, () => createReadStream(abs));
  if ((res.statusCode ?? 500) >= 300) throw new Error(`storage answered ${res.statusCode}: ${(await readAll(res)).slice(0, 300)}`);
  res.resume();
}

/** Downloads a link to `dest`, through a temporary file so a broken download never leaves half a file. */
export async function downloadFile(url: string, dest: string) {
  await mkdir(dirname(dest), { recursive: true });
  const res = await send(url, { method: 'GET' });
  if ((res.statusCode ?? 500) >= 300) throw new Error(`storage answered ${res.statusCode}: ${(await readAll(res)).slice(0, 300)}`);
  const part = `${dest}.part`;
  await pipeline(res, createWriteStream(part));
  await rename(part, dest);
}

/** A bundle path joined under a folder, refusing anything that would land outside it. */
export function within(folder: string, path: string): string {
  const root = resolve(folder);
  const target = resolve(root, path);
  if (relative(root, target).startsWith('..')) throw new Error(`${path} would land outside ${folder}`);
  return target;
}
