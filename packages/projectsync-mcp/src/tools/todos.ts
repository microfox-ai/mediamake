import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MediamakeApiError, type MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, safe } from '../../../mediamake-mcp/src/util.js';
import { READ, WRITE } from './annotations.js';

/**
 * A project's to-do queue and its register (apps/mediamake/lib/space/todos, lib/space/register): a step
 * one place could not do waits for a place that can. A cloud session that reaches a step needing a
 * computer posts it and ends; someone with a computer that has what the step needs picks it up. The
 * routes are /api/space/todos and /api/space/places. `mm todo` and `mm access` do the same on a
 * computer with the MediaMake repo, and also bring the project's space up to date on a pick-up.
 */
const ROUTE = '/api/space/todos';
const NEED = /^(render|media:library|(key|mcp|app):[a-z0-9][a-z0-9._-]{0,63}|browser:[a-z0-9][a-z0-9.-]{0,63}(\/[\w.@<>-]{1,100})?)$/;

const projectId = z.string().describe('The project (list_projects). Your personal space has one too.');
const todoId = z.string().regex(/^td-[a-z0-9]{6}$/i, 'a to-do id: td-…').describe('The to-do (list_todos), as in "Pick up to-do td-… in <project>"');
const need = z.string().regex(NEED, 'render, key:<name>, mcp:<id>, app:<name>, browser:<site>[/<account>] or media:library');

interface Todo {
  id: string;
  state: string;
  mine?: boolean;
  claimedBy?: string;
  claimedOn?: string;
  claimedAt?: string;
  [key: string]: unknown;
}

/** A refusal that names who has the to-do says so. */
async function ask(client: MediamakeClient, body: Record<string, unknown>): Promise<{ todo: Todo; existing?: true }> {
  try {
    return await client.post(ROUTE, body);
  } catch (error) {
    const held = error instanceof MediamakeApiError ? (error.body as { error?: string; todo?: Todo } | undefined) : undefined;
    if (held?.todo?.state === 'claimed' && !held.todo.mine) throw new Error(`${held.error ?? 'Someone else has it'}: ${held.todo.claimedBy} has it${held.todo.claimedOn ? ` on ${held.todo.claimedOn}` : ''} since ${held.todo.claimedAt}.`);
    if (held?.error) throw new Error(held.error);
    throw error;
  }
}

export function registerTodoTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_todos',
    {
      title: 'List to-dos',
      description:
        "A project's to-do queue: the steps a session could not do where it ran (an upload that needs a signed-in browser, pictures from Midjourney), each with what it needs, the places that can do it, and who picked it up. Without projectId: what waits in every project you work on. A to-do is picked up with claim_todo, on a computer that has what it needs.",
      inputSchema: { projectId: projectId.optional() },
      annotations: READ,
    },
    safe(async ({ projectId }) => json(await client.get(ROUTE, projectId ? { project: projectId } : undefined))),
  );

  server.registerTool(
    'post_todo',
    {
      title: 'Post a to-do',
      description:
        "Post a step this place cannot do, for a place that can: say what to do in a line, what the step needs (the run sheet's words: key:elevenlabs, mcp:browse-hack, browser:youtube/<channel>, app:<name>, media:library, render) and what it works on (a release or production of the project, by slug and version). Save the work to the project first (create_release, create_production), so whoever picks it up can get it. Everyone on the project reads a to-do: never put a key or a password in it. The same step of the same work and version is posted once; a newer version cancels the older one that still waits. Owners and editors only.",
      inputSchema: {
        projectId,
        title: z.string().min(1).max(140).describe('What to do, in a line: "Upload doomcat-0412 to YouTube"'),
        needs: z.array(need).max(40).default([]).describe('What the step needs. Only a place that has them all is offered the to-do'),
        skill: z.string().optional().describe('The skill whose step this is'),
        step: z.string().optional().describe('The step, as the skill\'s run sheet names it: "5. Upload to YouTube"'),
        release: z.string().optional().describe('The release it works on, by slug'),
        production: z.string().optional().describe('The production it works on, by slug'),
        version: z.string().optional().describe('Which version of that release or production'),
        commit: z.string().optional().describe("The commit of the space's code it was made with"),
        notes: z.string().max(2000).optional().describe('More for whoever picks it up (when to schedule it, what to check). Never a secret'),
        needsYes: z.boolean().optional().describe("True when the step must wait for a person's yes (its run sheet or the routine says so)"),
        safeToRepeat: z.boolean().optional().describe('True when doing it twice does no harm. Left out, whoever picks it up first checks it did not already happen'),
        options: z.array(z.string().min(1).max(80)).min(2).max(6).optional().describe('A choice only a person can make (which thumbnail): it is answered on the page, not run'),
        then: z.string().max(200).optional().describe('What comes after it: "resume the run in the cloud"'),
        from: z.string().max(80).optional().describe('The place posting it, by name: "cloud"'),
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, needsYes, safeToRepeat, ...rest }) => {
      const { todo, existing } = await ask(client, { action: 'post', project: projectId, ...rest, ...(needsYes && { yes: true }), ...(safeToRepeat && { repeat: true }) });
      return json({ ...(existing ? { alreadyWaiting: true } : { posted: true }), todo, tell: `Whoever picks it up pastes into Claude: ${(todo as { line?: string }).line}` });
    }),
  );

  server.registerTool(
    'claim_todo',
    {
      title: 'Pick up a to-do',
      description:
        'Pick a to-do up ("Pick up to-do td-… in <project>"): it is yours for 2 hours, and only one pick-up succeeds; if someone else has it you are told who. Do this only on a computer that has everything the to-do needs, and only when the user asked. Then do the step with its skill (get its release or production with get_release / get_production and saveTo), and finish with finish_todo. On a computer with the MediaMake repo, `mm todo pick <id>` does the same and brings the project\'s space up to date first.',
      inputSchema: { id: todoId, place: z.string().max(80).optional().describe('This computer, by the name its owner gave it') },
      annotations: WRITE,
    },
    safe(async ({ id, place }) => {
      const { todo } = await ask(client, { action: 'claim', id: id.toLowerCase(), ...(place && { place }) });
      return json({
        todo,
        next: [
          ...(todo.repeat ? [] : ['This step must not happen twice: first check that it did not already (a link on the release, the video on the channel). If it did, only record the result.']),
          ...(todo.needsYes ? ["It waits for a person's yes: ask the user before doing it. They say yes on the project's page (To do), or with `mm todo yes`."] : []),
          'When it is done: finish_todo with outcome "done" and the result (the link). If it fails: outcome "failed" with the reason. Not now after all: outcome "released".',
        ],
      });
    }),
  );

  server.registerTool(
    'finish_todo',
    {
      title: 'Finish a to-do',
      description:
        'Say what came of a to-do: "done" with its result (the video\'s link; for a choice, the option the user picked), "failed" with the reason (it goes back to the queue, and the third failure stops it for a person), "released" to give back one you picked up, or "cancelled" when it is no longer wanted. Only whoever picked it up finishes, fails or releases it.',
      inputSchema: {
        id: todoId,
        outcome: z.enum(['done', 'failed', 'released', 'cancelled']),
        result: z.string().max(500).optional().describe('For done: the link, or what came of it. Never a secret'),
        reason: z.string().max(500).optional().describe('For failed (required) or cancelled: why'),
      },
      annotations: WRITE,
    },
    safe(async ({ id, outcome, result, reason }) => {
      if (outcome === 'failed' && !reason) throw new Error('A failed to-do needs its reason');
      const action = ({ done: 'done', failed: 'fail', released: 'release', cancelled: 'cancel' } as const)[outcome];
      return json(await ask(client, { action, id: id.toLowerCase(), ...(outcome === 'done' && result && { result }), ...((outcome === 'failed' || outcome === 'cancelled') && reason && { reason }) }));
    }),
  );

  server.registerTool(
    'where_it_runs',
    {
      title: 'Where a project runs',
      description:
        "A project's register: its cloud environments and the computers its people opened to it, what each can do (renders, keys by name with their spend limit, MCPs, apps, browser sign-ins by site and account), and for each thing its skills need, which place has it. Read it before deciding where a step runs or posting a to-do. A computer is closed to a project until its owner opens it (`mm access open <project>` on that computer, or the project's page); never ask for a key or a password.",
      inputSchema: { projectId },
      annotations: READ,
    },
    safe(async ({ projectId }) => json(await client.get('/api/space/places', { project: projectId }))),
  );
}
