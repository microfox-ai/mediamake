import { NextRequest } from 'next/server';
import {
  isDevFilesEnabled,
  listCodeFiles,
  notFound,
} from '@/lib/remotion-editor/server/lyrics-fs';

export const dynamic = 'force-dynamic';

/** Code and JSON files a project can import, with modified times (development only). */
export async function GET(request: NextRequest) {
  if (!isDevFilesEnabled()) return notFound();
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug || slug.includes('/') || slug.startsWith('.')) {
    return Response.json({ message: 'Pass ?slug=<project>' }, { status: 400 });
  }
  return Response.json({ files: await listCodeFiles(slug) });
}
