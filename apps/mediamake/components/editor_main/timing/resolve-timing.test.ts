import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  absoluteToLocalEffectTime,
  atomContentEnd,
  nextStartOffset,
  patchMediaAtom,
  placedOrigin,
  readStartOffset,
  sceneBlocksForPreset,
  sceneBlocksFromMediaInput,
  sceneRelativeEffectAnchors,
  sequenceLengthFromInput,
  visibleSpan,
} from '../panels/bottom/editor/media-scene-blocks';
import { applyTimingToPresetInput, blockDropTarget, loadInstanceTree, lockTargetNames, moveNode, moveNodes, orderPresetsLikeTree, presetAnchorPlacement } from './load-instance-tree';
import { remapLocksOnPaste } from './paste-remap';
import { latestSpanEnd, resolveTiming } from './resolve-timing';
import { estimateSequenceDuration } from './sequence-estimate';
import {
  collectIntrinsicDurations,
  collectMediaItemDurations,
  fittedDuration,
  stampInstanceTiming,
} from './stamp-timing';
import type { AppliedNode } from './types';

function node(
  partial: Pick<AppliedNode, 'id' | 'timing'> &
    Partial<Omit<AppliedNode, 'id' | 'timing'>>,
): AppliedNode {
  return {
    presetId: partial.presetId ?? 'media-track',
    name: partial.name ?? partial.id,
    role: partial.role ?? 'track',
    arrangement: partial.arrangement,
    input: partial.input ?? {},
    children: partial.children ?? [],
    disabled: partial.disabled,
    id: partial.id,
    timing: partial.timing,
  };
}

describe('resolveTiming', () => {
  it('sums a sequenced scene and packs child starts', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'sequence',
      presetId: 'scene',
      timing: { kind: 'hug', start: 2 },
      children: [
        node({ id: 'a', timing: { kind: 'explicit', start: 9, duration: 2 } }),
        node({ id: 'b', timing: { kind: 'explicit', start: 9, duration: 3 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.deepEqual(nodes.get('a'), {
      start: 0,
      duration: 2,
      absoluteStart: 2,
      parentAbsoluteStart: 2,
      locked: false,
    });
    assert.equal(nodes.get('b')?.start, 2);
    assert.equal(nodes.get('b')?.absoluteStart, 4);
    assert.equal(nodes.get('scene')?.duration, 5);
    assert.equal(nodes.get('scene')?.absoluteStart, 2);
  });

  it('requires a duration on an aligned scene', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'scene',
      timing: { kind: 'unspecified', start: 0 },
      children: [
        node({ id: 'a', timing: { kind: 'explicit', start: 0, duration: 4 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(nodes.has('scene'), false);
    assert.equal(diagnostics.some((item) => item.code === 'missing-duration'), true);
  });

  it('copies a lock target inside a sequence instead of packing the scene', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'sequence',
      presetId: 'scene',
      timing: { kind: 'explicit', start: 0, duration: 30 },
      children: [
        node({ id: 'a', timing: { kind: 'explicit', start: 0, duration: 4 } }),
        node({ id: 'b', timing: { kind: 'explicit', start: 9, duration: 3 } }),
        node({ id: 'c', timing: { kind: 'lock', refId: 'b' } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('b')?.start, 4);
    assert.equal(nodes.get('c')?.start, nodes.get('b')?.start);
    assert.equal(nodes.get('c')?.duration, nodes.get('b')?.duration);
    assert.equal(nodes.get('c')?.absoluteStart, nodes.get('b')?.absoluteStart);
  });

  it('keeps the packed start of a later lock target inside a sequence', () => {
    // Subtitles locked to the audio, placed above it, after an intro.
    for (const timing of [
      { kind: 'explicit', start: 0, duration: 30 } as const,
      { kind: 'hug', start: 0 } as const,
    ]) {
      const root = node({
        id: 'scene',
        role: 'scene',
        arrangement: 'sequence',
        presetId: 'scene',
        timing,
        children: [
          node({ id: 'intro', timing: { kind: 'explicit', start: 0, duration: 4 } }),
          node({ id: 'subs', timing: { kind: 'lock', refId: 'audio' } }),
          node({ id: 'audio', timing: { kind: 'intrinsic', start: 0 } }),
        ],
      });
      const { nodes, diagnostics } = resolveTiming(root, {
        intrinsicDurations: { audio: 10 },
      });
      assert.equal(diagnostics.length, 0);
      assert.equal(nodes.get('audio')?.start, 4);
      assert.equal(nodes.get('subs')?.start, 4);
      assert.equal(nodes.get('subs')?.duration, 10);
      if (timing.kind === 'hug') assert.equal(nodes.get('scene')?.duration, 14);
    }
  });

  it('copies start and duration when locking to a sibling', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'scene',
      timing: { kind: 'explicit', start: 0, duration: 20 },
      children: [
        node({ id: 'a', timing: { kind: 'explicit', start: 3, duration: 4 } }),
        node({ id: 'b', timing: { kind: 'lock', refId: 'a' } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('b')?.start, 3);
    assert.equal(nodes.get('b')?.duration, 4);
    assert.equal(nodes.get('b')?.locked, true);
  });

  it('locks to an ancestor in the child parent coordinates', () => {
    const root = node({
      id: 'root',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'base-scene',
      timing: { kind: 'explicit', start: 0, duration: 20 },
      children: [
        node({
          id: 'scene',
          role: 'scene',
          arrangement: 'aligned',
          presetId: 'scene',
          timing: { kind: 'explicit', start: 5, duration: 10 },
          children: [node({ id: 'track', timing: { kind: 'lock', refId: 'root' } })],
        }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.some((item) => item.code === 'lock-cycle'), false);
    assert.equal(nodes.get('track')?.duration, 20);
    assert.equal(nodes.get('track')?.start, -5);
    assert.equal(nodes.get('track')?.absoluteStart, 0);
    assert.equal(
      diagnostics.some((item) => item.nodeId === 'track' && item.code === 'child-overflow'),
      true,
    );
  });

  it('trims the base scene to a locked child and drops the time outside it', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'base-scene',
      timing: { kind: 'lock', refId: 'clip' },
      children: [
        node({ id: 'head', timing: { kind: 'explicit', start: 0, duration: 4 } }),
        node({ id: 'clip', timing: { kind: 'explicit', start: 4, duration: 8 } }),
        node({ id: 'tail', timing: { kind: 'explicit', start: 12, duration: 4 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('base')?.start, 4);
    assert.equal(nodes.get('base')?.duration, 8);
    assert.equal(nodes.get('base')?.locked, true);
    assert.equal(nodes.get('clip')?.start, 0);
    assert.equal(nodes.get('clip')?.absoluteStart, 4);
    assert.equal(nodes.get('clip')?.duration, 8);
    assert.equal(nodes.get('head')?.absoluteStart, 0);
    assert.equal(nodes.get('tail')?.absoluteStart, 12);
  });

  it('locks the base scene to a nested child at that child\'s time', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'base-scene',
      timing: { kind: 'lock', refId: 'clip' },
      children: [
        node({
          id: 'inner',
          role: 'scene',
          arrangement: 'aligned',
          presetId: 'scene',
          timing: { kind: 'explicit', start: 2, duration: 20 },
          children: [
            node({ id: 'clip', timing: { kind: 'explicit', start: 2, duration: 8 } }),
          ],
        }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('clip')?.absoluteStart, 4);
    assert.equal(nodes.get('base')?.start, 4);
    assert.equal(nodes.get('base')?.duration, 8);
    assert.equal(nodes.get('inner')?.absoluteStart, 2);
    assert.equal(nodes.get('inner')?.start, -2);
  });

  it('trims a nested scene to a locked child', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'base-scene',
      timing: { kind: 'explicit', start: 0, duration: 20 },
      children: [
        node({
          id: 'inner',
          role: 'scene',
          arrangement: 'aligned',
          presetId: 'scene',
          timing: { kind: 'lock', refId: 'clip' },
          children: [
            node({ id: 'head', timing: { kind: 'explicit', start: 0, duration: 1 } }),
            node({ id: 'clip', timing: { kind: 'explicit', start: 1, duration: 2 } }),
          ],
        }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('inner')?.start, 1);
    assert.equal(nodes.get('inner')?.duration, 2);
    assert.equal(nodes.get('inner')?.locked, true);
    assert.equal(nodes.get('clip')?.start, 0);
    assert.equal(nodes.get('clip')?.absoluteStart, 1);
    assert.equal(nodes.get('clip')?.duration, 2);
    assert.equal(nodes.get('head')?.absoluteStart, 0);
  });

  it('trims a nested scene to a grandchild', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'base-scene',
      timing: { kind: 'explicit', start: 0, duration: 20 },
      children: [
        node({
          id: 'inner',
          role: 'scene',
          arrangement: 'aligned',
          presetId: 'scene',
          timing: { kind: 'lock', refId: 'clip' },
          children: [
            node({
              id: 'deeper',
              role: 'scene',
              arrangement: 'aligned',
              presetId: 'scene',
              timing: { kind: 'explicit', start: 2, duration: 10 },
              children: [
                node({ id: 'clip', timing: { kind: 'explicit', start: 3, duration: 4 } }),
              ],
            }),
          ],
        }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('clip')?.absoluteStart, 5);
    assert.equal(nodes.get('inner')?.start, 5);
    assert.equal(nodes.get('inner')?.duration, 4);
    assert.equal(nodes.get('deeper')?.start, -3);
    assert.equal(nodes.get('deeper')?.absoluteStart, 2);
  });

  it('packs a scene that locks to its child inside a sequence', () => {
    const root = node({
      id: 'seq',
      role: 'scene',
      arrangement: 'sequence',
      presetId: 'scene',
      timing: { kind: 'explicit', start: 0, duration: 30 },
      children: [
        node({ id: 'intro', timing: { kind: 'explicit', start: 0, duration: 4 } }),
        node({
          id: 'inner',
          role: 'scene',
          arrangement: 'aligned',
          presetId: 'scene',
          timing: { kind: 'lock', refId: 'clip' },
          children: [
            node({ id: 'head', timing: { kind: 'explicit', start: 0, duration: 1 } }),
            node({ id: 'clip', timing: { kind: 'explicit', start: 1, duration: 2 } }),
          ],
        }),
        node({ id: 'outro', timing: { kind: 'explicit', start: 0, duration: 3 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('intro')?.start, 0);
    assert.equal(nodes.get('inner')?.start, 4);
    assert.equal(nodes.get('inner')?.duration, 2);
    assert.equal(nodes.get('clip')?.start, 0);
    assert.equal(nodes.get('clip')?.absoluteStart, 4);
    assert.equal(nodes.get('head')?.start, -1);
    assert.equal(nodes.get('outro')?.start, 6);
    assert.equal(nodes.get('outro')?.duration, 3);
  });

  it('still refuses a track locking to its descendant', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'base-scene',
      timing: { kind: 'explicit', start: 0, duration: 20 },
      children: [
        node({
          id: 'track',
          role: 'track',
          timing: { kind: 'lock', refId: 'inner' },
          children: [
            node({ id: 'inner', timing: { kind: 'explicit', start: 0, duration: 2 } }),
          ],
        }),
      ],
    });
    const { diagnostics } = resolveTiming(root);
    assert.equal(
      diagnostics.some((item) => item.nodeId === 'track' && item.code === 'lock-out-of-scope'),
      true,
    );
  });

  it('reports a cycle when a hugged scene is locked to by its child', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'sequence',
      presetId: 'scene',
      timing: { kind: 'hug', start: 0 },
      children: [node({ id: 'a', timing: { kind: 'lock', refId: 'scene' } })],
    });
    const { diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.some((item) => item.code === 'lock-cycle'), true);
  });

  it('bounds an auto-range scene from the earliest start to the latest end', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'autoRange',
      presetId: 'scene',
      timing: { kind: 'autoRange' },
      children: [
        node({ id: 'late-short', timing: { kind: 'explicit', start: 10, duration: 2 } }),
        node({ id: 'early', timing: { kind: 'explicit', start: 2, duration: 4 } }),
        node({ id: 'mid-long', timing: { kind: 'explicit', start: 5, duration: 9 } }),
        node({ id: 'off', timing: { kind: 'explicit', start: 0, duration: 50 }, disabled: true }),
        node({ id: 'blank', role: 'track', timing: { kind: 'unspecified', start: 0 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.some((item) => item.nodeId === 'scene'), false);
    assert.equal(nodes.get('scene')?.start, 2);
    assert.equal(nodes.get('scene')?.duration, 12);
    assert.equal(nodes.get('early')?.start, 0);
    assert.equal(nodes.get('early')?.absoluteStart, 2);
    assert.equal(nodes.get('late-short')?.start, 8);
    assert.equal(nodes.get('late-short')?.absoluteStart, 10);
    assert.equal(nodes.get('mid-long')?.absoluteStart, 5);
    assert.equal(nodes.has('off'), false);
    assert.equal(nodes.has('blank'), false);
  });

  it('keeps a negative first start and ignores a later item that ends sooner', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'autoRange',
      presetId: 'scene',
      timing: { kind: 'autoRange' },
      children: [
        node({ id: 'lead', timing: { kind: 'explicit', start: -4, duration: 2 } }),
        node({ id: 'tail', timing: { kind: 'explicit', start: 1, duration: 3 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('scene')?.start, -4);
    assert.equal(nodes.get('scene')?.duration, 8);
    assert.equal(nodes.get('lead')?.start, 0);
    assert.equal(nodes.get('lead')?.absoluteStart, -4);
    assert.equal(nodes.get('tail')?.start, 5);
    assert.equal(nodes.get('tail')?.absoluteStart, 1);
  });

  it('packs an auto-range scene inside a sequence and drops its leading gap', () => {
    const root = node({
      id: 'seq',
      role: 'scene',
      arrangement: 'sequence',
      presetId: 'scene',
      timing: { kind: 'hug', start: 0 },
      children: [
        node({
          id: 'ranged',
          role: 'scene',
          arrangement: 'autoRange',
          presetId: 'scene',
          timing: { kind: 'autoRange' },
          children: [
            node({ id: 'a', timing: { kind: 'explicit', start: 5, duration: 2 } }),
            node({ id: 'b', timing: { kind: 'explicit', start: 9, duration: 4 } }),
          ],
        }),
        node({ id: 'next', timing: { kind: 'explicit', start: 0, duration: 1 } }),
      ],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('ranged')?.start, 0);
    assert.equal(nodes.get('ranged')?.duration, 8);
    assert.equal(nodes.get('a')?.start, 0);
    assert.equal(nodes.get('a')?.absoluteStart, 0);
    assert.equal(nodes.get('b')?.start, 4);
    assert.equal(nodes.get('b')?.absoluteStart, 4);
    assert.equal(nodes.get('next')?.start, 8);
    assert.equal(nodes.get('seq')?.duration, 9);
  });

  it('fails an auto-range scene that has no timed children', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'autoRange',
      presetId: 'scene',
      timing: { kind: 'autoRange' },
      children: [node({ id: 'a', timing: { kind: 'lock', refId: 'scene' } })],
    });
    const { nodes, diagnostics } = resolveTiming(root);
    assert.equal(nodes.has('scene'), false);
    assert.equal(diagnostics.some((item) => item.code === 'lock-cycle'), true);
  });

  it('keeps a duration-only lock from moving the clip', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'scene',
      timing: { kind: 'explicit', start: 0, duration: 20 },
      children: [
        node({ id: 'a', timing: { kind: 'explicit', start: 0, duration: 8 } }),
        node({
          id: 'b',
          timing: { kind: 'durationLock', refId: 'a', start: 2 },
        }),
      ],
    });
    const { nodes } = resolveTiming(root);
    assert.equal(nodes.get('b')?.start, 2);
    assert.equal(nodes.get('b')?.duration, 8);
    assert.equal(nodes.get('b')?.locked, true);
  });
});

describe('remapLocksOnPaste', () => {
  it('remaps internal locks and reports an external target', () => {
    const root = node({
      id: 'scene',
      role: 'scene',
      arrangement: 'aligned',
      presetId: 'scene',
      timing: { kind: 'explicit', start: 0, duration: 10 },
      children: [
        node({ id: 'a', timing: { kind: 'lock', refId: 'b' } }),
        node({ id: 'b', timing: { kind: 'explicit', start: 1, duration: 2 } }),
        node({ id: 'c', timing: { kind: 'lock', refId: 'outside' } }),
      ],
    });
    const { node: pasted, diagnostics } = remapLocksOnPaste(
      root,
      new Map([
        ['scene', 'scene2'],
        ['a', 'a2'],
        ['b', 'b2'],
        ['c', 'c2'],
      ]),
    );
    const track = pasted.children[0];
    assert.equal(track.id, 'a2');
    assert.equal(track.timing.kind === 'lock' && track.timing.refId, 'b2');
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0]?.code, 'external-lock');
    assert.equal(diagnostics[0]?.nodeId, 'c2');
  });
});

describe('loadInstanceTree', () => {
  it('ignores fitDurationTo on the base scene', () => {
    const tree = loadInstanceTree({
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
      presets: [
        {
          id: 'base',
          label: 'Base',
          presetId: 'base-scene',
          presetType: 'full',
          presetInputData: { start: 2, fitDurationTo: 'audio-track' },
        },
        {
          id: 'audio',
          label: 'Audio',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: { trackName: 'audio-track', duration: 30 },
        },
      ],
    } as never);
    assert.equal(tree.timing.kind, 'explicit');
    if (tree.timing.kind === 'explicit') {
      assert.equal(tree.timing.start, 2);
      assert.equal(tree.timing.duration, 20);
    }
    const audio = tree.children.find((child) => child.id === 'audio');
    assert.equal(audio?.timing.kind, 'explicit');
  });

  it('wraps a flat preset list under the base scene', () => {
    const tree = loadInstanceTree({
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
      presets: [
        {
          id: 'base',
          label: 'Base',
          presetId: 'base-scene',
          presetType: 'full',
          presetInputData: { duration: 12, arrangement: 'aligned' },
        },
        {
          id: 'media',
          label: 'Media',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: { parentId: 'inner', trackName: 'clips' },
        },
        {
          id: 'inner',
          label: 'Inner',
          presetId: 'scene',
          presetType: 'children',
          presetInputData: { arrangement: 'sequence', duration: 12 },
        },
      ],
    } as never);
    assert.equal(tree.presetId, 'base-scene');
    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0]?.id, 'inner');
    assert.equal(tree.children[0]?.children[0]?.id, 'media');
    assert.equal(tree.timing.kind, 'explicit');
  });

  it('keeps arranged order inside a group when the flat list matches the tree', () => {
    const shell = {
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
    };
    const presets = [
      {
        id: 'base',
        label: 'Base',
        presetId: 'base-scene',
        presetType: 'full',
        presetInputData: { duration: 10 },
      },
      {
        id: 'group',
        label: 'Group',
        presetId: 'scene',
        presetType: 'children',
        presetInputData: { arrangement: 'sequence', duration: 10 },
      },
      {
        id: 'b',
        label: 'B',
        presetId: 'text-atom',
        presetType: 'children',
        presetInputData: { parentId: 'group', trackName: 'b' },
      },
      {
        id: 'a',
        label: 'A',
        presetId: 'text-atom',
        presetType: 'children',
        presetInputData: { parentId: 'group', trackName: 'a' },
      },
    ];
    const leaf = (id: string, name: string) => ({
      id,
      presetId: 'text-atom',
      name,
      role: 'track' as const,
      input: { parentId: 'group' },
      timing: { kind: 'explicit' as const, start: 0, duration: 1 },
      children: [],
    });
    const arranged = loadInstanceTree({
      ...shell,
      presets,
      nodes: {
        id: 'base',
        presetId: 'base-scene',
        name: 'Scene',
        role: 'scene',
        arrangement: 'aligned',
        input: {},
        timing: { kind: 'explicit', start: 0, duration: 10 },
        children: [
          {
            id: 'group',
            presetId: 'scene',
            name: 'Group',
            role: 'scene',
            arrangement: 'sequence',
            input: {},
            timing: { kind: 'explicit', start: 0, duration: 10 },
            children: [leaf('a', 'A'), leaf('b', 'B')],
          },
        ],
      },
    } as never);
    assert.deepEqual(
      arranged.children[0]?.children.map((child) => child.id),
      ['a', 'b'],
    );

    const ordered = orderPresetsLikeTree(presets, arranged);
    assert.deepEqual(ordered?.map((preset) => preset.id), ['base', 'group', 'a', 'b']);
    const fromList = loadInstanceTree({ ...shell, presets: ordered } as never);
    assert.deepEqual(
      fromList.children[0]?.children.map((child) => child.id),
      ['a', 'b'],
    );
  });

  it('inserts a copied preset inside its group', () => {
    const shell = {
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
    };
    const leaf = (id: string) => ({
      id,
      presetId: 'text-atom',
      name: id,
      role: 'track' as const,
      input: { parentId: 'group' },
      timing: { kind: 'explicit' as const, start: 0, duration: 1 },
      children: [],
    });
    const tree = loadInstanceTree({
      ...shell,
      presets: [
        {
          id: 'base',
          presetId: 'base-scene',
          presetType: 'full',
          presetInputData: { duration: 10 },
        },
        {
          id: 'group',
          presetId: 'scene',
          presetType: 'children',
          presetInputData: { duration: 10 },
        },
        {
          id: 'a',
          presetId: 'text-atom',
          presetType: 'children',
          presetInputData: { parentId: 'group', trackName: 'a' },
        },
        {
          id: 'copy',
          presetId: 'text-atom',
          presetType: 'children',
          presetInputData: { parentId: 'group', trackName: 'copy' },
        },
        {
          id: 'b',
          presetId: 'text-atom',
          presetType: 'children',
          presetInputData: { parentId: 'group', trackName: 'b' },
        },
      ],
      nodes: {
        id: 'base',
        presetId: 'base-scene',
        name: 'Scene',
        role: 'scene',
        arrangement: 'aligned',
        input: {},
        timing: { kind: 'explicit', start: 0, duration: 10 },
        children: [
          {
            id: 'group',
            presetId: 'scene',
            name: 'Group',
            role: 'scene',
            arrangement: 'sequence',
            input: {},
            timing: { kind: 'explicit', start: 0, duration: 10 },
            children: [leaf('a'), leaf('b')],
          },
        ],
      },
    } as never);
    assert.deepEqual(
      tree.children[0]?.children.map((child) => child.id),
      ['a', 'copy', 'b'],
    );
    assert.equal(tree.children.some((child) => child.id === 'copy'), false);
  });

  it('drops an outside block into a group when the pointer is on a child', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      presetId: 'base-scene',
      timing: { kind: 'explicit', start: 0, duration: 10 },
      children: [
        node({
          id: 'group',
          role: 'scene',
          presetId: 'scene',
          timing: { kind: 'explicit', start: 0, duration: 10 },
          children: [
            node({ id: 'a', timing: { kind: 'explicit', start: 0, duration: 1 } }),
            node({ id: 'b', timing: { kind: 'explicit', start: 0, duration: 1 } }),
          ],
        }),
        node({ id: 'outside', timing: { kind: 'explicit', start: 0, duration: 1 } }),
      ],
    });
    assert.deepEqual(blockDropTarget(root, 'outside', 'a', false), {
      parentId: 'group',
      index: 0,
    });
    assert.deepEqual(blockDropTarget(root, 'outside', 'a', true), {
      parentId: 'group',
      index: 1,
    });
    assert.equal(blockDropTarget(root, 'outside', 'group', true)?.parentId, 'group');
    assert.deepEqual(presetAnchorPlacement(root, 'a', 'beside'), {
      parentId: 'group',
      index: 1,
    });
    assert.deepEqual(presetAnchorPlacement(root, 'group', 'into-or-beside'), {
      parentId: 'group',
      index: 2,
    });
  });

  it('moves several blocks into a group and keeps their order', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      presetId: 'base-scene',
      timing: { kind: 'explicit', start: 0, duration: 10 },
      children: [
        node({ id: 'title', timing: { kind: 'explicit', start: 0, duration: 1 } }),
        node({
          id: 'group',
          role: 'scene',
          presetId: 'scene',
          timing: { kind: 'explicit', start: 0, duration: 10 },
          children: [
            node({ id: 'a', timing: { kind: 'explicit', start: 0, duration: 1 } }),
          ],
        }),
        node({ id: 'caption', timing: { kind: 'explicit', start: 0, duration: 1 } }),
        node({
          id: 'nested',
          role: 'scene',
          presetId: 'scene',
          timing: { kind: 'explicit', start: 0, duration: 10 },
          children: [
            node({ id: 'inner', timing: { kind: 'explicit', start: 0, duration: 1 } }),
          ],
        }),
      ],
    });
    const target = blockDropTarget(root, 'caption', 'group', true, ['title', 'caption', 'inner']);
    assert.equal(target?.parentId, 'group');
    const moved = moveNodes(root, ['title', 'caption', 'inner'], 'group', target?.index ?? 0);
    assert.deepEqual(
      moved.children.map((child) => child.id),
      ['group', 'nested'],
    );
    const group = moved.children.find((child) => child.id === 'group');
    assert.deepEqual(
      group?.children.map((child) => child.id),
      ['a', 'title', 'caption', 'inner'],
    );
    const nested = moved.children.find((child) => child.id === 'nested');
    assert.deepEqual(nested?.children.map((child) => child.id), []);
    const kept = moveNodes(root, ['title', 'nested'], 'group', Number.MAX_SAFE_INTEGER);
    const keptGroup = kept.children.find((child) => child.id === 'group');
    assert.deepEqual(
      keptGroup?.children.map((child) => child.id),
      ['a', 'title', 'nested'],
    );
    assert.deepEqual(
      keptGroup?.children.find((child) => child.id === 'nested')?.children.map((child) => child.id),
      ['inner'],
    );
    assert.equal(moveNodes(root, ['title'], 'missing', 0), root);
  });

  it('hugs a sequence root and locks a media track by id', () => {
    const tree = loadInstanceTree({
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
      presets: [
        {
          id: 'base',
          label: 'Base',
          presetId: 'base-scene',
          presetType: 'full',
          presetInputData: { trackType: 'sequence', start: 1 },
        },
        {
          id: 'media',
          label: 'Media',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: { start: 2, duration: 4, lock: 'other' },
        },
        {
          id: 'other',
          label: 'Other',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: { start: 0, duration: 6 },
        },
      ],
    } as never);
    assert.equal(tree.arrangement, 'sequence');
    assert.deepEqual(tree.timing, { kind: 'hug', start: 1 });
    const media = tree.children.find((child) => child.id === 'media');
    assert.equal(media?.timing.kind, 'lock');
    if (media?.timing.kind === 'lock') assert.equal(media.timing.refId, 'other');
  });

  it('gives a sequence media track the summed length of its scene blocks', () => {
    const tree = loadInstanceTree({
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
      presets: [
        {
          id: 'base',
          label: 'Base',
          presetId: 'base-scene',
          presetType: 'full',
          presetInputData: { trackType: 'sequence', start: 0 },
        },
        {
          id: 'media',
          label: 'Media',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: {
            trackType: 'sequence',
            start: 2,
            mediaItems: {
              items: [
                { type: 'video', rangeString: '0:10-0:20' },
                { type: 'video', rangeString: '1:00-1:05,1:10-1:12' },
              ],
            },
          },
        },
      ],
    } as never);
    const media = tree.children.find((child) => child.id === 'media');
    assert.equal(media?.timing.kind, 'explicit');
    if (media?.timing.kind === 'explicit') {
      assert.equal(media.timing.start, 2);
      assert.equal(media.timing.duration, 10 + 5 + 2);
    }
    const { nodes, diagnostics } = resolveTiming(tree);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('base')?.duration, 17);
    assert.equal(nodes.get('media')?.duration, 17);
    assert.equal(nodes.get('media')?.start, 0);
  });

  it('ranges a scene from its children and a media track from its items', () => {
    const tree = loadInstanceTree({
      id: 'tl',
      projectId: 'p',
      displayName: 'Cut',
      isOwned: true,
      presets: [
        {
          id: 'base',
          label: 'Base',
          presetId: 'base-scene',
          presetType: 'full',
          presetInputData: { trackType: 'autoRange', start: 3, duration: 20 },
        },
        {
          id: 'clip',
          label: 'Clip',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: { start: 4, duration: 2 },
        },
        {
          id: 'titles',
          label: 'Titles',
          presetId: 'media-track',
          presetType: 'children',
          presetInputData: {
            trackType: 'autoRange',
            start: 9,
            duration: 1,
            mediaItems: {
              items: [
                { type: 'video', rangeString: '0:12-0:16' },
                { type: 'video', rangeString: '0:04-0:06' },
              ],
            },
          },
        },
      ],
    } as never);
    assert.deepEqual(tree.timing, { kind: 'autoRange' });
    const titles = tree.children.find((child) => child.id === 'titles');
    assert.equal(titles?.timing.kind, 'explicit');
    if (titles?.timing.kind === 'explicit') {
      assert.equal(titles.timing.start, 4);
      assert.equal(titles.timing.duration, 12);
    }
    const { nodes, diagnostics } = resolveTiming(tree);
    assert.equal(diagnostics.filter((item) => item.nodeId === 'base').length, 0);
    assert.equal(nodes.get('base')?.start, 4);
    assert.equal(nodes.get('base')?.duration, 12);
    assert.equal(nodes.get('clip')?.absoluteStart, 4);
    assert.equal(nodes.get('titles')?.absoluteStart, 4);
  });
});

describe('sceneBlocksFromMediaInput', () => {
  it('packs sequence scenes by child length and keeps aligned ranges in place', () => {
    const sequence = sceneBlocksFromMediaInput({
      trackType: 'sequence',
      mediaItems: {
        items: [
          { type: 'video', name: 'Intro', rangeString: '0:10-0:20' },
          { type: 'image', rangeString: '1:00-1:05,1:10-1:12' },
        ],
      },
    });
    assert.equal(sequence.sequence, true);
    assert.equal(sequence.complete, true);
    assert.equal(sequence.duration, 17);
    assert.deepEqual(
      sequence.blocks.map((block) => [block.start, block.duration]),
      [
        [0, 10],
        [10, 5],
        [15, 2],
      ],
    );

    const aligned = sceneBlocksFromMediaInput({
      trackType: 'aligned',
      mediaItems: {
        items: [{ type: 'video', rangeString: '0:10-0:20,0:30-0:35' }],
      },
    });
    assert.equal(aligned.sequence, false);
    assert.deepEqual(
      aligned.blocks.map((block) => [block.start, block.duration]),
      [
        [10, 10],
        [30, 5],
      ],
    );
    assert.equal(aligned.duration, 35);

    const alignedFile = sceneBlocksFromMediaInput(
      {
        trackType: 'aligned',
        start: 4,
        mediaItems: {
          items: [
            { type: 'audio', name: 'Bed', src: 'https://cdn.example/bed.mp3' },
            { type: 'video', name: 'Cut', duration: 6 },
          ],
        },
      },
      { 0: 12.5 },
    );
    assert.equal(alignedFile.sequence, false);
    assert.equal(alignedFile.complete, true);
    assert.equal(alignedFile.trackStart, 4);
    assert.equal(alignedFile.duration, 12.5);
    assert.deepEqual(
      alignedFile.blocks.map((block) => [block.start, block.duration, block.label]),
      [
        [0, 12.5, 'Bed'],
        [0, 6, 'Cut'],
      ],
    );

    const shifted = sceneBlocksFromMediaInput(
      {
        trackType: 'aligned',
        mediaItems: {
          items: [{ type: 'audio', name: 'Bed', start: 3 }],
        },
      },
      { 0: 12.5 },
    );
    assert.deepEqual(
      shifted.blocks.map((block) => [block.start, block.duration, block.itemIndex]),
      [[3, 12.5, 0]],
    );

    const audio = sceneBlocksFromMediaInput(
      {
        trackType: 'sequence',
        start: 0,
        mediaItems: {
          items: [{ type: 'audio', name: 'Voice', src: 'https://cdn.example/a.mp3' }],
        },
      },
      { 0: 12.5 },
    );
    assert.equal(audio.sequence, true);
    assert.equal(audio.complete, true);
    assert.equal(audio.duration, 12.5);
    assert.deepEqual(
      audio.blocks.map((block) => [block.start, block.duration, block.label]),
      [[0, 12.5, 'Voice']],
    );
    assert.equal(
      sequenceLengthFromInput(
        {
          trackType: 'sequence',
          start: 0,
          mediaItems: {
            items: [{ type: 'audio', name: 'Voice' }],
          },
        },
        { 0: 12.5 },
      ),
      12.5,
    );
    assert.equal(
      sequenceLengthFromInput(
        {
          trackType: 'sequence',
          start: 0,
          mediaItems: { items: [{ type: 'audio' }] },
        },
        undefined,
        12.5,
      ),
      12.5,
    );

    const autoRange = sceneBlocksFromMediaInput({
      trackType: 'autoRange',
      start: 40,
      mediaItems: {
        items: [
          { type: 'video', rangeString: '0:30-0:35' },
          { type: 'video', name: 'Open', rangeString: '0:10-0:20' },
          { type: 'image', duration: 99 },
        ],
      },
    });
    assert.equal(autoRange.mode, 'autoRange');
    assert.equal(autoRange.sequence, false);
    assert.equal(autoRange.trackStart, 10);
    assert.equal(autoRange.duration, 25);
    assert.deepEqual(
      autoRange.blocks.map((block) => [block.start, block.duration]),
      [
        [30, 5],
        [10, 10],
      ],
    );
  });
});

describe('media track window', () => {
  it('keeps the end put when the head is trimmed', () => {
    assert.equal(readStartOffset({ startOffset: -3 }), -3);
    assert.equal(readStartOffset({ startOffset: 2 }), 0);
    assert.deepEqual(visibleSpan(4, 10, -2), { start: 6, duration: 8 });
    assert.deepEqual(visibleSpan(4, 10, 0), { start: 4, duration: 10 });
    assert.equal(nextStartOffset(0, 10, 2, 0.05), -2);
    assert.equal(nextStartOffset(-2, 10, -2, 0.05), 0);
    assert.equal(placedOrigin(4, 10, -2, { start: 8, duration: 8 }), 6);
    assert.equal(placedOrigin(4, 10, -2, { start: 7, duration: 7 }), 4);
    assert.equal(atomContentEnd({ trackType: 'aligned', mediaItems: { items: [{ duration: 6, start: 3 }] } }, 4), 13);
  });

  it('writes aligned atom edits onto the item or its single range', () => {
    const cropped = patchMediaAtom(
      { mediaItems: { items: [{ type: 'audio', start: 0, duration: 10 }] } },
      0,
      { start: 2, duration: 8, cropDelta: 2 },
    ) as { mediaItems: { items: Array<Record<string, number>> } };
    assert.deepEqual(cropped.mediaItems.items[0], {
      type: 'audio',
      start: 2,
      duration: 8,
      startCropVideo: 2,
    });

    const ranged = patchMediaAtom(
      { mediaItems: { items: [{ rangeString: '0:10-0:20' }] } },
      0,
      { start: 12, duration: 5 },
    ) as { mediaItems: { items: Array<{ rangeString: string }> } };
    assert.equal(ranged.mediaItems.items[0]?.rangeString, '0:12-0:17');

    const many = patchMediaAtom(
      { mediaItems: { items: [{ rangeString: '0:10-0:20,0:30-0:35' }] } },
      0,
      { start: 1, duration: 1 },
    ) as { mediaItems: { items: Array<{ rangeString: string }> } };
    assert.equal(many.mediaItems.items[0]?.rangeString, '0:10-0:20,0:30-0:35');

    const locked = patchMediaAtom(
      {
        mediaItems: {
          items: [{ rangeString: '0:10-0:20', lockTo: 'audio-track' }],
        },
      },
      0,
      { start: 12, duration: 5 },
    ) as { mediaItems: { items: Array<{ rangeString: string; lockTo: string }> } };
    assert.equal(locked.mediaItems.items[0]?.rangeString, '0:10-0:20');
    assert.equal(locked.mediaItems.items[0]?.lockTo, 'audio-track');
  });

  it('ignores an item range when lockTo is set', () => {
    const locked = sceneBlocksFromMediaInput({
      trackType: 'aligned',
      mediaItems: {
        items: [
          { type: 'video', lockTo: 'audio-track', rangeString: '0:10-0:20' },
          { type: 'video', duration: 6 },
        ],
      },
    });
    assert.equal(locked.complete, false);
    assert.deepEqual(
      locked.blocks.map((block) => [block.start, block.duration]),
      [[0, 6]],
    );
  });

  it('keeps an item range when only fitDurationTo is set', () => {
    const ranged = sceneBlocksFromMediaInput({
      trackType: 'aligned',
      mediaItems: {
        items: [
          {
            type: 'video',
            fitDurationTo: 'audio-track',
            rangeString: '0:10-0:20,0:30-0:35',
          },
        ],
      },
    });
    assert.deepEqual(
      ranged.blocks.map((block) => [block.start, block.duration]),
      [
        [10, 10],
        [30, 5],
      ],
    );
  });

  it('places imageloop images like an aligned media track', () => {
    const aligned = sceneBlocksFromMediaInput({
      trackType: 'aligned',
      start: 2,
      images: {
        items: [
          { name: 'Wide', rangeString: '0:10-0:20' },
          { rangeString: '0:30-0:35,0:40-0:42' },
        ],
      },
    });
    assert.equal(aligned.mode, 'aligned');
    assert.equal(aligned.sequence, false);
    assert.equal(aligned.trackStart, 2);
    assert.equal(aligned.duration, 42);
    assert.deepEqual(
      aligned.blocks.map((block) => [block.start, block.duration, block.label]),
      [
        [10, 10, 'Wide'],
        [30, 5, 'Image 2 1'],
        [40, 2, 'Image 2 2'],
      ],
    );

    const shifted = sceneBlocksFromMediaInput({
      trackType: 'aligned',
      images: [{ name: 'Still', start: 3, duration: 4 }],
    });
    assert.deepEqual(
      shifted.blocks.map((block) => [block.start, block.duration, block.label]),
      [[3, 4, 'Still']],
    );

    const byDuration = sceneBlocksFromMediaInput({
      trackType: 'sequence',
      duration: 9,
      images: { items: [{}, {}, {}] },
    });
    assert.equal(byDuration.sequence, true);
    assert.equal(byDuration.complete, true);
    assert.equal(byDuration.duration, 9);
    assert.deepEqual(
      byDuration.blocks.map((block) => [block.start, block.duration]),
      [
        [0, 3],
        [3, 3],
        [6, 3],
      ],
    );

    const byImage = sceneBlocksFromMediaInput({
      trackType: 'sequence',
      perImageDuration: 2,
      images: { items: [{ name: 'A' }, { name: 'B', rangeString: '0:00-0:05' }] },
    });
    assert.equal(byImage.complete, true);
    assert.equal(byImage.duration, 7);
    assert.deepEqual(
      byImage.blocks.map((block) => [block.start, block.duration, block.label]),
      [
        [0, 2, 'A'],
        [2, 5, 'B'],
      ],
    );
    assert.equal(
      sequenceLengthFromInput({
        trackType: 'sequence',
        perImageDuration: 2,
        images: { items: [{}, {}] },
      }),
      4,
    );

    const missing = sceneBlocksFromMediaInput({
      trackType: 'sequence',
      images: { items: [{ name: 'A' }] },
    });
    assert.equal(missing.complete, false);
    assert.equal(missing.blocks.length, 0);

    const locked = sceneBlocksFromMediaInput({
      trackFitDurationTo: 'audio-track',
      images: [{ rangeString: '0:00-0:04' }],
    });
    assert.equal(locked.mode, 'lockedTo');
    assert.equal(locked.blocks.length, 0);

    const rangedLegacy = sceneBlocksFromMediaInput({
      images: [{ rangeString: '0:01-0:03' }],
    });
    assert.equal(rangedLegacy.mode, 'aligned');
    assert.equal(rangedLegacy.blocks[0]?.duration, 2);
  });

  it('places waveform, text, html blocks, and the second counter on the timeline', () => {
    const waveform = sceneBlocksForPreset('waveform-audio', {
      trackFitDurationTo: 'audio-track',
      audio: { duration: 12 },
    });
    assert.equal(waveform.mode, 'lockedTo');
    assert.equal(waveform.blocks.length, 0);

    const text = sceneBlocksForPreset('text-overlay', {
      transitions: { startOffset: 7, duration: 8 },
    });
    assert.equal(text.mode, 'aligned');
    assert.equal(text.trackStart, 7);
    assert.equal(text.duration, 8);
    assert.deepEqual(
      text.blocks.map((block) => [block.start, block.duration, block.label]),
      [[0, 8, 'Text']],
    );

    const html = sceneBlocksForPreset('htmlBlockAtom', {
      ranges: ['0:00-2:00', '5:00-7:00'],
    });
    assert.equal(html.mode, 'aligned');
    assert.equal(html.duration, 420);
    assert.deepEqual(
      html.blocks.map((block) => [block.start, block.duration, block.label]),
      [
        [0, 120, 'Block 1'],
        [300, 120, 'Block 2'],
      ],
    );

    const counter = sceneBlocksForPreset('second-counter', {
      trackType: 'sequence',
      rangeString: '0:00-0:03,1:00-1:02',
    });
    assert.equal(counter.sequence, true);
    assert.equal(counter.duration, 5);
    assert.deepEqual(
      counter.blocks.map((block) => [block.start, block.duration]),
      [
        [0, 3],
        [3, 2],
      ],
    );
  });

  it('writes an imageloop atom edit onto the image, without a source crop', () => {
    const patched = patchMediaAtom(
      { images: { items: [{ src: 'a.png', start: 0, duration: 4 }] } },
      0,
      { start: 1, duration: 3, cropDelta: 1 },
    ) as { images: { items: Array<Record<string, unknown>> } };
    assert.deepEqual(patched.images.items[0], {
      src: 'a.png',
      start: 1,
      duration: 3,
    });
  });

  it('draws loop and shake ranges on each scene block, including a lock', () => {
    const aligned = sceneRelativeEffectAnchors(
      {
        trackType: 'aligned',
        images: {
          items: [
            { rangeString: '0:10-0:20' },
            { start: 3, duration: 2 },
          ],
        },
      },
      4,
    );
    assert.deepEqual(
      aligned.map((anchor) => [anchor.start, anchor.duration]),
      [
        [14, 10],
        [7, 2],
      ],
    );

    const locked = sceneRelativeEffectAnchors(
      {
        trackType: 'lockedTo',
        lock: 'audio',
        images: { items: [{ rangeString: '0:00-0:05' }] },
      },
      30,
      12,
    );
    assert.deepEqual(
      locked.map((anchor) => [anchor.start, anchor.duration]),
      [[30, 5]],
    );

    const windowOnly = sceneRelativeEffectAnchors(
      { trackType: 'lockedTo', lock: 'audio', images: { items: [{}] } },
      30,
      12,
    );
    assert.deepEqual(windowOnly, [{ start: 30, duration: 12 }]);
    assert.equal(absoluteToLocalEffectTime(32, windowOnly), 2);
    assert.equal(absoluteToLocalEffectTime(14, aligned), 0);
    assert.equal(absoluteToLocalEffectTime(16, aligned), 2);
  });
});

describe('applyTimingToPresetInput', () => {
  it('writes start and duration and drops the old track timing fields', () => {
    const next = applyTimingToPresetInput(
      { trackStartOffset: 3, trackDuration: 9, trackFitDurationTo: 'audio', trackType: 'aligned' },
      { kind: 'explicit', start: 1, duration: 5 },
    );
    assert.equal(next.start, 1);
    assert.equal(next.duration, 5);
    assert.equal(next.trackType, 'aligned');
    assert.equal('trackStartOffset' in next, false);
    assert.equal('trackDuration' in next, false);
    assert.equal('trackFitDurationTo' in next, false);
    assert.equal('lock' in next, false);
  });
});

describe('stampInstanceTiming', () => {
  it('writes the track window and leaves a looping VideoAtom untouched', () => {
    const root = node({
      id: 'track-1',
      timing: { kind: 'explicit', start: 1, duration: 10 },
    });
    const resolved = new Map([
      [
        'track-1',
        {
          start: 1,
          duration: 10,
          absoluteStart: 1,
          parentAbsoluteStart: 0,
          locked: false,
        },
      ],
    ]);
    const video = {
      id: 'vid',
      componentId: 'VideoAtom',
      _presetItemId: 'track-1',
      data: { src: 'a.mp4', loop: true, srcDuration: 99 },
      context: { timing: { duration: 4, fitDurationTo: 'this' } },
      childrenData: [],
    };
    const tree = [
      {
        id: 'clips',
        componentId: 'BaseLayout',
        _presetItemId: 'track-1',
        data: {},
        context: { timing: { duration: 4, fitDurationTo: 'this' } },
        childrenData: [video],
      },
    ];
    stampInstanceTiming(tree, root, resolved);
    const timing = tree[0].context.timing as {
      duration?: number;
      start?: number;
      fitDurationTo?: string;
    };
    assert.equal(timing.duration, 10);
    assert.equal(timing.start, 1);
    assert.equal(timing.fitDurationTo, undefined);
    assert.equal(video.data.srcDuration, 99);
    assert.equal(video.data.loop, true);
    assert.equal(video.context.timing.duration, 4);
    assert.equal(video.context.timing.fitDurationTo, 'this');
  });

  it('keeps a trailing probed clip in the base scene length', () => {
    const root = node({
      id: 'base-scene-0',
      presetId: 'base-scene',
      role: 'scene',
      arrangement: 'sequence',
      timing: { kind: 'hug', start: 0 },
      children: [
        node({
          id: 'audio-scene',
          presetId: 'scene',
          role: 'scene',
          arrangement: 'autoRange',
          timing: { kind: 'autoRange' },
          children: [
            node({ id: 'audio-track', timing: { kind: 'intrinsic', start: 0 } }),
          ],
        }),
        node({ id: 'ending', timing: { kind: 'intrinsic', start: 0 } }),
      ],
    });
    const ending = {
      id: 'media-track',
      type: 'scene',
      _presetItemId: 'ending',
      context: {
        timing: {
          start: 0,
          duration: 10.416666666666666,
          startInFrames: 0,
          durationInFrames: 313,
        },
      },
      childrenData: [
        {
          id: 'media-track-video-0',
          componentId: 'VideoAtom',
          _presetItemId: 'ending',
          data: { loop: false },
          context: { timing: { duration: 10.416666666666666 } },
          childrenData: [],
        },
      ],
    };
    const compiled = [
      {
        id: 'BaseScene',
        type: 'scene',
        _presetItemId: 'base-scene-0',
        context: {
          timing: { start: 0, duration: 409.008, startInFrames: 0, durationInFrames: 12270 },
        },
        childrenData: [
          {
            id: 'audio-scene',
            type: 'layout',
            _presetItemId: 'audio-scene',
            context: { timing: { duration: 409.008, startInFrames: 0, durationInFrames: 12270 } },
            childrenData: [
              {
                id: 'audio-track',
                type: 'scene',
                _presetItemId: 'audio-track',
                context: { timing: { duration: 409.008 } },
                childrenData: [
                  {
                    id: 'audio-track-audio-0',
                    componentId: 'AudioAtom',
                    _presetItemId: 'audio-track',
                    context: { timing: { duration: 409.008 } },
                    childrenData: [],
                  },
                ],
              },
            ],
          },
          ending,
        ],
      },
    ];
    const intrinsic = collectIntrinsicDurations(compiled);
    const { nodes, diagnostics } = resolveTiming(root, { intrinsicDurations: intrinsic });
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('ending')?.start, 409.008);
    assert.equal(nodes.get('ending')?.duration, 10.416666666666666);
    const sceneDuration = nodes.get('base-scene-0')?.duration ?? 0;
    assert.ok(Math.abs(sceneDuration - (409.008 + 10.416666666666666)) < 1e-9);
    stampInstanceTiming(compiled, root, nodes);
    assert.equal(fittedDuration(compiled, 'BaseScene'), sceneDuration);
    assert.equal(ending.context.timing.start, 409.008);
    assert.equal(ending.context.timing.startInFrames, undefined);
    assert.equal(ending.context.timing.durationInFrames, undefined);
  });

  it('uses one probed audio file as the sequence scene length', () => {
    const input = {
      trackType: 'sequence',
      start: 0,
      mediaItems: {
        items: [{ type: 'audio', name: 'Voice', src: 'https://cdn.example/a.mp3' }],
      },
    };
    const compiled = [
      {
        id: 'voice',
        type: 'scene',
        componentId: 'BaseLayout',
        _presetItemId: 'media',
        context: { timing: { start: 0 } },
        childrenData: [
          {
            id: 'voice-audio-0',
            componentId: 'AudioAtom',
            _presetItemId: 'media',
            context: { timing: { duration: 12.5 } },
            childrenData: [],
          },
        ],
      },
    ];
    const root = node({
      id: 'base',
      role: 'scene',
      arrangement: 'sequence',
      presetId: 'base-scene',
      timing: { kind: 'hug', start: 0 },
      children: [
        node({
          id: 'media',
          input,
          timing: { kind: 'intrinsic', start: 0 },
        }),
      ],
    });
    assert.equal(collectMediaItemDurations(compiled, 'media')[0], 12.5);
    assert.equal(collectIntrinsicDurations(compiled).media, 12.5);
    assert.equal(
      estimateSequenceDuration({
        input,
        presetId: 'media',
        root,
        compiledChildren: compiled,
      }),
      12.5,
    );
    const { nodes, diagnostics } = resolveTiming(root, {
      intrinsicDurations: collectIntrinsicDurations(compiled),
    });
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('media')?.start, 0);
    assert.equal(nodes.get('media')?.duration, 12.5);
    assert.equal(nodes.get('base')?.duration, 12.5);
    assert.equal(latestSpanEnd(root, {
      intrinsicDurations: collectIntrinsicDurations(compiled),
    }), 12.5);
  });

  it('lists sibling and ancestor names for a lock dropdown', () => {
    const root = node({
      id: 'base',
      name: 'Base Scene',
      role: 'scene',
      arrangement: 'aligned',
      timing: { kind: 'explicit', start: 0, duration: 10 },
      children: [
        node({
          id: 'a',
          name: 'A',
          input: { trackName: 'intro' },
          timing: { kind: 'explicit', start: 0, duration: 2 },
        }),
        node({
          id: 'nested',
          name: 'Nested',
          role: 'scene',
          arrangement: 'aligned',
          input: { trackName: 'middle' },
          timing: { kind: 'explicit', start: 0, duration: 4 },
          children: [
            node({
              id: 'b',
              name: 'B',
              input: { trackName: 'verse' },
              timing: { kind: 'explicit', start: 0, duration: 2 },
            }),
            node({
              id: 'c',
              name: 'C',
              input: { trackName: 'chorus' },
              timing: { kind: 'explicit', start: 0, duration: 2 },
            }),
          ],
        }),
      ],
    });
    assert.deepEqual(lockTargetNames(root, 'b'), ['chorus', 'middle']);
    assert.deepEqual(lockTargetNames(root, 'a'), ['middle']);
    assert.deepEqual(lockTargetNames(root, 'nested'), ['chorus', 'intro', 'verse']);
    assert.deepEqual(lockTargetNames(root, 'base'), ['chorus', 'intro', 'middle', 'verse']);
  });
});

describe('moveNode', () => {
  const timing = { kind: 'explicit' as const, start: 0, duration: 2 };

  it('nests a block under a scene and refuses a cycle', () => {
    const root = node({
      id: 'base',
      role: 'scene',
      presetId: 'base-scene',
      timing,
      children: [
        node({
          id: 'scene',
          role: 'scene',
          presetId: 'scene',
          timing,
          children: [
            node({ id: 'inner', role: 'scene', presetId: 'scene', timing }),
          ],
        }),
        node({ id: 'clip', timing }),
      ],
    });
    const nested = moveNode(root, 'clip', 'scene', Number.MAX_SAFE_INTEGER);
    assert.deepEqual(nested.children.map((child) => child.id), ['scene']);
    assert.deepEqual(
      nested.children[0]?.children.map((child) => child.id),
      ['inner', 'clip'],
    );
    const cycled = moveNode(nested, 'scene', 'inner', 0);
    assert.equal(cycled, nested);
  });
});
