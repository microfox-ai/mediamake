'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, LockIcon, MapPinIcon, PlusIcon, SendIcon, StarIcon, Trash2Icon, TriangleAlertIcon, Undo2Icon, XIcon, ZoomInIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { STATUS_LABEL, staleThumbs } from '@/lib/thumbnail-revisions/revision-file';
import { MAX_FINAL, type ThumbAction } from '@/lib/thumbnail-revisions/types';
import { allIds, selectActiveRevision, useThumbRevisionsStore } from './store';

const QUICK = ['More like this', 'Try other fonts', 'Make the words bigger', 'Move the logo', 'Different words'];

function IdChip({ id }: { id: string }) {
  const click = useThumbRevisionsStore(s => s.click);
  const openZoom = useThumbRevisionsStore(s => s.openZoom);
  return (
    <Hint label={`Select ${id} (double-click to zoom)`}>
      <button
        type="button"
        onClick={() => click(id, { only: true })}
        onDoubleClick={() => openZoom(id)}
        className="rounded bg-amber-400 px-1.5 text-[11px] font-extrabold text-black hover:bg-amber-300"
      >
        {id}
      </button>
    </Hint>
  );
}

function IdList({ ids, empty }: { ids: string[]; empty: string }) {
  return ids.length ? (
    <span className="flex flex-wrap gap-1">
      {ids.map(id => (
        <IdChip key={id} id={id} />
      ))}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">{empty}</span>
  );
}

function RevisionTabs() {
  const revisionIds = useThumbRevisionsStore(s => s.revisionIds);
  const revisions = useThumbRevisionsStore(s => s.revisions);
  const activeRevisionId = useThumbRevisionsStore(s => s.activeRevisionId);
  const openRevision = useThumbRevisionsStore(s => s.openRevision);
  const newRevision = useThumbRevisionsStore(s => s.newRevision);
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b px-2">
      {revisionIds.map(id => (
        <Hint key={id} label={`${revisions[id]?.title ?? id} · ${STATUS_LABEL[revisions[id]?.status ?? 'draft']}`} side="bottom">
          <button
            type="button"
            onClick={() => openRevision(id)}
            className={cn('flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted', id === activeRevisionId && 'bg-muted font-semibold')}
          >
            {id}
            <span className={cn('size-1.5 rounded-full', revisions[id]?.status === 'ready' ? 'bg-amber-400' : revisions[id]?.status === 'resolved' ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
          </button>
        </Hint>
      ))}
      <Hint label="New revision" keys="N" side="bottom">
        <button type="button" aria-label="New revision" onClick={() => void newRevision()} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <PlusIcon className="size-4" />
        </button>
      </Hint>
    </div>
  );
}

function SubmitBox() {
  const revision = useThumbRevisionsStore(selectActiveRevision);
  const job = useThumbRevisionsStore(s => s.job);
  const renders = useThumbRevisionsStore(s => s.renders);
  const setStatus = useThumbRevisionsStore(s => s.setStatus);
  const flushSaves = useThumbRevisionsStore(s => s.flushSaves);
  if (!revision || !job) return null;
  const stale = staleThumbs(revision, Object.fromEntries(Object.entries(renders).map(([id, r]) => [id, r.lastModified])));
  const message = `Thumbnail revision ${revision.id} for ${job.name} is ready (out/thumbnails/${job.name}/${job.name}.revisions/${revision.id}.md)`;
  const empty = !revision.comments.length && !revision.final.length && !revision.keep.length && !revision.drop.length;
  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{revision.title}</span>
        <span className={cn('rounded px-1.5 py-px text-[10px] font-semibold', revision.status === 'ready' ? 'bg-amber-400 text-black' : revision.status === 'resolved' ? 'bg-emerald-500 text-black' : 'bg-muted text-muted-foreground')}>
          {STATUS_LABEL[revision.status]}
        </span>
      </div>
      {stale.length > 0 && (
        <p className="flex items-start gap-1 text-xs text-amber-400">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" /> Re-rendered since: {stale.join(', ')}. Check them again.
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

function SelectionActions() {
  const selection = useThumbRevisionsStore(s => s.selection);
  const index = useThumbRevisionsStore(s => s.job?.index);
  const revision = useThumbRevisionsStore(selectActiveRevision);
  const toggleAction = useThumbRevisionsStore(s => s.toggleAction);
  const addComment = useThumbRevisionsStore(s => s.addComment);
  const openZoom = useThumbRevisionsStore(s => s.openZoom);
  const composerFocus = useThumbRevisionsStore(s => s.composerFocus);
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (composerFocus) ref.current?.focus();
  }, [composerFocus]);

  const ordered = allIds(index).filter(id => selection.includes(id));
  const on = (a: ThumbAction) => ordered.length > 0 && ordered.every(id => revision?.[a].includes(id));
  const submit = async () => {
    if (await addComment(text)) setText('');
  };
  const action = (a: ThumbAction, label: string, keys: string, icon: React.ReactNode, hint: string) => (
    <Hint label={hint} keys={keys}>
      <Button size="sm" variant={on(a) ? 'default' : 'outline'} className="h-8 flex-1 gap-1 px-2 text-xs" disabled={!ordered.length} onClick={() => void toggleAction(a)}>
        {icon} {label}
      </Button>
    </Hint>
  );
  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">Selection</span>
        {ordered.length > 0 && (
          <Hint label="Zoom in on the selection" keys="Space">
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => openZoom()}>
              <ZoomInIcon className="size-4" />
            </button>
          </Hint>
        )}
      </div>
      <IdList ids={ordered} empty="Click thumbnails to select them (several at once)." />
      <div className="flex gap-1.5">
        {action('final', 'Final', 'F', <StarIcon className="size-3.5" />, `Select for upload: 1 final, or up to ${MAX_FINAL} for YouTube's A/B test`)}
        {action('keep', 'Keep', 'K', <LockIcon className="size-3.5" />, 'Keep exactly as it is')}
        {action('drop', 'Drop', 'D', <XIcon className="size-3.5" />, 'Not worth more work')}
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
        placeholder={ordered.length ? `Comment on ${ordered.join(', ')}…` : 'Select thumbnails, then comment…'}
        className="min-h-20 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {QUICK.map(q => (
          <button key={q} type="button" onClick={() => setText(t => (t ? `${t}. ${q}` : q))} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
            {q}
          </button>
        ))}
      </div>
      <Hint label="Add the comment" keys="Mod Enter">
        <Button size="sm" className="w-full" disabled={!text.trim() || !ordered.length} onClick={() => void submit()}>
          Add comment
        </Button>
      </Hint>
      <p className="text-[11px] text-muted-foreground">To point at a tiny mistake, zoom in and click the spot.</p>
    </div>
  );
}

function Comments() {
  const revision = useThumbRevisionsStore(selectActiveRevision);
  const updateComment = useThumbRevisionsStore(s => s.updateComment);
  const deleteComment = useThumbRevisionsStore(s => s.deleteComment);
  if (!revision) return null;
  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">{revision.final.length > 1 ? 'A/B' : 'Final'}</span>
          <IdList ids={revision.final} empty="—" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">Keep</span>
          <IdList ids={revision.keep} empty="—" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-semibold">Drop</span>
          <IdList ids={revision.drop} empty="—" />
        </div>
      </div>
      <div className="text-xs font-semibold">Comments ({revision.comments.length})</div>
      {!revision.comments.length && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      {revision.comments.map(c => (
        <div key={c.id} className={cn('space-y-1.5 rounded-md border p-2', c.status === 'done' && 'opacity-60')}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">{c.id}</span>
            <IdList ids={c.thumbs} empty="" />
            {c.pin && (
              <Hint label={`Pinned at ${Math.round(c.pin.x * 100)}% across, ${Math.round(c.pin.y * 100)}% down${c.snapshot ? ' (zoomed crop saved)' : ''}`}>
                <MapPinIcon className="size-3.5 text-amber-400" />
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
          {c.reply && <p className="rounded bg-muted px-2 py-1 text-xs"><span className="font-semibold">Claude:</span> {c.reply}</p>}
        </div>
      ))}
    </div>
  );
}

export function RevisionPanel() {
  const job = useThumbRevisionsStore(s => s.job);
  if (!job) return <div className="p-4 text-xs text-muted-foreground">Revisions appear here once a job is open.</div>;
  return (
    <div className="flex h-full flex-col">
      <RevisionTabs />
      <ScrollArea className="min-h-0 flex-1">
        <SubmitBox />
        <SelectionActions />
        <Comments />
      </ScrollArea>
    </div>
  );
}
