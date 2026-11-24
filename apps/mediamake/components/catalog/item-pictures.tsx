'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageUpIcon, ImagesIcon, Loader2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LISTING_PICTURE_TYPE } from '@/lib/catalog/listing';

/**
 * Change pictures, on a store item's page: its headshot and, for an MCP or an app, its icon, for the
 * people who look after the item (its authors, and admins, who also have the whole listing on its
 * release page). The page is the same for everyone, so the button asks the server who is looking
 * (GET /api/catalog/listing) and shows only for them. A picture is uploaded to MediaMake's
 * storage (public once uploaded) and is live on the listing as soon as it is saved.
 */

type Pictures = { headshot?: string; icon?: string };
type Answer = Pictures & { canEdit?: boolean };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/catalog/listing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const answer = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(answer.error ?? 'Could not change the pictures');
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

export function ItemPicturesTools({ itemId, kind, title }: { itemId: string; kind: string; title: string }) {
  const [current, setCurrent] = React.useState<Pictures | null>(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    let gone = false;
    setCurrent(null);
    fetch(`/api/catalog/listing?item=${encodeURIComponent(itemId)}`)
      .then(res => (res.ok ? res.json() : null))
      .then((answer: Answer | null) => !gone && answer?.canEdit && setCurrent({ headshot: answer.headshot, icon: answer.icon }))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [itemId]);

  if (!current) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        <ImagesIcon /> Change pictures
      </Button>
      {open && <PicturesDialog itemId={itemId} kind={kind} title={title} current={current} onSaved={setCurrent} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PicturesDialog({ itemId, kind, title, current, onSaved, onClose }: { itemId: string; kind: string; title: string; current: Pictures; onSaved: (pictures: Pictures) => void; onClose: () => void }) {
  const router = useRouter();
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
  const changed = headshot !== (current.headshot ?? '') || (hasIcon && icon !== (current.icon ?? ''));
  const busy = saving || uploading > 0;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !changed) return;
    setSaving(true);
    setError('');
    try {
      const saved = await call<Pictures>({
        type: 'set',
        itemId,
        ...(headshot !== (current.headshot ?? '') && { headshot }),
        ...(hasIcon && icon !== (current.icon ?? '') && { icon }),
      });
      onSaved({ headshot: saved.headshot, icon: saved.icon });
      toast.success('Pictures saved: they are live on its page');
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
          <DialogTitle>Change pictures</DialogTitle>
          <DialogDescription>What {title}&apos;s cards and page show. A picture is public once it is uploaded, and live when you save.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={save}>
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
            <Button type="submit" disabled={busy || !changed}>
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
