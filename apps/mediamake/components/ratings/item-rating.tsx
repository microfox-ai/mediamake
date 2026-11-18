'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FEEDBACK_MAX_CHARS } from '@/lib/feedback/feedback';
import type { RatingSummary } from '@/lib/ratings/ratings';
import { cn } from '@/lib/utils';

/**
 * An item's rating, and the way to give one: its average in stars with how
 * many rated it, and a button that opens a dialog with five stars and a box
 * for words. The stars are saved as the member's rating (one per item,
 * changed by rating again); the words go as feedback, which only they and
 * the MediaMake team read. The same on an item's page and in its dialog.
 */

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map(star => (
        <StarIcon key={star} className={cn('size-4', value >= star - 0.25 ? 'fill-amber-400 text-amber-400' : value >= star - 0.75 ? 'fill-amber-400/50 text-amber-400' : 'text-muted-foreground/40')} />
      ))}
    </span>
  );
}

/** `★ 4.6 (12)`, small, for a card. Nothing when nobody rated it. */
export function RatingChip({ rating, className }: { rating?: RatingSummary | null; className?: string }) {
  if (!rating?.count) return null;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground', className)} title={`Rated ${rating.average.toFixed(1)} out of 5 by ${rating.count} member${rating.count === 1 ? '' : 's'}`}>
      <StarIcon className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-medium text-foreground">{rating.average.toFixed(1)}</span> ({rating.count})
    </span>
  );
}

export function ItemRating({ itemId, title, version, initial, className }: { itemId: string; title: string; version?: string; initial?: RatingSummary | null; className?: string }) {
  const pathname = usePathname();
  const [rating, setRating] = useState<RatingSummary | null>(initial ?? null);
  const [mine, setMine] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/catalog/ratings?item=${encodeURIComponent(itemId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as { rating: RatingSummary | null; mine: number | null; signedIn: boolean };
      setRating(json.rating);
      setMine(json.mine);
      setSignedIn(json.signedIn);
    } catch {
      // the average the page came with stays
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setSending(true);
    try {
      const res = await fetch('/api/catalog/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, stars, version, source: 'web' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Could not save it (${res.status})`);
      setRating(json.rating);
      setMine(json.mine);
      const words = text.trim();
      let said = false;
      if (words.length >= 3) {
        const sent = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: words, itemId, version, source: 'web' }),
        });
        said = sent.ok;
        if (!sent.ok) toast.error('Your stars are saved. The words could not be sent: try again from the Feedback tab.');
      }
      toast.success(said ? 'Thank you. Your rating and feedback are in' : 'Thank you. Your rating is in');
      setText('');
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const shown = hover || stars;
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <p className="flex items-center gap-1.5 text-sm" aria-label={rating ? `Rated ${rating.average.toFixed(1)} out of 5 by ${rating.count}` : 'No ratings yet'}>
        <Stars value={rating?.average ?? 0} />
        {rating ? (
          <>
            <span className="font-medium">{rating.average.toFixed(1)}</span>
            <span className="text-muted-foreground">
              · {rating.count} rating{rating.count === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">No ratings yet</span>
        )}
      </p>
      {signedIn === false ? (
        <Link href={`/login?redirectTo=${encodeURIComponent(pathname ?? '/')}`} className="text-xs font-medium underline underline-offset-4">
          Sign in to rate
        </Link>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => {
            setStars(mine ?? 0);
            setOpen(true);
          }}
        >
          <StarIcon className={cn(mine && 'fill-amber-400 text-amber-400')} /> {mine ? `You gave ${mine}` : 'Rate it'}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate {title}</DialogTitle>
            <DialogDescription>Everyone sees the average. Only you and the MediaMake team see what you write.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={event => {
              event.preventDefault();
              if (stars && !sending) void send();
            }}
          >
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={stars === star}
                  aria-label={`${star} star${star === 1 ? '' : 's'}`}
                  className="cursor-pointer rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseEnter={() => setHover(star)}
                  onClick={() => setStars(star)}
                >
                  <StarIcon className={cn('size-8 transition-colors', shown >= star ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
                </button>
              ))}
            </div>
            <Textarea
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="What worked, what got in your way? (optional)"
              maxLength={FEEDBACK_MAX_CHARS}
              className="min-h-24"
              aria-label="Your feedback (optional)"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!stars || sending}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
