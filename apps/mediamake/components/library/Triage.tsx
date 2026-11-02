'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isTextField } from '@/components/revisions/keyboard';
import { qualityOf } from '@/lib/library/filter';
import { ratingOf } from '@/lib/library/model';
import { MEDIA_KINDS, type LibraryRequest } from '@/lib/library/types';
import { Stars } from './Cards';
import { bytes, duration, itemPath } from './format';
import { Thumb } from './Thumb';
import { pendingRating, pendingSort, useLibraryStore } from './store';
import { useMatchingMedia } from './hooks';

type SortKind = Extract<LibraryRequest, { op: 'sort' }>['kind'];
const KINDS = MEDIA_KINDS.filter((k): k is SortKind => k !== 'unsorted');
const tagsOf = (s: string) => s.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

/** The inbox, one item at a time: say what it is (1–9), where it goes (subject), Enter. */
export function Triage() {
  const items = useMatchingMedia();
  const library = useLibraryStore(s => s.library);
  const pending = useLibraryStore(s => s.pending);
  const send = useLibraryStore(s => s.send);
  const select = useLibraryStore(s => s.select);
  const [at, setAt] = useState(0);
  const current = items[Math.min(at, items.length - 1)];
  const [kind, setKind] = useState<SortKind | ''>('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const done = items.filter(m => pendingSort(pending, m.id)).length;

  useEffect(() => {
    if (!current) return;
    const sorted = pendingSort(pending, current.id);
    setKind(sorted?.kind ?? (KINDS.includes(current.guess as SortKind) ? (current.guess as SortKind) : ''));
    setSubject(sorted?.subject ?? current.subject ?? '');
    setTags('');
    // only when the item changes, not when an edit lands
  }, [current?.id]);

  const subjects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of library.media) if (m.subject && (!kind || m.kind === kind)) counts.set(m.subject, (counts.get(m.subject) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [library.media, kind]);

  const next = () => {
    const after = items.findIndex((m, i) => i > at && !pendingSort(pending, m.id));
    setAt(after >= 0 ? after : Math.min(at + 1, items.length - 1));
  };

  const save = async () => {
    if (!current || !kind || busy) return;
    setBusy(true);
    const ok = await send({ op: 'sort', target: current.id, kind, ...(subject.trim() && { subject: subject.trim().toLowerCase() }), ...(tagsOf(tags).length && { tags: tagsOf(tags) }) });
    setBusy(false);
    if (ok) next();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter' && (!isTextField(e.target) || (e.target as HTMLElement).closest('[data-triage]'))) {
        e.preventDefault();
        void save();
        return;
      }
      if (isTextField(e.target)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= KINDS.length) setKind(KINDS[n - 1]);
      else if (e.key === 'ArrowRight') setAt(i => Math.min(i + 1, items.length - 1));
      else if (e.key === 'ArrowLeft') setAt(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!current) return <div className="grid h-64 place-items-center text-sm text-muted-foreground">The inbox is empty: everything has a place.</div>;
  const sorted = pendingSort(pending, current.id);
  const waiting = pendingRating(pending, current.id);
  const facts = [qualityOf(current), current.width && current.height ? `${current.width}×${current.height}` : null, duration(current.duration), bytes(current.bytes)].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3 px-1.5">
        <h2 className="text-[15px] font-semibold tracking-tight">Inbox</h2>
        <span className="text-xs text-muted-foreground">
          {items.length - done} to sort{done > 0 && ` · ${done} sorted, waiting for the media CLI`}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-full p-0" aria-label="Previous" onClick={() => setAt(i => Math.max(i - 1, 0))}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          {Math.min(at, items.length - 1) + 1} / {items.length}
          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-full p-0" aria-label="Next" onClick={() => setAt(i => Math.min(i + 1, items.length - 1))}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border bg-neutral-950">
          <Thumb image={current.thumb} preview={current.preview} playing seed={current.subject ?? current.kind} title={current.title} label={current.guess ?? 'unsorted'} fit="contain" className="aspect-video w-full bg-neutral-950" />
        </div>
        <div className="space-y-4" data-triage>
          <div>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 text-base font-semibold leading-tight">{current.title}</div>
              <button type="button" onClick={() => select({ kind: 'item', id: current.id })} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                Details
              </button>
            </div>
            <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{itemPath(library, current).shown}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {facts.join(' · ')}
              {current.source?.tool && ` · from ${current.source.tool}`}
            </div>
            {current.guess && <div className="mt-1 text-xs text-muted-foreground">The library thinks: {current.guess}</div>}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium">What is it?</div>
            <div className="grid grid-cols-3 gap-1.5">
              {KINDS.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn('flex h-8 items-center justify-between rounded-lg border px-2.5 text-xs capitalize transition', kind === k ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')}
                >
                  {k}
                  <kbd className={cn('font-mono text-[10px]', kind === k ? 'text-background/60' : 'text-muted-foreground')}>{i + 1}</kbd>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Subject</span>
            <Input value={subject} onChange={e => setSubject(e.target.value)} list="triage-subjects" placeholder="one-piece/zoro, transitions, inverteddevils/cadence" className="h-8 text-sm" />
            <datalist id="triage-subjects">
              {subjects.slice(0, 60).map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Tags</span>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="comma separated" className="h-8 text-sm" />
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Rating</span>
            <Stars size="md" value={waiting !== undefined ? waiting : ratingOf(current)} pending={waiting !== undefined} onRate={r => void send({ op: 'rate', target: current.id, rating: r })} />
          </div>

          <div className="flex gap-2">
            <Button className="h-9 flex-1 gap-1.5 rounded-full" disabled={!kind || busy} onClick={() => void save()}>
              <CheckIcon className="size-4" /> {sorted ? 'Sort again' : 'Sort'} <kbd className="ml-1 font-mono text-[10px] opacity-60">Enter</kbd>
            </Button>
            <Button variant="outline" className="h-9 rounded-full" onClick={next}>
              Skip
            </Button>
          </div>
          {sorted && (
            <p className="text-xs text-sky-700 dark:text-sky-300">
              Sorted as {sorted.kind}
              {sorted.subject ? `/${sorted.subject}` : ''}: the media CLI moves it on its next run.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {items.map((m, i) => {
          const isDone = !!pendingSort(pending, m.id);
          return (
            <button key={m.id} type="button" onClick={() => setAt(i)} className={cn('relative w-28 shrink-0 rounded-lg p-0.5 transition', i === at ? 'ring-2 ring-foreground' : 'hover:bg-muted', isDone && 'opacity-45')}>
              <Thumb image={m.thumb} seed={m.subject ?? m.kind} title={m.title} compact className="aspect-video w-full rounded-md" />
              {isDone && <CheckIcon className="absolute right-1.5 top-1.5 size-4 rounded-full bg-emerald-500 p-0.5 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
