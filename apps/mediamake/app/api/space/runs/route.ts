import { NextRequest, NextResponse } from 'next/server';
import { runDB, type RunResult } from '@/lib/space/run-store';
import { parseRunAsk, runSlug } from '@/lib/space/runs';
import { projectId } from '@/lib/space/space';

/**
 * A project's run records: which steps of a production are done, where, and which is next
 * (lib/space/runs, docs/cloud-device-runs.md). Behind the middleware, so x-client-id is the signed-in
 * account. Everyone on a project reads its runs; owners and editors start and continue them.
 *
 * GET    ?project=<id>              that project's runs.
 *        ?project=<id>&slug=<slug>  one run.
 *        neither                    the runs that aren't over in every project the account works on.
 * POST   { action: "start", project, slug, skill, steps: [{ step, needs, yes?, repeat? }], title?, place?, again? }
 *        { action: "resume", project, slug, place? }
 *        { action: "step", project, slug, step, place?, hours? }     a step starts
 *        { action: "save", project, slug, step, place?, output?, saved?: { production?, release?, commit? } }
 *        { action: "wait", project, slug, step, title?, notes? }     the step becomes a to-do, and the place lets go
 *        { action: "stop", project, slug } | { action: "cancel", project, slug, reason? }
 *        One place has a run at a time: another is answered 409 with who has it and where.
 */
const signIn = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const failed = (what: string, error: unknown) => {
  console.error(`[runs] Could not ${what}:`, error);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 503 });
};
const answer = (result: RunResult) => ('error' in result ? NextResponse.json({ error: result.error, ...(result.run && { run: result.run }) }, { status: result.status }) : NextResponse.json(result));

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const params = req.nextUrl.searchParams;
  try {
    if (!params.has('project')) return NextResponse.json(await runDB.mine(clientId));
    const project = projectId(params.get('project'));
    if (!project) return NextResponse.json({ error: 'project is a project id' }, { status: 400 });
    if (params.has('slug')) {
      const slug = runSlug(params.get('slug'));
      const run = slug && (await runDB.one(clientId, project, slug));
      return run ? NextResponse.json({ run }) : NextResponse.json({ error: 'No such run in that project' }, { status: 404 });
    }
    const view = await runDB.forProject(project, clientId);
    return view ? NextResponse.json(view) : NextResponse.json({ error: 'You are not on that project' }, { status: 403 });
  } catch (error) {
    return failed('read the runs', error);
  }
}

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const ask = parseRunAsk(await req.json().catch(() => null));
  if ('error' in ask) return NextResponse.json({ error: ask.error }, { status: 400 });
  try {
    return answer(await runDB.act(clientId, ask));
  } catch (error) {
    return failed('change the run', error);
  }
}
