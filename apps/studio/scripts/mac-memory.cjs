/**
 * mac-memory: preloaded into the Remotion CLI on macOS by mm render (node --require). On macOS,
 * os.freemem() counts only the pages nobody holds, not the inactive and purgeable memory macOS hands
 * out on demand: it said 0.3–3.9 GB "free" on the 18 GB M3 Pro (0b baseline, 2026-11-09). Remotion
 * sizes three things from it, and all three came out at their floor:
 *
 * - parallel encoding (off below about 2.5 GB free at half size), so encoding ran after the frames;
 * - OffthreadVideo's decoding threads, (free − 2 GB) / 400 MB, which came out as 1–5 of 8;
 * - the footage frame cache.
 *
 * Here os.freemem() returns what macOS itself reports as free for memory pressure
 * (sysctl kern.memorystatus_level, the "System-wide memory free percentage" of `memory_pressure`),
 * which is what /proc/meminfo's MemAvailable gives Remotion on Linux. It never returns less than
 * the original, and falls back to it when sysctl fails. MM_MAC_MEMORY=off turns it off.
 */
'use strict';
const os = require('node:os');
const { execFileSync } = require('node:child_process');

if (process.platform === 'darwin' && process.env.MM_MAC_MEMORY !== 'off') {
  const original = os.freemem;
  let cached = null;
  os.freemem = () => {
    const own = original();
    if (cached && Date.now() - cached.at < 2000) return Math.max(own, cached.value);
    try {
      const level = Number(execFileSync('sysctl', ['-n', 'kern.memorystatus_level'], { encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'] }).trim());
      if (level > 0 && level <= 100) {
        cached = { at: Date.now(), value: Math.round((os.totalmem() * level) / 100) };
        return Math.max(own, cached.value);
      }
    } catch {
      // no sysctl: Remotion's own number
    }
    return own;
  };
}
