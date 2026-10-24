import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { summarizeTimeline } from '../timeline-format.js';
import { json, safe } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;

const presetSource = z
  .enum(['predefined', 'database'])
  .describe(
    'predefined: built into the app code (base-scene, sub-vertical-float, waveform…). database: saved by users.',
  );

/** Metadata only; database list responses otherwise carry each preset's full code. */
function dbPresetMeta(preset: any) {
  return { _id: preset._id, ...preset.metadata, clientId: preset.clientId };
}

export const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function getPreset(
  client: MediamakeClient,
  id: string,
  source: 'predefined' | 'database',
  includeCode = false,
) {
  if (source === 'predefined') {
    return client.get('/api/presets/predefined', {
      id,
      includeCode: includeCode || undefined,
    });
  }
  // Timelines reference database presets by metadata.id; the _id route is for direct lookups.
  const route = OBJECT_ID.test(id)
    ? '/api/presets/'
    : '/api/presets/by-metadata-id/';
  const { preset } = await client.get(`${route}${encodeURIComponent(id)}`);
  return {
    _id: preset._id,
    metadata: preset.metadata,
    presetParams: preset.presetParams,
    ...(includeCode ? { presetFunction: preset.presetFunction } : {}),
  };
}

function trackNameOf(preset: any): string | undefined {
  const name = preset?.presetInputData?.trackName ?? preset?.label;
  return typeof name === 'string' ? name : undefined;
}

function uniqueTrackName(presets: any[], seed: string): string {
  const taken = new Set(presets.map(trackNameOf).filter(Boolean));
  if (!taken.has(seed)) return seed;
  for (let i = 2; ; i++) {
    const candidate = `${seed} ${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function registerPresetTools(
  server: McpServer,
  client: MediamakeClient,
) {
  server.registerTool(
    'list_presets',
    {
      title: 'List presets',
      description:
        'List presets (the building blocks of a timeline). presetType: full = scene/canvas, children = visual tracks (captions, waveform, media), effects/data/context = modifiers. Returns metadata only; use get_preset for the input schema.',
      inputSchema: {
        source: presetSource.default('predefined'),
        presetType: z
          .enum(['children', 'data', 'context', 'effects', 'full'])
          .optional(),
        search: z
          .string()
          .optional()
          .describe('Case-insensitive match on id, title, description or tags'),
        tags: z.array(z.string()).optional().describe('database only'),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        includeDeprecated: z.boolean().default(false),
      },
      annotations: READ,
    },
    safe(
      async ({
        source,
        presetType,
        search,
        tags,
        page,
        limit,
        includeDeprecated,
      }) => {
        let presets: any[];
        let total: number | undefined;
        if (source === 'predefined') {
          presets = (await client.get('/api/presets/predefined')).presets;
        } else {
          const res = await client.get('/api/presets', {
            presetType,
            tags: tags?.join(','),
            page,
            limit,
          });
          presets = res.presets.map(dbPresetMeta);
          total = res.total;
        }
        const q = search?.toLowerCase();
        presets = presets.filter(
          p =>
            (!presetType || p.presetType === presetType) &&
            (includeDeprecated || !p.deprecated) &&
            (!q ||
              [p.id, p.title, p.description, ...(p.tags ?? [])].some(
                (v: unknown) =>
                  typeof v === 'string' && v.toLowerCase().includes(q),
              )),
        );
        const compact = presets.map(p => ({
          id: p.id,
          _id: p._id,
          title: p.title,
          presetType: p.presetType,
          role: p.role,
          tags: p.tags,
          description:
            typeof p.description === 'string'
              ? p.description.slice(0, 300)
              : undefined,
          deprecated: p.deprecated || undefined,
          replacedBy: p.replacedBy,
        }));
        return json({
          source,
          presets: compact,
          total: total ?? compact.length,
        });
      },
    ),
  );

  server.registerTool(
    'get_preset',
    {
      title: 'Get preset',
      description:
        'Get a preset\'s metadata (including defaultInputParams) and its input JSON schema (presetParams). Pass the metadata id (e.g. "sub-vertical-float", or a database preset\'s "preset-…" id); a database preset\'s Mongo _id also works.',
      inputSchema: {
        id: z.string(),
        source: presetSource.default('predefined'),
        includeCode: z
          .boolean()
          .default(false)
          .describe('Also return the stringified presetFunction'),
      },
      annotations: READ,
    },
    safe(async ({ id, source, includeCode }) =>
      json(await getPreset(client, id, source, includeCode)),
    ),
  );

  server.registerTool(
    'add_preset_to_timeline',
    {
      title: 'Add preset to timeline',
      description:
        'Append a preset instance to a timeline, the way the editor\'s Add button does at the top level: inputs start from the preset\'s defaultInputParams, your presetInputData is merged on top, and the track gets a unique trackName. Reference a defaultData entry from an input (for example captions) the same way existing timelines do; inspect one with get_timeline detail "full" first.',
      inputSchema: {
        timelineId: z.string(),
        presetId: z
          .string()
          .describe(
            'Preset metadata id (database presets also accept their _id)',
          ),
        source: presetSource.default('predefined'),
        presetInputData: z.record(z.string(), z.any()).default({}),
        trackName: z.string().optional(),
        disabled: z.boolean().default(false),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    safe(
      async ({
        timelineId,
        presetId,
        source,
        presetInputData,
        trackName,
        disabled,
      }) => {
        const [timeline, preset] = await Promise.all([
          client.get('/api/project/timeline', { id: timelineId }),
          getPreset(client, presetId, source),
        ]);
        const metadata = preset.metadata;
        const presets: any[] = timeline.presets ?? [];
        const input = {
          ...(metadata.defaultInputParams ?? {}),
          ...presetInputData,
        };
        const seed =
          trackName?.trim() ||
          (typeof input.trackName === 'string' && input.trackName.trim()) ||
          metadata.title ||
          metadata.id;
        input.trackName = uniqueTrackName(presets, seed);

        const instance = {
          id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          // The editor resolves both predefined and database presets by metadata.id.
          presetId: metadata.id,
          presetType: metadata.presetType,
          presetInputData: input,
          disabled,
        };
        const updated = await client.put('/api/project/timeline', {
          id: timelineId,
          presets: [...presets, instance],
          version: timeline.version ?? 0,
        });
        return json({
          added: instance,
          timeline: summarizeTimeline(updated, { maxDepth: 2 }),
        });
      },
    ),
  );
}
