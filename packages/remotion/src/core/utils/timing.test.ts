import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seriesPlacement } from './timing';

describe('seriesPlacement', () => {
  it('packs a second sequence child with no extra offset', () => {
    const first = seriesPlacement({
      hasStart: true,
      startInFrames: 0,
      durationInFrames: 4123,
      packedCursor: 0,
    });
    assert.equal(first.offset, 0);
    assert.equal(first.nextCursor, 4123);

    const second = seriesPlacement({
      hasStart: true,
      startInFrames: 4123,
      durationInFrames: 8148,
      packedCursor: first.nextCursor,
    });
    assert.equal(second.offset, 0);
    assert.equal(second.nextCursor, 12271);
  });

  it('keeps a real gap and packs a child that has no start', () => {
    const gapped = seriesPlacement({
      hasStart: true,
      startInFrames: 50,
      durationInFrames: 10,
      packedCursor: 20,
    });
    assert.equal(gapped.offset, 30);

    const packed = seriesPlacement({
      hasStart: false,
      startInFrames: 0,
      durationInFrames: 10,
      packedCursor: 20,
    });
    assert.equal(packed.offset, 0);
    assert.equal(packed.nextCursor, 30);
  });
});
