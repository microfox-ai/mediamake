import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadInstanceTree } from './load-instance-tree';
import { remapLocksOnPaste } from './paste-remap';
import { resolveTiming } from './resolve-timing';
import { stampInstanceTiming } from './stamp-timing';
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
});
