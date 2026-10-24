import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  contentTypeFor,
  EDITS_PATH,
  isDevFilesEnabled,
  notFound,
  resolveLyricsPath,
} from '@/lib/remotion-editor/server/lyrics-fs';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ path: string[] }> };

const relFrom = async (params: Params['params']) => (await params).path.join('/');

/**
 * Serves any file under apps/lyrics_videos (development only): what staticFile() resolves to in
 * /remotion-editor. Supports Range requests, which audio and video seeking needs.
 */
async function serve(request: Request, params: Params['params'], head: boolean) {
  if (!isDevFilesEnabled()) return notFound();
  const abs = resolveLyricsPath(await relFrom(params));
  const stat = abs ? await fs.stat(abs).catch(() => null) : null;
  if (!abs || !stat?.isFile()) return notFound();

  const etag = `W/"${stat.size}-${Math.round(stat.mtimeMs)}"`;
  const headers: Record<string, string> = {
    'Content-Type': contentTypeFor(abs),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    ETag: etag,
  };
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  let start = 0;
  let end = stat.size - 1;
  let status = 200;
  const range = request.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && stat.size > 0) {
    if (range[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(Number(range[2]), end);
    } else if (range[2]) {
      start = Math.max(0, stat.size - Number(range[2]));
    }
    if (start > end || start >= stat.size) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${stat.size}` },
      });
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length'] = String(stat.size === 0 ? 0 : end - start + 1);

  if (head || stat.size === 0) return new Response(null, { status, headers });
  const body = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream;
  return new Response(body, { status, headers });
}

export function GET(request: Request, { params }: Params) {
  return serve(request, params, false);
}

export function HEAD(request: Request, { params }: Params) {
  return serve(request, params, true);
}

/** Writes projects/<slug>/video/edits.json, the only file the editor may change. */
export async function PUT(request: Request, { params }: Params) {
  if (!isDevFilesEnabled()) return notFound();
  const rel = await relFrom(params);
  const abs = EDITS_PATH.test(rel) ? resolveLyricsPath(rel) : null;
  if (!abs) {
    return Response.json({ message: 'Only video/edits.json can be written' }, { status: 403 });
  }
  const videoDir = path.dirname(abs);
  if (!(await fs.stat(videoDir).catch(() => null))?.isDirectory()) return notFound();

  const text = await request.text();
  try {
    const parsed = JSON.parse(text) as { schema?: unknown };
    if (parsed.schema !== 'lyrics_videos.edits/v1') throw new Error('wrong schema');
  } catch {
    return Response.json({ message: 'Not a lyrics_videos.edits/v1 document' }, { status: 400 });
  }
  // write beside, then rename, so a render never reads half a file
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
  await fs.rename(tmp, abs);
  const stat = await fs.stat(abs);
  return Response.json({ ok: true, mtime: stat.mtimeMs });
}
