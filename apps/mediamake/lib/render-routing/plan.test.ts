import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeRenderLoad, planRender } from "./plan";

const atom = (componentId: string, data: Record<string, unknown> = {}) => ({
  id: componentId,
  componentId,
  type: "atom",
  data,
});

const timeline = (...children: unknown[]) => ({
  childrenData: [
    { id: "scene", componentId: "BaseLayout", type: "layout", childrenData: children },
  ],
  config: { duration: 30, fps: 30 },
});

const graphics = timeline(
  atom("ImageAtom", { src: "https://cdn.example.com/a.png" }),
  atom("TextAtom", { text: "Hello" }),
  atom("ShapeAtom"),
);

const withAudio = timeline(
  atom("ImageAtom", { src: "https://cdn.example.com/a.png" }),
  atom("AudioAtom", { src: "https://cdn.example.com/song.mp3" }),
);

const allowed = { allowed: true };
const denied = { allowed: false, reason: "No Lambda for you." };

describe("analyzeRenderLoad", () => {
  it("counts images and graphics as light", () => {
    const load = analyzeRenderLoad(graphics);
    assert.equal(load.weight, "light");
    assert.equal(load.imageSources, 1);
    assert.equal(load.graphicLayers, 2);
    assert.equal(load.videoSources, 0);
    assert.equal(load.durationSeconds, 30);
  });

  it("treats video and audio as heavy", () => {
    assert.equal(analyzeRenderLoad(withAudio).weight, "heavy");
    const video = analyzeRenderLoad(
      timeline(atom("VideoAtom", { src: "https://cdn.example.com/clip.mp4" })),
    );
    assert.equal(video.weight, "heavy");
    assert.equal(video.videoSources, 1);
  });

  it("counts waveforms and beat montages as audio", () => {
    assert.equal(analyzeRenderLoad(timeline(atom("WaveformHistogram"))).audioSources, 1);
    const effect = {
      ...atom("ShapeAtom"),
      effects: [{ id: "w", componentId: "waveform", data: {} }],
    };
    assert.equal(analyzeRenderLoad(timeline(effect)).weight, "heavy");
  });

  it("finds media URLs in props of any shape", () => {
    const load = analyzeRenderLoad({
      manifest: { audio: "/media/track.wav", shots: [{ image: "/a.jpg" }] },
    });
    assert.equal(load.weight, "heavy");
    assert.equal(load.audioSources, 1);
  });

  it("ignores file names inside text", () => {
    const load = analyzeRenderLoad(timeline(atom("TextAtom", { text: "now playing song.mp3" })));
    assert.equal(load.weight, "light");
  });

  it("parses JSON strings and survives bad JSON", () => {
    assert.equal(analyzeRenderLoad(JSON.stringify(withAudio)).weight, "heavy");
    assert.equal(analyzeRenderLoad("{not json").weight, "light");
  });

  it("keeps stills light and audio renders heavy", () => {
    assert.equal(analyzeRenderLoad(withAudio, "still").weight, "light");
    assert.equal(analyzeRenderLoad(graphics, "audio").weight, "heavy");
  });

  it("flags local media", () => {
    const load = analyzeRenderLoad(
      timeline(atom("ImageAtom", { src: "https://app.example.com/__local-media/abc/a.png" })),
    );
    assert.equal(load.hasLocalMedia, true);
  });
});

describe("planRender", () => {
  it("sends light renders to Lambda when allowed", () => {
    const plan = planRender({ inputProps: graphics, lambda: allowed });
    assert.equal(plan.target, "lambda");
    assert.equal(plan.lambdaAvailable, true);
  });

  it("sends heavy renders local but keeps Lambda available", () => {
    const plan = planRender({ inputProps: withAudio, lambda: allowed });
    assert.equal(plan.target, "local");
    assert.equal(plan.lambdaAvailable, true);
    assert.match(plan.reason, /1 audio track/);
  });

  it("renders locally without Lambda access", () => {
    const plan = planRender({ inputProps: graphics, lambda: denied });
    assert.equal(plan.target, "local");
    assert.equal(plan.lambdaAvailable, false);
    assert.equal(plan.reason, "No Lambda for you.");
  });

  it("never offers Lambda for local media", () => {
    const plan = planRender({
      inputProps: timeline(atom("ImageAtom", { src: "/__local-media/abc/a.png" })),
      lambda: allowed,
    });
    assert.equal(plan.target, "local");
    assert.equal(plan.lambdaAvailable, false);
  });

  it("sends stills to Lambda even with media", () => {
    const plan = planRender({ inputProps: withAudio, renderType: "still", lambda: allowed });
    assert.equal(plan.target, "lambda");
  });
});
