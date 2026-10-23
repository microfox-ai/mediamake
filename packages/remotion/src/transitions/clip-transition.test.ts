import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  attachCompiledTransitions,
  catalogForTarget,
  compileClipTransitions,
  copyTransitionToOtherEdge,
  normalizeClipTransitions,
  transitionsAfterSplit,
  transitionsFromHost,
  volumeGainAt,
  type ClipTransition,
} from './clip-transition';

const fadeIn: ClipTransition = {
  id: 'enter',
  type: 'fade',
  edge: 'in',
  duration: 0.4,
  easing: 'linear',
  amount: 1,
};

const slideOut: ClipTransition = {
  id: 'exit',
  type: 'slide-left',
  edge: 'out',
  duration: 0.6,
  easing: 'spring',
  amount: 1,
  linkId: 'both',
};

describe('compileClipTransitions', () => {
  it('places an enter at 0 and releases the resting image', () => {
    const { effects } = compileClipTransitions({
      transitions: [fadeIn],
      clipDuration: 3,
      targetId: 'shot',
      target: 'image',
    });
    assert.equal(effects.length, 1);
    assert.equal(effects[0]?.id, 'transition:enter');
    assert.equal(effects[0]?.data.start, 0);
    assert.equal(effects[0]?.data.duration, 0.4);
    assert.equal(effects[0]?.data.inactiveBehavior, 'none');
    assert.equal(effects[0]?.data.origin, 'transition');
    assert.deepEqual(effects[0]?.data.targetIds, ['shot']);
    assert.deepEqual(effects[0]?.data.ranges, [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ]);
  });

  it('pins an exit to the end and holds the end state', () => {
    const { effects } = compileClipTransitions({
      transitions: [slideOut],
      clipDuration: 3,
      targetId: 'shot',
      target: 'image',
    });
    assert.equal(effects[0]?.data.start, 2.4);
    assert.equal(effects[0]?.data.duration, 0.6);
    assert.equal(effects[0]?.data.inactiveBehavior, 'hold-end');
    assert.equal(effects[0]?.data.type, 'spring');
  });

  it('stacks several transitions on the same edge', () => {
    const { effects } = compileClipTransitions({
      transitions: [
        fadeIn,
        { ...fadeIn, id: 'blur', type: 'blur', duration: 0.2 },
      ],
      clipDuration: 3,
      targetId: 'shot',
      target: 'text',
    });
    assert.equal(effects.length, 2);
    assert.equal(effects[1]?.data.ranges[0]?.key, 'blur');
  });

  it('caps duration to the clip and skips an exit when the clip has no length', () => {
    const capped = compileClipTransitions({
      transitions: [{ ...fadeIn, duration: 4 }],
      clipDuration: 1,
      targetId: 'shot',
      target: 'video',
    });
    assert.equal(capped.effects[0]?.data.duration, 1);

    const noLength = compileClipTransitions({
      transitions: [slideOut],
      clipDuration: 0,
      targetId: 'shot',
      target: 'video',
    });
    assert.equal(noLength.effects.length, 0);
  });

  it('turns an audio fade into a volume envelope and hides slide', () => {
    const compiled = compileClipTransitions({
      transitions: [
        { ...fadeIn, type: 'fade' },
        { ...slideOut, edge: 'in', type: 'slide-left' },
      ],
      clipDuration: 2,
      targetId: 'bed',
      target: 'audio',
    });
    assert.equal(compiled.effects.length, 0);
    assert.deepEqual(compiled.volumeEnvelope, {
      fades: [{ edge: 'in', duration: 0.4, amount: 1 }],
    });
    assert.equal(catalogForTarget('audio').every((entry) => entry.id === 'fade'), true);
    assert.equal(catalogForTarget('image').some((entry) => entry.id === 'slide-left'), true);
  });
});

describe('normalizeClipTransitions', () => {
  it('expands an imageloop in-and-out object into two linked records', () => {
    const list = normalizeClipTransitions([
      {
        id: 'wipe',
        timing: 'in&out',
        animation: 'fade',
        impact: 0.5,
        animationType: 'bezier',
        inRange: 0.2,
        outRange: 0.3,
      },
    ]);
    assert.equal(list.length, 2);
    assert.equal(list[0]?.edge, 'in');
    assert.equal(list[0]?.duration, 0.2);
    assert.equal(list[1]?.edge, 'out');
    assert.equal(list[1]?.duration, 0.3);
    assert.equal(list[0]?.linkId, list[1]?.linkId);
    assert.equal(list[0]?.easing, 'bezier');
    assert.equal(list[0]?.amount, 0.5);
  });

  it('prefers the authored list over a legacy field', () => {
    const list = transitionsFromHost({
      transitions: [fadeIn],
      transitionEffects: [{ timing: 'out', animation: 'blur' }],
    });
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, 'enter');
  });
});

describe('attachCompiledTransitions', () => {
  it('keeps an exit pinned when the clip duration changes', () => {
    const first = attachCompiledTransitions({
      id: 'title',
      componentId: 'TextAtom',
      transitions: [slideOut],
      context: { timing: { duration: 4 } },
      effects: [{ id: 'pan', componentId: 'pan', data: {} }],
    });
    const exit = first.effects?.find((effect) =>
      typeof effect === 'object' && effect.id === 'transition:exit',
    );
    assert.equal(
      exit && typeof exit === 'object' ? exit.data?.start : undefined,
      3.4,
    );

    const trimmed = attachCompiledTransitions({
      ...first,
      context: { timing: { duration: 2 } },
    });
    const next = trimmed.effects?.find((effect) =>
      typeof effect === 'object' && effect.id === 'transition:exit',
    );
    assert.equal(
      next && typeof next === 'object' ? next.data?.start : undefined,
      1.4,
    );
    assert.equal(
      trimmed.effects?.some((effect) =>
        typeof effect === 'object' && effect.id === 'pan',
      ),
      true,
    );
  });

  it('writes an audio envelope and leaves the static volume in place', () => {
    const node = attachCompiledTransitions({
      id: 'bed',
      componentId: 'AudioAtom',
      transitions: [fadeIn],
      data: { src: 'a.mp3', volume: 0.4 },
      context: { timing: { duration: 2 } },
    });
    assert.equal(node.effects?.length, 0);
    assert.equal(node.data?.volume, 0.4);
    assert.equal(
      (node.data?.volumeEnvelope as { fades: { edge: string }[] }).fades[0]?.edge,
      'in',
    );
  });
});

describe('transitionsAfterSplit', () => {
  it('drops the exit on the left half and the enter on the right half', () => {
    const list = [fadeIn, slideOut];
    assert.deepEqual(
      transitionsAfterSplit(list, 'left').map((transition) => transition.edge),
      ['in'],
    );
    assert.deepEqual(
      transitionsAfterSplit(list, 'right').map((transition) => transition.edge),
      ['out'],
    );
  });
});

describe('volumeGainAt', () => {
  it('fades in from silence and out to silence', () => {
    const fades = [
      { edge: 'in' as const, duration: 1, amount: 1 },
      { edge: 'out' as const, duration: 1, amount: 1 },
    ];
    assert.equal(volumeGainAt(0, 4, fades), 0);
    assert.equal(volumeGainAt(1, 4, fades), 1);
    assert.equal(volumeGainAt(3, 4, fades), 1);
    assert.equal(volumeGainAt(4, 4, fades), 0);
  });
});

describe('copyTransitionToOtherEdge', () => {
  it('adds the other edge when nothing is linked yet', () => {
    const next = copyTransitionToOtherEdge([fadeIn], fadeIn.id);
    assert.equal(next.length, 2);
    assert.equal(next[1]?.edge, 'out');
    assert.equal(next[0]?.linkId, next[1]?.linkId);
    assert.equal(next[1]?.type, 'fade');
  });
});
