'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProofGallery } from '@/components/catalog/proof-gallery';
import type { GalleryTile } from '@/lib/catalog/gallery';
import { madeIdOf, madeTiles, type MadeShown } from '@/lib/catalog/made';

/**
 * What members made with an item (lib/catalog/made), on its pages: anyone who can use a skill, an MCP
 * or an app adds what they made with it (Add yours: a title, a link, a picture), and takes their own
 * back. They sit in the same gallery as the productions an admin recorded. The page it is on can be the
 * same for everyone (a store page), so who is looking is asked of the server (GET /api/catalog/made).
 */

interface MadeState {
  entries: MadeShown[];
  /** The viewer may add: signed in, and the item is one they can use. */
  canAdd: boolean;
  canRemoveAny: boolean;
  signedIn: boolean;
  /** False until the server said who is looking. */
  known: boolean;
}

async function call(url: string, init?: RequestInit): Promise<{ entries: MadeShown[] } & Partial<MadeState>> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Could not reach MediaMake (${res.status})`);
  return body;
}

/** An item's member entries, as the page was sent them, then as the server knows them for this viewer. */
export function useMade(itemKey: string, initial: MadeShown[] = [], known?: Pick<MadeState, 'canAdd' | 'canRemoveAny' | 'signedIn'>) {
  const [state, setState] = React.useState<MadeState>({ entries: initial, canAdd: false, canRemoveAny: false, signedIn: false, ...known, known: !!known });
  React.useEffect(() => {
    let live = true;
    call(`/api/catalog/made?key=${encodeURIComponent(itemKey)}`)
      .then(body => live && setState({ entries: body.entries, canAdd: !!body.canAdd, canRemoveAny: !!body.canRemoveAny, signedIn: !!body.signedIn, known: true }))
      .catch(() => live && setState(current => ({ ...current, known: true })));
    return () => {
      live = false;
    };
  }, [itemKey]);

  const add = async (entry: { title: string; url?: string; image?: string }) => {
    const body = await call('/api/catalog/made', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: itemKey, ...entry }) });
    setState(current => ({ ...current, entries: body.entries }));
  };
  const remove = async (id: string) => {
    const body = await call(`/api/catalog/made?key=${encodeURIComponent(itemKey)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setState(current => ({ ...current, entries: body.entries }));
  };
  const tiles = React.useMemo(() => madeTiles(state.entries), [state.entries]);
  /** Whether the viewer may remove the entry a tile shows. */
  const removable = (tile: GalleryTile) => {
    const id = madeIdOf(tile.key);
    const entry = id ? state.entries.find(found => found.id === id) : undefined;
    return entry && (entry.mine || state.canRemoveAny) ? entry.id : undefined;
  };
  return { ...state, tiles, add, remove, removable };
}

export type Made = ReturnType<typeof useMade>;

/** Add yours: opens the dialog, or says to sign in. Hidden for someone who can't use the item. */
export function AddMadeButton({ made, title, loginHref, className }: { made: Made; title: string; loginHref?: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  if (!made.known) return null;
  if (!made.signedIn) {
    return loginHref ? (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href={loginHref}>
          <PlusIcon /> Sign in to add yours
        </Link>
      </Button>
    ) : null;
  }
  if (!made.canAdd) return null;
  return (
    <>
      <Button variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <PlusIcon /> Add yours
      </Button>
      {open && <AddMadeDialog title={title} onAdd={made.add} onClose={() => setOpen(false)} />}
    </>
  );
}

const HTTPS = /^https:\/\/\S+$/;

function AddMadeDialog({ title, onAdd, onClose }: { title: string; onAdd: Made['add']; onClose: () => void }) {
  const [what, setWhat] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [image, setImage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const problem = url.trim() && !HTTPS.test(url.trim()) ? 'The link must start with https://' : image.trim() && !HTTPS.test(image.trim()) ? 'The picture must be an https link' : null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onAdd({ title: what.trim(), ...(url.trim() && { url: url.trim() }), ...(image.trim() && { image: image.trim() }) });
      toast.success('Added to Made with this');
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={open => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Made with {title}</DialogTitle>
            <DialogDescription>Show something finished that you made with it. Everyone who opens its page sees it.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="made-title">What you made</Label>
            <Input id="made-title" value={what} maxLength={200} onChange={e => setWhat(e.target.value)} placeholder="My channel's new intro" autoFocus required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="made-url">Link</Label>
            <Input id="made-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtu.be/…" inputMode="url" />
            <p className="text-xs text-muted-foreground">A YouTube link plays on the page. Any other link opens from its tile.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="made-image">Picture link (optional)</Label>
            <Input id="made-image" value={image} onChange={e => setImage(e.target.value)} placeholder="https://…/poster.png" inputMode="url" />
          </div>
          {problem && <p className="text-xs text-destructive">{problem}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !what.trim() || !!problem}>
              {busy && <Loader2Icon className="animate-spin" />} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Remove, for the entry a tile shows when the viewer may take it down (their own, or any for an admin). */
export function RemoveMade({ made, tile, className }: { made: Made; tile: GalleryTile; className?: string }) {
  const [busy, setBusy] = React.useState(false);
  const id = made.removable(tile);
  if (!id) return null;
  const remove = async () => {
    if (!window.confirm(`Remove "${tile.title}" from Made with this?`)) return;
    setBusy(true);
    try {
      await made.remove(id);
      toast.success('Removed');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" disabled={busy} onClick={remove} className={className ?? 'inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-destructive'}>
      {busy ? <Loader2Icon className="size-3 animate-spin" /> : <Trash2Icon className="size-3" />} Remove
    </button>
  );
}

/**
 * The gallery of a store page's Made with this tab: the productions on record, then what members
 * added, with Add yours. `empty` is what it says when there is nothing yet.
 */
export function MadeGallery({
  itemKey,
  itemId,
  title,
  proof,
  initial,
  loginHref,
  empty,
}: {
  itemKey: string;
  itemId: string;
  title: string;
  /** The productions an admin recorded, as tiles. */
  proof: GalleryTile[];
  initial: MadeShown[];
  loginHref?: string;
  empty: string;
}) {
  const made = useMade(itemKey, initial);
  const tiles = [...proof, ...made.tiles];
  return (
    <div className="flex flex-col gap-3">
      {tiles.length > 0 ? <ProofGallery itemId={itemId} tiles={tiles} actions={tile => <RemoveMade made={made} tile={tile} />} /> : <p className="text-sm text-muted-foreground">{empty}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <AddMadeButton made={made} title={title} loginHref={loginHref} />
        <p className="text-xs text-muted-foreground">Made something with it? Anyone who can use it can add theirs.</p>
      </div>
    </div>
  );
}
