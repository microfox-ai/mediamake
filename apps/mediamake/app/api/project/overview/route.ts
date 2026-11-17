import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { canUseCloudProjects, getViewerTier } from '@/lib/access';
import { projectCards } from '@/lib/projects/access-store';
import { ensurePersonalProject } from '@/lib/projects/personal';

/**
 * GET /api/project/overview
 * The Spaces page's cards: the caller's personal space (made here when there
 * is none) and every project they own or were given, each
 * with its owner, the caller's role, its members, what it stores and when it
 * last changed (lib/projects/access's ProjectCard). Behind the middleware, so
 * x-client-id is the caller.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    const db = await getDatabase();
    // the personal space's files live in a project of its own, made here the first time (Plus and above)
    if (canUseCloudProjects(await getViewerTier({ clientId }))) {
      await ensurePersonalProject(db, clientId).catch(error => console.error('[projects] Could not make the personal space:', error));
    }
    return NextResponse.json({ clientId, projects: await projectCards(db, clientId) });
  } catch (error) {
    console.error('[projects] Could not list projects:', error);
    return NextResponse.json({ error: 'Could not load your projects' }, { status: 503 });
  }
}
