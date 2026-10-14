import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { audioClipsFromCompiled, packAudioClips } from "./find-audio-media";

describe("audioClipsFromCompiled", () => {
  it("places a sequence of two audio files back to back on one lane", () => {
    const clips = audioClipsFromCompiled([
      {
        id: "BaseScene",
        componentId: "BaseLayout",
        context: { timing: { start: 0, duration: 409.008 } },
        childrenData: [
          {
            id: "audio-track",
            componentId: "BaseLayout",
            context: { timing: { start: 0, duration: 409.008 } },
            childrenData: [
              {
                id: "audio-track-audio-0",
                componentId: "AudioAtom",
                data: { src: "https://cdn.example/first.mp3" },
                context: { timing: { start: 0, duration: 137.424 } },
              },
              {
                id: "audio-track-audio-1",
                componentId: "AudioAtom",
                data: { src: "https://cdn.example/second.mp3" },
                context: { timing: { start: 137.424, duration: 271.584 } },
              },
            ],
          },
        ],
      },
    ]);
    assert.deepEqual(
      clips.map((clip) => [clip.id, clip.start, clip.duration, clip.trackName]),
      [
        ["audio-track-audio-0", 0, 137.424, "audio-track"],
        ["audio-track-audio-1", 137.424, 271.584, "audio-track"],
      ],
    );
    const lanes = packAudioClips(clips);
    assert.equal(lanes.length, 1);
    assert.equal(lanes[0]?.label, "audio-track");
    assert.equal(lanes[0]?.items.length, 2);
  });

  it("gives an overlapping clip its own lane", () => {
    const lanes = packAudioClips([
      { id: "a", src: "https://cdn.example/a.mp3", start: 0, duration: 10, trackName: "a" },
      { id: "b", src: "https://cdn.example/b.mp3", start: 4, duration: 10, trackName: "b" },
    ]);
    assert.equal(lanes.length, 2);
  });
});
