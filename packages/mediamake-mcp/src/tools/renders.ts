import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, safe, sleep } from '../util.js';
import { OBJECT_ID } from './presets.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const RENDER = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const;

const awsRenderPreset = z
  .enum([
    'classic',
    'complex-fast',
    'complex-slow',
    'basic-fast',
    'throttled',
    'lightweight',
    'broadcast',
    'enterprise',
  ])
  .default('classic')
  .describe(
    'Lambda size preset; heavier timelines (many captions, video layers) want complex-*',
  );

const common = {
  fileName: z.string().optional(),
  codec: z
    .enum(['h264', 'h265', 'vp8', 'vp9', 'prores', 'mp3', 'aac', 'wav', 'gif'])
    .optional(),
  isDownloadable: z.boolean().default(true),
  awsRenderPreset,
  wait: z
    .boolean()
    .default(false)
    .describe('Poll until the render finishes (up to timeoutSeconds)'),
  timeoutSeconds: z.number().int().min(10).max(1800).default(900),
};

async function waitForRender(
  client: MediamakeClient,
  renderId: string,
  bucketName: string,
  timeoutSeconds: number,
) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let last: any;
  while (Date.now() < deadline) {
    last = await client.get('/api/remotion/progress', {
      id: renderId,
      bucketName,
    });
    if (last.type === 'done' || last.type === 'error') break;
    await sleep(5000);
  }
  return compactProgress(renderId, bucketName, last);
}

function compactProgress(renderId: string, bucketName: string, p: any) {
  return {
    renderId,
    bucketName,
    state: p?.type,
    progress: p?.progress,
    url: p?.url,
    sizeBytes: p?.size,
    error: p?.type === 'error' ? p?.message : undefined,
    costUSD: p?.renderInfo?.costs?.accruedSoFar,
  };
}

function compactPlan(plan: any) {
  return {
    recommended: plan?.target,
    reason: plan?.reason,
    lambdaAvailable: plan?.lambdaAvailable,
    lambdaDeniedReason: plan?.lambda?.allowed ? undefined : plan?.lambda?.reason,
    load: plan?.load,
  };
}

export function registerRenderTools(
  server: McpServer,
  client: MediamakeClient,
) {
  server.registerTool(
    'plan_render',
    {
      title: 'Plan render',
      description:
        'Suggest where a render should run, without rendering, with the reason. "local" when the timeline plays minutes of video, very long audio, a 1 GB+ file or 500 MB+ of media in all (every Lambda chunk downloads and decodes it again); "lambda" for lighter media, images and graphics. Show the user the suggestion and reason and let them choose; either target works when lambdaAvailable is true.',
      inputSchema: {
        inputProps: z.record(z.string(), z.any()),
        renderType: z.enum(['video', 'audio', 'still']).default('video'),
      },
      annotations: READ,
    },
    safe(async ({ inputProps, renderType }) =>
      json(
        compactPlan(
          await client.post('/api/remotion/render/plan', {
            inputProps,
            renderType,
          }),
        ),
      ),
    ),
  );

  server.registerTool(
    'render',
    {
      title: 'Render composition',
      description:
        'Render a Remotion composition from inputProps. target "auto" (default) follows plan_render: timelines with light media render on AWS Lambda; media-heavy timelines (lots of footage or very large files), or API keys without Lambda access, are not rendered and come back with the plan, so render them locally (target "local" when the Mediamake app runs on this machine, or the Remotion CLI) or pass target "lambda" to use Lambda anyway. target "local" renders on the machine running the Mediamake app (dev server only). For the DataMotion composition inputProps is { childrenData, config: { width, height, fps, duration }, style }. Reuse the inputProps of a past render with get_render_input_props. renderType "still" returns a PNG immediately.',
      inputSchema: {
        inputProps: z.record(z.string(), z.any()),
        composition: z.string().default('DataMotion'),
        renderType: z.enum(['video', 'audio', 'still']).default('video'),
        frame: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('still only: 0-based frame'),
        frameTime: z
          .number()
          .min(0)
          .optional()
          .describe('still only: time in seconds'),
        projectId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        target: z.enum(['auto', 'lambda', 'local']).default('auto'),
        outputLocation: z
          .string()
          .optional()
          .describe('local only: output folder on the app machine'),
        ...common,
      },
      annotations: RENDER,
    },
    safe(
      async ({
        inputProps,
        composition,
        renderType,
        frame,
        frameTime,
        projectId,
        tags,
        target,
        outputLocation,
        fileName,
        codec,
        isDownloadable,
        awsRenderPreset,
        wait,
        timeoutSeconds,
      }) => {
        if (target === 'auto') {
          const plan = await client.post('/api/remotion/render/plan', {
            inputProps,
            renderType,
          });
          if (plan.target !== 'lambda')
            return json({ rendered: false, ...compactPlan(plan) });
        }
        if (target === 'local') {
          const res = await client.post(
            '/api/remotion/render/local',
            {
              compositionId: composition,
              inputProps,
              renderType,
              frame,
              frameTime,
              codec,
              fileName,
              outputLocation,
            },
            undefined,
            timeoutSeconds * 1000,
          );
          return json(res);
        }
        const res = await client.post('/api/remotion/render', {
          id: composition,
          inputProps,
          renderType,
          frame,
          frameTime,
          projectId,
          tags,
          fileName,
          codec,
          isDownloadable,
          awsRenderPreset,
        });
        if (renderType === 'still')
          return json({
            renderId: res.renderId,
            url: res.url,
            sizeBytes: res.sizeInBytes,
          });
        if (!wait)
          return json({
            renderId: res.renderId,
            bucketName: res.bucketName,
            configUsed: res.configUsed,
          });
        return json(
          await waitForRender(
            client,
            res.renderId,
            res.bucketName,
            timeoutSeconds,
          ),
        );
      },
    ),
  );

  server.registerTool(
    'render_presets',
    {
      title: 'Render presets',
      description:
        'Render a list of preset instances on Lambda: the server runs each preset in order (a full/scene preset first, then tracks and effects) and renders the result. Same item shape as a timeline\'s presets: { presetId, presetType: "predefined" | "database", presetInputData }. baseData maps reference keys to values, like a timeline\'s defaultData.references. Note this runs presets in list order and ignores a tree timeline\'s nodes timing; for an exact editor match, export inputProps from the editor and use render.',
      inputSchema: {
        presets: z
          .array(
            z.object({
              presetId: z.string(),
              presetType: z.enum(['predefined', 'database']),
              presetInputData: z.record(z.string(), z.any()),
            }),
          )
          .min(1),
        baseData: z.record(z.string(), z.any()).optional(),
        composition: z.string().default('DataMotion'),
        ...common,
      },
      annotations: RENDER,
    },
    safe(
      async ({
        presets,
        baseData,
        composition,
        fileName,
        codec,
        isDownloadable,
        awsRenderPreset,
        wait,
        timeoutSeconds,
      }) => {
        // The render route looks database presets up by Mongo _id; timelines store metadata.id.
        const resolved = await Promise.all(
          presets.map(async p => {
            if (p.presetType !== 'database' || OBJECT_ID.test(p.presetId))
              return p;
            const { preset } = await client.get(
              `/api/presets/by-metadata-id/${encodeURIComponent(p.presetId)}`,
            );
            return { ...p, presetId: String(preset._id) };
          }),
        );
        const res = await client.post('/api/remotion/render/preset', {
          presets: resolved,
          baseData,
          composition,
          fileName,
          codec,
          isDownloadable,
          awsRenderPreset,
        });
        if (!wait)
          return json({
            renderId: res.renderId,
            bucketName: res.bucketName,
            processedPresets: res.processedPresets,
            configUsed: res.configUsed,
          });
        return json(
          await waitForRender(
            client,
            res.renderId,
            res.bucketName,
            timeoutSeconds,
          ),
        );
      },
    ),
  );

  server.registerTool(
    'render_status',
    {
      title: 'Render status',
      description:
        'Progress of a Lambda render; returns the output URL once done.',
      inputSchema: {
        renderId: z.string(),
        bucketName: z.string(),
        wait: z.boolean().default(false),
        timeoutSeconds: z.number().int().min(10).max(1800).default(900),
      },
      annotations: READ,
    },
    safe(async ({ renderId, bucketName, wait, timeoutSeconds }) => {
      if (wait)
        return json(
          await waitForRender(client, renderId, bucketName, timeoutSeconds),
        );
      return json(
        compactProgress(
          renderId,
          bucketName,
          await client.get('/api/remotion/progress', {
            id: renderId,
            bucketName,
          }),
        ),
      );
    }),
  );

  server.registerTool(
    'list_renders',
    {
      title: 'List renders',
      description:
        'Render history, newest first (without inputProps). Page with the returned nextCursor.',
      inputSchema: {
        renderType: z.enum(['any', 'video', 'audio', 'still']).default('any'),
        projectId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().optional(),
      },
      annotations: READ,
    },
    safe(async ({ renderType, projectId, tags, limit, cursor }) => {
      const res = await client.get('/api/remotion/history', {
        renderType,
        projectId,
        tags: tags?.join(','),
        limit,
        cursor,
      });
      const items = (res.items ?? []).map((r: any) => ({
        renderId: r.renderId,
        bucketName: r.bucketName,
        fileName: r.fileName,
        composition: r.composition,
        renderType: r.renderType,
        status: r.status,
        createdAt: r.createdAt,
        projectId: r.projectId,
        tags: r.tags,
        downloadUrl: r.downloadUrl,
        error: r.error,
      }));
      return json({ items, nextCursor: res.nextCursor, hasMore: res.hasMore });
    }),
  );

  server.registerTool(
    'get_render_input_props',
    {
      title: 'Get render inputProps',
      description:
        'The exact inputProps a past render used (the compiled composition JSON). Useful to re-render, tweak, or study how a finished video was built.',
      inputSchema: { renderId: z.string() },
      annotations: READ,
    },
    safe(async ({ renderId }) =>
      json(
        await client.get('/api/remotion/history', {
          renderId,
          inputPropsOnly: true,
          includeArchived: true,
        }),
      ),
    ),
  );
}
