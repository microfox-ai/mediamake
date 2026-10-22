import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyCaptionSnapshots,
  captionIdsChanged,
  captionSnapshotsFromTimeline,
  captionValueKey,
  clearLocalCaptionOwnership,
  localCaptionMatches,
  rememberLocalCaptions,
  timelineWithoutCaptionBodies,
} from './caption-local-history';

const line = (text: string) => ({ id: 'line-1', text });

function timelineWith(text: string) {
  return {
    defaultData: {
      references: [
        {
          key: 'lyrics',
          type: 'captions' as const,
          value: {
            _id: 'cap-1',
            title: 'Hook',
            description: '',
            sourceTranscriptionId: 'tr-1',
            captions: [line(text)],
          },
        },
        { key: 'other', type: 'object' as const, value: { name: 'keep' } },
      ],
    },
  };
}

describe('caption local history', () => {
  it('keeps caption lines beside the timeline and puts them back', () => {
    const timeline = timelineWith('hello');
    const snapshots = captionSnapshotsFromTimeline(timeline);
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0]?.id, 'cap-1');
    assert.deepEqual(snapshots[0]?.captions, [line('hello')]);

    const stored = timelineWithoutCaptionBodies(timeline);
    assert.equal(stored.defaultData.references[0]?.value?.captions, undefined);
    assert.equal(stored.defaultData.references[1]?.value?.name, 'keep');

    const restored = applyCaptionSnapshots(stored, snapshots);
    assert.deepEqual(restored.defaultData.references[0]?.value?.captions, [line('hello')]);
    assert.equal(restored.defaultData.references[0]?.value?.sourceTranscriptionId, 'tr-1');

    const unsaved = {
      defaultData: {
        references: [
          {
            type: 'captions' as const,
            value: { title: 'Draft', captions: [line('keep me')] },
          },
        ],
      },
    };
    assert.deepEqual(
      timelineWithoutCaptionBodies(unsaved).defaultData.references[0]?.value?.captions,
      [line('keep me')],
    );
  });

  it('notices caption edits and ignores an unchanged document', () => {
    const before = timelineWith('hello');
    const after = timelineWith('hello world');
    assert.deepEqual(captionIdsChanged(before, after), ['cap-1']);
    assert.deepEqual(captionIdsChanged(before, timelineWith('hello')), []);
  });

  it('owns the local caption key so a server copy cannot replace it', () => {
    clearLocalCaptionOwnership();
    const timeline = timelineWith('edited');
    rememberLocalCaptions(timeline, new Set(['cap-1']));
    const key = captionValueKey(timeline.defaultData.references[0]?.value);
    assert.equal(localCaptionMatches('cap-1', key), true);
    assert.equal(localCaptionMatches('cap-1', captionValueKey({ _id: 'cap-1', captions: [] })), false);
    assert.equal(localCaptionMatches('other', key), false);
    clearLocalCaptionOwnership();
    assert.equal(localCaptionMatches('cap-1', key), false);
  });
});
