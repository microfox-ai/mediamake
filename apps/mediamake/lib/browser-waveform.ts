/**
 * Browser-local waveform peak extraction via Web Audio API.
 * Fetches audio (direct, then same-origin proxy on CORS failure) and decodes peaks locally.
 */

export type BrowserWaveformResult = {
  /** Normalized peak amplitudes in [0, 1] (one value per bar). */
  peaks: number[];
  /** Audio duration in seconds. */
  duration: number;
};

const memoryCache = new Map<string, BrowserWaveformResult>();
const inflight = new Map<string, Promise<BrowserWaveformResult | null>>();

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

function isFetchableHttpUrl(src: string): boolean {
  const s = src.trim();
  return (
    /^https?:\/\//i.test(s) ||
    /^blob:/i.test(s) ||
    /^data:audio\//i.test(s)
  );
}

/**
 * Downsample channel samples to `barCount` peak amplitudes (max abs in each bucket).
 */
export function extractPeaksFromChannel(
  channel: Float32Array,
  barCount: number,
): number[] {
  if (!channel.length || barCount <= 0) return [];
  const samplesPerBar = Math.max(1, Math.floor(channel.length / barCount));
  const peaks = new Array<number>(barCount);
  let globalMax = 0;

  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar;
    const end = Math.min(channel.length, start + samplesPerBar);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j] ?? 0);
      if (v > peak) peak = v;
    }
    peaks[i] = peak;
    if (peak > globalMax) globalMax = peak;
  }

  if (globalMax <= 0) return peaks.map(() => 0.08);
  return peaks.map((p) => Math.max(0.04, p / globalMax));
}

function extractPeaksFromBuffer(
  buffer: AudioBuffer,
  barCount: number,
): number[] {
  const channels = Math.max(1, buffer.numberOfChannels);
  if (channels === 1) {
    return extractPeaksFromChannel(buffer.getChannelData(0), barCount);
  }

  const perChannel = Array.from({ length: channels }, (_, c) =>
    extractPeaksFromChannel(buffer.getChannelData(c), barCount),
  );
  const merged = new Array<number>(barCount);
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += perChannel[c]?.[i] ?? 0;
    merged[i] = sum / channels;
  }
  const max = Math.max(...merged, 0.001);
  return merged.map((p) => Math.max(0.04, p / max));
}

async function fetchAudioArrayBuffer(src: string): Promise<ArrayBuffer> {
  // blob: / data: — fetch directly
  if (/^blob:/i.test(src) || /^data:audio\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch audio (${res.status})`);
    return res.arrayBuffer();
  }

  // 1) Direct CORS fetch
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (res.ok) return res.arrayBuffer();
    throw new Error(`Direct fetch status ${res.status}`);
  } catch (directErr) {
    // 2) Same-origin proxy (CDN often blocks browser CORS)
    const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(src)}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) {
      const body = await proxyRes.json().catch(() => ({}));
      const detail =
        typeof body?.error === "string" ? body.error : proxyRes.statusText;
      console.error(
        "[browser-waveform] direct fetch failed, proxy also failed:",
        src,
        directErr,
        detail,
      );
      throw new Error(
        `Audio fetch failed (direct + proxy): ${detail || proxyRes.status}`,
      );
    }
    return proxyRes.arrayBuffer();
  }
}

/**
 * Fetch an audio URL, decode it in the browser, and return peak bars + duration.
 * Results are memoized in-memory per URL + barCount.
 */
export async function generateBrowserWaveform(
  src: string,
  barCount = 200,
): Promise<BrowserWaveformResult | null> {
  if (!src || typeof window === "undefined") return null;

  if (
    /^ref:/i.test(src.trim()) ||
    /^data:\[[^\]]+\]/.test(src.trim()) ||
    !isFetchableHttpUrl(src)
  ) {
    return null;
  }

  const cacheKey = `${src}::${barCount}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<BrowserWaveformResult | null> => {
    try {
      const arrayBuffer = await fetchAudioArrayBuffer(src);
      const ctx = getAudioContext();
      // Resume if suspended (autoplay policy) — decode still works either way
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }
      const copy = arrayBuffer.slice(0);
      const audioBuffer = await ctx.decodeAudioData(copy);
      const peaks = extractPeaksFromBuffer(audioBuffer, barCount);
      const result: BrowserWaveformResult = {
        peaks,
        duration: audioBuffer.duration,
      };
      memoryCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error(
        "[browser-waveform] failed to decode waveform for",
        src,
        err,
      );
      return null;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

/** Clear the in-memory waveform cache (e.g. on project switch). */
export function clearBrowserWaveformCache(): void {
  memoryCache.clear();
}
