'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Film, ImageUp, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProofGallery } from '@/components/catalog/proof-gallery';
import { galleryTiles } from '@/lib/catalog/gallery';
import { RULE, proofOf, type ReadyProof } from '@/lib/catalog/types';
import { parseYouTubeId } from '@/lib/catalog/video';
import { adminCall, type ItemDetail } from './model';

/**
 * "Made with this" for one item, as an admin edits it: the finished
 * productions that make it Ready, each with a title, a link (a YouTube link
 * plays in the gallery), an uploaded picture and an uploaded clip. Saving
 * marks the item Ready with them (set_readiness); with none it can only go
 * back to Beta. The preview is the gallery its page shows (never the trailer, which plays above the README).
 */

type Draft = { title: string; url: string; image: string; video: string };

const EMPTY: Draft = { title: '', url: '', image: '', video: '' };
const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
const VIDEO_TYPES = 'video/mp4,video/webm';
const HTTPS = /^https:\/\/\S+$/;

function draftsOf(proof: ReadyProof[]): Draft[] {
  return proof.map(entry => ({ title: entry.title, url: entry.url ?? '', image: entry.image ?? '', video: entry.video ?? '' }));
}

function proofFrom(drafts: Draft[]): ReadyProof[] {
  return drafts
    .filter(draft => draft.title.trim())
    .map(draft => ({
      title: draft.title.trim(),
      ...(draft.url.trim() && { url: draft.url.trim() }),
      ...(draft.image.trim() && { image: draft.image.trim() }),
      ...(draft.video.trim() && { video: draft.video.trim() }),
    }));
}

/** What is wrong with one production as typed; null when it can be saved. */
function problemOf(draft: Draft): string | null {
  const filled = draft.url.trim() || draft.image.trim() || draft.video.trim();
  if (!draft.title.trim()) return filled ? 'Give it a title' : null;
  for (const [label, value] of [['The link', draft.url], ['The picture', draft.image], ['The clip', draft.video]] as const) {
    if (value.trim() && !HTTPS.test(value.trim())) return `${label} must be an https link`;
  }
  return null;
}

/** The button on an item's release page: Mark Ready, or edit what was made with it. */
export function ReadinessButton({ detail, onDone }: { detail: ItemDetail; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const ready = detail.item.readiness === 'ready';
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {ready ? 'Made with this' : 'Mark Ready'}
      </Button>
      {open && <ProofDialog detail={detail} onClose={() => setOpen(false)} onDone={onDone} />}
    </>
  );
}

function ProofDialog({ detail, onClose, onDone }: { detail: ItemDetail; onClose: () => void; onDone: () => void }) {
  const { item, readinessMark } = detail;
  const ready = item.readiness === 'ready';
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const saved = draftsOf(proofOf(readinessMark));
    return saved.length ? saved : [{ ...EMPTY }];
  });
  const [busy, setBusy] = useState(false);

  const proof = useMemo(() => proofFrom(drafts), [drafts]);
  const problems = drafts.map(problemOf);
  const valid = proof.length > 0 && problems.every(problem => !problem);
  const tiles = useMemo(() => galleryTiles(proof), [proof]);

  const change = (i: number, patch: Partial<Draft>) => setDrafts(list => list.map((draft, at) => (at === i ? { ...draft, ...patch } : draft)));
  const move = (i: number, by: number) =>
    setDrafts(list => {
      const next = [...list];
      const [entry] = next.splice(i, 1);
      next.splice(i + by, 0, entry);
      return next;
    });

  async function save(readiness: 'ready' | 'beta') {
    setBusy(true);
    try {
      await adminCall({ type: 'set_readiness', itemIds: [item.id], readiness, ...(readiness === 'ready' && { proof }) });
      toast.success(readiness === 'beta' ? 'Back to Beta' : ready ? 'Made with this saved' : 'Marked Ready');
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Made with this: {item.title}</DialogTitle>
          <DialogDescription>
            {RULE} Add the finished productions made with it: they are what makes it Ready, and its page shows them as a gallery under Made with this. Its trailer is separate: it plays above the README.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            {drafts.map((draft, i) => (
              <ProductionFields
                key={i}
                itemId={item.id}
                number={i + 1}
                draft={draft}
                problem={problems[i]}
                onChange={patch => change(i, patch)}
                onUp={i > 0 ? () => move(i, -1) : undefined}
                onDown={i < drafts.length - 1 ? () => move(i, 1) : undefined}
                onRemove={drafts.length > 1 ? () => setDrafts(list => list.filter((_, at) => at !== i)) : undefined}
              />
            ))}
            {drafts.length < 20 && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setDrafts(list => [...list, { ...EMPTY }])}>
                <Plus /> Add a production
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:sticky lg:top-0 lg:self-start">
            <Label>How its page shows it</Label>
            {tiles.length ? (
              <div className="rounded-xl border bg-card p-4">
                <ProofGallery itemId={item.id} tiles={tiles} />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing to show yet: name a production.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {ready ? (
            <Button variant="ghost" disabled={busy} onClick={() => save('beta')}>
              Back to Beta
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!valid || busy} onClick={() => save('ready')}>
              {busy && <Loader2 className="animate-spin" />}
              {ready ? 'Save' : 'Mark Ready'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductionFields({
  itemId,
  number,
  draft,
  problem,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  itemId: string;
  number: number;
  draft: Draft;
  problem: string | null;
  onChange: (patch: Partial<Draft>) => void;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
}) {
  const id = `${itemId}-made-${number}`;
  const youtube = !!parseYouTubeId(draft.url);
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center gap-1">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Production {number}</legend>
        <span className="ml-auto flex">
          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={!onUp} onClick={onUp} aria-label="Move earlier">
            <ArrowUp />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={!onDown} onClick={onDown} aria-label="Move later">
            <ArrowDown />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" disabled={!onRemove} onClick={onRemove} aria-label="Remove">
            <X />
          </Button>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>What was made</Label>
        <Input id={`${id}-title`} value={draft.title} maxLength={200} onChange={e => onChange({ title: e.target.value })} placeholder="The Microfox brand kit" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-url`}>Link</Label>
        <Input id={`${id}-url`} value={draft.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://youtu.be/… or where it can be seen" />
        <p className="text-xs text-muted-foreground">{youtube ? 'A YouTube link: it plays in the gallery.' : 'A YouTube link plays in the gallery; any other link opens from its tile.'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <UploadField id={`${id}-image`} itemId={itemId} label="Picture" hint="A screenshot, poster or frame" accept={IMAGE_TYPES} Icon={ImageUp} value={draft.image} onChange={image => onChange({ image })} />
        <UploadField id={`${id}-video`} itemId={itemId} label="Clip" hint="MP4 or WebM, plays in the gallery" accept={VIDEO_TYPES} Icon={Film} value={draft.video} onChange={video => onChange({ video })} />
      </div>
      {problem && <p className="text-xs text-destructive">{problem}</p>}
    </fieldset>
  );
}

/** Uploads one file for a production (public once uploaded), or takes a pasted https link. */
function UploadField({
  id,
  itemId,
  label,
  hint,
  accept,
  Icon,
  value,
  onChange,
}: {
  id: string;
  itemId: string;
  label: string;
  hint: string;
  accept: string;
  Icon: typeof ImageUp;
  value: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      if (!accept.split(',').includes(file.type)) throw new Error(`${label}: ${hint.split(',')[0]} only`);
      const { uploadUrl, publicUrl } = await adminCall<{ uploadUrl: string; publicUrl: string }>({
        type: 'create_proof_upload',
        itemId,
        filename: file.name,
        contentType: file.type,
      });
      // the signed link expects exactly these headers
      const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      onChange(publicUrl);
      toast.success(`${label} uploaded: save to keep it`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-1.5">
        <input ref={input} type="file" accept={accept} className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Icon />}
          Upload
        </Button>
        <Input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder="or paste a link" className="h-8 min-w-0 text-xs" />
      </div>
      <p className="text-xs text-muted-foreground">{value.trim() ? 'Set. Clear the field to remove it.' : hint}</p>
    </div>
  );
}
