import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  insertPresetToComposition,
  insertSceneContainer,
  runPreset,
} from '@/components/editor/presets/engine/preset-helpers';
import { presetStdLib } from '@/components/editor/presets/engine/preset-stdlib';
import { getPredefinedPresetById } from '@/components/editor/presets/registry/registry/presets-registry';
import { CAPTION_PRESET_IDS } from './caption-audio-lock';
import { compileOrder, loadInstanceTree, VIRTUAL_ROOT_ID } from './load-instance-tree';
import { resolveTiming } from './resolve-timing';
import { stampInstanceTiming } from './stamp-timing';

const FPS = 30;

// tsx keeps function names with `__name(...)`. Preset bodies run from their
// source string, where that helper does not exist.
(globalThis as { __name?: unknown }).__name ??= (fn: unknown) => fn;

function word(id: string, text: string, absoluteStart: number, duration: number, captionStart: number) {
  return {
    id,
    text,
    start: absoluteStart - captionStart,
    end: absoluteStart - captionStart + duration,
    absoluteStart,
    absoluteEnd: absoluteStart + duration,
    duration,
    confidence: 1,
  };
}

/** Two lines timed against the audio file: 2s and 5s in. */
const captions = [
  {
    id: 'c0',
    text: 'hold the line',
    start: 0,
    end: 1.5,
    absoluteStart: 2,
    absoluteEnd: 3.5,
    duration: 1.5,
    words: [word('c0w0', 'hold', 2, 0.5, 2), word('c0w1', 'the', 2.5, 0.5, 2), word('c0w2', 'line', 3, 0.5, 2)],
  },
  {
    id: 'c1',
    text: 'never let go',
    start: 0,
    end: 1.5,
    absoluteStart: 5,
    absoluteEnd: 6.5,
    duration: 1.5,
    words: [word('c1w0', 'never', 5, 0.5, 5), word('c1w1', 'let', 5.5, 0.5, 5), word('c1w2', 'go', 6, 0.5, 5)],
  },
];

type Node = {
  id: string;
  type?: string;
  context?: { timing?: { start?: number; startInFrames?: number } };
  effects?: Array<{ data?: { start?: unknown } }>;
  childrenData?: Node[];
  _dataItemIds?: string[];
};

function startOf(node: Node): number {
  const timing = node.context?.timing;
  if (typeof timing?.start === 'number') return timing.start;
  if (typeof timing?.startInFrames === 'number') return timing.startInFrames / FPS;
  return 0;
}

/** When the first drawn atom of a caption starts, its own effects included. */
function firstAtomStart(node: Node, offset: number): number | undefined {
  const at = offset + startOf(node);
  if (node.type === 'atom') {
    const effectStarts = (node.effects ?? [])
      .map((effect) => effect.data?.start)
      .filter((value): value is number => typeof value === 'number');
    return at + (effectStarts.length > 0 ? Math.min(...effectStarts) : 0);
  }
  for (const child of node.childrenData ?? []) {
    const found = firstAtomStart(child, at);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Absolute time the caption at `index` first shows on screen. */
function captionStart(nodes: Node[], tag: string): number | undefined {
  const walk = (list: Node[], offset: number): number | undefined => {
    for (const node of list) {
      if (node._dataItemIds?.includes(tag)) return firstAtomStart(node, offset);
      const found = walk(node.childrenData ?? [], offset + startOf(node));
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return walk(nodes, 0);
}

/** B-roll reads `captions` and only draws lines that picked an image. */
const captionKey = (presetId: string) => (presetId === 'broll' ? 'captions' : 'inputCaptions');
const captionInput = (presetId: string) =>
  presetId === 'broll'
    ? captions.map((caption, index) => ({
        ...caption,
        metadata: { selectedImage: { src: `https://cdn.test/broll-${index}.jpg` } },
      }))
    : captions;

async function compile(presets: Array<{ id: string; presetId: string; presetType: string; presetInputData: object }>) {
  const timeline = { id: 'tl', projectId: 'p', displayName: 'Cut', isOwned: true, presets } as never;
  const tree = loadInstanceTree(timeline);
  let composition: any = {
    childrenData: [],
    config: { fps: FPS, width: 1080, height: 1920, duration: 30 },
    style: {},
  };
  for (const { node, parentRenderId } of compileOrder(tree)) {
    if (node.disabled || node.presetId === VIRTUAL_ROOT_ID) continue;
    if (node.presetId === 'scene') {
      composition = insertSceneContainer(
        composition,
        { id: node.id, arrangement: node.arrangement, input: node.input },
        parentRenderId,
      );
      continue;
    }
    const preset = getPredefinedPresetById(node.presetId);
    assert.ok(preset, `missing preset ${node.presetId}`);
    const output = await runPreset(structuredClone(node.input), preset.presetFunction, {
      config: composition.config,
      style: composition.style,
      clip: {},
      applyDataItemIdsToNodeTree: presetStdLib.applyDataItemIdsToNodeTree,
    } as never, preset.metadata);
    assert.ok(output, `${node.presetId} returned nothing`);
    composition = insertPresetToComposition(composition, {
      presetOutput: output,
      presetType: preset.metadata.presetType,
      presetItemId: node.id,
      attachToId: parentRenderId && parentRenderId !== 'BaseScene' ? parentRenderId : undefined,
    });
  }
  stampInstanceTiming(composition.childrenData, tree, resolveTiming(tree).nodes);
  return composition.childrenData as Node[];
}

const base = {
  id: 'base',
  presetId: 'base-scene',
  presetType: 'full',
  presetInputData: { duration: 30, arrangement: 'aligned' },
};
const intro = (input: object = {}) => ({
  id: 'intro',
  presetId: 'media-track',
  presetType: 'children',
  presetInputData: {
    trackName: 'intro',
    trackType: 'aligned',
    duration: 4,
    mediaItems: [{ type: 'video', src: 'https://cdn.test/intro.mp4', duration: 4 }],
    ...input,
  },
});
const audio = (input: object = {}) => ({
  id: 'audio',
  presetId: 'media-track',
  presetType: 'children',
  presetInputData: {
    trackName: 'song',
    trackType: 'aligned',
    duration: 10,
    mediaItems: [{ type: 'audio', src: 'https://cdn.test/song.mp3', duration: 10 }],
    ...input,
  },
});
const captionBlock = (presetId: string, input: object = {}) => {
  const defaults = getPredefinedPresetById(presetId)?.metadata.defaultInputParams ?? {};
  return {
    id: 'subs',
    presetId,
    presetType: 'children',
    presetInputData: {
      ...structuredClone(defaults),
      [captionKey(presetId)]: structuredClone(captionInput(presetId)),
      ...input,
    },
  };
};

const layouts = {
  'aligned scene, audio moved past the intro': (presetId: string) => [
    base,
    intro({ start: 0 }),
    audio({ start: 4 }),
    captionBlock(presetId),
  ],
  'sequence scene, captions above the audio': (presetId: string) => [
    base,
    { id: 'main', presetId: 'scene', presetType: 'children', presetInputData: { trackName: 'main', trackType: 'sequence' } },
    intro({ parentId: 'main' }),
    captionBlock(presetId, { parentId: 'main' }),
    audio({ parentId: 'main' }),
  ],
  'audio in a sequence scene, captions at the root': (presetId: string) => [
    base,
    { id: 'main', presetId: 'scene', presetType: 'children', presetInputData: { trackName: 'main', trackType: 'sequence' } },
    intro({ parentId: 'main' }),
    audio({ parentId: 'main' }),
    captionBlock(presetId),
  ],
};

describe('caption presets after an intro', () => {
  for (const presetId of CAPTION_PRESET_IDS) {
    for (const [name, build] of Object.entries(layouts)) {
      it(`${presetId}: ${name}`, async () => {
        const nodes = await compile(build(presetId) as never);
        for (const [index, caption] of captions.entries()) {
          const at = captionStart(nodes, `${captionKey(presetId)}.[${index}]`);
          assert.ok(at !== undefined, `caption ${index} was not drawn`);
          const expected = 4 + caption.absoluteStart;
          // A lead-in may show a line slightly early, never late and never
          // as early as the audio's own 0.
          assert.ok(
            at <= expected + 1e-6 && at >= expected - 1,
            `caption ${index} starts at ${at.toFixed(2)}s, expected about ${expected}s`,
          );
        }
      });
    }
  }
});
