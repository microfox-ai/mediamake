'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageUpIcon, Loader2Icon, PencilLineIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { LISTING_PICTURE_TYPE, MAX_LISTING_DESCRIPTION } from '@/lib/catalog/listing';

/**
 * Edit card, for the people who look after a store item (its authors, and admins, who also have the
 * whole listing on its release page): its description, its headshot and, for an MCP or an app, its
 * icon, which is what its cards and the top of its page show. On an item's page, which is the same
 * for everyone, the button asks the server who is looking (GET /api/catalog/listing) and shows only
 * for them; My store items already knows and passes `initial`. A picture is uploaded to MediaMake's
 * storage (public once uploaded), and what is saved is live on the listing at once.
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

/** `bare` leaves the button without a row of its own, for a caller that lays out several. */
export function ItemCardTools({ itemId, kind, title, initial, bare }: { itemId: string; kind: string; title: string; initial?: CardValues; bare?: boolean }) {
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
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
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
  const [uploading, setUploading] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  // said in the dialog itself: a toast can sit behind it
  const [error, setError] = React.useState('');
  const onBusy = (on: boolean) => {
    if (on) setError('');
    setUploading(count => count + (on ? 1 : -1));
  };
  const hasIcon = kind !== 'skill';
  const words = description.trim();
  const tooLong = words.length > MAX_LISTING_DESCRIPTION;
  const change = {
    ...(words !== (current.description ?? '') && { description: words }),
    ...(headshot !== (current.headshot ?? '') && { headshot }),
    ...(hasIcon && icon !== (current.icon ?? '') && { icon }),
  };
  const changed = Object.keys(change).length > 0;
  const busy = saving || uploading > 0;

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
          <DialogDescription>What {title}&apos;s cards and the top of its page show. What you save is live at once, and a picture is public once it is uploaded.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={save}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-description">Description</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={3}
              placeholder={current.summary ?? 'What it is, for people, in a line or two'}
              aria-invalid={tooLong}
              aria-describedby="card-description-note"
            />
            <p id="card-description-note" className={cn('flex justify-between gap-3 text-xs', tooLong ? 'text-destructive' : 'text-muted-foreground')}>
              <span>What it is, for people, in a line or two.{current.summary ? ' Left empty, its own summary shows.' : ''}</span>
              <span className="shrink-0 tabular-nums">
                {words.length}/{MAX_LISTING_DESCRIPTION}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-5">
            <Picture itemId={itemId} label="Headshot" about="16:9, shown on its cards and above its README" shape="wide" value={headshot} onChange={setHeadshot} onBusy={onBusy} onError={setError} />
            {hasIcon && <Picture itemId={itemId} label="Icon" about="Square" shape="square" value={icon} onChange={setIcon} onBusy={onBusy} onError={setError} />}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !changed || tooLong}>
              {saving && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One picture: its preview, which opens the file picker, and a way to take it off. */
function Picture({
  itemId,
  label,
  about,
  shape,
  value,
  onChange,
  onBusy,
  onError,
}: {
  itemId: string;
  label: string;
  about: string;
  shape: 'wide' | 'square';
  value: string;
  onChange: (url: string) => void;
  onBusy: (on: boolean) => void;
  onError: (message: string) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const pick = async (file: File) => {
    setBusy(true);
    onBusy(true);
    try {
      onChange(await upload(itemId, file));
    } catch (failure) {
      onError(`${label}: ${(failure as Error).message}`);
    } finally {
      setBusy(false);
      onBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', shape === 'wide' ? 'w-full sm:w-72' : 'w-28')}>
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={cn(
          'group relative overflow-hidden rounded-xl border bg-muted text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          shape === 'wide' ? 'aspect-video w-full' : 'aspect-square w-24',
        )}
        aria-label={value ? `Replace the ${label.toLowerCase()}` : `Upload the ${label.toLowerCase()}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">None yet. Click to upload one.</span>
        )}
        <span className={cn('absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity', busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100')}>
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <ImageUpIcon className="size-4" />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={event => event.target.files?.[0] && pick(event.target.files[0])} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{about}</span>
        {value && !busy && (
          <button type="button" className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => onChange('')}>
            <XIcon className="size-3" aria-hidden /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
