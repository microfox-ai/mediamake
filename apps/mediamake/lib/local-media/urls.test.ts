import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLocalMediaUrl,
  containsLocalMedia,
  findLocalMediaRefs,
  isLocalMediaUrl,
  parseLocalMediaUrl,
  replaceLocalMediaUrls,
} from "./urls";

const ORIGIN = "https://mediamake.example.com";

describe("buildLocalMediaUrl / parseLocalMediaUrl", () => {
  it("round-trips ids and awkward file names", () => {
    const url = buildLocalMediaUrl(`${ORIGIN}/`, "a1b2-c3", "my clip (final) #2.mp4");
    assert.equal(
      url,
      `${ORIGIN}/__local-media/a1b2-c3/my%20clip%20(final)%20%232.mp4`,
    );
    assert.deepEqual(parseLocalMediaUrl(url), {
      id: "a1b2-c3",
      fileName: "my clip (final) #2.mp4",
    });
  });

  it("ignores query and hash", () => {
    assert.deepEqual(parseLocalMediaUrl(`${ORIGIN}/__local-media/x/y.mp3?t=1#a`), {
      id: "x",
      fileName: "y.mp3",
    });
  });

  it("rejects other URLs", () => {
    assert.equal(parseLocalMediaUrl("https://cdn.example.com/a.mp4"), null);
    assert.equal(parseLocalMediaUrl(`${ORIGIN}/__local-media/`), null);
    assert.equal(isLocalMediaUrl(42), false);
    assert.equal(isLocalMediaUrl(`${ORIGIN}/__local-media/id/a.png`), true);
  });
});

describe("findLocalMediaRefs", () => {
  const props = {
    childrenData: [
      { data: { src: buildLocalMediaUrl(ORIGIN, "v1", "intro.mp4") } },
      { data: { src: "https://cdn.example.com/cloud.mp4" } },
      { data: { src: buildLocalMediaUrl("http://localhost:3000", "a1", "beat.mp3") } },
      { data: { src: buildLocalMediaUrl(ORIGIN, "v1", "intro.mp4") } },
    ],
  };

  it("finds distinct local refs in objects and JSON strings", () => {
    for (const input of [props, JSON.stringify(props, null, 2)]) {
      const refs = findLocalMediaRefs(input);
      assert.deepEqual(
        refs.map((r) => [r.id, r.fileName]),
        [
          ["v1", "intro.mp4"],
          ["a1", "beat.mp3"],
        ],
      );
    }
    assert.equal(containsLocalMedia(props), true);
  });

  it("returns nothing for cloud-only JSON", () => {
    assert.deepEqual(findLocalMediaRefs({ src: "https://cdn.example.com/x.mp4" }), []);
    assert.equal(containsLocalMedia("{}"), false);
  });
});

describe("replaceLocalMediaUrls", () => {
  it("swaps only the mapped ids, across origins", () => {
    const json = JSON.stringify({
      a: buildLocalMediaUrl(ORIGIN, "v1", "intro.mp4"),
      b: buildLocalMediaUrl("http://localhost:3000", "v1", "intro.mp4"),
      c: buildLocalMediaUrl(ORIGIN, "keep", "x.mp4"),
    });
    const out = JSON.parse(
      replaceLocalMediaUrls(json, new Map([["v1", "https://cdn.example.com/intro.mp4"]])),
    );
    assert.equal(out.a, "https://cdn.example.com/intro.mp4");
    assert.equal(out.b, "https://cdn.example.com/intro.mp4");
    assert.equal(out.c, buildLocalMediaUrl(ORIGIN, "keep", "x.mp4"));
  });
});
