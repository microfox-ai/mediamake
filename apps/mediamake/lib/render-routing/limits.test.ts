import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HEAVY_LIMITS, heavyReason, weighMedia } from "./limits";

const MB = 1024 * 1024;

describe("weighMedia", () => {
  it("a song and a looping overlay under a 4-minute video are light", () => {
    const w = weighMedia([
      { kind: "audio", src: "song.wav", bytes: 73 * MB, usedSeconds: 240 },
      { kind: "video", src: "loop.mp4", bytes: 16 * MB, usedSeconds: 240 },
    ]);
    assert.equal(w.weight, "light");
    assert.deepEqual(w.heavyBecause, []);
    assert.equal(w.mediaBytes, 89 * MB);
    assert.equal(w.largestFileBytes, 73 * MB);
  });

  it("two overlays looping under a 4m 25s song pass the video limit", () => {
    const w = weighMedia([
      { kind: "audio", src: "song.wav", bytes: 73 * MB, usedSeconds: 265 },
      { kind: "video", src: "loop.mp4", bytes: 16 * MB, usedSeconds: 265 },
      { kind: "video", src: "dust.mp4", bytes: 75 * MB, usedSeconds: 265 },
    ]);
    assert.equal(w.weight, "heavy");
    assert.equal(w.videoSecondsUsed, 530);
    assert.match(w.heavyBecause[0], /8m 50s of video/);
    assert.match(heavyReason(w.heavyBecause), /^Local suggested: it plays 8m 50s of video\./);
  });

  it("a clip nothing plays counts for its bytes, not its seconds", () => {
    const w = weighMedia([
      { kind: "video", src: "source.mp4", bytes: HEAVY_LIMITS.totalBytes, usedSeconds: 0 },
    ]);
    assert.equal(w.weight, "heavy");
    assert.equal(w.videoSecondsUsed, 0);
    assert.match(w.heavyBecause[0], /adds up to 500 MB/);
  });

  it("a still is always light", () => {
    const w = weighMedia([{ kind: "video", src: "big.mp4", bytes: 2 * HEAVY_LIMITS.fileBytes, usedSeconds: 600 }], "still");
    assert.equal(w.weight, "light");
  });

  it("audio without a file counts through extraAudioSeconds", () => {
    const w = weighMedia([], "video", HEAVY_LIMITS.audioSeconds);
    assert.equal(w.weight, "heavy");
    assert.match(w.heavyBecause[0], /30m of audio/);
  });
});
