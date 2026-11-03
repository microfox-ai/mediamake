import { dbToGain } from './loudness';
import type { LoopRange } from './types';

/*
 * One playhead for every version of a ladder. Every version is decoded once into an AudioBuffer
 * and, while playing, runs through its own GainNode from the same start time, sample-locked. The
 * version the user listens to has its gain up and the others sit at zero, so switching is a 10 ms
 * crossfade at the same moment in the song: no gap, no restart, no drift. Seeking and looping
 * stop every source and start them again together.
 */

interface Version {
  buffer: AudioBuffer;
  gain: GainNode;
  source: AudioBufferSourceNode | null;
  /** Gain in dB that levels this version with the quietest one (0 unless levels are matched). */
  trim: number;
}

/** Long enough to hide the switch, short enough to feel instant. */
const FADE_S = 0.01;
/** Sources start a hair in the future so they all start on the same sample. */
const LEAD_S = 0.03;

export class LadderPlayer {
  private ctx: AudioContext;
  private master: GainNode;
  private versions = new Map<string, Version>();
  private order: string[] = [];
  private startedAt = 0;
  private offset = 0;
  private generation = 0;
  active: string | null = null;
  playing = false;
  loop: LoopRange | null = null;
  looping = false;
  matched = false;
  /** Called when playback stops on its own (the end of the song) or the player's state changes. */
  onChange: (() => void) | null = null;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'playback' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
  }

  get duration(): number {
    let d = 0;
    for (const v of this.versions.values()) d = Math.max(d, v.buffer.duration);
    return d;
  }

  get ids(): string[] {
    return [...this.order];
  }

  decode(data: ArrayBuffer): Promise<AudioBuffer> {
    return this.ctx.decodeAudioData(data);
  }

  add(id: string, buffer: AudioBuffer) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    this.versions.set(id, { buffer, gain, source: null, trim: 0 });
    this.order.push(id);
    if (!this.active) this.setActive(id);
    // a version added mid-play joins at the same moment
    if (this.playing) this.start(this.position(), [id]);
  }

  buffer(id: string): AudioBuffer | undefined {
    return this.versions.get(id)?.buffer;
  }

  /** Seconds into the song right now. */
  position(): number {
    if (!this.playing) return this.offset;
    let pos = this.offset + (this.ctx.currentTime - this.startedAt);
    const loop = this.looping ? this.loop : null;
    if (loop && pos >= loop.end) {
      const len = Math.max(loop.end - loop.start, 0.01);
      pos = loop.start + ((pos - loop.end) % len);
    }
    return Math.min(pos, this.duration);
  }

  private targetGain(id: string): number {
    const v = this.versions.get(id);
    if (!v || id !== this.active) return 0;
    return dbToGain(this.matched ? v.trim : 0);
  }

  private applyGains(fade = FADE_S) {
    const now = this.ctx.currentTime;
    for (const [id, v] of this.versions) {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(this.targetGain(id), now + fade);
    }
  }

  private stopSources() {
    this.generation++;
    for (const v of this.versions.values()) {
      if (!v.source) continue;
      v.source.onended = null;
      try {
        v.source.stop();
      } catch {
        // already stopped
      }
      v.source.disconnect();
      v.source = null;
    }
  }

  private start(from: number, only?: string[]) {
    const loop = this.looping && this.loop && this.loop.end - this.loop.start > 0.05 ? this.loop : null;
    const duration = this.duration;
    let offset = from;
    if (loop && (offset < loop.start || offset >= loop.end)) offset = loop.start;
    if (!loop && offset >= duration) offset = 0;
    const t0 = only ? this.startedAt : this.ctx.currentTime + LEAD_S;
    const generation = only ? this.generation : ++this.generation;
    let first = true;
    for (const [id, v] of this.versions) {
      if (only && !only.includes(id)) continue;
      const source = this.ctx.createBufferSource();
      source.buffer = v.buffer;
      if (loop) {
        source.loop = true;
        source.loopStart = loop.start;
        source.loopEnd = Math.min(loop.end, v.buffer.duration);
      }
      source.connect(v.gain);
      if (only) {
        // join a running playback where it is now
        const elapsed = Math.max(0, this.ctx.currentTime - this.startedAt);
        let pos = this.offset + elapsed;
        if (loop && pos >= loop.end) pos = loop.start + ((pos - loop.end) % (loop.end - loop.start));
        if (pos < v.buffer.duration) source.start(this.ctx.currentTime, pos);
      } else {
        source.start(t0, Math.min(offset, v.buffer.duration));
      }
      if (first && !loop && !only) {
        source.onended = () => {
          if (generation !== this.generation || !this.playing) return;
          this.playing = false;
          this.offset = 0;
          this.stopSources();
          this.onChange?.();
        };
      }
      first = false;
      v.source = source;
    }
    if (!only) {
      this.startedAt = t0;
      this.offset = offset;
      this.playing = true;
    }
  }

  async play() {
    if (!this.versions.size) return;
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => undefined);
    if (this.playing) return;
    this.applyGains(0.001);
    this.start(this.offset);
    this.onChange?.();
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.position();
    this.playing = false;
    this.stopSources();
    this.onChange?.();
  }

  toggle() {
    return this.playing ? this.pause() : this.play();
  }

  seek(t: number) {
    const to = Math.max(0, Math.min(t, this.duration));
    if (this.playing) {
      this.stopSources();
      this.start(to);
    } else this.offset = to;
    this.onChange?.();
  }

  setActive(id: string) {
    if (!this.versions.has(id) || id === this.active) return;
    this.active = id;
    this.applyGains();
    this.onChange?.();
  }

  /** The loop range; playback keeps going from where it is (or jumps into the range when outside it). */
  setLoop(range: LoopRange | null, looping = range !== null) {
    this.loop = range && range.end - range.start > 0.05 ? { start: Math.max(0, range.start), end: Math.min(range.end, this.duration || range.end) } : null;
    this.looping = looping && this.loop !== null;
    if (this.playing) {
      const pos = this.position();
      this.stopSources();
      this.start(pos);
    } else if (this.looping && this.loop && (this.offset < this.loop.start || this.offset >= this.loop.end)) this.offset = this.loop.start;
    this.onChange?.();
  }

  setLooping(on: boolean) {
    this.setLoop(this.loop, on);
  }

  /** Per-version gain in dB (what levels it with the others), applied while `matched` is on. */
  setTrims(trims: Record<string, number>) {
    for (const [id, v] of this.versions) v.trim = trims[id] ?? 0;
    this.applyGains();
  }

  setMatched(on: boolean) {
    this.matched = on;
    this.applyGains();
    this.onChange?.();
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.01);
  }

  dispose() {
    this.stopSources();
    this.versions.clear();
    this.order = [];
    void this.ctx.close().catch(() => undefined);
  }
}
