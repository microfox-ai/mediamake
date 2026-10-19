'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, FileAudio, FileVideo, FolderOpen, HardDrive, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagMultiSelect } from '@/components/ui/tag-multi-select';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/components/editor/player/render-stats';
import type { LocalMediaCandidate, LocalMediaContentType } from '@/lib/local-media/types';
import { useLocalMedia, type LocalImportSelection } from './local-media-provider';

const TYPE_META: Partial<Record<LocalMediaContentType, { label: string; icon: typeof FileVideo; tone: string }>> = {
  video: { label: 'Video', icon: FileVideo, tone: 'text-violet-500' },
  audio: { label: 'Audio', icon: FileAudio, tone: 'text-amber-500' },
  image: { label: 'Images', icon: ImageIcon, tone: 'text-sky-500' },
};

const INITIAL_ROWS = 300;

export function LocalImportDialog({
  selection,
  onClose,
  onImported,
  defaultTags = [],
  projects = [],
  defaultProjectId,
}: {
  selection: LocalImportSelection | null;
  onClose: () => void;
  onImported?: (added: number) => void;
  defaultTags?: string[];
  projects?: { id: string; displayName: string }[];
  defaultProjectId?: string | null;
}) {
  const { importSelection } = useLocalMedia();
  const candidates = useMemo(() => selection?.candidates ?? [], [selection]);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [types, setTypes] = useState<Set<LocalMediaContentType>>(new Set(['video', 'audio', 'image']));
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId ?? undefined);
  const [showAll, setShowAll] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Reset for each new selection: everything new is ticked.
  useEffect(() => {
    if (!selection) return;
    setChosen(new Set(selection.candidates.flatMap((c, i) => (c.alreadyImported ? [] : [i]))));
    setTypes(new Set(['video', 'audio', 'image']));
    setTags(defaultTags);
    setProjectId(defaultProjectId && defaultProjectId !== 'default' ? defaultProjectId : undefined);
    setShowAll(false);
    setProgress(null);
    // defaultTags/defaultProjectId are read once per selection on purpose.
  }, [selection]);

  const typeCounts = useMemo(() => {
    const counts = new Map<LocalMediaContentType, number>();
    for (const c of candidates) counts.set(c.contentType, (counts.get(c.contentType) ?? 0) + 1);
    return counts;
  }, [candidates]);

  const visible = useMemo(
    () => candidates.map((c, i) => ({ c, i })).filter(({ c }) => types.has(c.contentType)),
    [candidates, types],
  );
  const picked = visible.filter(({ c, i }) => chosen.has(i) && !c.alreadyImported);
  const pickedBytes = picked.reduce((sum, { c }) => sum + c.size, 0);
  const alreadyCount = candidates.filter((c) => c.alreadyImported).length;
  const selectable = visible.filter(({ c }) => !c.alreadyImported);
  const allSelected = selectable.length > 0 && selectable.every(({ i }) => chosen.has(i));
  const importing = progress !== null;

  const toggleType = (type: LocalMediaContentType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const toggleAll = () =>
    setChosen((prev) => {
      const next = new Set(prev);
      for (const { i } of selectable) {
        if (allSelected) next.delete(i);
        else next.add(i);
      }
      return next;
    });

  const toggleOne = (i: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const handleImport = async () => {
    if (!selection || picked.length === 0) return;
    setProgress({ done: 0, total: picked.length });
    try {
      const { added, skipped } = await importSelection(
        selection,
        picked.map(({ c }) => c),
        { tags, projectId },
        (done, total) => setProgress({ done, total }),
      );
      toast.success(`Added ${added} local file${added === 1 ? '' : 's'}`, {
        description:
          skipped > 0
            ? `${skipped} already in your library were skipped.`
            : 'They stay on this computer — nothing was uploaded.',
      });
      onImported?.(added);
      onClose();
    } catch (err) {
      console.error('[local-media] import failed', err);
      toast.error(err instanceof Error ? err.message : 'Import failed');
      setProgress(null);
    }
  };

  const title = selection?.folderName
    ? `Import from “${selection.folderName}”`
    : `Import ${candidates.length} file${candidates.length === 1 ? '' : 's'}`;
  const rows = showAll ? visible : visible.slice(0, INITIAL_ROWS);

  return (
    <Dialog open={Boolean(selection)} onOpenChange={(open) => !open && !importing && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[88vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selection?.folderName ? (
              <FolderOpen className="h-5 w-5 text-sky-500" />
            ) : (
              <HardDrive className="h-5 w-5 text-sky-500" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {candidates.length === 0
              ? 'No video, audio or image files were found here.'
              : `Found ${candidates.length} media file${candidates.length === 1 ? '' : 's'}${
                  alreadyCount ? ` · ${alreadyCount} already in your library` : ''
                }. They stay on this computer and are used straight from disk.`}
          </DialogDescription>
        </DialogHeader>

        {candidates.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(['video', 'audio', 'image'] as const).map((type) => {
                const count = typeCounts.get(type) ?? 0;
                if (count === 0) return null;
                const meta = TYPE_META[type]!;
                const Icon = meta.icon;
                const on = types.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={importing}
                    onClick={() => toggleType(type)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      on ? 'border-primary/40 bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', on && meta.tone)} />
                    {meta.label}
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </button>
                );
              })}
              <span className="flex-1" />
              <Button variant="ghost" size="sm" onClick={toggleAll} disabled={importing || selectable.length === 0}>
                {allSelected ? 'Select none' : 'Select all'}
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border divide-y">
              {rows.map(({ c, i }) => (
                <CandidateRow
                  key={i}
                  candidate={c}
                  checked={chosen.has(i)}
                  disabled={importing || c.alreadyImported}
                  onToggle={() => toggleOne(i)}
                />
              ))}
              {!showAll && visible.length > INITIAL_ROWS && (
                <button
                  type="button"
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(true)}
                >
                  Show all {visible.length} files
                </button>
              )}
              {visible.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No files of the selected types.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <TagMultiSelect
                  selectedTags={tags}
                  onTagsChange={setTags}
                  label=""
                  required={false}
                  showCreateNew={true}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Project</Label>
                <Select
                  value={projectId ?? 'none'}
                  onValueChange={(v) => setProjectId(v === 'none' ? undefined : v)}
                  disabled={importing}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {importing && progress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>Reading files and making thumbnails…</span>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />
            Nothing is uploaded. Works in preview & browser render.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing || picked.length === 0}>
              {importing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {picked.length > 0
                ? `Add ${picked.length} file${picked.length === 1 ? '' : 's'} · ${formatBytes(pickedBytes)}`
                : 'Add files'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  candidate,
  checked,
  disabled,
  onToggle,
}: {
  candidate: LocalMediaCandidate;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const meta = TYPE_META[candidate.contentType];
  const Icon = meta?.icon ?? FileVideo;
  const slash = candidate.relativePath.lastIndexOf('/');
  const folder = slash === -1 ? '' : candidate.relativePath.slice(0, slash + 1);
  return (
    <label
      className={cn(
        'flex items-center gap-3 px-3 py-2 text-sm',
        disabled ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50',
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--primary)]"
        checked={checked && !candidate.alreadyImported}
        disabled={disabled}
        onChange={onToggle}
      />
      <Icon className={cn('h-4 w-4 shrink-0', meta?.tone)} />
      <span className="min-w-0 flex-1 truncate" title={candidate.relativePath}>
        {folder && <span className="text-muted-foreground">{folder}</span>}
        {candidate.name}
      </span>
      {candidate.alreadyImported ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          Already added
        </span>
      ) : (
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{formatBytes(candidate.size)}</span>
      )}
    </label>
  );
}
