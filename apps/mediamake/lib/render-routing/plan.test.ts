import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeRenderLoad, planRender } from "./plan";

const MB = 1024 * 1024;

const atom = (componentId: string, data: Record<string, unknown> = {}, timing?: { duration: number }) => ({
  id: componentId,
  componentId,
  type: "atom",
  data,
  ...(timing ? { context: { timing } } : {}),
});

const timeline = (duration: number, ...children: unknown[]) => ({
  childrenData: [
    { id: "scene", componentId: "BaseLayout", type: "layout", childrenData: children },
  ],
  config: { duration, fps: 30 },
});

const graphics = timeline(
  30,
  atom("ImageAtom", { src: "https://cdn.example.com/a.png" }),
  atom("TextAtom", { text: "Hello" }),
  atom("ShapeAtom"),
);

const song = "https://cdn.example.com/song.mp3";
const lyricVideo = timeline(
  240,
  atom("ImageAtom", { src: "https://cdn.example.com/a.png" }),
  atom("AudioAtom", { src: song }),
);

const clip = (n: number, seconds: number) =>
  atom("VideoAtom", { src: `https://cdn.example.com/clip${n}.mp4` }, { duration: seconds });

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

  it("keeps one song light", () => {
    const load = analyzeRenderLoad(lyricVideo);
    assert.equal(load.weight, "light");
    assert.equal(load.audioSources, 1);
    assert.equal(load.audioSecondsUsed, 240);
  });

  it("keeps a few short clips light", () => {
    const load = analyzeRenderLoad(timeline(60, clip(1, 10), clip(2, 15), clip(3, 20)));
    assert.equal(load.weight, "light");
    assert.equal(load.videoSources, 3);
    assert.equal(load.videoSecondsUsed, 45);
  });

  it("goes heavy on minutes of footage", () => {
    const load = analyzeRenderLoad(timeline(600, clip(1, 200), clip(2, 200)));
    assert.equal(load.weight, "heavy");
    assert.match(load.heavyBecause.join(), /6m 40s of video/);
  });

  it("goes heavy on a 1 GB file, even when short", () => {
    const src = "https://cdn.example.com/clip1.mp4";
    const load = analyzeRenderLoad(timeline(20, clip(1, 10)), "video", { [src]: 1200 * MB });
    assert.equal(load.weight, "heavy");
    assert.match(load.heavyBecause.join(), /1\.2 GB/);
  });

  it("goes heavy when files add up", () => {
    const sizes = Object.fromEntries(
      [1, 2, 3].map(n => [`https://cdn.example.com/clip${n}.mp4`, 200 * MB]),
    );
    const load = analyzeRenderLoad(timeline(60, clip(1, 5), clip(2, 5), clip(3, 5)), "video", sizes);
    assert.equal(load.weight, "heavy");
    assert.equal(load.mediaBytes, 600 * MB);
  });

  it("reads trims and sizes stored on the atom", () => {
    const load = analyzeRenderLoad(
      timeline(100, atom("VideoAtom", { src: "https://cdn.example.com/x.mp4", startFrom: 5, endAt: 35, fileSize: 50 * MB })),
    );
    assert.equal(load.videoSecondsUsed, 30);
    assert.equal(load.mediaBytes, 50 * MB);
    assert.equal(load.unknownSizes, 0);
  });

  it("sums repeated uses of one file and caps at the composition", () => {
    const load = analyzeRenderLoad(timeline(100, clip(1, 40), clip(1, 40)));
    assert.equal(load.videoSources, 1);
    assert.equal(load.videoSecondsUsed, 80);
    const capped = analyzeRenderLoad(timeline(30, clip(1, 500)));
    assert.equal(capped.videoSecondsUsed, 30);
  });

  it("finds media URLs in props of any shape", () => {
    const load = analyzeRenderLoad({
      config: { duration: 2000 },
      manifest: { audio: "/media/track.wav", shots: [{ image: "/a.jpg" }] },
    });
    assert.equal(load.audioSources, 1);
    assert.equal(load.weight, "heavy");
  });

  it("ignores file names inside text", () => {
    const load = analyzeRenderLoad(timeline(10, atom("TextAtom", { text: "now playing song.mp3" })));
    assert.equal(load.audioSources, 0);
  });

  it("parses JSON strings and survives bad JSON", () => {
    assert.equal(analyzeRenderLoad(JSON.stringify(lyricVideo)).audioSources, 1);
    assert.equal(analyzeRenderLoad("{not json").weight, "light");
  });

  it("keeps stills light", () => {
    const load = analyzeRenderLoad(timeline(600, clip(1, 600)), "still");
    assert.equal(load.weight, "light");
  });

  it("flags local media", () => {
    const load = analyzeRenderLoad(
      timeline(10, atom("ImageAtom", { src: "https://app.example.com/__local-media/abc/a.png" })),
    );
    assert.equal(load.hasLocalMedia, true);
  });
});

describe("planRender", () => {
  it("suggests Lambda for light media, saying why", () => {
    const plan = planRender({ inputProps: lyricVideo, lambda: allowed });
    assert.equal(plan.target, "lambda");
    assert.equal(plan.lambdaAvailable, true);
    assert.match(plan.reason, /1 audio track/);
  });

  it("suggests local for heavy media but leaves Lambda open", () => {
    const plan = planRender({ inputProps: timeline(600, clip(1, 400)), lambda: allowed });
    assert.equal(plan.target, "local");
    assert.equal(plan.lambdaAvailable, true);
    assert.match(plan.reason, /of video/);
  });

  it("notes when sizes are unknown", () => {
    const plan = planRender({ inputProps: timeline(30, clip(1, 10)), lambda: allowed });
    assert.match(plan.reason, /sizes are unknown/);
  });

  it("renders locally without Lambda access", () => {
    const plan = planRender({ inputProps: graphics, lambda: denied });
    assert.equal(plan.target, "local");
    assert.equal(plan.lambdaAvailable, false);
    assert.equal(plan.reason, "No Lambda for you.");
  });

  it("never offers Lambda for local media", () => {
    const plan = planRender({
      inputProps: timeline(10, atom("ImageAtom", { src: "/__local-media/abc/a.png" })),
      lambda: allowed,
    });
    assert.equal(plan.target, "local");
    assert.equal(plan.lambdaAvailable, false);
  });
});
