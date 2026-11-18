import { NextRequest, NextResponse } from 'next/server';
import { getProjectRole } from '@/lib/editor/project-access';
import { getDatabase } from '@/lib/mongodb';
import { parsePlaceAction, parsePlaceReport } from '@/lib/space/register';
import { registerDB } from '@/lib/space/register-store';
import { projectId } from '@/lib/space/space';

/**
 * The access register: what each place can do (lib/space/register, docs/cloud-device-runs.md). Behind
 * the middleware, so x-client-id is the signed-in account.
 *
 * GET    ?project=<id>   that project's register, for anyone on it: its cloud environments, the
 *        computers open to it, the viewer's own computers, and which place has what its skills need.
 *        Without `project`, the account's own places.
 * PUT    { kind: "device" | "cloud", device, name?, can: [...], limits?, repos? }   what one computer
 *        or cloud session can do. Words only: a key by its name, a sign-in by its site and account.
 * POST   { action: "open" | "close", place, project } | { action: "busy" | "free" | "forget", place }
 *        | { action: "name", place, name }   its owner only. A computer is closed to a project until
 *        its owner opens it.
 */
const signIn = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const failed = (what: string, error: unknown) => {
  console.error(`[places] Could not ${what}:`, error);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 503 });
};
const onProject = async (project: string, clientId: string) => !!(await getProjectRole(await getDatabase(), project, clientId));

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const asked = req.nextUrl.searchParams.get('project');
  try {
    if (!asked) return NextResponse.json({ places: await registerDB.mine(clientId) });
    const project = projectId(asked);
    if (!project) return NextResponse.json({ error: 'project is a project id' }, { status: 400 });
    if (!(await onProject(project, clientId))) return NextResponse.json({ error: 'You are not on that project' }, { status: 403 });
    return NextResponse.json(await registerDB.forProject(project, clientId));
  } catch (error) {
    return failed('read the register', error);
  }
}

export async function PUT(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const report = parsePlaceReport(await req.json().catch(() => null));
  if ('error' in report) return NextResponse.json({ error: report.error }, { status: 400 });
  try {
    const place = await registerDB.report(clientId, report);
    return NextResponse.json({ place: place.id, can: place.can.length, projects: place.projects });
  } catch (error) {
    return failed('save the report', error);
  }
}

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const ask = parsePlaceAction(await req.json().catch(() => null));
  if ('error' in ask) return NextResponse.json({ error: ask.error }, { status: 400 });
  try {
    if (ask.action === 'open' && !(await onProject(ask.project, clientId))) return NextResponse.json({ error: 'You are not on that project' }, { status: 403 });
    const result = await registerDB.act(clientId, ask);
    if (!result) return NextResponse.json({ error: 'No such place of yours' }, { status: 404 });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json('forgotten' in result ? result : { place: result.id, projects: result.projects, busy: result.busy === true, ...(result.name && { name: result.name }) });
  } catch (error) {
    return failed('change the place', error);
  }
}
