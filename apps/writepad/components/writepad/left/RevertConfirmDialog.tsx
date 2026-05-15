'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2, Trash2, FilePlus, FileEdit } from 'lucide-react';

export interface RevertPreviewData {
  commitId: string;
  commitMessage: string;
  toDelete: Array<{ fileId: string; name: string }>;
  toRestore: Array<{ fileId: string; name: string }>;
  toModify: Array<{ fileId: string; name: string }>;
}

interface RevertConfirmDialogProps {
  data: RevertPreviewData | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RevertConfirmDialog({
  data,
  onClose,
  onConfirm,
}: RevertConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const totalChanges =
    (data?.toDelete.length ?? 0) +
    (data?.toRestore.length ?? 0) +
    (data?.toModify.length ?? 0);

  return (
    <Dialog open={data !== null} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw size={15} className="text-rose-400" />
            Reset branch to this commit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Resetting to</p>
            <p className="truncate text-xs font-medium text-foreground">{data?.commitMessage}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {data?.commitId.slice(0, 7)}
            </p>
          </div>

          {totalChanges === 0 ? (
            <p className="text-xs text-muted-foreground">
              No file changes — the branch is already at this commit&apos;s state.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                These file changes will be applied:
              </p>

              {(data?.toDelete ?? []).length > 0 && (
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                    Delete ({data!.toDelete.length})
                  </p>
                  <div className="space-y-px">
                    {data!.toDelete.map((f) => (
                      <div key={f.fileId} className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-rose-400/80">
                        <Trash2 size={10} className="flex-shrink-0" />
                        <span className="truncate line-through decoration-rose-400/50">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data?.toRestore ?? []).length > 0 && (
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Restore ({data!.toRestore.length})
                  </p>
                  <div className="space-y-px">
                    {data!.toRestore.map((f) => (
                      <div key={f.fileId} className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-emerald-400/80">
                        <FilePlus size={10} className="flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data?.toModify ?? []).length > 0 && (
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    Modify ({data!.toModify.length})
                  </p>
                  <div className="space-y-px">
                    {data!.toModify.map((f) => (
                      <div key={f.fileId} className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-amber-400/80">
                        <FileEdit size={10} className="flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60">
            Commits after this point will no longer be reachable from this branch. This cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={12} className="mr-1.5 animate-spin" />
            ) : (
              <RotateCcw size={12} className="mr-1.5" />
            )}
            Reset Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
