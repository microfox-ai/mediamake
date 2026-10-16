import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipStillsForInput, collectVisualMedia, readClipStill } from "./visual-media";

describe("collectVisualMedia", () => {
  it("reads an image url", () => {
    const media = collectVisualMedia({
      src: "https://cdn.example.com/hero.jpg",
    });
    assert.deepEqual(media, [
      { kind: "image", src: "https://cdn.example.com/hero.jpg" },
    ]);
  });

  it("keeps a video thumbnail when one is stored", () => {
    const media = collectVisualMedia({
      src: "https://cdn.example.com/clip.mp4",
      type: "video",
      thumbnail: "https://cdn.example.com/clip.jpg",
    });
    assert.deepEqual(media, [
      {
        kind: "video",
        src: "https://cdn.example.com/clip.mp4",
        thumbnail: "https://cdn.example.com/clip.jpg",
      },
    ]);
  });

  it("skips audio and counts each visual source once", () => {
    const media = collectVisualMedia({
      mediaItems: [
        { src: "https://cdn.example.com/a.mp3", type: "audio" },
        { src: "https://cdn.example.com/clip.mp4", type: "video" },
        { src: "https://cdn.example.com/clip.mp4", type: "video" },
        { src: "https://cdn.example.com/still.png" },
      ],
    });
    assert.deepEqual(
      media.map((item) => item.src),
      ["https://cdn.example.com/clip.mp4", "https://cdn.example.com/still.png"],
    );
  });

  it("fills linked media from the timeline reference", () => {
    const media = collectVisualMedia(
      {
        mediaItems: {
          mediaRef: "clips",
          items: [{ fit: "cover" }, { fit: "cover" }, { fit: "cover" }],
        },
      },
      [
        {
          key: "clips",
          value: [
            { src: "https://cdn.example.com/one.jpg", type: "image" },
            { src: "https://cdn.example.com/two.mp4", type: "video", thumbnail: "https://cdn.example.com/two.jpg" },
            { src: "https://cdn.example.com/voice.wav", type: "audio" },
          ],
        },
      ],
    );
    assert.equal(media.length, 2);
    assert.equal(media[0]?.kind, "image");
    assert.equal(media[1]?.thumbnail, "https://cdn.example.com/two.jpg");
  });

  it("reads an image painted as a css url and ignores lottie json", () => {
    const media = collectVisualMedia({
      style: { backgroundImage: 'url("https://images.unsplash.com/photo-1?w=800")' },
      lottie: { src: "https://assets.lottiefiles.com/packages/lf20.json" },
    });
    assert.deepEqual(media, [
      { kind: "image", src: "https://images.unsplash.com/photo-1?w=800" },
    ]);
  });

  it("keeps per-item stills and skips audio", () => {
    const stills = clipStillsForInput({
      mediaItems: [
        { src: "https://cdn.example.com/a.jpg", type: "image" },
        { src: "https://cdn.example.com/b.mp4", type: "video", startFrom: 3, thumbnail: "https://cdn.example.com/b.jpg" },
        { src: "https://cdn.example.com/c.mp3", type: "audio" },
      ],
    });
    assert.equal(stills[0]?.kind, "image");
    assert.equal(stills[1]?.sourceOffset, 3);
    assert.equal(stills[1]?.thumbnail, "https://cdn.example.com/b.jpg");
    assert.equal(stills[2], null);
    assert.equal(readClipStill({ src: "https://cdn.example.com/song.wav" }), null);
  });

  it("resolves a data reference to a video without a stored thumbnail", () => {
    const media = collectVisualMedia(
      { src: "data:[hero]" },
      [{ key: "hero", value: "https://cdn.example.com/hero.webm" }],
    );
    assert.deepEqual(media, [
      { kind: "video", src: "https://cdn.example.com/hero.webm" },
    ]);
  });
});
