'use client';

import { useEffect, useRef, useState } from 'react';
import { ClockIcon, LoaderIcon, StarIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { clock } from '@/lib/file-revisions/revision-file';
import type { LadderVersion } from '@/lib/remaster-revisions/ladder';
import { LEVEL_WARN_LU } from '@/lib/remaster-revisions/types';
import { usePosition } from './Timeline';
import { getPlayer, selectActiveRevision, useLevelOf, useLevelSpread, useRemasterStore, useVersions, type VersionAction } from './store';

/*
 * One row per version: its key, its name, what is known about its loudness, whether it is the
 * final or dropped, and how many notes it has. Click a row (or press its key) to listen to it:
 * the song keeps playing from the same moment.
 */

const fmt = (n: number | undefined, unit: string, digits = 1) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(digits)} ${unit}` : null);

function Levels({ v }: { v: LadderVersion }) {
  const measured = useRemasterStore(s => s.levels[v.id]);
  const matched = useRemasterStore(s => s.matched);
  const spread = useLevelSpread();
  const level = useLevelOf(v.id);
  const ref = useLevelOf(spread?.quietest ?? null);
  const sidecar = [fmt(v.info?.lufs, 'LUFS'), fmt(v.info?.truePeak, 'dBTP'), v.info?.lra !== undefined ? `LRA ${v.info.lra.toFixed(1)}` : null].filter(Boolean);
  const own = measured ? [fmt(measured.lufs, 'LUFS'), `peak ${measured.peak.toFixed(1)} dBFS`] : [];
  const trim = matched && level && ref ? ref.lufs - level.lufs : 0;
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] tabular-nums text-muted-foreground">
      {sidecar.length > 0 && (
        <Hint label="From the ladder's remaster.json (the remaster scripts' measurement)">
          <span>{sidecar.join(' · ')}</span>
        </Hint>
      )}
      {own.length > 0 && (
        <Hint label="Measured here from the decoded audio (ITU-R BS.1770 loudness; the peak is a sample peak, a true peak runs up to 0.5 dB higher)">
          <span className={cn(sidecar.length > 0 && 'opacity-70')}>≈ {own.join(' · ')}</span>
        </Hint>
      )}
      {!sidecar.length && !own.length && <LoaderIcon className="size-3 animate-spin" />}
      {matched && Math.abs(trim) >= 0.05 && (
        <Hint label="Turned down by this much while levels are matched">
          <span className="text-amber-400">{trim > 0 ? '+' : ''}{trim.toFixed(1)} dB</span>
        </Hint>
      )}
    </span>
  );
}

function Row({ v, index }: { v: LadderVersion; index: number }) {
  const active = useRemasterStore(s => s.active === v.id);
  const decoded = useRemasterStore(s => v.id in s.peaks);
  const revision = useRemasterStore(selectActiveRevision);
  const setActive = useRemasterStore(s => s.setActive);
  const toggleAction = useRemasterStore(s => s.toggleAction);
  const isFinal = revision?.final.includes(v.id) ?? false;
  const dropped = revision?.drop.includes(v.id) ?? false;
  const notes = revision?.comments.filter(c => c.images.includes(v.id)).length ?? 0;
  const action = (a: VersionAction, on: boolean, label: string, keys: string, icon: React.ReactNode) => (
    <Hint label={label} keys={keys}>
      <button
        type="button"
        aria-label={label}
        onClick={e => {
          e.stopPropagation();
          void toggleAction(a, v.id);
        }}
        className={cn('rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground', on && (a === 'final' ? 'text-amber-400 hover:text-amber-300' : 'text-destructive'))}
      >
        {icon}
      </button>
    </Hint>
  );
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={() => decoded && setActive(v.id)}
      onKeyDown={e => e.key === 'Enter' && decoded && setActive(v.id)}
      className={cn(
        'group flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
        active ? 'border-amber-400/70 bg-amber-400/10' : 'hover:bg-muted/60',
        !decoded && 'opacity-50',
        dropped && 'opacity-50',
      )}
    >
      <kbd className={cn('flex size-7 shrink-0 items-center justify-center rounded font-mono text-sm font-bold', active ? 'bg-amber-400 text-black' : 'bg-muted text-muted-foreground')}>{v.key || index + 1}</kbd>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('truncate text-sm font-medium', dropped && 'line-through')} title={v.label}>{v.label}</span>
          {isFinal && <span className="rounded bg-amber-400 px-1.5 text-[10px] font-bold text-black">FINAL</span>}
          {dropped && <span className="rounded bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">dropped</span>}
          {notes > 0 && <span className="rounded-full border px-1.5 text-[10px] text-muted-foreground">{notes} note{notes === 1 ? '' : 's'}</span>}
          {!decoded && <LoaderIcon className="size-3 animate-spin text-muted-foreground" />}
        </span>
        {v.info?.note && <span className="block truncate text-xs text-muted-foreground">{v.info.note}</span>}
        <Levels v={v} />
      </span>
      <span className="flex shrink-0 items-center">
        {action('final', isFinal, isFinal ? 'Unmark as the final' : 'This is the one: the final', 'Enter', <StarIcon className={cn('size-4', isFinal && 'fill-current')} />)}
        {action('drop', dropped, dropped ? 'Undrop' : 'Drop: not this one', 'Delete', <XIcon className="size-4" />)}
      </span>
    </div>
  );
}

function LevelWarning() {
  const spread = useLevelSpread();
  const matched = useRemasterStore(s => s.matched);
  const setMatched = useRemasterStore(s => s.setMatched);
  const versions = useVersions();
  const labelOf = (id: string) => versions.find(v => v.id === id)?.label ?? id;
  if (!spread || spread.lu <= LEVEL_WARN_LU) return null;
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

/** A note on the version playing now, with the moment it is about when wanted. */
function NoteComposer() {
  const version = useRemasterStore(s => s.job?.ladder.versions.find(v => v.id === s.active));
  const addComment = useRemasterStore(s => s.addComment);
  const pause = useRemasterStore(s => s.pause);
  const seek = useRemasterStore(s => s.seek);
  const composerFocus = useRemasterStore(s => s.composerFocus);
  const pos = usePosition();
  const [text, setText] = useState('');
  const [at, setAt] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (composerFocus) ref.current?.focus();
  }, [composerFocus]);
  if (!version) return null;
  const submit = async () => {
    if (await addComment(text, { ids: [version.id], ...(at !== null ? { t: at } : {}) })) {
      setText('');
      setAt(null);
    }
  };
  const QUICK = ['too bright', 'vocal buried', 'bass muddy', 'this one', 'harsh at the chorus'];
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold">Note on {version.label}</span>
        <Hint label={at === null ? 'Attach the moment the playhead is at (pauses)' : 'Forget the moment'} keys="T">
          <button
            type="button"
            onClick={() => {
              if (at === null) {
                pause();
                setAt(getPlayer()?.position() ?? pos);
              } else setAt(null);
            }}
            className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', at !== null ? 'border-blue-400 text-blue-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            <ClockIcon className="size-3" /> {at === null ? `at ${clock(pos)}` : `at ${clock(at)}`}
          </button>
        </Hint>
        {at !== null && (
          <button type="button" className="text-[11px] text-muted-foreground underline-offset-2 hover:underline" onClick={() => seek(at)}>
            go there
          </button>
        )}
      </div>
      <Textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={`What you hear in ${version.label}…`}
        className="min-h-16 text-sm"
      />
      <div className="flex flex-wrap items-center gap-1">
        {QUICK.map(q => (
          <button key={q} type="button" onClick={() => setText(t => (t ? `${t}, ${q}` : q))} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
            {q}
          </button>
        ))}
        <Hint label="Add the note" keys="Mod Enter">
          <Button size="sm" className="ml-auto h-7 text-xs" disabled={!text.trim()} onClick={() => void submit()}>
            Add note
          </Button>
        </Hint>
      </div>
    </div>
  );
}

export function Versions() {
  const versions = useVersions();
  const loading = useRemasterStore(s => s.loading);
  return (
    <div className="space-y-3">
      {loading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin" /> Decoding {Math.min(loading.done + 1, loading.total)} of {loading.total}
            {loading.current ? `: ${loading.current}` : ''}…
          </div>
          <div className="h-1 overflow-hidden rounded bg-muted">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${(loading.done / Math.max(1, loading.total)) * 100}%` }} />
          </div>
        </div>
      )}
      <LevelWarning />
      <div className="space-y-1.5">
        {versions.map((v, i) => (
          <Row key={v.id} v={v} index={i} />
        ))}
      </div>
      <NoteComposer />
    </div>
  );
}
