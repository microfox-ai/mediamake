'use client';

import type { PlayerRef } from '@remotion/player';
import { frameAt } from '@/lib/revisions/frames';
import { renderLiveFrame, type LiveProject } from '@/lib/revisions/live';

/*
 * A Remotion Player dressed as the <video> element the revisions screen drives: the store seeks,
 * plays and pauses it, and reads its time, through the same few properties and events. The
 * picture sits in `box` the way a video's picture sits in its element (letterboxed to fit).
 *
 * A Player shows DOM, not pixels, so a comment's still renders the frame again in the browser
 * (`grab()`). The magnifier shows the frame as DOM instead (MarkupLayer).
 */
export class LiveMedia extends EventTarget {
  private player: PlayerRef | null = null;
  private unlisten: (() => void) | null = null;
  private cached: { frame: number; canvas: HTMLCanvasElement } | null = null;
  private rendering: {
    frame: number;
    done: Promise<HTMLCanvasElement | null>;
  } | null = null;
  /** set by the transport; the Player takes it as a prop */
  playbackRate = 1;
  muted = false;
  readonly seeking = false;
  readonly readyState = 4;

  constructor(
    public live: LiveProject,
    readonly box: HTMLElement,
  ) {
    super();
  }

  /** The project compiled again (its code changed): frames rendered before are stale. */
  update(live: LiveProject) {
    if (live === this.live) return;
    this.live = live;
    this.cached = null;
    this.rendering = null;
  }

  /** Connects the Player (null when it unmounts) and forwards its events as a video's. */
  attach(player: PlayerRef | null) {
    this.unlisten?.();
    this.unlisten = null;
    this.player = player;
    if (!player) return;
    const forward = (type: string) => () => this.dispatchEvent(new Event(type));
    const pairs: [Parameters<PlayerRef['addEventListener']>[0], string][] = [
      ['frameupdate', 'timeupdate'],
      ['seeked', 'seeked'],
      ['play', 'play'],
      ['pause', 'pause'],
      ['ended', 'ended'],
    ];
    const handlers = pairs.map(([from, to]) => {
      const fn = forward(to);
      player.addEventListener(from, fn);
      return [from, fn] as const;
    });
    this.unlisten = () =>
      handlers.forEach(([from, fn]) => player.removeEventListener(from, fn));
    this.dispatchEvent(new Event('loadedmetadata'));
  }

  get frame(): number {
    return this.player?.getCurrentFrame() ?? 0;
  }

  get currentTime(): number {
    return this.frame / this.live.fps;
  }

  set currentTime(time: number) {
    const frame = Math.min(
      this.live.durationInFrames - 1,
      frameAt(Math.max(0, time), this.live.fps),
    );
    this.dispatchEvent(new Event('seeking'));
    this.player?.seekTo(frame);
  }

  get paused(): boolean {
    return !(this.player?.isPlaying() ?? false);
  }

  get duration(): number {
    return this.live.durationInFrames / this.live.fps;
  }

  get videoWidth(): number {
    return this.live.width;
  }

  get videoHeight(): number {
    return this.live.height;
  }

  get offsetLeft(): number {
    return this.box.offsetLeft;
  }

  get offsetTop(): number {
    return this.box.offsetTop;
  }

  get clientWidth(): number {
    return this.box.clientWidth;
  }

  get clientHeight(): number {
    return this.box.clientHeight;
  }

  play(): Promise<void> {
    this.player?.play();
    return Promise.resolve();
  }

  pause(): void {
    this.player?.pause();
  }

  private render(frame: number): Promise<HTMLCanvasElement | null> {
    if (this.cached?.frame === frame)
      return Promise.resolve(this.cached.canvas);
    if (this.rendering?.frame === frame) return this.rendering.done;
    const live = this.live;
    const done = renderLiveFrame(live, frame).then(
      canvas => {
        // the project compiled again meanwhile: these pixels are of the old code
        if (this.live !== live) return canvas;
        this.cached = { frame, canvas };
        if (this.rendering?.frame === frame) this.rendering = null;
        return canvas;
      },
      (err: unknown) => {
        if (this.rendering?.frame === frame) this.rendering = null;
        throw err;
      },
    );
    this.rendering = { frame, done };
    return done;
  }

  /** A frame (the one on screen by default) as pixels, rendered in the browser. Throws when that fails. */
  grab(frame = this.frame): Promise<HTMLCanvasElement | null> {
    return this.render(frame);
  }
}

/** The <video> element, or a live Player dressed as one. */
export type StageMedia = HTMLVideoElement | LiveMedia;

/** The element the picture is fitted into, for measuring and resize observers. */
export const mediaBox = (el: StageMedia): HTMLElement =>
  el instanceof LiveMedia ? el.box : el;
