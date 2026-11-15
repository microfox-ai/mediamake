import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { isEmail } from '@/lib/projects/access';
import { accountFor, findProject, suggestPeople } from '@/lib/projects/access-store';

/**
 * GET /api/project/people?q=…&projectId=…
 * Who to offer while someone types a name to share a project with: the
 * people they already share a project with (admins: every account), minus
 * those already on `projectId`. A full email address answers whether it has
 * an account (`match`) or would be invited (`invite`); nothing else lets one
 * member look up another.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const q = (params.get('q') ?? '').trim().slice(0, 254);
  try {
    const db = await getDatabase();
    const project = params.get('projectId') ? await findProject(db, params.get('projectId')!) : null;
    const onIt = project && project.clientId === clientId ? [project.clientId, ...(project.sharedWith ?? []).map(member => member.clientId)] : [];
    const people = await suggestPeople(db, clientId, q, onIt);
    if (!isEmail(q)) return NextResponse.json({ people });
    const email = q.toLowerCase();
    const match = await accountFor(db, { email });
    return NextResponse.json({ people: people.filter(who => who.clientId !== match?.clientId), ...(match ? { match } : { invite: email }) });
  } catch (error) {
    console.error('[projects] Could not look people up:', error);
    return NextResponse.json({ error: 'Could not look people up' }, { status: 503 });
  }
}
