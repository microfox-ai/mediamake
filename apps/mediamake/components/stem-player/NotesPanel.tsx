'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ClockIcon, CopyIcon, GitCompareArrowsIcon, PlusIcon, SendIcon, Trash2Icon, TriangleAlertIcon, Undo2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { STATUS_LABEL, clock, staleImages } from '@/lib/file-revisions/revision-file';
import { getEngine, isReviewable, jobNameOf, selectActiveRevision, selectCurrent, uidOf, useReviewJob, useStemStore } from './store';

/*
 * The review of a folder of versions: which one is the final, which are dropped, every note, and
 * the Submit to Claude button. The files are the ones /file-revision writes (rev-NNN.json + .md in
 * <folder>/<folder>.revisions/), so the skill that made the versions reads the pick back the same
 * way. Any other folder gets this panel when the user turns Compare versions on for it.
 */

function TrackChip({ id }: { id: string }) {
  const track = useStemStore(s => (s.review ? s.tracks[uidOf(s.review, id)] : undefined));
  const clickTrack = useStemStore(s => s.clickTrack);
  const label = track?.label ?? id;
  return (
    <Hint label={`Listen to ${label}`}>
      <button type="button" onClick={() => track && clickTrack(track.uid)} className="rounded bg-amber-400 px-1.5 text-[11px] font-extrabold text-black hover:bg-amber-300">
        {label}
      </button>
    </Hint>
  );
}

function Chips({ ids, empty }: { ids: string[]; empty: string }) {
  return ids.length ? (
    <span className="flex flex-wrap gap-1">
      {ids.map(id => (
        <TrackChip key={id} id={id} />
      ))}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">{empty}</span>
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
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" /> Re-rendered since: {stale.length} version{stale.length === 1 ? '' : 's'}. Listen again.
        </p>
      )}
      {revision.status === 'draft' && (
        <Hint label="Marks the revision ready, so Claude acts on it">
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
      {revision.status === 'resolved' && <p className="text-xs text-muted-foreground">Claude resolved this revision. New actions start a new one.</p>}
    </div>
  );
}

const QUICK = ['too bright', 'vocal buried', 'bass muddy', 'this one', 'harsh at the chorus'];

/** A note on the focused track, with the moment it is about when wanted. */
function NoteComposer() {
  const track = useStemStore(s => (s.sel.focus && s.tracks[s.sel.focus]?.folder === s.review ? s.tracks[s.sel.focus] : undefined));
  const addComment = useStemStore(s => s.addComment);
  const pause = useStemStore(s => s.pause);
  const seek = useStemStore(s => s.seek);
  const composerFocus = useStemStore(s => s.composerFocus);
  const [text, setText] = useState('');
  const [at, setAt] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (composerFocus) ref.current?.focus();
  }, [composerFocus]);
  if (!track) return null;
  const submit = async () => {
    if (await addComment(text, { ids: [track.id], ...(at !== null ? { t: at } : {}) })) {
      setText('');
      setAt(null);
    }
  };
  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Note on {track.label}</span>
        <Hint label={at === null ? 'Attach the moment the playhead is at (pauses)' : 'Forget the moment'}>
          <button
            type="button"
            onClick={() => {
              if (at !== null) return setAt(null);
              pause();
              setAt(getEngine()?.position() ?? 0);
            }}
            className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', at !== null ? 'border-blue-400 text-blue-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            <ClockIcon className="size-3" /> {at === null ? 'at this moment' : `at ${clock(at)}`}
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
        placeholder={`What you hear in ${track.label}…`}
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

function Comments() {
  const revision = useStemStore(selectActiveRevision);
  const job = useReviewJob();
  const updateComment = useStemStore(s => s.updateComment);
  const deleteComment = useStemStore(s => s.deleteComment);
  const seek = useStemStore(s => s.seek);
  const clickTrack = useStemStore(s => s.clickTrack);
  if (!job) return null;
  const count = job.ids.length;
  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">Final</span>
          <Chips ids={revision?.final ?? []} empty="— press Enter on the one you'd keep" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">Drop</span>
          <Chips ids={revision?.drop ?? []} empty="—" />
        </div>
      </div>
      <div className="text-xs font-semibold">Notes ({revision?.comments.length ?? 0})</div>
      {!revision?.comments.length && <p className="text-xs text-muted-foreground">No notes yet. Press N to write one on the track you are on.</p>}
      {revision?.comments.map(c => {
        const whole = count > 1 && c.images.length === count;
        return (
          <div key={c.id} className={cn('space-y-1.5 rounded-md border p-2', c.status === 'done' && 'opacity-60')}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">{c.id}</span>
              {whole ? <span className="text-[11px] text-muted-foreground">all of them</span> : <Chips ids={c.images} empty="" />}
              {c.pin?.t !== undefined && (
                <Hint label="Go to that moment in that track">
                  <button
                    type="button"
                    onClick={() => {
                      clickTrack(uidOf(job.folder.key, c.pin!.image));
                      seek(c.pin!.t!);
                    }}
                    className="flex items-center gap-0.5 rounded-full border border-blue-400/60 px-1.5 text-[10px] text-blue-400"
                  >
                    <ClockIcon className="size-3" /> {clock(c.pin.t)}
                  </button>
                </Hint>
              )}
              <span className="ml-auto flex gap-0.5">
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
  if (!folder)
    return <div className="p-4 text-xs text-muted-foreground">Notes and the final pick appear here for a folder that holds the versions of one song.</div>;
  if (!isReviewable(folder))
    return (
      <div className="space-y-3 p-4 text-xs text-muted-foreground">
        <p>
          <b className="text-foreground">{folder.name}</b> plays as it is: select tracks to hear them, alone or together.
        </p>
        <p>If its files are versions of one song to choose between, turn on Compare versions: you get Match levels, a final pick, drops, and notes saved beside the files for Claude.</p>
        <Button size="sm" variant="outline" className="h-7 w-full gap-1.5 text-xs" onClick={() => setCompare(folder.key, true)}>
          <GitCompareArrowsIcon className="size-3.5" /> Compare versions in this folder
        </Button>
      </div>
    );
  return (
    <div className="flex h-full flex-col">
      <RevisionTabs />
      <ScrollArea className="min-h-0 flex-1">
        <SubmitBox />
        <NoteComposer />
        <GeneralNote />
        <Comments />
        {folder.compare && !folder.versions && (
          <div className="p-3 pt-0">
            <button type="button" className="text-[11px] text-muted-foreground underline-offset-2 hover:underline" onClick={() => setCompare(folder.key, false)}>
              Stop comparing versions in this folder (notes stay on disk)
            </button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
