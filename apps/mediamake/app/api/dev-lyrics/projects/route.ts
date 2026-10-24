import {
  isDevFilesEnabled,
  listProjects,
  LYRICS_ROOT,
  notFound,
} from '@/lib/remotion-editor/server/lyrics-fs';

export const dynamic = 'force-dynamic';

/** Lyric projects in apps/lyrics_videos (development only). */
export async function GET() {
  if (!isDevFilesEnabled()) return notFound();
  return Response.json({ root: LYRICS_ROOT, projects: await listProjects() });
}
