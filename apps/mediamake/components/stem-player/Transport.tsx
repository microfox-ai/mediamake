'use client';

import { useCallback, useMemo, useRef } from 'react';
import { LoaderIcon, PauseIcon, PlayIcon, Repeat2Icon, RewindIcon, TriangleAlertIcon, Volume2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { clock } from '@/lib/file-revisions/revision-file';
import { LEVEL_WARN_LU } from '@/lib/stem-player/types';
import { isReviewable, levelSpread, selectCurrent, usePlayhead, useStemStore } from './store';

/** The loudest and quietest versions of the current project, when it is a folder of versions. */
function useSpread() {
  const folder = useStemStore(selectCurrent);
  const tracks = useStemStore(s => s.tracks);
  return useMemo(() => (isReviewable(folder) ? levelSpread(folder, tracks) : null), [folder, tracks]);
}

/** Play, the clock, the loop, and (in a folder of versions) Match levels. */
export function Transport() {
  const any = useStemStore(s => s.sel.selected.length > 0);
  const playing = useStemStore(s => s.playing);
  const waiting = useStemStore(s => s.waiting);
  const duration = useStemStore(s => s.duration);
  const loop = useStemStore(s => s.loop);
  const looping = useStemStore(s => s.looping);
  const volume = useStemStore(s => s.volume);
  const several = useStemStore(s => s.heard.length > 1);
  const folder = useStemStore(selectCurrent);
  const matched = useStemStore(s => !!folder && !!s.matched[folder.key]);
  const tracks = useStemStore(s => s.tracks);
  const togglePlay = useStemStore(s => s.togglePlay);
  const seek = useStemStore(s => s.seek);
  const setLoop = useStemStore(s => s.setLoop);
  const setLooping = useStemStore(s => s.setLooping);
  const setMatched = useStemStore(s => s.setMatched);
  const setVolume = useStemStore(s => s.setVolume);
  const spread = useSpread();
  const timeRef = useRef<HTMLSpanElement>(null);
  usePlayhead(
    useCallback((pos: number) => {
      if (timeRef.current) timeRef.current.textContent = clock(pos);
    }, []),
  );
  const reviewable = isReviewable(folder);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Hint label="Back to the start" keys="Home">
        <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!any} onClick={() => seek(0)}>
          <RewindIcon className="size-4" />
        </Button>
      </Hint>
      <Hint label={playing ? 'Pause' : 'Play (from the start when it is at the end)'} keys="Space">
        <Button size="sm" className="h-8 w-24" disabled={!any} onClick={() => togglePlay()}>
          {waiting ? <LoaderIcon className="size-4 animate-spin" /> : playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          {waiting ? 'Loading' : playing ? 'Pause' : 'Play'}
        </Button>
      </Hint>
      <span className="font-mono text-sm tabular-nums">
        <span ref={timeRef}>{clock(0)}</span> <span className="text-muted-foreground">/ {clock(duration)}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Hint label={loop ? (looping ? 'Stop looping (the range stays)' : 'Loop the range') : 'Drag on the waveform to choose a range to loop ([ and ] set its edges at the playhead)'} keys="L">
          <Button variant={looping ? 'default' : 'outline'} size="sm" className={cn('h-7 gap-1 px-2 text-xs', !loop && 'text-muted-foreground')} disabled={!loop} onClick={() => setLooping(!looping)}>
            <Repeat2Icon className="size-3.5" /> Loop{loop ? ` ${clock(loop.start)}–${clock(loop.end)}` : ''}
          </Button>
        </Hint>
        {loop && (
          <Hint label="Clear the range" keys="Esc">
            <button type="button" className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setLoop(null)}>
              <XIcon className="size-3.5" />
            </button>
          </Hint>
        )}
      </span>
      <span className="ml-auto flex items-center gap-4">
        {reviewable && (
          <Hint
            label={
              !spread
                ? 'Needs the loudness of at least two versions (they are measured as they load)'
                : several
                  ? 'Paused while several tracks play together, so their balance is not changed'
                  : `Turn every version down to the quietest (${tracks[spread.quietest]?.label ?? '?'}, ${spread.ref.toFixed(1)} LUFS) so you judge the sound, not the volume`
            }
            keys="M"
          >
            <label className={cn('flex cursor-pointer items-center gap-2 text-xs', matched && several && 'text-muted-foreground')}>
              <Switch checked={matched} onCheckedChange={setMatched} />
              Match levels{matched && several ? ' (paused)' : ''}
            </label>
          </Hint>
        )}
        <span className="flex w-28 items-center gap-1.5">
          <Volume2Icon className="size-3.5 text-muted-foreground" />
          <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={([v]) => setVolume(v)} aria-label="Volume" />
        </span>
      </span>
    </div>
  );
}

/** In a folder of versions: says when one is louder than another, because the louder one always sounds better by itself. */
export function LevelHint() {
  const folder = useStemStore(selectCurrent);
  const tracks = useStemStore(s => s.tracks);
  const matched = useStemStore(s => !!folder && !!s.matched[folder.key]);
  const setMatched = useStemStore(s => s.setMatched);
  const spread = useSpread();
  if (!spread || spread.lu <= LEVEL_WARN_LU) return null;
  const labelOf = (uid: string) => tracks[uid]?.label ?? uid;
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs">
      <TriangleAlertIcon className="size-4 shrink-0 text-amber-400" />
      <span className="flex-1">
        <b>{labelOf(spread.loudest)}</b> is {spread.lu.toFixed(1)} LU louder than <b>{labelOf(spread.quietest)}</b>: by itself the louder one always sounds better.
        {matched ? ' Levels are matched, so you hear the sound, not the volume.' : ' Match the levels to judge the sound alone.'}
      </span>
      {!matched && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMatched(true)}>
          Match levels
        </Button>
      )}
    </div>
  );
}
