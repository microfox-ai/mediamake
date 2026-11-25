import { NextRequest, NextResponse } from 'next/server';
import { AGENTS_TIER, commandId, parseCommand, parsePoll, parseReport, runId } from '@/lib/agents/agents';
import { agentsDB } from '@/lib/agents/store';
import { tierOf } from '@/lib/memberships/admin';
import { tierOpens } from '@/lib/memberships/tiers';

/**
 * Sub-agents on the API key (lib/agents, docs/sub-agents.md). Behind the middleware, so x-client-id
 * is the signed-in account: the page's session, or the key `mm login` gave a computer (the
 * environment's MEDIAMAKE_API_KEY in a cloud session). For admins and Cohort members; an account
 * only ever reads and changes its own runs.
 *
 * GET                       the account's runs, the places that report and the credit.
 *     ?id=ag-…&after=<seq>  one run, with its conversation after `after`.
 * POST  from a place (`mm agents`):
 *       { action: "report", place, run, from, events, settings? }   a run as it is now → { have, commands }
 *       { action: "poll", place, listening?, folder?, settings? }   what waits for this place → { commands }
 *       { action: "settle", command, done, note?, run? }            a command was done, or could not be
 *       from the page:
 *       { action: "ask", kind: "message", run, message } | { …, kind: "stop", run } | { …, kind: "start", place, start }
 *       { action: "unsend", command }                               takes back a message not taken yet
 *       { action: "forget", run }                                   removes a run from the page
 */
const signIn = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const failed = (what: string, error: unknown) => {
  console.error(`[agents] Could not ${what}:`, error);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 503 });
};

async function member(req: NextRequest): Promise<string | NextResponse> {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signIn();
  return tierOpens(await tierOf(clientId), AGENTS_TIER) ? clientId : bad('Sub-agents are for admins and Cohort members', 403);
}

export async function GET(req: NextRequest) {
  try {
    const clientId = await member(req);
    if (typeof clientId !== 'string') return clientId;
    const params = req.nextUrl.searchParams;
    if (!params.has('id')) return NextResponse.json(await agentsDB.list(clientId));
    const id = runId(params.get('id'));
    if (!id) return bad('id is ag-…');
    const after = Number(params.get('after') ?? -1);
    const view = await agentsDB.one(clientId, id, Number.isInteger(after) && after >= -1 ? after : -1);
    return view ? NextResponse.json(view) : bad('No such sub-agent', 404);
  } catch (error) {
    return failed('read the sub-agents', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientId = await member(req);
    if (typeof clientId !== 'string') return clientId;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    switch (body?.action) {
      case 'report': {
        const report = parseReport(body);
        return 'error' in report ? bad(report.error) : NextResponse.json(await agentsDB.report(clientId, report));
      }
      case 'poll': {
        const poll = parsePoll(body);
        if ('error' in poll) return bad(poll.error);
        return NextResponse.json({ commands: await agentsDB.touch(clientId, poll.place, { listening: poll.listening, folder: poll.folder, settings: poll.settings }) });
      }
      case 'settle': {
        const id = commandId(body.command);
        if (!id) return bad('command is cm-…');
        const ok = await agentsDB.settle(clientId, id, body.done === true, { ...(typeof body.note === 'string' && { note: body.note }), ...(runId(body.run) && { run: runId(body.run) as string }) });
        return NextResponse.json({ ok });
      }
      case 'ask': {
        const ask = parseCommand(body);
        if ('error' in ask) return bad(ask.error);
        const result = await agentsDB.ask(clientId, ask);
        return 'error' in result ? bad(result.error, result.status) : NextResponse.json(result);
      }
      case 'unsend': {
        const id = commandId(body.command);
        return id ? NextResponse.json({ ok: await agentsDB.unsend(clientId, id) }) : bad('command is cm-…');
      }
      case 'forget': {
        const id = runId(body.run);
        return id ? NextResponse.json({ ok: await agentsDB.forget(clientId, id) }) : bad('run is ag-…');
      }
      default:
        return bad('action is report, poll, settle, ask, unsend or forget');
    }
  } catch (error) {
    return failed('change the sub-agents', error);
  }
}
