'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { FileNode } from './types';

export type DialogState =
  | { type: 'new-file'; parentId: string | null; existingNames: string[] }
  | { type: 'new-folder'; parentId: string | null; existingNames: string[] }
  | { type: 'rename'; node: FileNode; existingNames: string[] }
  | { type: 'delete'; node: FileNode }
  | null;

interface FileOperationDialogProps {
  state: DialogState;
  onClose: () => void;
  onNewFile: (parentId: string | null, name: string) => void;
  onNewFolder: (parentId: string | null, name: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
}

export function FileOperationDialog({
  state,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: FileOperationDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    setError(null);
    if (state.type === 'rename') {
      setInputValue(state.node.name);
    } else {
      setInputValue('');
    }
  }, [state]);

  useEffect(() => {
    if (state && state.type !== 'delete') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state]);

  if (!state) return null;

  // ── Delete confirmation ────────────────────────────────────────────────────
  if (state.type === 'delete') {
    return (
      <AlertDialog open onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete {state.node.type === 'folder' ? 'folder' : 'file'}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              &ldquo;{state.node.name}&rdquo; will be permanently removed.
              {state.node.type === 'folder' && ' All contents will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={onClose}
              className="border-border bg-muted text-foreground hover:bg-accent"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(state.node.id); onClose(); }}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // ── Name input dialog (new file / new folder / rename) ────────────────────
  const titles: Record<string, string> = {
    'new-file': 'New File',
    'new-folder': 'New Folder',
    'rename': `Rename "${state.type === 'rename' ? state.node.name : ''}"`,
  };

  const handleSubmit = () => {
    const name = inputValue.trim();
    if (!name) return;

    // For rename: if the name is unchanged (including case), allow it through as a no-op.
    const isUnchangedRename = state.type === 'rename' && state.node.name === name;

    if (!isUnchangedRename) {
      // Case-insensitive duplicate check against siblings at the same level.
      const duplicate = state.existingNames.find(
        (n) => n.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        setError(`"${duplicate}" already exists here. Choose a different name.`);
        return;
      }
    }

    if (state.type === 'new-file') onNewFile(state.parentId, name);
    if (state.type === 'new-folder') onNewFolder(state.parentId, name);
    if (state.type === 'rename') onRename(state.node.id, name);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground text-sm">{titles[state.type]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
            placeholder={state.type === 'new-file' ? 'filename.md' : state.type === 'new-folder' ? 'folder-name' : ''}
            className="w-full rounded border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-violet-500/60 data-[error]:border-rose-500/60"
            data-error={error ? '' : undefined}
          />
          {error && (
            <p className="text-[11px] text-rose-400">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            {state.type === 'rename' ? 'Rename' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
