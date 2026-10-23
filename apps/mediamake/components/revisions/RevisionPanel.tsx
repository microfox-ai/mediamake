'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CameraIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleIcon,
  ClipboardCopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ScissorsIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { frameAt, formatTime, rangeFrames } from '@/lib/revisions/frames';
import { getSubdir, readFileIn, revisionsDirName } from '@/lib/revisions/fs';
import { shotAt, shotsInRange } from '@/lib/revisions/map';
import {
  commentSortKey,
  isStaleRevision,
  STATUS_LABEL,
} from '@/lib/revisions/revision-file';
import type {
  Revision,
  RevisionComment,
  RevisionStatus,
} from '@/lib/revisions/types';
import { selectActiveRevision, selectFps, useRevisionsStore } from './store';
import { Hint, useKeys } from './keyboard';

function RevisionTabs() {
  const video = useRevisionsStore(s => s.video);
  const revisionIds = useRevisionsStore(s => s.revisionIds);
  const openRevisionIds = useRevisionsStore(s => s.openRevisionIds);
  const activeRevisionId = useRevisionsStore(s => s.activeRevisionId);
  const revisions = useRevisionsStore(s => s.revisions);
  const dirty = useRevisionsStore(s => s.dirty);
  const newRevision = useRevisionsStore(s => s.newRevision);
  const openRevision = useRevisionsStore(s => s.openRevision);
  const closeRevision = useRevisionsStore(s => s.closeRevision);
  const setActiveRevision = useRevisionsStore(s => s.setActiveRevision);
  const closed = revisionIds.filter(id => !openRevisionIds.includes(id));

  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 border-b bg-muted/30 px-1">
      <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {openRevisionIds.map(id => {
          const active = id === activeRevisionId;
          return (
            <Hint key={id} label={`${id}.json`} side="bottom">
              <div
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onClick={() => setActiveRevision(id)}
                onKeyDown={e => e.key === 'Enter' && setActiveRevision(id)}
                className={cn(
                  'group flex h-8 max-w-40 shrink-0 cursor-pointer items-center gap-1 rounded-t-md border border-b-0 px-2 text-xs',
                  active
                    ? 'bg-background font-medium'
                    : 'border-transparent text-muted-foreground hover:bg-background/60',
                )}
              >
                <span className="truncate">{revisions[id]?.title ?? id}</span>
                {dirty[id] && (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-amber-500"
                    aria-label="Unsaved"
                  />
                )}
                <Hint label="Close (the file stays on disk)" side="bottom">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      void closeRevision(id);
                    }}
                    className="rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Hint>
              </div>
            </Hint>
          );
        })}
      </div>
      <Hint label="New revision" keys="N" side="bottom">
        <Button
          variant="ghost"
          size="sm"
          className="mb-0.5 h-7 w-7 shrink-0 p-0"
          disabled={!video}
          onClick={() => void newRevision()}
        >
          <PlusIcon className="size-4" />
        </Button>
      </Hint>
      <DropdownMenu>
        <Hint label="Open a revision of this video" side="bottom">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mb-0.5 h-7 w-7 shrink-0 p-0"
              disabled={!video}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs">
            Revisions of this video
          </DropdownMenuLabel>
          {revisionIds.length === 0 && (
            <DropdownMenuItem disabled className="text-xs">
              None yet
            </DropdownMenuItem>
          )}
          {revisionIds.map(id => (
            <DropdownMenuItem
              key={id}
              className="text-xs"
              onSelect={() => openRevision(id)}
            >
              <span className="truncate">{revisions[id]?.title ?? id}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {revisions[id]?.comments.length ?? 0} ·{' '}
                {revisions[id] ? STATUS_LABEL[revisions[id].status] : ''}
                {!closed.includes(id) && ' · open'}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs"
            onSelect={() => void newRevision()}
          >
            <PlusIcon className="size-3.5" /> New revision
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function claudeMessage(revision: Revision): string {
  const s = useRevisionsStore.getState();
  const videoName = s.video?.name ?? revision.video.file;
  const dirName = revisionsDirName(videoName);
  const sourcePath = s.map?.source?.path;
  const folderPath = sourcePath
    ? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
    : null;
  const location = folderPath
    ? `${folderPath}/${dirName}/${revision.id}.md`
    : `${dirName}/${revision.id}.md in the folder "${s.folder?.name ?? '?'}" (next to ${videoName})`;
  const open = revision.comments.filter(c => c.status === 'open').length;
  return [
    `Please work through ${revision.title} (${revision.id}) of ${videoName}: ${open} open comment${open === 1 ? '' : 's'}.`,
    `Read ${location}; the JSON beside it is the source of truth and ${revision.id}/ holds the stills.`,
    `When a comment is handled, set its status to "done" and add a reply in ${revision.id}.json.`,
  ].join('\n');
}

function RevisionHeader({ revision }: { revision: Revision }) {
  const updateRevision = useRevisionsStore(s => s.updateRevision);
  const newRevision = useRevisionsStore(s => s.newRevision);
  const video = useRevisionsStore(s => s.video);
  const [title, setTitle] = useState(revision.title);
  useEffect(() => setTitle(revision.title), [revision.title, revision.id]);
  const stale = video ? isStaleRevision(revision, video) : false;

  const copyForClaude = async () => {
    try {
      await navigator.clipboard.writeText(claudeMessage(revision));
      toast.success('Copied: paste it to Claude', { duration: 2500 });
    } catch {
      toast.error('Clipboard is blocked in this browser', { duration: 4000 });
    }
  };

  const setStatus = (status: RevisionStatus) => {
    updateRevision(revision.id, r => ({ ...r, status }));
    if (status === 'ready') {
      toast.success(`${revision.title} is ready for Claude`, {
        duration: 6000,
        action: { label: 'Copy message', onClick: () => void copyForClaude() },
      });
    }
  };

  const commitTitle = () => {
    const next = title.trim();
    if (next && next !== revision.title)
      updateRevision(revision.id, r => ({ ...r, title: next }));
    else setTitle(revision.title);
  };

  return (
    <div className="shrink-0 space-y-1.5 border-b p-2">
      <div className="flex items-center gap-1.5">
        <Hint label="Rename this revision (Enter saves)" side="bottom">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e =>
              e.key === 'Enter' && (e.target as HTMLInputElement).blur()
            }
            className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 text-sm font-medium hover:border-input focus:border-input focus:outline-none"
            aria-label="Revision title"
          />
        </Hint>
        <Hint
          label="Set to “Ready for Claude” when you're done reviewing"
          side="bottom"
        >
          <select
            value={revision.status}
            onChange={e => setStatus(e.target.value as RevisionStatus)}
            className={cn(
              'h-7 rounded border px-1.5 text-xs',
              revision.status === 'ready' && 'border-sky-500 text-sky-700',
              revision.status === 'resolved' &&
                'border-emerald-500 text-emerald-700',
            )}
          >
            {(Object.keys(STATUS_LABEL) as RevisionStatus[]).map(status => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </Hint>
        <DropdownMenu>
          <Hint label="Copy a message or file name for Claude" side="bottom">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-xs"
              onSelect={() => void copyForClaude()}
            >
              <ClipboardCopyIcon className="size-3.5" /> Copy message for Claude
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onSelect={() => {
                const s = useRevisionsStore.getState();
                const path = `${revisionsDirName(s.video?.name ?? '')}/${revision.id}.json`;
                void navigator.clipboard
                  .writeText(path)
                  .then(() =>
                    toast.success(`Copied ${path}`, { duration: 2000 }),
                  );
              }}
            >
              <ClipboardCopyIcon className="size-3.5" /> Copy file name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-1.5 text-[11px] text-muted-foreground">
        {revision.id}.json · {revision.comments.length} comment
        {revision.comments.length === 1 ? '' : 's'} ·{' '}
        {revision.comments.filter(c => c.status === 'open').length} open
      </div>
      {stale && (
        <div className="flex items-start gap-1.5 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-800 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Written against an older render (
            {new Date(revision.video.lastModified).toLocaleString()}). New
            comments here would mix two cuts.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void newRevision()}
            >
              Start a new revision
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

function AnchorChip() {
  const selection = useRevisionsStore(s => s.selection);
  const map = useRevisionsStore(s => s.map);
  const currentTime = useRevisionsStore(s => s.currentTime);
  const fps = useRevisionsStore(selectFps);
  const setSelection = useRevisionsStore(s => s.setSelection);

  if (selection) {
    const shots = shotsInRange(map, selection.from, selection.to, fps);
    return (
      <div className="flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-1 text-[11px] text-sky-800 dark:text-sky-200">
        <ScissorsIcon className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate tabular-nums">
          {formatTime(selection.from)} → {formatTime(selection.to)} · f
          {rangeFrames(selection, fps).first}–f
          {rangeFrames(selection, fps).last}
          {shots.length > 0 &&
            ` · ${shots.length === 1 ? shots[0].id : `${shots[0].id} → ${shots[shots.length - 1].id}`}`}
        </span>
        <Hint label="Comment on the current frame instead" keys="Esc">
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="ml-auto"
          >
            <XIcon className="size-3" />
          </button>
        </Hint>
      </div>
    );
  }
  const shot = shotAt(map, currentTime);
  return (
    <div className="flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
      <CameraIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate tabular-nums">
        {shot && (
          <span className="font-mono font-semibold text-foreground">
            {shot.id} ·{' '}
          </span>
        )}
        f{frameAt(currentTime, fps)} · {formatTime(currentTime)} · saves a still
      </span>
    </div>
  );
}

function Composer() {
  const video = useRevisionsStore(s => s.video);
  const selection = useRevisionsStore(s => s.selection);
  const composerFocusToken = useRevisionsStore(s => s.composerFocusToken);
  const addComment = useRevisionsStore(s => s.addComment);
  const pause = useRevisionsStore(s => s.pause);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const addKeys = useKeys('Mod ↵');
  const playKeys = useKeys('PlayAnywhere');

  useEffect(() => {
    if (composerFocusToken) ref.current?.focus();
  }, [composerFocusToken]);

  const submit = async () => {
    if (!text.trim() || adding) return;
    setAdding(true);
    try {
      if (await addComment(text)) setText('');
    } finally {
      setAdding(false);
    }
  };

  if (!video) return null;
  return (
    <div className="shrink-0 space-y-1.5 border-b p-2">
      <AnchorChip />
      <Textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={pause}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={
          selection
            ? 'What should change in this range?'
            : 'What should change in this frame?'
        }
        className="min-h-16 resize-none text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {addKeys} add · {playKeys} play · Esc leave
        </span>
        <Hint
          label={
            selection
              ? 'Add a comment on the selected range'
              : 'Add a comment on this frame (saves a still)'
          }
          keys="Mod ↵"
        >
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!text.trim() || adding}
            onClick={() => void submit()}
          >
            {adding ? 'Saving…' : 'Add comment'}
          </Button>
        </Hint>
      </div>
    </div>
  );
}

/** Object URL for a saved still, read straight from the folder. */
function useStillUrl(snapshot: string | undefined): string | null {
  const folder = useRevisionsStore(s => s.folder);
  const videoName = useRevisionsStore(s => s.video?.name);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!snapshot || !folder || !videoName) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void (async () => {
      const [sub, name] = snapshot.split('/');
      const dir = await getSubdir(
        folder.handle,
        revisionsDirName(videoName),
        false,
      ).catch(() => null);
      const stills =
        dir && sub ? await getSubdir(dir, sub, false).catch(() => null) : null;
      const file =
        stills && name
          ? await readFileIn(stills, name).catch(() => null)
          : null;
      if (!file || cancelled) return;
      objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [snapshot, folder, videoName]);
  return url;
}

function CommentCard({
  comment,
  highlighted,
}: {
  comment: RevisionComment;
  highlighted: boolean;
}) {
  const focusComment = useRevisionsStore(s => s.focusComment);
  const editComment = useRevisionsStore(s => s.editComment);
  const deleteComment = useRevisionsStore(s => s.deleteComment);
  const still = useStillUrl(
    comment.kind === 'point' ? comment.snapshot : undefined,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const ref = useRef<HTMLDivElement>(null);
  const done = comment.status === 'done';

  useEffect(() => {
    if (highlighted)
      ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlighted]);

  const where =
    comment.kind === 'point'
      ? `${comment.shot?.id ? `${comment.shot.id} · ` : ''}f${comment.frame} · ${formatTime(comment.time)}`
      : `${comment.shots.length ? `${comment.shots[0]}${comment.shots.length > 1 ? ` → ${comment.shots[comment.shots.length - 1]}` : ''} · ` : ''}f${comment.fromFrame}–f${comment.toFrame}`;

  return (
    <div
      ref={ref}
      onClick={() => !editing && focusComment(comment.id)}
      className={cn(
        'cursor-pointer rounded-md border p-2 text-xs transition-colors hover:bg-muted/50',
        highlighted && 'border-foreground/40 bg-muted/60',
        done && 'opacity-60',
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Hint label={done ? 'Mark open' : 'Mark done'}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              editComment(comment.id, { status: done ? 'open' : 'done' });
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {done ? (
              <CheckCircle2Icon className="size-4 text-emerald-600" />
            ) : (
              <CircleIcon className="size-4" />
            )}
          </button>
        </Hint>
        {comment.kind === 'range' ? (
          <ScissorsIcon className="size-3 shrink-0 text-sky-600" />
        ) : (
          <CameraIcon className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 truncate font-mono text-[11px] tabular-nums">
          {where}
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {comment.id}
        </span>
        <DropdownMenu>
          <Hint label="Edit or delete">
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontalIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem
              className="text-xs"
              onSelect={() => {
                setDraft(comment.text);
                setEditing(true);
              }}
            >
              <PencilIcon className="size-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-destructive"
              onSelect={() => deleteComment(comment.id)}
            >
              <Trash2Icon className="size-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {editing ? (
        <div className="space-y-1" onClick={e => e.stopPropagation()}>
          <Textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (draft.trim())
                  editComment(comment.id, { text: draft.trim() });
                setEditing(false);
              }
            }}
            className="min-h-14 resize-none text-xs"
          />
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs"
              disabled={!draft.trim()}
              onClick={() => {
                editComment(comment.id, { text: draft.trim() });
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p
          className={cn(
            'whitespace-pre-wrap break-words',
            done && 'line-through',
          )}
        >
          {comment.text}
        </p>
      )}
      {still && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={still}
          alt={`Still of ${comment.id}`}
          className="mt-1.5 w-full rounded border object-contain"
        />
      )}
      {comment.reply && (
        <div className="mt-1.5 rounded bg-muted px-2 py-1 text-[11px]">
          <span className="font-medium">Claude:</span> {comment.reply}
        </div>
      )}
    </div>
  );
}

function CommentList({ revision }: { revision: Revision }) {
  const highlightCommentId = useRevisionsStore(s => s.highlightCommentId);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const comments = useMemo(
    () =>
      [...revision.comments]
        .filter(c => !onlyOpen || c.status === 'open')
        .sort((a, b) => commentSortKey(a) - commentSortKey(b)),
    [revision.comments, onlyOpen],
  );

  return (
    <>
      <div className="flex h-7 shrink-0 items-center gap-2 px-2 text-[11px] text-muted-foreground">
        <span>Comments</span>
        <label className="ml-auto flex items-center gap-1">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={e => setOnlyOpen(e.target.checked)}
          />
          open only
        </label>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 px-2 pb-3">
          {comments.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {revision.comments.length
                ? 'Everything is done.'
                : 'No comments yet.'}
            </div>
          )}
          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              highlighted={comment.id === highlightCommentId}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

export function RevisionPanel() {
  const video = useRevisionsStore(s => s.video);
  const revision = useRevisionsStore(selectActiveRevision);

  return (
    <div className="flex h-full min-w-0 flex-col border-l bg-background">
      <RevisionTabs />
      {revision && <RevisionHeader revision={revision} />}
      <Composer />
      {revision ? (
        <CommentList revision={revision} />
      ) : (
        <div className="p-4 text-center text-xs text-muted-foreground">
          {video
            ? 'No revision open. Your first comment starts a new one, or press + above.'
            : 'Comments for the open video show up here.'}
        </div>
      )}
    </div>
  );
}
