/**
 * Pure timing helpers for the browser render progress UI. No React, no DOM —
 * the clock source is injectable so the maths can be unit tested.
 */

/** Stopwatch that excludes paused time. */
export function createActiveClock(now: () => number = () => performance.now()) {
  let accumulated = 0;
  let runningSince: number | null = null;

  return {
    start() {
      accumulated = 0;
      runningSince = now();
    },
    pause() {
      if (runningSince === null) return;
      accumulated += now() - runningSince;
      runningSince = null;
    },
    resume() {
      if (runningSince !== null) return;
      runningSince = now();
    },
    /** Active milliseconds so far. */
    elapsed(): number {
      return accumulated + (runningSince === null ? 0 : now() - runningSince);
    },
    isRunning(): boolean {
      return runningSince !== null;
    },
    /** Freezes the current value; returned so callers can store it. */
    snapshot(): { activeMs: number; runningSince: number | null } {
      return { activeMs: accumulated, runningSince };
    },
  };
}

export type ActiveClock = ReturnType<typeof createActiveClock>;

/** Active ms for a clock snapshot, evaluated at `at`. */
export function activeMsAt(
  snapshot: { activeMs: number; runningSince: number | null },
  at: number,
): number {
  return (
    snapshot.activeMs +
    (snapshot.runningSince === null ? 0 : Math.max(0, at - snapshot.runningSince))
  );
}

export interface EtaEstimatorOptions {
  /** EMA weight for the newest rate sample (0..1). */
  alpha?: number;
  /** Below this progress the estimate is too noisy to show. */
  minProgress?: number;
  /** Below this much active time the estimate is too noisy to show. */
  minActiveMs?: number;
}

/**
 * Remaining-time estimate from (activeMs, progress) samples. Blends the
 * whole-run average rate with a smoothed recent rate, so the number reacts
 * to slow/fast sections without jumping on every throttled sample. Feed it
 * pause-free active time and a pause never inflates the estimate.
 */
export function createEtaEstimator({
  alpha = 0.15,
  minProgress = 0.01,
  minActiveMs = 1500,
}: EtaEstimatorOptions = {}) {
  let first: { activeMs: number; progress: number } | null = null;
  let last: { activeMs: number; progress: number } | null = null;
  let recentRate: number | null = null;

  return {
    push(activeMs: number, progress: number) {
      const sample = { activeMs, progress: Math.min(1, Math.max(0, progress)) };
      if (!first) first = sample;
      if (last) {
        const dt = sample.activeMs - last.activeMs;
        const dp = sample.progress - last.progress;
        if (dt > 0 && dp >= 0) {
          const rate = dp / dt;
          recentRate =
            recentRate === null ? rate : alpha * rate + (1 - alpha) * recentRate;
        }
      }
      last = sample;
    },
    /** Milliseconds left, or null while there is not enough signal yet. */
    remainingMs(): number | null {
      if (!first || !last || recentRate === null) return null;
      if (last.progress >= 1) return 0;
      const span = last.activeMs - first.activeMs;
      if (last.progress < minProgress || span < minActiveMs) return null;
      const averageRate = (last.progress - first.progress) / span;
      const rate =
        averageRate > 0 && recentRate > 0
          ? (averageRate + recentRate) / 2
          : Math.max(averageRate, recentRate);
      if (!(rate > 0)) return null;
      return (1 - last.progress) / rate;
    },
    reset() {
      first = null;
      last = null;
      recentRate = null;
    },
  };
}

/** Exponential moving average for byte/frame throughput. */
export function createThroughputMeter(alpha = 0.3) {
  let lastAt: number | null = null;
  let lastValue = 0;
  let perSecond: number | null = null;

  return {
    push(at: number, value: number) {
      if (lastAt !== null) {
        const dt = (at - lastAt) / 1000;
        if (dt > 0.05) {
          const rate = Math.max(0, value - lastValue) / dt;
          perSecond = perSecond === null ? rate : alpha * rate + (1 - alpha) * perSecond;
          lastAt = at;
          lastValue = value;
        }
        return;
      }
      lastAt = at;
      lastValue = value;
    },
    perSecond(): number | null {
      return perSecond;
    },
  };
}

/** "1h 02m", "3m 05s", "42s", "<1s". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 1) return '<1s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/** "0 B", "512 KB", "1.4 MB", "2.05 GB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  const digits = i === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  const text = value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return `${text} ${units[i]}`;
}
