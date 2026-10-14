import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { beatEnvelope, buildCaptionBeats, findActiveBeat } from './caption-smear-math';

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
});
