import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/*
 * A ladder folder opened by its path on the public /remaster-revision page (development only,
 * like dev-lyrics and dev-library): the dev server runs on the user's own computer, so a review
 * link can name the folder instead of asking for the folder picker. It lists a folder, serves its
 * files, and writes only what the screen writes: rev-NNN.json / .md inside a `<folder>.revisions`
 * subfolder (created on demand). Only paths under the home folder; nothing is run or deleted
 * outside a .revisions folder.
 */

const TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff',
};

const REVISION_FILE = /^rev-\d+\.(json|md)$/;
const notFound = () => Response.json({ message: 'Not found' }, { status: 404 });
const bad = (message: string) => Response.json({ message }, { status: 400 });

/** An absolute folder path under the home folder, or null. */
function folderOf(request: NextRequest): string | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const asked = request.nextUrl.searchParams.get('path') ?? '';
  if (!asked || !path.isAbsolute(asked) || asked.includes('\0')) return null;
  const abs = path.resolve(asked);
  const home = os.homedir();
  return abs === home || abs.startsWith(home + path.sep) ? abs : null;
}

const safeName = (name: string | null): name is string => !!name && !name.includes('/') && !name.includes('\\') && !name.includes('\0') && name !== '.' && name !== '..';

/** `?path=<folder>` lists it; `&file=<name>` serves that file. */
export async function GET(request: NextRequest) {
  const folder = folderOf(request);
  if (!folder) return notFound();
  const file = request.nextUrl.searchParams.get('file');
  if (file !== null) {
    if (!safeName(file)) return bad('Bad file name');
    const abs = path.join(folder, file);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat?.isFile()) return notFound();
    const data = await fs.readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Last-Modified': stat.mtime.toUTCString(),
        'X-Last-Modified-Ms': String(Math.round(stat.mtimeMs)),
        'Cache-Control': 'no-store',
      },
    });
  }
  const stat = await fs.stat(folder).catch(() => null);
  if (!stat?.isDirectory()) return notFound();
  const entries = [];
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const s = await fs.stat(path.join(folder, entry.name)).catch(() => null);
    if (!s) continue;
    entries.push({ name: entry.name, kind: entry.isDirectory() ? 'directory' : 'file', size: s.size, lastModified: Math.round(s.mtimeMs) });
  }
  return Response.json({ name: path.basename(folder), path: folder, entries });
}

/** Creates `<folder>/<dir>`, a .revisions folder only. */
export async function POST(request: NextRequest) {
  const folder = folderOf(request);
  if (!folder) return notFound();
  const dir = request.nextUrl.searchParams.get('dir');
  if (!safeName(dir) || !dir.endsWith('.revisions')) return bad('Only a <folder>.revisions folder can be created');
  await fs.mkdir(path.join(folder, dir), { recursive: true });
  return Response.json({ created: path.join(folder, dir) });
}

/** Writes `<folder>/<file>`: a rev-NNN.json or .md inside a .revisions folder only. */
export async function PUT(request: NextRequest) {
  const folder = folderOf(request);
  if (!folder) return notFound();
  const file = request.nextUrl.searchParams.get('file');
  if (!path.basename(folder).endsWith('.revisions') || !safeName(file) || !REVISION_FILE.test(file)) return bad('Only rev-NNN.json / .md inside a .revisions folder can be written');
  const abs = path.join(folder, file);
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, new Uint8Array(await request.arrayBuffer()));
  await fs.rename(tmp, abs);
  const stat = await fs.stat(abs);
  return Response.json({ lastModified: Math.round(stat.mtimeMs) });
}

/** Removes a file inside a .revisions folder only (a pin crop; the screen never deletes audio). */
export async function DELETE(request: NextRequest) {
  const folder = folderOf(request);
  if (!folder) return notFound();
  const file = request.nextUrl.searchParams.get('file');
  if (!path.basename(folder).endsWith('.revisions') || !safeName(file)) return bad('Only files inside a .revisions folder can be removed');
  await fs.rm(path.join(folder, file), { force: true });
  return Response.json({ removed: file });
}
