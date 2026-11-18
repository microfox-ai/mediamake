import { NextRequest, NextResponse } from 'next/server';
import { projectId } from '@/lib/space/space';
import { todoDB, type TodoResult } from '@/lib/space/todo-store';
import { parseTodoAsk, parseTodoPost, todoIdOf } from '@/lib/space/todos';

/**
 * A project's to-do queue: a step one place could not do, posted for a place that can
 * (lib/space/todos, docs/cloud-device-runs.md). Behind the middleware, so x-client-id is the
 * signed-in account. Everyone on a project reads its to-dos; owners and editors post and work them.
 *
 * GET    ?project=<id>   that project's to-dos, each with the places that can do it.
 *        ?id=<td-…>      one to-do.
 *        neither         what waits or is held in every project the account works on.
 * POST   { action: "post", project, title, needs: [...], skill?, step?, production?, release?, version?,
 *          commit?, notes?, yes?, repeat?, options?, then?, from? }   a new to-do. Never a secret.
 *        { action: "claim", id, place? } | { action: "done", id, result? } | { action: "fail", id, reason }
 *        | { action: "release" | "yes" | "reopen", id } | { action: "cancel", id, reason? }
 *        Only one claim succeeds: the other is answered 409 with who has it.
 */
const signIn = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const failed = (what: string, error: unknown) => {
  console.error(`[todos] Could not ${what}:`, error);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 503 });
};
const answer = (result: TodoResult) => ('error' in result ? NextResponse.json({ error: result.error, ...(result.todo && { todo: result.todo }) }, { status: result.status }) : NextResponse.json(result));

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const params = req.nextUrl.searchParams;
  try {
    if (params.has('id')) {
      const id = todoIdOf(params.get('id'));
      const todo = id && (await todoDB.one(clientId, id));
      return todo ? NextResponse.json({ todo }) : NextResponse.json({ error: 'No such to-do in your projects' }, { status: 404 });
    }
    if (!params.has('project')) return NextResponse.json(await todoDB.mine(clientId));
    const project = projectId(params.get('project'));
    if (!project) return NextResponse.json({ error: 'project is a project id' }, { status: 400 });
    const view = await todoDB.forProject(project, clientId);
    return view ? NextResponse.json(view) : NextResponse.json({ error: 'You are not on that project' }, { status: 403 });
  } catch (error) {
    return failed('read the to-dos', error);
  }
}

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  const body = await req.json().catch(() => null);
  try {
    if (body?.action === 'post') {
      const post = parseTodoPost(body);
      if ('error' in post) return NextResponse.json({ error: post.error }, { status: 400 });
      return answer(await todoDB.post(clientId, post));
    }
    const ask = parseTodoAsk(body);
    if ('error' in ask) return NextResponse.json({ error: ask.error }, { status: 400 });
    return answer(await todoDB.act(clientId, ask));
  } catch (error) {
    return failed('change the to-do', error);
  }
}
