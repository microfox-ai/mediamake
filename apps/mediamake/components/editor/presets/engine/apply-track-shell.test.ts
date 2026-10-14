import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyTrackShell } from './apply-track-shell';
import { textAtomPreset } from '../registry/general/text-atom';

describe('applyTrackShell', () => {
  it('wraps a container in one BaseLayout and keeps the author children', () => {
    const output = applyTrackShell(
      {
        trackName: 'titles',
        trackType: 'sequence',
        start: 2,
        duration: 8,
        startOffset: -1,
        attachedToId: 'intro-scene',
      },
      {
        children: [{ id: 'child', componentId: 'TextAtom', type: 'atom' }],
        containerProps: { className: 'absolute' },
      },
      'container',
    );

    const root = output.output.childrenData?.[0] as unknown as {
      id: string;
      componentId: string;
      type: string;
      context: { timing: { start: number; duration?: number; startOffset?: number } };
      childrenData: { id: string }[];
      data: { containerProps: { className: string } };
    };
    assert.equal(root.componentId, 'BaseLayout');
    assert.equal(root.type, 'scene');
    assert.equal(root.id, 'titles');
    assert.equal(root.childrenData[0]?.id, 'child');
    assert.equal(root.context.timing.start, 2);
    assert.equal(root.context.timing.duration, 8);
    assert.equal(root.context.timing.startOffset, -1);
    assert.equal(root.data.containerProps.className, 'absolute');
    assert.equal(output.options?.attachedToId, 'intro-scene');
  });

  it('omits duration for a lock and for auto range', () => {
    const locked = applyTrackShell(
      { trackName: 'a', trackType: 'lockedTo', lock: 'b', duration: 10 },
      { children: [] },
      'container',
    );
    const auto = applyTrackShell(
      { trackName: 'a', trackType: 'autoRange', duration: 10 },
      { children: [] },
      'container',
    );
    const lockedTiming = (locked.output.childrenData?.[0] as { context: { timing: { duration?: number } } }).context.timing;
    const autoTiming = (auto.output.childrenData?.[0] as { context: { timing: { duration?: number } }; type: string }).context.timing;
    const autoType = (auto.output.childrenData?.[0] as { type: string }).type;
    assert.equal(lockedTiming.duration, undefined);
    assert.equal(autoTiming.duration, undefined);
    assert.equal(autoType, 'layout');
    assert.equal(locked.options?.attachedToId, 'BaseScene');
  });

  it('uses a returned duration only when the params have none', () => {
    const output = applyTrackShell(
      { trackName: 'blocks', trackType: 'aligned', start: 0 },
      { children: [], duration: 12 },
      'container',
    );
    const timing = (output.output.childrenData?.[0] as { context: { timing: { duration?: number } } }).context.timing;
    assert.equal(timing.duration, 12);
  });

  it('inserts an atom with timing and no layout', () => {
    const output = applyTrackShell(
      {
        trackName: 'hello',
        trackType: 'aligned',
        start: 1,
        duration: 4,
        attachedToId: 'SceneA',
      },
      {
        componentId: 'TextAtom',
        type: 'atom',
        data: { text: 'Hi' },
      },
      'atom',
    );
    const node = output.output.childrenData?.[0] as {
      id: string;
      componentId: string;
      type: string;
      data: { text: string; containerProps: { className: string } };
      context: { timing: { start: number; duration?: number } };
    };
    assert.equal(output.output.childrenData?.length, 1);
    assert.equal(node.componentId, 'TextAtom');
    assert.equal(node.type, 'atom');
    assert.equal(node.id, 'hello');
    assert.equal(node.context.timing.start, 1);
    assert.equal(node.context.timing.duration, 4);
    assert.deepEqual(node.data.containerProps, {
      style: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    });
    assert.equal(output.options?.attachedToId, 'SceneA');
    assert.equal(
      output.output.childrenData?.some((child) => child.componentId === 'BaseLayout'),
      false,
    );
  });

  it('reads legacy lock and track range aliases', () => {
    const output = applyTrackShell(
      { trackName: 'old', trackFitDurationTo: 'other', trackRange: '0:10-0:20' },
      { children: [] },
      'container',
    );
    const timing = (output.output.childrenData?.[0] as {
      context: { timing: { start: number; duration?: number } };
    }).context.timing;
    assert.equal(timing.start, 10);
    assert.equal(timing.duration, undefined);
  });
});

describe('text-atom preset', () => {
  it('exposes the shared track fields without declaring them in the build', () => {
    const properties = textAtomPreset.presetParams.properties as Record<string, { enum?: string[] }>;
    for (const key of [
      'trackName',
      'trackType',
      'lock',
      'start',
      'duration',
      'startOffset',
      'attachedToId',
      'text',
    ]) {
      assert.ok(properties[key], `missing ${key}`);
    }
    assert.equal(textAtomPreset.metadata.placement, 'atom');
    assert.equal(textAtomPreset.presetFunction.includes('trackName: z'), false);
    assert.deepEqual(properties.trackType?.enum, ['lockedTo', 'sequence', 'aligned']);

    const run = new Function(
      'data',
      'props',
      `return (${textAtomPreset.presetFunction})(data, props);`,
    );
    const params = {
      trackName: 'hello',
      text: 'Hi',
      start: 1,
      duration: 4,
      trackType: 'aligned',
      attachedToId: 'SceneA',
    };
    const built = run(params, {});
    const output = applyTrackShell(params, built, 'atom');
    const node = output.output.childrenData?.[0] as {
      componentId: string;
      id: string;
      type: string;
      data: { text: string; containerProps: { className: string } };
      context: { timing: { start: number; duration?: number } };
    };
    assert.equal(node.componentId, 'TextAtom');
    assert.equal(node.type, 'atom');
    assert.equal(node.id, 'hello');
    assert.equal(node.data.text, 'Hi');
    assert.deepEqual(node.data.containerProps, {
      style: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    });
    assert.equal(node.context.timing.start, 1);
    assert.equal(node.context.timing.duration, 4);
    assert.equal(output.options?.attachedToId, 'SceneA');
    assert.equal(
      output.output.childrenData?.some((child) => child.componentId === 'BaseLayout'),
      false,
    );
  });
});
