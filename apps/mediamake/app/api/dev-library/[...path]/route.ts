import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ path: string[] }> };

const TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

const notFound = () => Response.json({ message: 'Not found' }, { status: 404 });
const expandHome = (p: string) => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

/** The library named in ~/.mediamake/config.json (MEDIAMAKE_CONFIG points at another file), as the media CLI reads it. */
async function configuredRoot(): Promise<string | null> {
  const file = process.env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');
  try {
    const library = JSON.parse(await fs.readFile(file, 'utf8'))?.library;
    if (!library || typeof library !== 'object') return null;
    return path.resolve(expandHome(typeof library.root === 'string' && library.root.trim() ? library.root.trim() : '~/Downloads/_LIBRARY'));
  } catch {
    return null;
  }
}

/**
 * The media library's export and thumbnails for the public /library page, read on this computer
 * (development only, like dev-lyrics): the library in ~/.mediamake/config.json, or `?root=` (an
 * absolute path, e.g. a test fixture). It serves <root>/.catalog/export/<name>.json and
 * <root>/.catalog/thumbs/**, read-only, and nothing else: edits go through the folder the viewer
 * picks on the page.
 */
export async function GET(request: NextRequest, { params }: Params) {
  if (process.env.NODE_ENV !== 'development') return notFound();
  const asked = request.nextUrl.searchParams.get('root');
  const root = asked ? (path.isAbsolute(asked) && !asked.includes('\0') ? path.resolve(asked) : null) : await configuredRoot();
  if (!root) return notFound();

  const parts = (await params).path;
  const ok = (parts[0] === 'export' && parts.length === 2 && /^[a-z0-9-]+\.json$/.test(parts[1])) || (parts[0] === 'thumbs' && parts.length >= 2 && parts.every(p => p && p !== '..' && p !== '.' && !p.includes('\0')));
  if (!ok) return notFound();
  const catalog = path.join(root, '.catalog');
  const abs = path.resolve(catalog, ...parts);
  if (!abs.startsWith(path.join(catalog, parts[0]) + path.sep)) return notFound();

  // a root given in the URL must be a library: its export says so
  if (asked) {
    const meta = await fs.readFile(path.join(catalog, 'export', 'meta.json'), 'utf8').catch(() => '');
    if (!meta.includes('"mediamake.library-export/v1"')) return notFound();
  }

  const stat = await fs.stat(abs).catch(() => null);
  if (!stat?.isFile()) return notFound();
  return new Response(new Uint8Array(await fs.readFile(abs)), {
    headers: {
      'Content-Type': TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': parts[0] === 'export' ? 'no-store' : 'private, max-age=300',
    },
  });
}
