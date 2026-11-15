import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { projectCards } from '@/lib/projects/access-store';

/**
 * GET /api/project/overview
 * The Projects page's cards: every project the caller owns or was given, each
 * with its owner, the caller's role, its members, what it stores and when it
 * last changed (lib/projects/access's ProjectCard). Behind the middleware, so
 * x-client-id is the caller.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    return NextResponse.json({ clientId, projects: await projectCards(await getDatabase(), clientId) });
  } catch (error) {
    console.error('[projects] Could not list projects:', error);
    return NextResponse.json({ error: 'Could not load your projects' }, { status: 503 });
  }
}
