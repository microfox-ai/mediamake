import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { applyLetterSpacingSettle, beatEnvelope, buildCaptionBeats, findActiveBeat, letterSpacingSettle } from './caption-smear-math';

const caption = (absoluteStart: number, words: [string, number, number][]) => ({
  absoluteStart,
  absoluteEnd: words[words.length - 1][2],
  words: words.map(([text, start, end]) => ({ text, absoluteStart: start, absoluteEnd: end })),
});

describe('buildCaptionBeats', () => {
  it('shows long words alone and joins short ones with the next word', () => {
    const beats = buildCaptionBeats([
      caption(0, [
        ['devil', 0, 0.3],
        ['on', 0.3, 0.45],
        ['my', 0.45, 0.6],
        ['shoulder', 0.6, 1.2],
        ['an', 1.3, 1.4],
        ['ant', 1.4, 1.7],
      ]),
    ]);
    assert.deepEqual(
      beats.map((b) => b.text),
      ['devil', 'on my', 'shoulder', 'an ant'],
    );
  });

  it('cuts each beat at the next beat start and lingers after a pause', () => {
    const beats = buildCaptionBeats(
      [caption(0, [['devil', 0, 0.3], ['shoulder', 0.4, 1]]), caption(5, [['around', 5, 5.5]])],
      { linger: 0.5 },
    );
    assert.equal(beats[0].end, 0.4);
    assert.equal(beats[1].end, 1.5);
    assert.equal(beats[2].end, 6);
  });

  it('never joins across captions or long gaps; a trailing short word rides on the previous beat', () => {
    const beats = buildCaptionBeats([
      caption(0, [['over', 0, 0.4], ['it', 0.45, 0.6]]),
      caption(2, [['so', 2, 2.2]]),
      caption(4, [['we', 4, 4.1], ['run', 5, 5.4]]),
    ]);
    assert.deepEqual(
      beats.map((b) => b.text),
      ['over it', 'so', 'we', 'run'],
    );
  });

  it('falls back to caption-relative word times and splits packed words', () => {
    const beats = buildCaptionBeats([
      { absoluteStart: 10, words: [{ text: 'no angels', start: 0, end: 1 }] },
    ]);
    assert.deepEqual(
      beats.map((b) => [b.text, b.start]),
      [
        ['no angels', 10],
      ],
    );
  });

  it('tolerates missing or malformed input', () => {
    assert.deepEqual(buildCaptionBeats(undefined), []);
    assert.deepEqual(buildCaptionBeats([null, { words: 'x' }, { words: [{ text: '' }] }]), []);
  });
});

describe('findActiveBeat', () => {
  const beats = buildCaptionBeats([caption(0, [['devil', 1, 1.5], ['shoulder', 1.5, 2]])], { linger: 0.2 });

  it('returns the beat covering the time and null in gaps', () => {
    assert.equal(findActiveBeat(beats, 0.5), null);
    assert.equal(findActiveBeat(beats, 1.2)?.text, 'devil');
    assert.equal(findActiveBeat(beats, 1.5)?.text, 'shoulder');
    assert.equal(findActiveBeat(beats, 2.3), null);
  });
});

describe('beatEnvelope', () => {
  it('is visible on the very first frame of a beat', () => {
    assert.equal(beatEnvelope(0, 1).smear, 1);
  });

  it('smears in, snaps sharp, then dims at the end', () => {
    const start = beatEnvelope(0.1, 1);
    assert.equal(start.crisp, 0);
    assert.ok(start.smear > 0.9);

    const hold = beatEnvelope(0.5, 1);
    assert.equal(hold.smear, 0);
    assert.equal(hold.crisp, 1);
    assert.equal(hold.dim, 0);

    assert.equal(beatEnvelope(1, 1).dim, 1);
  });

  it('still reaches sharp text on very short beats', () => {
    const env = beatEnvelope(0.12, 0.15);
    assert.equal(env.crisp, 1);
    assert.equal(env.dim, 0);
  });

  it('caps smear at the threshold so long words do not keep stretching', () => {
    const stillSmearing = beatEnvelope(0.4, 3, { smearThreshold: 0.5 });
    assert.ok(stillSmearing.smear > 0);

    const snapped = beatEnvelope(0.7, 3, { smearThreshold: 0.5 });
    assert.equal(snapped.smear, 0);
    assert.equal(snapped.crisp, 1);

    const defaultCap = beatEnvelope(0.7, 3);
    assert.equal(defaultCap.smear, 0);

    const shortCap = beatEnvelope(0.3, 3, { smearThreshold: 0.15 });
    assert.equal(shortCap.smear, 0);
    assert.equal(shortCap.crisp, 1);
  });
});

describe('letterSpacingSettle', () => {
  it('starts tight and is not fully open when the word ends', () => {
    const start = letterSpacingSettle(0, 1);
    const end = letterSpacingSettle(1, 1);
    assert.equal(start.progress, 0);
    assert.ok(end.progress > 0.7);
    assert.ok(end.progress < 1);
    assert.ok(end.extraEm > 0);

    const target = 8;
    const fontSize = 100;
    const atStart = applyLetterSpacingSettle(target, fontSize, start);
    const atEnd = applyLetterSpacingSettle(target, fontSize, end);
    assert.ok(atStart < target, `start ${atStart} should be tighter than rest`);
    assert.ok(atEnd > atStart, `settle ${atEnd} should expand`);
    assert.ok(atEnd < target, `end ${atEnd} should still be short of rest`);
  });

  it('is fully at rest when disabled or impact is 0', () => {
    assert.deepEqual(letterSpacingSettle(0, 1, { enabled: false }), { progress: 1, extraEm: 0 });
    assert.deepEqual(letterSpacingSettle(0, 1, { impact: 0 }), { progress: 1, extraEm: 0 });
  });

  it('eases out — more of the motion happens in the first half', () => {
    const a = letterSpacingSettle(0.25, 1).progress;
    const b = letterSpacingSettle(0.5, 1).progress;
    const c = letterSpacingSettle(0.75, 1).progress;
    assert.ok(b - a > c - b);
  });

  it('higher impact leaves more leftover settle at the word end', () => {
    const low = letterSpacingSettle(1, 1, { impact: 0.5 });
    const high = letterSpacingSettle(1, 1, { impact: 2 });
    assert.ok(high.progress < low.progress);
    assert.ok(high.extraEm > low.extraEm);
  });
});
