import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, safe, sleep } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const DONE = new Set([
  'completed',
  'complete',
  'succeeded',
  'success',
  'failed',
  'error',
  'cancelled',
]);

/** workers-config comes straight from the worker runtime; accept a map or a list. */
function workerList(config: any): any[] {
  const raw = config?.workers ?? config;
  const entries: [string, any][] = Array.isArray(raw)
    ? raw.map((w: any) => [w?.id ?? w?.workerId ?? w?.name, w])
    : raw && typeof raw === 'object'
      ? Object.entries(raw)
      : [];
  return entries
    .filter(([id]) => typeof id === 'string')
    .map(([id, w]) => ({
      id,
      description: w?.description ?? w?.metadata?.description,
      queue: w?.queue ?? w?.queueName,
      tags: w?.tags ?? w?.metadata?.tags,
    }));
}

export function registerWorkerTools(
  server: McpServer,
  client: MediamakeClient,
) {
  server.registerTool(
    'list_workers',
    {
      title: 'List workers',
      description:
        'List Mediamake generation workers: video (google-veo, kling-ai, runway, luma, pika, minimax, wan, heygen, d-id, sync-so), image (google-nanobanana, flux, ideogram, stability, magnific), audio (elevenlabs tts/sfx/voice clone, udio, stable audio), ffmpeg compose and subtitle burn, transcriber and more. Use get_worker_schema before run_worker.',
      inputSchema: {
        search: z.string().optional(),
        raw: z
          .boolean()
          .default(false)
          .describe('Return the full workers-config response'),
      },
      annotations: READ,
    },
    safe(async ({ search, raw }) => {
      const config = await client.get('/api/workflows/workers-config');
      if (raw) return json(config);
      const q = search?.toLowerCase();
      const workers = workerList(config).filter(
        w => !q || `${w.id} ${w.description ?? ''}`.toLowerCase().includes(q),
      );
      return json({ workers, count: workers.length });
    }),
  );

  server.registerTool(
    'get_worker_schema',
    {
      title: 'Get worker input schema',
      description: "JSON schema of a worker's input.",
      inputSchema: { workerId: z.string() },
      annotations: READ,
    },
    safe(async ({ workerId }) =>
      json(
        await client.get(
          `/api/workflows/workers/${encodeURIComponent(workerId)}/schema`,
        ),
      ),
    ),
  );

  server.registerTool(
    'run_worker',
    {
      title: 'Run worker',
      description:
        'Start a worker job (generation costs credits on the provider). With wait=true (default) this polls until the job finishes or timeoutSeconds passes, then returns its output; otherwise it returns the jobId for get_worker_job.',
      inputSchema: {
        workerId: z.string(),
        input: z
          .record(z.string(), z.any())
          .describe('Worker input, matching get_worker_schema'),
        wait: z.boolean().default(true),
        timeoutSeconds: z.number().int().min(5).max(1800).default(600),
        pollSeconds: z.number().int().min(2).max(60).default(5),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    safe(async ({ workerId, input, wait, timeoutSeconds, pollSeconds }) => {
      const path = `/api/workflows/workers/${encodeURIComponent(workerId)}`;
      const started = await client.post(path, { input });
      if (!wait) return json(started);

      const deadline = Date.now() + timeoutSeconds * 1000;
      let job: any = started;
      while (Date.now() < deadline) {
        await sleep(pollSeconds * 1000);
        job = await client.get(`${path}/${encodeURIComponent(started.jobId)}`);
        if (DONE.has(String(job.status).toLowerCase())) return json(job);
      }
      return json({
        ...job,
        note: `Still ${job.status} after ${timeoutSeconds}s. Check again with get_worker_job.`,
      });
    }),
  );

  server.registerTool(
    'get_worker_job',
    {
      title: 'Get worker job',
      description: 'Status and output of a worker job.',
      inputSchema: { workerId: z.string(), jobId: z.string() },
      annotations: READ,
    },
    safe(async ({ workerId, jobId }) =>
      json(
        await client.get(
          `/api/workflows/workers/${encodeURIComponent(workerId)}/${encodeURIComponent(jobId)}`,
        ),
      ),
    ),
  );

  server.registerTool(
    'list_agents',
    {
      title: 'List agents',
      description:
        "List Mediamake AI agents (preset writing, prompting, Midjourney, metadata, summarise, research, audio analysis…). Set includeSchemas for each agent's input and output schemas.",
      inputSchema: {
        tag: z.string().optional(),
        category: z.string().optional(),
        includeSchemas: z.boolean().default(false),
      },
      annotations: READ,
    },
    safe(async ({ tag, category, includeSchemas }) => {
      const res = await client.get('/api/agents', { tag, category });
      const agents = (res.agents ?? []).map((a: any) =>
        includeSchemas
          ? a
          : {
              id: a.id,
              path: a.path,
              title: a.metadata?.title,
              description: a.description,
              category: a.metadata?.category,
              tags: a.metadata?.tags,
            },
      );
      return json({ agents, count: agents.length });
    }),
  );

  server.registerTool(
    'run_agent',
    {
      title: 'Run agent',
      description:
        "Call a Mediamake agent by its path (from list_agents) and return its response. Pass a prompt for a simple user message, and/or params for the agent's structured input.",
      inputSchema: {
        path: z.string().describe('Agent path, e.g. /summarize'),
        prompt: z.string().optional(),
        params: z.record(z.string(), z.any()).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    safe(async ({ path, prompt, params }) => {
      const agentPath = path.startsWith('/') ? path : `/${path}`;
      const body = {
        ...(params ?? {}),
        messages: prompt
          ? [
              {
                id: `msg-${Date.now()}`,
                role: 'user',
                content: prompt,
                parts: [{ type: 'text', text: prompt }],
              },
            ]
          : [],
      };
      return json(
        await client.post(`/api/studio/chat/agent${agentPath}`, body),
      );
    }),
  );
}
