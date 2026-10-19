import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeMsAt,
  createActiveClock,
  createEtaEstimator,
  createThroughputMeter,
  formatBytes,
  formatDuration,
} from "./render-stats";

function fakeNow() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe("createActiveClock", () => {
  it("excludes paused time", () => {
    const time = fakeNow();
    const clock = createActiveClock(time.now);
    clock.start();
    time.advance(1000);
    clock.pause();
    time.advance(60_000);
    assert.equal(clock.elapsed(), 1000);
    clock.resume();
    time.advance(500);
    assert.equal(clock.elapsed(), 1500);
  });

  it("ignores double pause and double resume", () => {
    const time = fakeNow();
    const clock = createActiveClock(time.now);
    clock.start();
    time.advance(100);
    clock.pause();
    clock.pause();
    time.advance(100);
    clock.resume();
    clock.resume();
    time.advance(100);
    assert.equal(clock.elapsed(), 200);
  });

  it("snapshot evaluates later without the clock", () => {
    const time = fakeNow();
    const clock = createActiveClock(time.now);
    clock.start();
    time.advance(300);
    const snap = clock.snapshot();
    assert.equal(activeMsAt(snap, time.now() + 200), 500);
    clock.pause();
    assert.equal(activeMsAt(clock.snapshot(), time.now() + 10_000), 300);
  });
});

describe("createEtaEstimator", () => {
  it("returns null until enough signal", () => {
    const eta = createEtaEstimator({ minActiveMs: 1000, minProgress: 0.01 });
    eta.push(0, 0);
    eta.push(200, 0.002);
    assert.equal(eta.remainingMs(), null);
  });

  it("estimates a steady rate", () => {
    const eta = createEtaEstimator({ minActiveMs: 1000 });
    // 1% per second -> 100 s total.
    for (let s = 0; s <= 20; s++) eta.push(s * 1000, s / 100);
    const remaining = eta.remainingMs();
    assert.ok(remaining !== null);
    assert.ok(Math.abs(remaining - 80_000) < 1, `got ${remaining}`);
  });

  it("is unaffected by pauses when fed active time", () => {
    const eta = createEtaEstimator({ minActiveMs: 1000 });
    for (let s = 0; s <= 10; s++) eta.push(s * 1000, s / 100);
    // A long pause does not advance active time, so nothing changes.
    eta.push(10_000, 0.1);
    for (let s = 11; s <= 20; s++) eta.push(s * 1000, s / 100);
    const remaining = eta.remainingMs();
    assert.ok(remaining !== null && Math.abs(remaining - 80_000) < 1);
  });

  it("returns 0 when complete", () => {
    const eta = createEtaEstimator({ minActiveMs: 0, minProgress: 0 });
    eta.push(0, 0);
    eta.push(1000, 1);
    assert.equal(eta.remainingMs(), 0);
  });
});

describe("createThroughputMeter", () => {
  it("measures bytes per second", () => {
    const meter = createThroughputMeter(1);
    meter.push(0, 0);
    meter.push(1000, 5_000_000);
    assert.equal(meter.perSecond(), 5_000_000);
  });
});

describe("formatDuration", () => {
  it("formats ranges", () => {
    assert.equal(formatDuration(null), "—");
    assert.equal(formatDuration(200), "<1s");
    assert.equal(formatDuration(42_000), "42s");
    assert.equal(formatDuration(185_000), "3m 05s");
    assert.equal(formatDuration(3_720_000), "1h 02m");
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatBytes(1024 * 1024 * 150), "150 MB");
  });
});
