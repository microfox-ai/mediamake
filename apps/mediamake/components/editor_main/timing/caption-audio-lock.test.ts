import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { autoAudioLock } from './caption-audio-lock';
import { applyTimingToPresetInput, findNode, loadInstanceTree } from './load-instance-tree';
import { resolveTiming } from './resolve-timing';

const song = { type: 'audio', src: 'https://cdn.test/song.mp3' };

function timeline(presets: unknown[]) {
  return loadInstanceTree({
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
        presetInputData: { duration: 30, arrangement: 'aligned' },
      },
      ...(presets as object[]),
    ],
  } as never);
}

const subs = (input: Record<string, unknown> = {}) => ({
  id: 'subs',
  label: 'Subs',
  presetId: 'sub-vertical-float',
  presetType: 'children',
  presetInputData: { inputCaptions: 'data:[captions]', ...input },
});

describe('caption auto lock', () => {
  it('follows the only audio file after an intro', () => {
    const tree = timeline([
      {
        id: 'intro',
        presetId: 'media-track',
        presetType: 'children',
        presetInputData: { trackName: 'intro', start: 0, duration: 4 },
      },
      {
        id: 'audio',
        presetId: 'media-track',
        presetType: 'children',
        presetInputData: { trackName: 'song', start: 4, duration: 10, mediaItems: [song] },
      },
      subs(),
    ]);
    assert.deepEqual(findNode(tree, 'subs')?.timing, { kind: 'lock', refId: 'audio', auto: true });
    const { nodes, diagnostics } = resolveTiming(tree);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('subs')?.start, 4);
    assert.equal(nodes.get('subs')?.duration, 10);
  });

  it('reaches audio inside a sequence scene elsewhere in the tree', () => {
    const tree = timeline([
      {
        id: 'main',
        presetId: 'scene',
        presetType: 'children',
        presetInputData: { trackName: 'main', trackType: 'sequence' },
      },
      {
        id: 'intro',
        presetId: 'media-track',
        presetType: 'children',
        presetInputData: { parentId: 'main', trackName: 'intro', duration: 4 },
      },
      {
        id: 'audio',
        presetId: 'media-track',
        presetType: 'children',
        presetInputData: { parentId: 'main', trackName: 'song', duration: 10, mediaItems: [song] },
      },
      subs(),
    ]);
    const { nodes, diagnostics } = resolveTiming(tree);
    assert.equal(diagnostics.length, 0);
    assert.equal(nodes.get('audio')?.absoluteStart, 4);
    assert.equal(nodes.get('subs')?.absoluteStart, 4);
    assert.equal(nodes.get('subs')?.duration, 10);
  });

  it('starts at the audio item when an intro clip shares its track', () => {
    const tree = timeline([
      {
        id: 'audio',
        presetId: 'media-track',
        presetType: 'children',
        presetInputData: {
          trackName: 'song',
          trackType: 'sequence',
          duration: 14,
          mediaItems: [{ type: 'video', src: 'https://cdn.test/intro.mp4', duration: 4 }, { ...song, duration: 10 }],
        },
      },
      subs(),
    ]);
    const { nodes } = resolveTiming(tree);
    assert.equal(nodes.get('subs')?.start, 4);
    assert.equal(nodes.get('subs')?.duration, 10);
  });

  it('stays off with two audio files or an authored track type', () => {
    const audio = (id: string) => ({
      id,
      presetId: 'media-track',
      presetType: 'children',
      presetInputData: { trackName: id, duration: 10, mediaItems: [song] },
    });
    assert.notEqual(findNode(timeline([audio('a'), audio('b'), subs()]), 'subs')?.timing.kind, 'lock');
    assert.notEqual(
      findNode(timeline([audio('a'), subs({ trackType: 'aligned' })]), 'subs')?.timing.kind,
      'lock',
    );
    assert.notEqual(findNode(timeline([audio('a'), subs({ start: 2, duration: 5 })]), 'subs')?.timing.kind, 'lock');
  });

  it('ignores muted, disabled, and non-caption presets', () => {
    const presets = [
      {
        id: 'audio',
        presetId: 'media-track',
        presetInputData: { mediaItems: [{ ...song, mute: true }] },
      },
      { id: 'other', presetId: 'media-track', disabled: true, presetInputData: { mediaItems: [song] } },
    ];
    assert.equal(autoAudioLock({ id: 'subs', presetId: 'sub-vertical-float' }, presets), null);
    assert.equal(
      autoAudioLock({ id: 'text', presetId: 'htmlBlockAtom' }, [
        { id: 'audio', presetId: 'media-track', presetInputData: { mediaItems: [song] } },
      ]),
      null,
    );
  });

  it('never writes the derived lock back onto the preset', () => {
    const next = applyTimingToPresetInput({ inputCaptions: [] }, { kind: 'lock', refId: 'audio', auto: true });
    assert.equal('lock' in next, false);
  });
});
