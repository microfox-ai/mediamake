import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CODE_EXTENSIONS,
  isDevFilesEnabled,
  notFound,
  resolveLyricsPath,
} from '@/lib/remotion-editor/server/lyrics-fs';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Reads several code or JSON files in one request (development only).
 * Body: { paths: string[] } relative to apps/lyrics_videos. Missing files come back as null.
 */
export async function POST(request: Request) {
  if (!isDevFilesEnabled()) return notFound();
  const body = (await request.json().catch(() => null)) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths)
    ? body.paths.filter((p): p is string => typeof p === 'string')
    : [];
  const files: Record<string, string | null> = {};
  await Promise.all(
    paths.map(async rel => {
      const abs = resolveLyricsPath(rel);
      if (!abs || !CODE_EXTENSIONS.includes(path.extname(abs))) {
        files[rel] = null;
        return;
      }
      const stat = await fs.stat(abs).catch(() => null);
      files[rel] =
        stat?.isFile() && stat.size <= MAX_BYTES
          ? await fs.readFile(abs, 'utf8').catch(() => null)
          : null;
    }),
  );
  return Response.json({ files });
}
