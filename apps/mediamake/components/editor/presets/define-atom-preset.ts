import { atomCategory, editorAtomCatalog } from '@microfox/remotion/editor-atom-catalog';
import { z } from 'zod';
import {
  definePreset,
  type AtomBuild,
  type TrackShellParams,
} from './define-preset';
import type { Preset } from './types';

/** Timeline fields the track shell owns. They must not land on atom `data`. */
const SHELL_KEYS = [
  'trackName',
  'trackType',
  'start',
  'startOffset',
  'duration',
  'lock',
  'attachedToId',
  'trackFitDurationTo',
  'trackStartOffset',
  'trackDuration',
  'trackRange',
] as const;

const rawDataParams = z.object({
  data: z
    .record(z.string(), z.any())
    .optional()
    .describe('Atom data'),
});

export function atomPresetId(componentId: string): string {
  return `atom:${componentId}`;
}

/**
 * `build.toString()` drops closed-over values, so the component id and the
 * shell key list are written into the function source.
 */
function buildSource(componentId: string, passthroughDataField: boolean): string {
  const id = JSON.stringify(componentId);
  if (passthroughDataField) {
    return `function (params) {
      const raw = params.data;
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      return { componentId: ${id}, type: 'atom', data };
    }`;
  }
  return `function (params) {
    const shell = ${JSON.stringify(SHELL_KEYS)};
    const data = { ...params };
    for (const key of shell) delete data[key];
    return { componentId: ${id}, type: 'atom', data };
  }`;
}

function compileBuild(
  source: string,
): (params: TrackShellParams & Record<string, unknown>) => AtomBuild {
  return new Function(`return (${source});`)() as (
    params: TrackShellParams & Record<string, unknown>,
  ) => AtomBuild;
}

function asZodObject(
  schema: unknown,
): z.ZodObject<z.ZodRawShape> | null {
  return schema instanceof z.ZodObject ? schema : null;
}

export function defineAtomPreset(atom: {
  componentId: string;
  displayName: string;
  inputSchema?: unknown;
  /** Folder the atom file lives in. `atoms` becomes BaseAtoms. */
  folder?: string;
  /** Overrides the folder default. */
  category?: string;
}): Preset {
  const schema = asZodObject(atom.inputSchema);
  const params = schema ?? rawDataParams;
  const title = atom.displayName || atom.componentId;
  const category = atomCategory(atom.folder ?? 'atoms', atom.category);

  return definePreset({
    metadata: {
      id: atomPresetId(atom.componentId),
      title,
      description: `${title} atom`,
      type: 'predefined',
      presetType: 'children',
      role: 'track',
      category,
      tags: ['atom'],
      defaultInputParams: {
        trackType: 'aligned',
        start: 0,
        duration: 5,
        attachedToId: 'BaseScene',
      },
    },
    placement: 'atom',
    params,
    build: compileBuild(buildSource(atom.componentId, schema == null)),
  });
}

/** One block per addable atom. Built from the server-safe catalog, not the React registry. */
export const atomBlockPresets: Preset[] = editorAtomCatalog.map((atom) =>
  defineAtomPreset(atom),
);
