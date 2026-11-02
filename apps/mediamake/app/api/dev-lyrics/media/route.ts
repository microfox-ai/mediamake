import { NextRequest } from 'next/server';
import {
  isDevFilesEnabled,
  listMediaFiles,
  notFound,
} from '@/lib/remotion-editor/server/lyrics-fs';

export const dynamic = 'force-dynamic';

/** Images, clips and sounds a project's scenes can load, for the editor's Assets panel (development only). */
export async function GET(request: NextRequest) {
  if (!isDevFilesEnabled()) return notFound();
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug || slug.includes('/') || slug.startsWith('.')) {
    return Response.json({ message: 'Pass ?slug=<project>' }, { status: 400 });
  }
  return Response.json({ files: await listMediaFiles(slug) });
}
