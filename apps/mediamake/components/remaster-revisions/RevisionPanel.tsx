'use client';

import { useState } from 'react';
import { CheckIcon, ClockIcon, CopyIcon, PlusIcon, SendIcon, Trash2Icon, TriangleAlertIcon, Undo2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { STATUS_LABEL, clock, staleImages } from '@/lib/file-revisions/revision-file';
import { ladderJobName } from '@/lib/remaster-revisions/ladder';
import { selectActiveRevision, useRemasterStore, useVersions } from './store';

/*
 * The revision beside the ladder: which version is the final, which are dropped, every note, and
 * the Submit to Claude button. The files are the ones /file-revision writes (rev-NNN.json + .md
 * in <folder>/<folder>.revisions/), so the remaster skill reads the pick back the same way.
 */

function VersionChip({ id }: { id: string }) {
  const label = useRemasterStore(s => s.job?.ladder.versions.find(v => v.id === id));
  const setActive = useRemasterStore(s => s.setActive);
  return (
    <Hint label={`Listen to ${label?.label ?? id}`}>
      <button type="button" onClick={() => setActive(id)} className="rounded bg-amber-400 px-1.5 text-[11px] font-extrabold text-black hover:bg-amber-300">
        {label?.label ?? id}
      </button>
    </Hint>
  );
}

function Chips({ ids, empty }: { ids: string[]; empty: string }) {
  return ids.length ? (
    <span className="flex flex-wrap gap-1">
      {ids.map(id => (
        <VersionChip key={id} id={id} />
      ))}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">{empty}</span>
  );
}

function RevisionTabs() {
  const revisionIds = useRemasterStore(s => s.revisionIds);
  const revisions = useRemasterStore(s => s.revisions);
  const activeRevisionId = useRemasterStore(s => s.activeRevisionId);
  const openRevision = useRemasterStore(s => s.openRevision);
  const newRevision = useRemasterStore(s => s.newRevision);
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
  const revision = useRemasterStore(selectActiveRevision);
  const job = useRemasterStore(s => s.job);
  const files = useRemasterStore(s => s.files);
  const setStatus = useRemasterStore(s => s.setStatus);
  const flushSaves = useRemasterStore(s => s.flushSaves);
  if (!revision || !job) return null;
  const stale = staleImages(revision, files);
  const where = job.ladder.index.path ? `${job.ladder.index.path.replace(/\/$/, '')}/` : job.path ? `…/${job.path}/` : `${job.name}/`;
  const message = `Remaster revision ${revision.id} for ${ladderJobName(job.path, job.name)} is ready (${where}${job.name}.revisions/${revision.id}.md)`;
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
        <Hint label="Marks the revision ready, so Claude acts on it (copies the final next to the song)">
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

function GeneralNote() {
  const addComment = useRemasterStore(s => s.addComment);
  const versions = useVersions();
  const [text, setText] = useState('');
  const submit = async () => {
    if (await addComment(text, { ids: versions.map(v => v.id) })) setText('');
  };
  return (
    <div className="space-y-2 border-b p-3">
      <span className="text-xs font-semibold">About the whole ladder</span>
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
  const revision = useRemasterStore(selectActiveRevision);
  const versions = useVersions();
  const updateComment = useRemasterStore(s => s.updateComment);
  const deleteComment = useRemasterStore(s => s.deleteComment);
  const seek = useRemasterStore(s => s.seek);
  const setActive = useRemasterStore(s => s.setActive);
  if (!revision) return null;
  const all = versions.length > 1;
  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">Final</span>
          <Chips ids={revision.final} empty="— press Enter on the one you'd keep" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">Drop</span>
          <Chips ids={revision.drop} empty="—" />
        </div>
      </div>
      <div className="text-xs font-semibold">Notes ({revision.comments.length})</div>
      {!revision.comments.length && <p className="text-xs text-muted-foreground">No notes yet. Press N to write one on the version playing.</p>}
      {revision.comments.map(c => {
        const whole = all && c.images.length === versions.length;
        return (
          <div key={c.id} className={cn('space-y-1.5 rounded-md border p-2', c.status === 'done' && 'opacity-60')}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">{c.id}</span>
              {whole ? <span className="text-[11px] text-muted-foreground">whole ladder</span> : <Chips ids={c.images} empty="" />}
              {c.pin?.t !== undefined && (
                <Hint label="Go to that moment in that version">
                  <button
                    type="button"
                    onClick={() => {
                      setActive(c.pin!.image);
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

export function RevisionPanel() {
  const job = useRemasterStore(s => s.job);
  if (!job) return <div className="p-4 text-xs text-muted-foreground">The pick and the notes appear here once a ladder is open.</div>;
  return (
    <div className="flex h-full flex-col">
      <RevisionTabs />
      <ScrollArea className="min-h-0 flex-1">
        <SubmitBox />
        <GeneralNote />
        <Comments />
      </ScrollArea>
    </div>
  );
}
