/**
 * bundles: a project's productions and releases, saved and fetched from a computer or a cloud session
 * without an MCP (mm run uses it; apps/mediamake/docs/cloud-device-runs.md › The run record). The same calls and the same
 * layout as the MediaMake Spaces MCP's create_production / create_release
 * (packages/projectsync-mcp/src/files.ts): keep the two in step.
 *
 *   a production   code/<the project's files>   input/<its input folder, up to 200 MB in all>
 *                  output/<its renders>
 *   a release      the release kit folder, as it is
 *
 * Saving lists every file with its sha256, uploads only the ones the bundle doesn't have yet, and makes
 * a new version; when nothing changed there is no new version. Fetching writes a version into folders
 * here and never replaces a file that differs unless asked to (the one here is kept beside it).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const MB = 1_000_000;
/** A production carries its inputs only while they come to this much in all (the server checks too). */
export const INPUT_LIMIT_BYTES = 200 * MB;
export const MAX_FILES = 2000;
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.turbo', '.venv', '__pycache__', 'dist']);
const INPUT_DIRS = new Set(['input', 'inputs']);
const ROUTE = { production: '/api/project/productions', release: '/api/project/releases' };
const AT_ONCE = 4;
const TIMEOUT_MS = 30000;

/** Every file under a folder, as [{ abs, rel }] with forward slashes: no hidden files, no tooling folders. */
export function walk(root) {
  const out = [];
  const visit = rel => {
    let entries = [];
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(child);
      } else if (entry.isFile()) out.push({ abs: path.join(root, child), rel: child, size: fs.statSync(path.join(root, child)).size });
    }
  };
  visit('');
  return out;
}

/** What a production holds: the project's code, its input folder while small enough, and its renders. */
export function productionFiles({ code, outputs }) {
  const files = [];
  const inputs = [];
  for (const file of code ? walk(code) : []) {
    const parts = file.rel.split('/');
    if (parts.length > 1 && INPUT_DIRS.has(parts[0].toLowerCase())) inputs.push({ abs: file.abs, path: `input/${parts.slice(1).join('/')}`, role: 'input', size: file.size });
    else files.push({ abs: file.abs, path: `code/${file.rel}`, role: 'code', size: file.size });
  }
  for (const file of outputs ? walk(outputs) : []) files.push({ abs: file.abs, path: `output/${file.rel}`, role: 'output', size: file.size });
  const inputBytes = inputs.reduce((sum, file) => sum + file.size, 0);
  const withInputs = inputBytes <= INPUT_LIMIT_BYTES;
  return { files: withInputs ? [...files, ...inputs] : files, ...(inputs.length && !withInputs && { leftOut: { files: inputs.length, mb: Math.round(inputBytes / MB) } }) };
}

/** A release kit: its folder as it is. */
export const releaseFiles = folder => walk(folder).map(file => ({ abs: file.abs, path: file.rel, role: 'file', size: file.size }));

export function sha256File(abs) {
  return new Promise((done, failed) => {
    const hash = createHash('sha256');
    fs.createReadStream(abs).on('data', chunk => hash.update(chunk)).on('error', failed).on('end', () => done(hash.digest('hex')));
  });
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
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

/** One call to MediaMake. A refusal is thrown with the server's words; 404 is null when `missingOk`. */
async function api(at, method, route, { query, body, missingOk = false } = {}) {
  const url = new URL(`${at.url}${route}`);
  for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
  const res = await fetch(url, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${at.key}`, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404 && missingOk) return null;
  if (!res.ok && !(res.status === 409 && data.missing)) throw new Error(data.error ?? `${route} answered ${res.status}`);
  return data;
}

/** A production or release of a project by its slug, or null. `links` adds an hour's link to each file. */
export const readBundle = (at, kind, { projectId, slug, version, links = false }) => api(at, 'GET', ROUTE[kind], { query: { projectId, slug, version, links: links ? 1 : undefined }, missingOk: true });

/**
 * Saves files as a new version of a production or release (made when the project has none by that
 * slug). Returns { id, version, uploaded, reused, unchanged }: `unchanged` when the latest version
 * already holds exactly these files, so nothing was sent.
 */
export async function saveBundle(at, kind, { projectId, slug, title, files, note, platform, productionId }) {
  if (!files.length) throw new Error(`Nothing to save for ${slug}: the folders hold no files`);
  if (files.length > MAX_FILES) throw new Error(`${slug} has ${files.length} files: a ${kind} holds at most ${MAX_FILES}. Leave caches and working files out of its folders.`);
  const listed = await mapLimit(files, AT_ONCE, async file => ({ ...file, sha256: await sha256File(file.abs) }));
  const have = await readBundle(at, kind, { projectId, slug });
  if (have?.files?.length === listed.length) {
    const stored = new Map(have.files.map(file => [file.path, file.sha256]));
    if (listed.every(file => stored.get(file.path) === file.sha256)) return { id: have.id, version: have.version ?? have.latestVersion, uploaded: 0, reused: listed.length, unchanged: true };
  }
  const body = { projectId, files: listed.map(file => ({ path: file.path, role: file.role, size: file.size, sha256: file.sha256 })), ...(note && { note }), ...(kind === 'release' && { ...(platform && { platform }), ...(productionId && { productionId }) }) };
  const started = have ? await api(at, 'PUT', ROUTE[kind], { body: { ...body, id: have.id } }) : await api(at, 'POST', ROUTE[kind], { body: { ...body, slug, ...(title && { title }) } });
  const byPath = new Map(listed.map(file => [file.path, file]));
  await mapLimit(started.uploads, AT_ONCE, async upload => {
    const file = byPath.get(upload.path);
    const res = await fetch(upload.uploadUrl, { method: 'PUT', headers: upload.headers, body: await fs.openAsBlob(file.abs) });
    if (!res.ok) throw new Error(`${upload.path} could not be uploaded: storage answered ${res.status}`);
  });
  const finished = await api(at, 'POST', `${ROUTE[kind]}/finish`, { body: started.finish });
  if (finished.ready === false) throw new Error(`${slug}: ${finished.missing.length} files did not arrive (${finished.missing.slice(0, 3).map(m => m.path).join(', ')}). Save it again: the rest is kept.`);
  return { id: started.id, version: started.version, uploaded: started.uploads.length, reused: started.reused.length };
}

/**
 * Writes a version's files into folders here. `placeOf(path)` says where a file of the bundle goes
 * (null: not wanted). A file already here with the same content is left alone. One that differs is
 * never replaced unless `takeSaved`: then the one here is first moved into `backup(abs)`.
 * Returns { saved, unchanged, differ } (`differ`: the files here that differ and were kept). `dry` only
 * looks: nothing is written.
 */
export async function fetchBundle(record, placeOf, { takeSaved = false, backup, dry = false } = {}) {
  const jobs = [];
  const differ = [];
  let unchanged = 0;
  for (const file of record.files ?? []) {
    const dest = placeOf(file.path);
    if (!dest) continue;
    const there = fs.statSync(dest, { throwIfNoEntry: false });
    if (there?.isFile()) {
      if (there.size === file.size && (await sha256File(dest)) === file.sha256) {
        unchanged += 1;
        continue;
      }
      differ.push(dest);
      if (!takeSaved) continue;
    }
    jobs.push({ file, dest, replace: !!there });
  }
  if (dry || (differ.length && !takeSaved)) return { saved: 0, unchanged, differ };
  await mapLimit(jobs, AT_ONCE, async ({ file, dest, replace }) => {
    if (replace && backup) {
      const kept = backup(dest);
      fs.mkdirSync(path.dirname(kept), { recursive: true });
      fs.renameSync(dest, kept);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const res = await fetch(file.url);
    if (!res.ok || !res.body) throw new Error(`${file.path} could not be fetched: storage answered ${res.status}`);
    // through a temporary file, so a broken download never leaves half a file
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(`${dest}.part`));
    fs.renameSync(`${dest}.part`, dest);
  });
  return { saved: jobs.length, unchanged, differ: takeSaved ? differ : [] };
}

/** Where a production's files go in a workspace: code/ and input/ in projects/<slug>, output/ in out/<slug>. */
export const productionPlace = (work, slug) => file => {
  const [top, ...rest] = file.split('/');
  if (!rest.length || rest.includes('..')) return null;
  if (top === 'code') return path.join(work, 'projects', slug, ...rest);
  if (top === 'input') return path.join(work, 'projects', slug, 'input', ...rest);
  if (top === 'output') return path.join(work, 'out', slug, ...rest);
  return null;
};

/** Where a release kit's files go: its folder in the workspace. */
export const releasePlace = (work, folder) => file => (file.split('/').includes('..') ? null : path.join(work, ...folder.split('/'), ...file.split('/')));
