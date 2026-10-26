import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import {
  stripTimeline,
  summarizeTimeline,
  timelineParts,
} from '../timeline-format.js';
import { json, safe } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const;

const detailSchema = z
  .enum(['summary', 'full'])
  .default('summary')
  .describe(
    'summary: format, config, references, preset list and node tree outline (small). full: the whole document with embedded preset code omitted.',
  );

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export function registerProjectTools(
  server: McpServer,
  client: MediamakeClient,
) {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List Mediamake projects the API key can see (owned or shared). Filter by name search or tag. Each project holds timelines.',
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe('Case-insensitive match on the project name'),
        tag: z.string().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: READ,
    },
    safe(async ({ search, tag, page, limit }) => {
      // The route only paginates when search or tag is set; otherwise it returns every project.
      const data = await client.get('/api/project', {
        search,
        tag,
        page,
        limit,
      });
      if (Array.isArray(data)) {
        const start = ((page ?? 1) - 1) * (limit ?? 50);
        const slice = data.slice(start, start + (limit ?? 50));
        return json({
          projects: slice,
          total: data.length,
          page: page ?? 1,
          limit: limit ?? 50,
        });
      }
      return json(data);
    }),
  );

  server.registerTool(
    'get_project',
    {
      title: 'Get project',
      description:
        'Get one project and a page of its timelines (newest first).',
      inputSchema: {
        id: z.string().describe('Project id'),
        timelinesLimit: z.number().int().min(1).max(100).default(50),
      },
      annotations: READ,
    },
    safe(async ({ id, timelinesLimit }) => {
      const [project, timelines] = await Promise.all([
        client.get('/api/project', { id }),
        client.get('/api/project/timeline', {
          projectId: id,
          summary: true,
          limit: timelinesLimit,
        }),
      ]);
      return json({
        ...project,
        timelines: timelines.timelines,
        timelinesPagination: timelines.pagination,
      });
    }),
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description: 'Create a new Mediamake project.',
      inputSchema: {
        displayName: z.string().min(1),
        tags: z.array(z.string()).optional(),
      },
      annotations: WRITE,
    },
    safe(async ({ displayName, tags }) =>
      json(await client.post('/api/project', { displayName, tags })),
    ),
  );

  server.registerTool(
    'list_timelines',
    {
      title: 'List timelines',
      description:
        'List timelines (id, name, dates). With projectId, only that project; without it, across every accessible project, most recently updated first.',
      inputSchema: {
        projectId: z.string().optional(),
        search: z
          .string()
          .optional()
          .describe('Case-insensitive match on the timeline name'),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: READ,
    },
    safe(async ({ projectId, search, page, limit }) =>
      json(
        await client.get('/api/project/timeline', {
          projectId,
          search,
          page,
          limit,
          summary: true,
        }),
      ),
    ),
  );

  server.registerTool(
    'get_timeline',
    {
      title: 'Get timeline',
      description:
        'Read a saved timeline. Every result has `format`: "tree" (current: nodes instance tree plus presets), "flat" (older: presets only, no nodes) or "legacy-preset-data" (oldest, see get_legacy_timeline). Prefer tree timelines when learning preferences.',
      inputSchema: {
        id: z.string().describe('Timeline id'),
        detail: detailSchema,
        includePresetCode: z
          .boolean()
          .default(false)
          .describe(
            'full only: keep presetInfo.presetFunction / presetParams embedded in each preset',
          ),
        maxArrayItems: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            'full only: truncate long arrays such as captions and words to this many items',
          ),
        maxDepth: z
          .number()
          .int()
          .min(0)
          .default(6)
          .describe('summary only: depth of the node tree outline'),
      },
      annotations: READ,
    },
    safe(async ({ id, detail, includePresetCode, maxArrayItems, maxDepth }) => {
      const doc = await client.get('/api/project/timeline', { id });
      if (detail === 'full')
        return json(stripTimeline(doc, { includePresetCode, maxArrayItems }));
      return json(summarizeTimeline(doc, { maxDepth }));
    }),
  );

  server.registerTool(
    'survey_timelines',
    {
      title: 'Survey timelines',
      description:
        'Read many timelines at once and aggregate them: how many are in each format, which presets each format uses and how often, and canvas configs. Use this before reverse engineering preferences from saved work.',
      inputSchema: {
        projectId: z
          .string()
          .optional()
          .describe('Only this project; default is every accessible project'),
        search: z.string().optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe('How many timelines (most recently updated first)'),
        includeLegacy: z
          .boolean()
          .default(false)
          .describe('Also include legacy presetData timelines'),
      },
      annotations: READ,
    },
    safe(async ({ projectId, search, limit, includeLegacy }) => {
      const ids: string[] = [];
      for (let page = 1; ids.length < limit; page++) {
        const res = await client.get('/api/project/timeline', {
          projectId,
          search,
          page,
          limit: Math.min(100, limit),
          summary: true,
        });
        const batch: any[] = res.timelines ?? [];
        ids.push(...batch.map(t => t.id));
        if (batch.length === 0 || page >= (res.pagination?.totalPages ?? 1))
          break;
      }

      const docs: any[] = await mapLimit(ids.slice(0, limit), 5, id =>
        client
          .get('/api/project/timeline', { id })
          .catch(error => ({ id, error: String(error) })),
      );
      if (includeLegacy) {
        const legacy: any[] = await client.get('/api/preset-data');
        const legacyDocs = await mapLimit(legacy.slice(0, limit), 5, meta =>
          client
            .get('/api/preset-data', { id: String(meta.id) })
            .catch(error => ({ id: meta.id, error: String(error) })),
        );
        docs.push(...legacyDocs);
      }

      const byFormat: Record<
        string,
        { count: number; presetUsage: Record<string, number> }
      > = {};
      const configs: Record<string, number> = {};
      const timelines: any[] = [];
      const failed: any[] = [];
      for (const doc of docs) {
        if (doc.error) {
          failed.push(doc);
          continue;
        }
        const summary = summarizeTimeline(doc, { maxDepth: 0 });
        const { presets } = timelineParts(doc);
        const bucket = (byFormat[summary.format] ??= {
          count: 0,
          presetUsage: {},
        });
        bucket.count++;
        for (const p of presets) {
          if (p.disabled) continue;
          bucket.presetUsage[p.presetId] =
            (bucket.presetUsage[p.presetId] ?? 0) + 1;
        }
        const c: any = summary.configuration;
        if (c?.width && c?.height) {
          const key = `${c.width}x${c.height}@${c.fps ?? '?'}fps`;
          configs[key] = (configs[key] ?? 0) + 1;
        }
        timelines.push({
          id: summary.id,
          projectId: summary.projectId,
          displayName: summary.displayName,
          updatedAt: summary.updatedAt,
          format: summary.format,
          presets: [
            ...new Set(presets.filter(p => !p.disabled).map(p => p.presetId)),
          ],
          references: summary.references.map((r: any) => `${r.key}:${r.type}`),
        });
      }
      return json({
        surveyed: timelines.length,
        byFormat,
        configs,
        timelines,
        failed,
      });
    }),
  );

  server.registerTool(
    'create_timeline',
    {
      title: 'Create timeline',
      description:
        'Create a timeline in a project. Either pass the content (configuration, defaultData, presets, optional nodes), template "blank", sourceTimelineId to duplicate, or legacyId to import a legacy presetData timeline. Presets are [{ id, presetId, presetType, presetInputData: { trackName, ... }, disabled }]. defaultData is { references: [{ key, type, value }] } and preset inputs can point at a reference.',
      inputSchema: {
        projectId: z.string(),
        displayName: z
          .string()
          .optional()
          .describe('Required unless duplicating or importing'),
        description: z.string().optional(),
        template: z.literal('blank').optional(),
        configuration: z.record(z.string(), z.any()).optional(),
        defaultData: z.record(z.string(), z.any()).optional(),
        presets: z.array(z.record(z.string(), z.any())).optional(),
        nodes: z
          .record(z.string(), z.any())
          .optional()
          .describe(
            'Preset instance tree (tree format). Saved right after create.',
          ),
        actions: z.array(z.any()).optional(),
        sourceTimelineId: z.string().optional(),
        legacyId: z.string().optional(),
      },
      annotations: WRITE,
    },
    safe(async ({ nodes, ...body }) => {
      const created = await client.post('/api/project/timeline', body);
      if (!nodes) return json(summarizeTimeline(created));
      // POST does not accept nodes; PUT does.
      const updated = await client.put('/api/project/timeline', {
        id: created.id,
        nodes,
      });
      return json(summarizeTimeline(updated));
    }),
  );

  server.registerTool(
    'update_timeline',
    {
      title: 'Update timeline',
      description:
        "Replace fields of a timeline. Only the fields you pass change; each passed field replaces the stored one whole. Pass `version` (from get_timeline) to fail with a conflict instead of overwriting someone else's newer publish.",
      inputSchema: {
        id: z.string(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        configuration: z.record(z.string(), z.any()).optional(),
        defaultData: z.record(z.string(), z.any()).optional(),
        presets: z.array(z.record(z.string(), z.any())).optional(),
        nodes: z.record(z.string(), z.any()).optional(),
        actions: z.array(z.any()).optional(),
        version: z.number().int().optional(),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async body =>
      json(summarizeTimeline(await client.put('/api/project/timeline', body))),
    ),
  );

  server.registerTool(
    'list_legacy_timelines',
    {
      title: 'List legacy timelines',
      description:
        'List saved timelines in the oldest, deprecated format (the presetData collection). Use create_timeline with legacyId to import one into a project.',
      inputSchema: {},
      annotations: READ,
    },
    safe(async () => json(await client.get('/api/preset-data'))),
  );

  server.registerTool(
    'get_legacy_timeline',
    {
      title: 'Get legacy timeline',
      description:
        'Read one legacy presetData timeline. Same summary/full options as get_timeline.',
      inputSchema: {
        id: z.string(),
        detail: detailSchema,
        maxArrayItems: z.number().int().min(1).optional(),
      },
      annotations: READ,
    },
    safe(async ({ id, detail, maxArrayItems }) => {
      const doc = await client.get('/api/preset-data', { id });
      if (detail === 'full') return json(stripTimeline(doc, { maxArrayItems }));
      return json(summarizeTimeline(doc));
    }),
  );
}
