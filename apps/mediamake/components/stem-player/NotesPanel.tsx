'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ClockIcon, CopyIcon, GitCompareArrowsIcon, PlusIcon, SendIcon, Trash2Icon, TriangleAlertIcon, Undo2Icon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { STATUS_LABEL, clock, staleImages } from '@/lib/file-revisions/revision-file';
import { getEngine, isReviewable, jobNameOf, selectActiveRevision, selectCurrent, uidOf, useReviewJob, useStemStore } from './store';

/*
 * Notes on what is heard: a note is about the selected tracks of the folder, at the moment the
 * playhead is at (or about the whole track), and is saved beside the files for Claude. The files are
 * the ones /file-revision writes (rev-NNN.json + .md in <folder>/<folder>.revisions/), so a skill
 * reads them the same way. A folder of versions also has its final pick and drops here.
 */

/** The tracks of the folder under review a note is about, as chips: a click selects them. */
function TrackChips({ ids, empty }: { ids: string[]; empty: string }) {
  const review = useStemStore(s => s.review);
  const tracks = useStemStore(s => s.tracks);
  const selectIds = useStemStore(s => s.selectIds);
  if (!ids.length || !review) return <span className="text-xs text-muted-foreground">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map(id => {
        const label = tracks[uidOf(review, id)]?.label ?? id;
        return (
          <Hint key={id} label={`Listen to ${label}`}>
            <button type="button" onClick={() => selectIds(review, [id])} className="rounded bg-amber-400 px-1.5 text-[11px] font-extrabold text-black hover:bg-amber-300">
              {label}
            </button>
          </Hint>
        );
      })}
    </span>
  );
}

function RevisionTabs() {
  const revisionIds = useStemStore(s => s.revisionIds);
  const revisions = useStemStore(s => s.revisions);
  const activeRevisionId = useStemStore(s => s.activeRevisionId);
  const openRevision = useStemStore(s => s.openRevision);
  const newRevision = useStemStore(s => s.newRevision);
  if (!revisionIds.length) return null;
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b px-2">
      {revisionIds.map(id => (
        <Hint key={id} label={`${revisions[id]?.title ?? id} · ${STATUS_LABEL[revisions[id]?.status ?? 'draft']}`} side="bottom">
          <button type="button" onClick={() => openRevision(id)} className={cn('flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted', id === activeRevisionId && 'bg-muted font-semibold')}>
            {id}
            <span className={cn('size-1.5 rounded-full', revisions[id]?.status === 'ready' ? 'bg-amber-400' : revisions[id]?.status === 'resolved' ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
          </button>
        </Hint>
      ))}
      <Hint label="New revision" side="bottom">
        <button type="button" aria-label="New revision" onClick={() => void newRevision()} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <PlusIcon className="size-4" />
        </button>
      </Hint>
    </div>
  );
}

function SubmitBox() {
  const revision = useStemStore(selectActiveRevision);
  const job = useReviewJob();
  const jobName = useStemStore(s => (job ? jobNameOf(s, job.folder) : ''));
  const setStatus = useStemStore(s => s.setStatus);
  const flushSaves = useStemStore(s => s.flushSaves);
  if (!revision || !job) return null;
  const stale = staleImages(revision, job.files);
  const where = job.index.path ? `${job.index.path.replace(/\/$/, '')}/` : `…/${jobName}/`;
  const kind = job.index.workflow === 'make-loudness-remaster' ? 'Remaster revision' : 'Audio revision';
  const message = `${kind} ${revision.id} for ${jobName} is ready (${where}${job.name}.revisions/${revision.id}.md)`;
  const empty = !revision.comments.length && !revision.final.length && !revision.drop.length;
  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{revision.title}</span>
        <span className={cn('rounded px-1.5 py-px text-[10px] font-semibold', revision.status === 'ready' ? 'bg-amber-400 text-black' : revision.status === 'resolved' ? 'bg-emerald-500 text-black' : 'bg-muted text-muted-foreground')}>{STATUS_LABEL[revision.status]}</span>
      </div>
      {stale.length > 0 && (
        <p className="flex items-start gap-1 text-xs text-amber-400">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" /> Written again since: {stale.length} track{stale.length === 1 ? '' : 's'}. Listen again.
        </p>
      )}
      {revision.status === 'draft' && (
        <Hint label="Marks the notes ready and copies the line to send, so Claude reads them from beside the files">
          <Button
            size="sm"
            className="w-full"
            disabled={empty}
            onClick={async () => {
              setStatus('ready');
              await flushSaves();
              await navigator.clipboard.writeText(message).catch(() => undefined);
              toast.success('Ready for Claude: the message to send is copied');
            }}
          >
            <SendIcon className="size-4" /> Submit to Claude
          </Button>
        </Hint>
      )}
      {revision.status === 'ready' && (
        <div className="space-y-2 rounded-md bg-muted p-2 text-xs">
          <p>Tell Claude:</p>
          <code className="block select-all break-words text-[11px]">{message}</code>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void navigator.clipboard.writeText(message).then(() => toast.success('Copied'))}>
              <CopyIcon className="size-3.5" /> Copy
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus('draft')}>
              <Undo2Icon className="size-3.5" /> Back to draft
            </Button>
          </div>
        </div>
      )}
      {revision.status === 'resolved' && <p className="text-xs text-muted-foreground">Claude resolved this revision. New notes start a new one.</p>}
    </div>
  );
}

const QUICK = ['louder', 'softer', 'bring in here', 'take out here', 'too bright', 'this one'];

/** A note on the selected tracks of this folder, at the moment the playhead is at (N), or on the whole track. */
function NoteComposer() {
  const review = useStemStore(s => s.review);
  const selected = useStemStore(s => s.sel.selected);
  const focus = useStemStore(s => s.sel.focus);
  const tracks = useStemStore(s => s.tracks);
  const addComment = useStemStore(s => s.addComment);
  const pause = useStemStore(s => s.pause);
  const seek = useStemStore(s => s.seek);
  const composerFocus = useStemStore(s => s.composerFocus);
  const [text, setText] = useState('');
  const [at, setAt] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  // what the note will be about: the selected tracks of this folder, else the focused one
  const mine = useMemo(() => {
    const here = selected.map(uid => tracks[uid]).filter(t => t && t.folder === review);
    const f = focus ? tracks[focus] : undefined;
    return here.length ? here : f && f.folder === review ? [f] : [];
  }, [selected, focus, tracks, review]);
  const elsewhere = useMemo(() => selected.filter(uid => tracks[uid] && tracks[uid].folder !== review).length, [selected, tracks, review]);
  const stampNow = () => {
    pause();
    setAt(getEngine()?.position() ?? 0);
  };
  // N: this moment, and the cursor in the box
  useEffect(() => {
    if (!composerFocus) return;
    pause();
    setAt(getEngine()?.position() ?? 0);
    ref.current?.focus();
  }, [composerFocus, pause]);
  if (!mine.length) return null;
  const names = mine.length > 3 ? `${mine.length} tracks` : mine.map(t => t.label).join(' + ');
  const submit = async () => {
    if (await addComment(text, at !== null ? { t: at } : {})) {
      setText('');
      setAt(null);
    }
  };
  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold">Note on {names}</span>
        {at === null ? (
          <Hint label="Make the note about the moment the playhead is at (pauses)">
            <button type="button" onClick={stampNow} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <ClockIcon className="size-3" /> add this moment
            </button>
          </Hint>
        ) : (
          <span className="flex items-center gap-0.5 rounded-full border border-blue-400 py-0.5 pl-2 pr-1 text-[11px] text-blue-400">
            <Hint label="Go to that moment">
              <button type="button" onClick={() => seek(at)} className="flex items-center gap-1">
                <ClockIcon className="size-3" /> at {clock(at)}
              </button>
            </Hint>
            <Hint label="No moment: the note is about the whole track">
              <button type="button" aria-label="Remove the moment" onClick={() => setAt(null)} className="rounded-full p-0.5 hover:bg-muted">
                <XIcon className="size-3" />
              </button>
            </Hint>
          </span>
        )}
      </div>
      {elsewhere > 0 && <p className="text-[11px] text-muted-foreground">The {elsewhere === 1 ? 'track' : `${elsewhere} tracks`} selected in another folder {elsewhere === 1 ? 'is' : 'are'} named in the note&apos;s words.</p>}
      <Textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => {
          // a note started by clicking in the box is about this moment too
          if (at === null && !text) stampNow();
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={`What you want, or hear, in ${names}…`}
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

/** In a folder of versions: a note about all of them. */
function GeneralNote() {
  const addComment = useStemStore(s => s.addComment);
  const job = useReviewJob();
  const [text, setText] = useState('');
  const submit = async () => {
    if (job && (await addComment(text, { ids: job.ids }))) setText('');
  };
  return (
    <div className="space-y-2 border-b p-3">
      <span className="text-xs font-semibold">About all of them</span>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="e.g. all of them lose the air of the original; try one step louder…"
        className="min-h-14 text-sm"
      />
      <Button size="sm" variant="outline" className="h-7 w-full text-xs" disabled={!text.trim()} onClick={() => void submit()}>
        Add note for Claude
      </Button>
    </div>
  );
}

function Comments({ versions }: { versions: boolean }) {
  const revision = useStemStore(selectActiveRevision);
  const job = useReviewJob();
  const updateComment = useStemStore(s => s.updateComment);
  const deleteComment = useStemStore(s => s.deleteComment);
  const seek = useStemStore(s => s.seek);
  const selectIds = useStemStore(s => s.selectIds);
  if (!job) return null;
  const count = job.ids.length;
  // by moment, the notes on a whole track after them
  const notes = [...(revision?.comments ?? [])].sort((a, b) => (a.pin?.t ?? Infinity) - (b.pin?.t ?? Infinity));
  return (
    <div className="space-y-3 p-3">
      {versions && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 font-semibold">Final</span>
            <TrackChips ids={revision?.final ?? []} empty="— press Enter on the one you'd keep" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 font-semibold">Drop</span>
            <TrackChips ids={revision?.drop ?? []} empty="—" />
          </div>
        </div>
      )}
      <div className="text-xs font-semibold">Notes ({notes.length})</div>
      {!notes.length && <p className="text-xs text-muted-foreground">No notes yet. Press N at the moment you mean: the note is about the tracks you have selected. Copy in the sidebar takes the notes along.</p>}
      {notes.map(c => {
        // "all of them" is a versions folder's note about the whole set; elsewhere a note names its tracks
        const whole = versions && count > 1 && c.images.length === count;
        return (
          <div key={c.id} className={cn('space-y-1.5 rounded-md border p-2', c.status === 'done' && 'opacity-60')}>
            <div className="flex flex-wrap items-center gap-1.5">
              {c.pin?.t !== undefined && (
                <Hint label="Go to that moment, with those tracks">
                  <button
                    type="button"
                    onClick={() => {
                      selectIds(job.folder.key, c.images);
                      seek(c.pin!.t!);
                    }}
                    className="flex items-center gap-0.5 rounded-full border border-blue-400/60 px-1.5 text-[10px] text-blue-400"
                  >
                    <ClockIcon className="size-3" /> {clock(c.pin.t)}
                  </button>
                </Hint>
              )}
              {whole ? <span className="text-[11px] text-muted-foreground">all of them</span> : <TrackChips ids={c.images} empty="" />}
              <span className="ml-auto flex items-center gap-0.5">
                <span className="mr-1 text-[10px] text-muted-foreground">{c.id}</span>
                <Hint label={c.status === 'done' ? 'Reopen' : 'Mark done'}>
                  <button type="button" onClick={() => updateComment(c.id, { status: c.status === 'done' ? 'open' : 'done' })} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <CheckIcon className="size-3.5" />
                  </button>
                </Hint>
                <Hint label="Delete">
                  <button type="button" onClick={() => void deleteComment(c.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2Icon className="size-3.5" />
                  </button>
                </Hint>
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{c.text}</p>
            {c.reply && (
              <p className="rounded bg-muted px-2 py-1 text-xs">
                <span className="font-semibold">Claude:</span> {c.reply}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NotesPanel() {
  const folder = useStemStore(selectCurrent);
  const setCompare = useStemStore(s => s.setCompare);
  if (!folder) return <div className="p-4 text-xs text-muted-foreground">Select a track to leave a note on it.</div>;
  const versions = isReviewable(folder);
  return (
    <div className="flex h-full flex-col">
      <RevisionTabs />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <SubmitBox />
        <NoteComposer />
        {versions && <GeneralNote />}
        <Comments versions={versions} />
        <div className="space-y-2 border-t p-3 text-[11px] text-muted-foreground">
          {!versions && (
            <>
              <p>Are these files versions of one song to choose between? Comparing them adds Match levels, a final pick and drops.</p>
              <Button size="sm" variant="outline" className="h-7 w-full min-w-0 gap-1.5 text-xs" onClick={() => setCompare(folder.key, true)}>
                <GitCompareArrowsIcon className="size-3.5 shrink-0" /> <span className="truncate">Compare versions here</span>
              </Button>
            </>
          )}
          {folder.compare && !folder.versions && (
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => setCompare(folder.key, false)}>
              Stop comparing versions in this folder (the notes stay)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
