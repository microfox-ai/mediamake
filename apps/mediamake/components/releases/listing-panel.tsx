'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, FileText, ImagePlus, Loader2, Pencil, Play, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MAX_LISTING_DESCRIPTION, MAX_LISTING_MEDIA, MAX_LISTING_README, MAX_LISTING_TAGS, mediaKindOf, parseTags, type ListingMedia } from '@/lib/catalog/listing';
import { parseYouTubeId, youtubeThumbnail } from '@/lib/catalog/video';
import { itemPagePath } from '@/lib/catalog/paths';
import { GroupLabel, Panel } from './parts';
import { adminCall, type ItemDetail } from './model';

/**
 * A skill's, MCP's or app's store listing on its release page: its headshot
 * (the 16:9 picture its cards show), its description, an MCP's or app's
 * icon, its README, its tags (its own, such as a skill's category, and the
 * ones an admin adds) and its screenshots, pictures and videos added by
 * link, like an app store listing's. Each change is saved at once (`set_listing`); the item's own
 * page shows them. Adding is a dialog from the buttons under the panel.
 */
export function ListingPanel({ detail, onSaved }: { detail: ItemDetail; onSaved: () => void }) {
  const { item } = detail;
  const added = detail.listing?.tags ?? [];
  const media = detail.listing?.media ?? [];
  const own = (item.tags ?? []).filter(tag => !added.includes(tag));
  const [dialog, setDialog] = useState<'tags' | 'media' | 'words' | 'readme' | null>(null);
  const listing = detail.listing;
  const hasIcon = item.kind === 'mcp' || item.kind === 'app';
  const [busy, setBusy] = useState(false);

  async function save(change: { tags?: string[]; media?: ListingMedia[]; description?: string; headshot?: string; icon?: string; readme?: string }, done: string) {
    setBusy(true);
    try {
      await adminCall({ type: 'set_listing', itemId: item.id, ...change });
      toast.success(done);
      onSaved();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const move = (from: number, to: number) => {
    const next = [...media];
    next.splice(to, 0, ...next.splice(from, 1));
    return save({ media: next }, 'Order saved');
  };

  return (
    <Panel
      title="Store listing"
      description={`Shown on its page, ${itemPagePath(item.id)}.`}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={() => setDialog('words')}>
            <Pencil /> Headshot and description
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog('readme')}>
            <FileText /> README
          </Button>
          <Button size="sm" variant="outline" disabled={added.length >= MAX_LISTING_TAGS} onClick={() => setDialog('tags')}>
            <Tag /> Add tags
          </Button>
          <Button size="sm" disabled={media.length >= MAX_LISTING_MEDIA} onClick={() => setDialog('media')}>
            <ImagePlus /> Add screenshot or video
          </Button>
        </>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
          {listing?.headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.headshot} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">No headshot set: its video&apos;s thumbnail is used</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            {hasIcon &&
              (listing?.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.icon} alt="" className="size-9 rounded-lg border object-cover" />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground">Icon</span>
              ))}
            <p className="min-w-0 text-sm">{listing?.description || <span className="text-muted-foreground">No description set: its summary is used.</span>}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            README:{' '}
            {listing?.readme ? 'written here' : listing?.readmeFile ? 'its README.md, in its folder' : 'the default one (video, title, badges, how to use)'}
          </p>
        </div>
      </div>

      <GroupLabel>Tags</GroupLabel>
      {own.length || added.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {own.map(tag => (
            <li key={tag} title="Its own tag: it comes with the item" className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {tag}
            </li>
          ))}
          {added.map(tag => (
            <li key={tag} className="flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs font-medium">
              {tag}
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove the tag ${tag}`}
                onClick={() => save({ tags: added.filter(other => other !== tag) }, `Tag ${tag} removed`)}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      )}

      <div className="mt-5">
        <GroupLabel>Screenshots and videos</GroupLabel>
        {media.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((entry, i) => (
              <li key={`${entry.url}-${i}`} className="group flex min-w-0 flex-col gap-1">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                  <MediaThumb entry={entry} />
                  <span className="absolute right-1 top-1 flex gap-0.5 rounded-md bg-black/60 p-0.5 text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <IconButton label="Show it earlier" disabled={busy || i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowLeft className="size-3.5" />
                    </IconButton>
                    <IconButton label="Show it later" disabled={busy || i === media.length - 1} onClick={() => move(i, i + 1)}>
                      <ArrowRight className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label="Remove it"
                      disabled={busy}
                      onClick={() => save({ media: media.filter((_, at) => at !== i) }, entry.kind === 'video' ? 'Video removed' : 'Screenshot removed')}
                    >
                      <X className="size-3.5" />
                    </IconButton>
                  </span>
                </div>
                <a href={entry.url} target="_blank" rel="noreferrer" className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
                  {entry.title || (entry.kind === 'video' ? 'Video' : `Screenshot ${i + 1}`)}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}
      </div>

      {dialog === 'tags' && (
        <TagsDialog
          have={[...own, ...added]}
          left={MAX_LISTING_TAGS - added.length}
          busy={busy}
          onClose={() => setDialog(null)}
          onAdd={async tags => (await save({ tags: [...added, ...tags] }, tags.length === 1 ? `Tag ${tags[0]} added` : `${tags.length} tags added`)) && setDialog(null)}
        />
      )}
      {dialog === 'words' && (
        <WordsDialog
          hasIcon={hasIcon}
          current={{ description: listing?.description ?? '', headshot: listing?.headshot ?? '', icon: listing?.icon ?? '' }}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={async words => (await save(words, 'Listing saved')) && setDialog(null)}
        />
      )}
      {dialog === 'readme' && (
        <ReadmeDialog
          current={listing?.readme ?? ''}
          fromFile={!!listing?.readmeFile}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={async readme => (await save({ readme }, readme ? 'README saved' : 'README cleared')) && setDialog(null)}
        />
      )}
      {dialog === 'media' && (
        <MediaDialog
          busy={busy}
          onClose={() => setDialog(null)}
          onAdd={async entry => (await save({ media: [...media, entry] }, entry.kind === 'video' ? 'Video added' : 'Screenshot added')) && setDialog(null)}
        />
      )}
    </Panel>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/** A screenshot as its picture; a video as YouTube's thumbnail or its first frame, with a play mark. */
function MediaThumb({ entry }: { entry: ListingMedia }) {
  const youtubeId = entry.kind === 'video' ? parseYouTubeId(entry.url) : null;
  if (entry.kind === 'image' || youtubeId) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={youtubeId ? youtubeThumbnail(youtubeId) : entry.url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        {youtubeId && <PlayMark />}
      </>
    );
  }
  return (
    <>
      <video src={entry.url} muted playsInline preload="metadata" className="absolute inset-0 size-full bg-black object-cover" />
      <PlayMark />
    </>
  );
}

function PlayMark() {
  return (
    <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white">
      <Play className="size-2.5 fill-current" />
    </span>
  );
}

/** Adds tags, typed with commas between them. */
function TagsDialog({ have, left, busy, onClose, onAdd }: { have: string[]; left: number; busy: boolean; onClose: () => void; onAdd: (tags: string[]) => void }) {
  const [text, setText] = useState('');
  const tags = parseTags(text.split(',')).filter(tag => !have.includes(tag));
  const tooMany = tags.length > left;
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add tags</DialogTitle>
          <DialogDescription>Words people look for it by. Put a comma between tags.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (tags.length && !tooMany && !busy) onAdd(tags);
          }}
        >
          <Input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="anime, lyric video, shorts" aria-label="Tags" />
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <li key={tag} className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {tooMany && <p className="text-xs text-destructive">Room for {left} more: an item takes {MAX_LISTING_TAGS} added tags.</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!tags.length || tooMany || busy}>
              {busy && <Loader2 className="animate-spin" />}
              {tags.length > 1 ? `Add ${tags.length} tags` : 'Add tag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const HTTPS = /^https:\/\/\S+$/;

/** The headshot (a 16:9 picture), the description and, for an MCP or an app, the icon. An empty box clears it. */
function WordsDialog({
  hasIcon,
  current,
  busy,
  onClose,
  onSave,
}: {
  hasIcon: boolean;
  current: { description: string; headshot: string; icon: string };
  busy: boolean;
  onClose: () => void;
  onSave: (words: { description: string; headshot: string; icon?: string }) => void;
}) {
  const [description, setDescription] = useState(current.description);
  const [headshot, setHeadshot] = useState(current.headshot);
  const [icon, setIcon] = useState(current.icon);
  const bad = (link: string) => !!link.trim() && !HTTPS.test(link.trim());
  const valid = !bad(headshot) && !bad(icon);
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Headshot and description</DialogTitle>
          <DialogDescription>What its cards and its page show. Leave a box empty to use the default.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            if (valid && !busy) onSave({ description: description.trim(), headshot: headshot.trim(), ...(hasIcon && { icon: icon.trim() }) });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-headshot">Headshot (a 16:9 picture, by link)</Label>
            <Input id="listing-headshot" value={headshot} onChange={e => setHeadshot(e.target.value)} placeholder="https://… (empty: its video's thumbnail)" aria-invalid={bad(headshot)} />
            {HTTPS.test(headshot.trim()) && (
              <div className="relative aspect-video w-48 overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headshot.trim()} alt="" className="absolute inset-0 size-full object-cover" />
              </div>
            )}
          </div>
          {hasIcon && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-icon">Icon (a square picture, by link)</Label>
              <Input id="listing-icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="https://…" aria-invalid={bad(icon)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-description">Description</Label>
            <Textarea id="listing-description" value={description} maxLength={MAX_LISTING_DESCRIPTION} onChange={e => setDescription(e.target.value)} placeholder="What it is, for people, in a line or two" className="min-h-20" />
          </div>
          {!valid && <p className="text-xs text-destructive">A picture is added by its https link</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The README in Markdown, for an item without a README.md of its own. Empty: the item's own, or the default one. */
function ReadmeDialog({ current, fromFile, busy, onClose, onSave }: { current: string; fromFile: boolean; busy: boolean; onClose: () => void; onSave: (readme: string) => void }) {
  const [text, setText] = useState(current);
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>README</DialogTitle>
          <DialogDescription>
            {fromFile ? 'This skill has a README.md in its folder. What you write here is shown instead.' : 'Its store listing, in Markdown: a video link first, a title, what it does, how to use it.'} Empty: {fromFile ? 'its README.md' : 'the default one'}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (!busy) onSave(text.trim());
          }}
        >
          <Textarea
            value={text}
            maxLength={MAX_LISTING_README}
            onChange={e => setText(e.target.value)}
            placeholder={'https://youtu.be/…\n\n# Its name\n\nWhat it does, in a line or two.\n\n## How to use\n\n1. …'}
            className="max-h-[50dvh] min-h-64 font-mono text-xs"
            aria-label="README, in Markdown"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Adds one screenshot or video by its link. */
function MediaDialog({ busy, onClose, onAdd }: { busy: boolean; onClose: () => void; onAdd: (entry: ListingMedia) => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  // the kind follows the link until the admin picks one
  const [picked, setPicked] = useState<ListingMedia['kind'] | null>(null);
  const link = url.trim();
  const kind = picked ?? mediaKindOf(link);
  const valid = HTTPS.test(link);
  const entry: ListingMedia = { kind, url: link, ...(title.trim() && { title: title.trim() }) };
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a screenshot or video</DialogTitle>
          <DialogDescription>Paste its link: a picture, a YouTube video, or an MP4 or WebM clip.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            if (valid && !busy) onAdd(entry);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-media-url">Link</Label>
            <Input id="listing-media-url" autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" aria-invalid={!!link && !valid} />
            {link && !valid && <p className="text-xs text-destructive">It must be an https link</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-media-kind">It is a</Label>
              <Select value={kind} onValueChange={value => setPicked(value as ListingMedia['kind'])}>
                <SelectTrigger id="listing-media-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Picture</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listing-media-title">Caption (optional)</Label>
              <Input id="listing-media-title" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} placeholder="What it shows" />
            </div>
          </div>
          {valid && (
            <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
              <MediaThumb key={`${kind}-${link}`} entry={entry} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy && <Loader2 className="animate-spin" />}
              {kind === 'video' ? 'Add video' : 'Add screenshot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
