'use client';

import * as React from 'react';
import Link from 'next/link';
import { LibraryIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ListedCard } from '@/lib/cloud-library/listing';
import { libraryApi } from './api';

/**
 * Collections listed in Explore (docs/library.md › Listed in Explore): a card per collection with
 * what it holds, a few titles and the rights its owner wrote, and "Request access", which its owner
 * answers. Nothing here opens a file.
 */

const button = 'inline-flex items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const said = (problem: unknown) => (problem instanceof Error ? problem.message : String(problem));
const SAYS: Partial<Record<ListedCard['state'], string>> = {
  yours: 'Yours',
  have: 'In your Library',
  invited: 'Accepted by its owner: say yes in your Library',
  declined: 'Its owner declined',
};

/** The listed collections, read once. `null` while reading or when the Library is not open to this account. */
export function useListedCollections(): { cards: ListedCard[] | null; reload: () => void } {
  const [cards, setCards] = React.useState<ListedCard[] | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    libraryApi
      .listed()
      .then(result => live && setCards(result.collections))
      .catch(() => live && setCards(null));
    return () => {
      live = false;
    };
  }, [tick]);
  return { cards, reload: () => setTick(n => n + 1) };
}

export function ListedCollections({ cards, onChanged }: { cards: ListedCard[]; onChanged: () => void }) {
  const [asking, setAsking] = React.useState<ListedCard | null>(null);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(done);
      setAsking(null);
      setNote('');
      onChanged();
    } catch (problem) {
      toast.error(said(problem));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="text-sm text-muted-foreground">Collections other members list from their Library. You see what each holds, never a file. Its owner decides who gets access, and what you get is their live collection, not a copy.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => (
          <article key={`${card.from}/${card.collection}`} className="flex flex-col gap-3 overflow-hidden rounded-xl border bg-card">
            <div className="flex aspect-[16/7] items-center justify-center bg-muted">
              {card.headshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.headshot} alt="" className="size-full object-cover" />
              ) : (
                <LibraryIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold">{card.name}</h3>
                <span className="shrink-0 text-2xl font-semibold tabular-nums">{card.entries}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {card.template} · by {card.by}
              </p>
              <p className="line-clamp-3 text-sm">{card.about}</p>
              {card.sample.length > 0 && <p className="line-clamp-2 text-xs text-muted-foreground">Such as: {card.sample.join(', ')}</p>}
              <p className="text-xs text-muted-foreground">Each {card.noun} can hold: {card.slots.join(', ').toLowerCase()}</p>
              <p className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                <span className="font-medium">Rights, as its owner wrote them:</span> {card.rights}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                {card.state === 'none' && (
                  <button type="button" className={`${primary} ml-auto`} onClick={() => setAsking(card)}>
                    Request access
                  </button>
                )}
                {card.state === 'asked' && (
                  <>
                    <span className="text-xs text-muted-foreground">Asked. Waiting for {card.by}</span>
                    <button type="button" className={button} disabled={busy} onClick={() => run(() => libraryApi.withdrawRequest(card.from, card.collection), 'Request taken back')}>
                      Take it back
                    </button>
                  </>
                )}
                {SAYS[card.state] && (
                  <>
                    <span className="text-xs text-muted-foreground">{SAYS[card.state]}</span>
                    {card.state !== 'declined' && (
                      <Link className={button} href="/app/library">
                        Open the Library
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!asking} onOpenChange={open => !open && setAsking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask {asking?.by} for {asking?.name}</DialogTitle>
            <DialogDescription>They see your name and this note. If they say yes, it shows in your personal Library to read and fetch, as their live collection.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} maxLength={400} value={note} onChange={event => setNote(event.target.value)} placeholder="What you want it for (optional)" aria-label="Note" />
          <DialogFooter>
            <button type="button" className={button} onClick={() => setAsking(null)}>
              Cancel
            </button>
            <button type="button" className={primary} disabled={busy} onClick={() => asking && run(() => libraryApi.requestAccess(asking.from, asking.collection, note), `Asked ${asking.by}`)}>
              {busy && <Loader2Icon className="size-4 animate-spin" />}
              Send the request
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
