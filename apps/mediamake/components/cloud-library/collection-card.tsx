'use client';

import * as React from 'react';
import Link from 'next/link';
import { ImageIcon, LibraryBigIcon, Loader2Icon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CollectionView, SpaceView } from '@/lib/cloud-library/view';
import { libraryApi, uploadFiles } from './api';

/**
 * A collection as a card: its picture, how many entries it holds as a big number, and its name.
 * Whoever can change the space sets the picture from the card (an image from the computer, or a
 * link); `mm library headshot` does the same from a script.
 */

const button = 'inline-flex items-center justify-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex shrink-0 items-center whitespace-nowrap justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';

function PictureDialog({ space, collection, open, onOpenChange, onChanged }: { space: SpaceView; collection: CollectionView; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [url, setUrl] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const picker = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (open) {
      setUrl('');
      setError(null);
    }
  }, [open]);

  const run = async (what: string, work: () => Promise<unknown>) => {
    setBusy(what);
    setError(null);
    try {
      await work();
      onChanged();
      onOpenChange(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(null);
    }
  };
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError(`${file.name} is not a picture`);
    void run('Uploading', async () => {
      const [sha256] = await uploadFiles(space.id, [file], setBusy);
      await libraryApi.setHeadshot(space.id, collection.slug, { sha256 });
      toast.success(`${collection.name} has its picture`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={next => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Picture for {collection.name}</DialogTitle>
          <DialogDescription>Shown on the collection’s card. A wide picture (16:9) fits best.</DialogDescription>
        </DialogHeader>
        <button type="button" className={`${button} w-full py-6`} disabled={!!busy} onClick={() => picker.current?.click()}>
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          {busy ?? 'Choose a picture from this computer'}
        </button>
        <input ref={picker} type="file" accept="image/*" hidden onChange={event => (upload(event.target.files?.[0]), (event.target.value = ''))} />
        <div className="flex items-center gap-2">
          <Input placeholder="Or paste a link: https://…" type="url" value={url} onChange={event => setUrl(event.target.value)} />
          <button type="button" className={primary} disabled={!!busy || !url.trim()} onClick={() => run('Saving', () => libraryApi.setHeadshot(space.id, collection.slug, { url: url.trim() }))}>
            Use it
          </button>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <p className="min-w-0 text-xs text-destructive" role={error ? 'alert' : undefined}>
            {error}
          </p>
          {collection.headshot && (
            <button type="button" className={button} disabled={!!busy} onClick={() => run('Removing', () => libraryApi.setHeadshot(space.id, collection.slug, {}))}>
              Remove the picture
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CollectionCard({ space, collection, href, may, onChanged }: { space: SpaceView; collection: CollectionView; href: string; may: boolean; onChanged: () => void }) {
  const [picture, setPicture] = React.useState(false);
  return (
    <div className="group relative">
      <Link href={href} className="flex h-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:bg-muted/50">
        <div className="relative flex aspect-video w-full items-center justify-center bg-muted">
          {(collection.shared || !!collection.sharedWith) && (
            <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs font-medium shadow-sm">
              <UsersIcon className="size-3.5 shrink-0" />
              <span className="truncate">{collection.shared ? `Shared by ${collection.shared.by}` : `Shared with ${collection.sharedWith}`}</span>
            </span>
          )}
          {collection.headshot ? (
            // a member's own picture, by a signed or outside link: next/image cannot optimise it
            // eslint-disable-next-line @next/next/no-img-element
            <img src={collection.headshot} alt="" className="size-full object-cover" />
          ) : (
            <LibraryBigIcon className="size-10 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{collection.name}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{collection.about}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-4xl font-semibold tabular-nums leading-none">{collection.entries}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {collection.noun}
              {collection.entries === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </Link>
      {may && (
        <button
          type="button"
          onClick={() => setPicture(true)}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs font-medium shadow-sm sm:opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ImageIcon className="size-3.5" />
          {collection.headshot ? 'Change picture' : 'Add a picture'}
        </button>
      )}
      {may && <PictureDialog space={space} collection={collection} open={picture} onOpenChange={setPicture} onChanged={onChanged} />}
    </div>
  );
}
