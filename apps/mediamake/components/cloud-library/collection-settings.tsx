'use client';

import * as React from 'react';
import { Loader2Icon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteConfirmed } from '@/lib/cloud-library';
import type { CollectionView, SpaceView } from '@/lib/cloud-library/view';
import { libraryApi } from './api';

/**
 * The Settings tab of a collection, for the owner of its space: its name, and the danger zone where
 * it is deleted after its name is typed (the same two cards as a space's Settings tab,
 * components/projects/space-settings). A collection another space shares has no Settings here.
 */

const card = 'max-w-2xl rounded-xl border bg-card p-4';
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export function CollectionSettings({ space, collection, onRenamed, onDeleted }: { space: SpaceView; collection: CollectionView; onRenamed: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Rename space={space} collection={collection} onRenamed={onRenamed} />

      <section className={`${card} border-destructive/40`}>
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-medium">Delete this collection</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Its {plural(collection.entries, collection.noun)} go with it{collection.sharedWith ? ', for every space it is shared with' : ''}. This can&apos;t be undone.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}>
            <Trash2Icon /> Delete this collection
          </Button>
        </div>
      </section>

      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} space={space} collection={collection} onDeleted={onDeleted} />
    </div>
  );
}

function Rename({ space, collection, onRenamed }: { space: SpaceView; collection: CollectionView; onRenamed: () => void }) {
  const [value, setValue] = React.useState(collection.name);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setValue(collection.name), [collection.name]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { name } = await libraryApi.rename(space.id, collection.slug, value);
      toast.success(`Renamed to ${name}.`);
      onRenamed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="text-sm font-semibold">General</h2>
      <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-64 space-y-1.5">
          <Label htmlFor="collection-name">Name</Label>
          <Input id="collection-name" value={value} onChange={event => setValue(event.target.value)} maxLength={80} />
        </div>
        <Button type="submit" variant="outline" disabled={busy || !value.trim() || value.trim() === collection.name}>
          {busy && <Loader2Icon className="animate-spin" />} Rename
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Only the name people read changes. Its id stays <code className="rounded bg-muted px-1 py-0.5">{collection.slug}</code>, so links to it and <code className="rounded bg-muted px-1 py-0.5">mm library</code> keep working.
      </p>
    </section>
  );
}

function DeleteDialog({ open, onClose, space, collection, onDeleted }: { open: boolean; onClose: () => void; space: SpaceView; collection: CollectionView; onDeleted: () => void }) {
  const [typed, setTyped] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setTyped('');
      setError(null);
    }
  }, [open]);

  const remove = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const gone = await libraryApi.deleteCollection(space.id, collection.slug, typed);
      toast.success(`${gone.name} is deleted.`);
      onClose();
      onDeleted();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {collection.name}?</DialogTitle>
          <DialogDescription>
            The collection and its {plural(collection.entries, collection.noun)} are deleted from the {space.name} space
            {collection.sharedWith ? `, and from the ${collection.sharedWith === 1 ? 'space' : `${collection.sharedWith} spaces`} it is shared with` : ''}
            {collection.listing ? ', and it comes off Explore' : ''}. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={remove} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="collection-delete-name">
              Type <span className="font-semibold">{collection.name}</span> to confirm
            </Label>
            <Input id="collection-delete-name" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" autoFocus />
          </div>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !deleteConfirmed(collection.name, typed)}>
              {busy && <Loader2Icon className="animate-spin" />} Delete this collection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
