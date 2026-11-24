'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageUpIcon, Loader2Icon, PencilLineIcon, Trash2Icon } from 'lucide-react';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { LISTING_PICTURE_TYPE, MAX_LISTING_DESCRIPTION } from '@/lib/catalog/listing';

/**
 * Edit card, for the people who look after a store item (its authors, and admins, who also have the
 * whole listing on its release page): its description, its headshot and, for an MCP or an app, its
 * icon, which is what its cards and the top of its page show. The dialog draws the card as the store
 * will, with the store's own parts, and it changes as they type or upload. On an item's page, which
 * is the same for everyone, the button asks the server who is looking (GET /api/catalog/listing) and
 * shows only for them; My store items already knows and passes `initial`. A picture is uploaded to
 * MediaMake's storage (public once uploaded), and what is saved is live on the listing at once.
 */

/** What the card has now; `summary` is the item's own, shown while it has no description. */
export type CardValues = { description?: string; summary?: string; headshot?: string; icon?: string };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/catalog/listing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const answer = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(answer.error ?? 'Could not save the changes');
  return answer as T;
}

/** Uploads one picture for the item and gives back its link. */
async function upload(itemId: string, file: File): Promise<string> {
  if (!LISTING_PICTURE_TYPE.test(file.type)) throw new Error('Pick a PNG, JPEG, WebP, GIF or AVIF picture');
  const { uploadUrl, publicUrl } = await call<{ uploadUrl: string; publicUrl: string }>({ type: 'create_upload', itemId, filename: file.name, contentType: file.type });
  // the signed link expects exactly these headers
  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
  if (!res.ok) throw new Error(`The upload failed (${res.status})`);
  return publicUrl;
}

/**
 * `bare` leaves the button without a row of its own, for a caller that lays out several; `primary`
 * makes it the main action of its row.
 */
export function ItemCardTools({ itemId, kind, title, initial, bare, primary }: { itemId: string; kind: string; title: string; initial?: CardValues; bare?: boolean; primary?: boolean }) {
  const [current, setCurrent] = React.useState<CardValues | null>(initial ?? null);
  const [open, setOpen] = React.useState(false);
  const known = initial !== undefined;
  React.useEffect(() => {
    if (known) return;
    let gone = false;
    setCurrent(null);
    fetch(`/api/catalog/listing?item=${encodeURIComponent(itemId)}`)
      .then(res => (res.ok ? res.json() : null))
      .then((answer: (CardValues & { canEdit?: boolean }) | null) => {
        if (!gone && answer?.canEdit) setCurrent({ description: answer.description, summary: answer.summary, headshot: answer.headshot, icon: answer.icon });
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [itemId, known]);

  if (!current) return null;
  const tools = (
    <>
      <Button variant={primary ? 'default' : 'outline'} size="sm" className={primary ? 'h-9' : 'h-8'} onClick={() => setOpen(true)}>
        <PencilLineIcon /> Edit card
      </Button>
      {open && <CardDialog itemId={itemId} kind={kind} title={title} current={current} onSaved={saved => setCurrent({ ...current, ...saved })} onClose={() => setOpen(false)} />}
    </>
  );
  return bare ? tools : <div className="flex flex-wrap gap-2">{tools}</div>;
}

function CardDialog({ itemId, kind, title, current, onSaved, onClose }: { itemId: string; kind: string; title: string; current: CardValues; onSaved: (values: CardValues) => void; onClose: () => void }) {
  const router = useRouter();
  const [description, setDescription] = React.useState(current.description ?? '');
  const [headshot, setHeadshot] = React.useState(current.headshot ?? '');
  const [icon, setIcon] = React.useState(current.icon ?? '');
  const [uploading, setUploading] = React.useState<'headshot' | 'icon' | null>(null);
  const [saving, setSaving] = React.useState(false);
  // said in the dialog itself: a toast can sit behind it
  const [error, setError] = React.useState('');
  const hasIcon = kind !== 'skill';
  const words = description.trim();
  const tooLong = words.length > MAX_LISTING_DESCRIPTION;
  const change = {
    ...(words !== (current.description ?? '') && { description: words }),
    ...(headshot !== (current.headshot ?? '') && { headshot }),
    ...(hasIcon && icon !== (current.icon ?? '') && { icon }),
  };
  const changed = Object.keys(change).length > 0;
  const busy = saving || uploading !== null;

  async function pick(which: 'headshot' | 'icon', file: File) {
    setUploading(which);
    setError('');
    try {
      const link = await upload(itemId, file);
      if (which === 'headshot') setHeadshot(link);
      else setIcon(link);
    } catch (failure) {
      setError(`${which === 'headshot' ? 'Headshot' : 'Icon'}: ${(failure as Error).message}`);
    } finally {
      setUploading(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !changed || tooLong) return;
    setSaving(true);
    setError('');
    try {
      const saved = await call<CardValues>({ type: 'set', itemId, ...change });
      onSaved({ description: saved.description, headshot: saved.headshot, icon: saved.icon });
      toast.success('Saved: it is live on its page');
      router.refresh();
      onClose();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={next => !next && !busy && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <form className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" onSubmit={save}>
          {/* the card, as the store draws it: it changes with every keystroke and upload */}
          <div className="flex flex-col gap-3 border-b bg-muted/40 p-5 md:border-b-0 md:border-r md:p-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">In the store</p>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="relative border-b">
                <VideoThumb id={itemId} title={title} src={headshot || undefined} />
                {uploading === 'headshot' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                    <Loader2Icon className="size-5 animate-spin" aria-hidden />
                  </span>
                )}
              </div>
              <div className="flex items-start gap-2.5 p-4">
                {hasIcon && (
                  <span className="relative shrink-0">
                    <ItemIcon id={itemId} title={title} src={icon || undefined} className="size-9 rounded-lg text-sm" />
                    {uploading === 'icon' && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-white">
                        <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      </span>
                    )}
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-semibold leading-snug">{title}</p>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{words || current.summary || 'What it is, in a line or two.'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-5 p-5 md:p-6">
            <DialogHeader>
              <DialogTitle>Edit card</DialogTitle>
              <DialogDescription>What {title}&apos;s cards and the top of its page show. Saving puts it live at once.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="card-description">Description</Label>
                <span className={cn('text-xs tabular-nums', tooLong ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                  {words.length}/{MAX_LISTING_DESCRIPTION}
                </span>
              </div>
              <Textarea
                id="card-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={4}
                placeholder={current.summary ?? 'What it is, for people, in a line or two'}
                aria-invalid={tooLong}
                aria-describedby="card-description-note"
                className="resize-none"
              />
              <p id="card-description-note" className="text-xs text-muted-foreground">
                What it is, for people, in a line or two.{current.summary ? ' Left empty, its own summary shows.' : ''}
              </p>
            </div>

            <PictureRow label="Headshot" about="16:9. Its cards and the top of its page." has={!!headshot} busy={uploading === 'headshot'} disabled={busy} onPick={file => pick('headshot', file)} onRemove={() => setHeadshot('')} />
            {hasIcon && <PictureRow label="Icon" about="Square. Beside its name." has={!!icon} busy={uploading === 'icon'} disabled={busy} onPick={file => pick('icon', file)} onRemove={() => setIcon('')} />}

            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className="mt-auto pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !changed || tooLong}>
                {saving && <Loader2Icon className="animate-spin" />}
                Save card
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One picture of the card: what it is, a button that opens the file picker, and a way to take it off. */
function PictureRow({ label, about, has, busy, disabled, onPick, onRemove }: { label: string; about: string; has: boolean; busy: boolean; disabled: boolean; onPick: (file: File) => void; onRemove: () => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{about}</p>
      </div>
      {has && (
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" disabled={disabled} onClick={onRemove} aria-label={`Remove the ${label.toLowerCase()}`}>
          <Trash2Icon />
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" disabled={disabled} onClick={() => input.current?.click()}>
        {busy ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />} {has ? 'Replace' : 'Upload'}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        aria-label={`${label} picture`}
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
