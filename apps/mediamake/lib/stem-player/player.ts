import { AT_END, afterSwitch, fitLoop, frameAfter, playFrom, positionAt, snap } from './clock';
import type { LoopRange } from './types';

/*
 * One playhead for every track that is open. A track is decoded once into an AudioBuffer, and only
 * the tracks that are heard run: every change (a new selection, a seek, a loop, a level) starts the
 * heard tracks together on one sample frame, at the frame the song has reached, and fades the ones
 * that were playing out over 12 ms. A track that stays heard is crossfaded with a copy of itself on
 * the same samples, so it carries on without a gap, and tracks heard together stay sample-locked.
 */

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** The gain it fades in to, from `startedAt` on the audio clock. */
  level: number;
  startedAt: number;
}

type HoldParam = AudioParam & { cancelAndHoldAtTime?: (time: number) => AudioParam };

/** Long enough to hide a switch, short enough to feel instant. */
const FADE_S = 0.012;
/** Tracks start a hair in the future, so they all start on the same frame. */
const LEAD_S = 0.02;

export class StemEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private gains = new Map<string, number>();
  private voices: Voice[] = [];
  private audible: string[] = [];
  private offset = 0;
  private startedAt = 0;
  /** Playing with nothing loaded to hear yet: the playhead waits for the track instead of running on. */
  private held = false;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  playing = false;
  loop: LoopRange | null = null;
  looping = false;
  /** Called when the transport changes: by the user, or by itself at the end. */
  onChange: (() => void) | null = null;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
  }

  get rate(): number {
    return this.ctx.sampleRate;
  }

  /** The longest track that is heard (0 while none is loaded). */
  get duration(): number {
    let d = 0;
    for (const id of this.audible) d = Math.max(d, this.buffers.get(id)?.duration ?? 0);
    return d;
  }

  /** Playing, but waiting for the selected track to load. */
  get waiting(): boolean {
    return this.playing && this.held;
  }

  /** The tracks heard now. */
  get heard(): string[] {
    return [...this.audible];
  }

  private activeLoop(): LoopRange | null {
    return this.looping ? this.loop : null;
  }

  private at(time: number): number {
    return positionAt({ playing: this.playing && !this.held, offset: this.offset, startedAt: this.startedAt, loop: this.activeLoop() }, time, this.duration);
  }

  /** Seconds into the song right now. */
  position(): number {
    return this.at(this.ctx.currentTime);
  }

  decode(data: ArrayBuffer): Promise<AudioBuffer> {
    return this.ctx.decodeAudioData(data);
  }

  buffer(id: string): AudioBuffer | undefined {
    return this.buffers.get(id);
  }

  setBuffer(id: string, buffer: AudioBuffer) {
    this.buffers.set(id, buffer);
  }

  /** Frees a track's audio (it is decoded again when it is next selected). */
  removeBuffer(id: string) {
    if (this.audible.includes(id)) this.setHeard(this.audible.filter(a => a !== id));
    this.buffers.delete(id);
    this.gains.delete(id);
  }

  /** Fades out whatever sounds, from `time`. */
  private release(time: number) {
    for (const v of this.voices) {
      const g = v.gain.gain as HoldParam;
      // A ramp runs from the event before it, so the fade-out needs its own starting point at `time`
      // (without it the ramp would have begun when the track faded in, and the track would already be silent).
      const level = v.level * Math.min(1, Math.max(0, (time - v.startedAt) / FADE_S));
      if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(time);
      else g.cancelScheduledValues(time);
      g.setValueAtTime(level, time);
      g.linearRampToValueAtTime(0, time + FADE_S);
      try {
        v.source.stop(time + FADE_S + 0.005);
      } catch {
        // stopped already
      }
    }
    this.voices = [];
  }

  /**
   * Starts the heard tracks together on one frame: from `from`, or (without it) from where the song
   * will be at that frame, so a track that was playing carries on in step.
   */
  private start(from?: number) {
    const rate = this.rate;
    const t0 = frameAfter(this.ctx.currentTime + LEAD_S, rate) / rate;
    const loop = this.activeLoop();
    let pos = from ?? this.at(t0);
    if (loop && (pos < loop.start || pos >= loop.end)) pos = loop.start;
    pos = snap(Math.max(0, pos), rate);
    this.release(t0);
    this.offset = pos;
    this.startedAt = t0;
    this.held = this.audible.length === 0;
    for (const id of this.audible) {
      const buffer = this.buffers.get(id)!;
      // a shorter track is over already, or never reaches the loop
      if (pos >= buffer.duration || (loop && loop.start >= buffer.duration)) continue;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      if (loop) {
        source.loop = true;
        source.loopStart = loop.start;
        source.loopEnd = Math.min(loop.end, buffer.duration);
      }
      const level = this.gains.get(id) ?? 1;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(level, t0 + FADE_S);
      source.connect(gain);
      gain.connect(this.master);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start(t0, pos);
      this.voices.push({ source, gain, level, startedAt: t0 });
    }
    this.armEnd();
  }

  private clearEnd() {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
  }

  /** Stops at the end of the song by itself (the tracks end on their own; this turns the transport off). */
  private armEnd() {
    this.clearEnd();
    if (!this.playing || this.held || this.activeLoop() || this.duration <= 0) return;
    const check = () => {
      this.endTimer = null;
      if (!this.playing || this.held || this.activeLoop()) return;
      const left = this.duration - this.position();
      if (left > AT_END) this.endTimer = setTimeout(check, left * 1000 + 20);
      else this.halt(this.duration);
    };
    this.endTimer = setTimeout(check, (Math.max(0, this.duration - this.offset) + LEAD_S) * 1000 + 20);
  }

  /** Stops with the playhead at `at`. */
  private halt(at: number) {
    this.offset = at;
    this.playing = false;
    this.held = false;
    this.release(this.ctx.currentTime);
    this.clearEnd();
    this.onChange?.();
  }

  /** From where the playhead is; from the start when it is at the end. */
  async play() {
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => undefined);
    if (this.playing) return;
    this.playing = true;
    this.start(playFrom(this.offset, this.duration, this.activeLoop()));
    this.onChange?.();
  }

  pause() {
    if (this.playing) this.halt(this.position());
  }

  toggle() {
    return this.playing ? this.pause() : this.play();
  }

  seek(t: number) {
    const d = this.duration;
    const to = Math.max(0, d > 0 ? Math.min(t, d) : t);
    if (this.playing) this.start(to);
    else this.offset = to;
    this.onChange?.();
  }

  /**
   * The tracks to hear (only loaded ones count) and the gain of each (1 unless given). The playhead
   * stays where it is; a selection shorter than where it is stops there, at its own end.
   */
  setHeard(ids: string[], gains: Record<string, number> = {}) {
    const next = ids.filter(id => this.buffers.has(id));
    const sameTracks = next.length === this.audible.length && next.every((id, i) => id === this.audible[i]);
    const sameGains = next.every(id => (gains[id] ?? 1) === (this.gains.get(id) ?? 1));
    if (sameTracks && sameGains) return;
    const pos = this.position();
    this.audible = next;
    this.gains = new Map(next.map(id => [id, gains[id] ?? 1]));
    const { at, stop } = afterSwitch(pos, this.duration, this.activeLoop());
    if (stop) return this.halt(at);
    if (this.playing) this.start();
    else this.offset = pos;
    this.onChange?.();
  }

  /** The loop range; playback keeps going from where it is (or jumps into the range when outside it). */
  setLoop(range: LoopRange | null, looping = range !== null) {
    const pos = this.position();
    this.loop = fitLoop(range, this.duration, this.rate);
    this.looping = looping && this.loop !== null;
    const loop = this.activeLoop();
    if (this.playing) this.start(pos);
    else if (loop && (this.offset < loop.start || this.offset >= loop.end)) this.offset = loop.start;
    this.onChange?.();
  }

  setLooping(on: boolean) {
    this.setLoop(this.loop, on);
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.01);
  }

  dispose() {
    this.clearEnd();
    this.release(this.ctx.currentTime);
    this.buffers.clear();
    this.audible = [];
    void this.ctx.close().catch(() => undefined);
  }
}
