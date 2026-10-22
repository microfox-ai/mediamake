import assert from "node:assert/strict";
import { describe, it } from "node:test";
// Plain JS served from /public; it exports its pure helpers for tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sw = require("../../public/local-media-sw.js") as {
  parseRange: (header: string | null, size: number) => { start: number; end: number } | null | "unsatisfiable";
  parseLocalPath: (pathname: string) => { id: string; fileName: string };
};

describe("local media service worker: parseRange", () => {
  it("serves the whole file without a usable range", () => {
    assert.equal(sw.parseRange(null, 100), null);
    assert.equal(sw.parseRange("bytes=-", 100), null);
    assert.equal(sw.parseRange("items=0-5", 100), null);
    assert.equal(sw.parseRange("bytes=0-5,10-20", 100), null);
  });

  it("handles open, closed and suffix ranges", () => {
    assert.deepEqual(sw.parseRange("bytes=0-", 100), { start: 0, end: 99 });
    assert.deepEqual(sw.parseRange("bytes=10-19", 100), { start: 10, end: 19 });
    assert.deepEqual(sw.parseRange("bytes=90-500", 100), { start: 90, end: 99 });
    assert.deepEqual(sw.parseRange("bytes=-10", 100), { start: 90, end: 99 });
    assert.deepEqual(sw.parseRange("bytes=-500", 100), { start: 0, end: 99 });
  });

  it("flags unsatisfiable ranges", () => {
    assert.equal(sw.parseRange("bytes=100-", 100), "unsatisfiable");
    assert.equal(sw.parseRange("bytes=20-10", 100), "unsatisfiable");
    assert.equal(sw.parseRange("bytes=-0", 100), "unsatisfiable");
    assert.equal(sw.parseRange("bytes=0-", 0), "unsatisfiable");
  });
});

describe("local media service worker: parseLocalPath", () => {
  it("decodes id and file name", () => {
    assert.deepEqual(sw.parseLocalPath("/__local-media/ab-12/my%20clip.mp4"), {
      id: "ab-12",
      fileName: "my clip.mp4",
    });
    assert.deepEqual(sw.parseLocalPath("/__local-media/only-id"), { id: "only-id", fileName: "" });
  });
});
