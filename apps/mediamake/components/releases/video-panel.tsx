'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ExternalLink, ImageUp, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoThumb, YouTubeEmbed } from '@/components/catalog/video';
import { cn } from '@/lib/utils';
import { catalogItemId, isValidSlug, type CatalogItemRecord, type CatalogVideo } from '@/lib/catalog/types';
import { parseYouTubeId, watchPath, youtubeThumbnail, youtubeUrl } from '@/lib/catalog/video';
import { GroupLabel, Panel, TierPill } from './parts';
import { adminCall, itemPath, type ItemDetail } from './model';

/**
 * The videos on the release pages: an item's intro (a skill's, or an MCP's or
 * app's), a tutorial's video, and a course's lessons in order. Each has its
 * own title, description and thumbnail (uploaded, else YouTube's). Stored
 * with `set_video` (see CatalogVideo); tutorials and courses are added from
 * the dashboard with `create_video_item`.
 */

interface Draft {
  url: string;
  title: string;
  description: string;
  /** An uploaded or pasted thumbnail; empty for the default one. */
  thumbnail: string;
}

function draftOf(video: CatalogVideo | null): Draft {
  return {
    url: video?.youtubeId ? youtubeUrl(video.youtubeId) : '',
    title: video?.title ?? '',
    description: video?.description ?? '',
    thumbnail: video?.thumbnail ?? '',
  };
}

function sameDraft(a: Draft, b: Draft) {
  return a.url.trim() === b.url.trim() && a.title.trim() === b.title.trim() && a.description.trim() === b.description.trim() && a.thumbnail.trim() === b.thumbnail.trim();
}

/** What set_video and create_video_item take from a draft. */
function videoBody(draft: Draft, extra: { lessons?: string[] } = {}) {
  return {
    ...(draft.url.trim() && { url: draft.url.trim() }),
    title: draft.title.trim(),
    description: draft.description.trim(),
    ...(draft.thumbnail.trim() && { thumbnail: draft.thumbnail.trim() }),
    ...extra,
  };
}

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A video's link, words and thumbnail. A course has no link: it plays its lessons. */
function VideoFields({
  itemId,
  draft,
  onChange,
  withUrl,
  fallbackThumbnail,
  fallbackLabel,
}: {
  itemId: string;
  draft: Draft;
  onChange: (draft: Draft) => void;
  withUrl: boolean;
  /** The thumbnail shown when none is uploaded and there is no link (a course: its first lesson's). */
  fallbackThumbnail?: string;
  fallbackLabel?: string;
}) {
  const youtubeId = withUrl ? parseYouTubeId(draft.url) : null;
  const urlError = withUrl && draft.url.trim() && !youtubeId ? 'Not a link to one YouTube video' : null;
  const fieldId = (name: string) => `${itemId}-${name}`;
  return (
    // side by side only when the panel itself is wide enough (the release page's left column can be narrow)
    <div className="@container">
      <div className="grid gap-5 @xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {withUrl && (
            <Field
              label="YouTube link"
              htmlFor={fieldId('url')}
              error={urlError}
              hint={youtubeId ? `Video ${youtubeId}` : 'A watch, youtu.be, Shorts or embed link'}
            >
              <Input
                id={fieldId('url')}
                value={draft.url}
                onChange={e => onChange({ ...draft, url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
                aria-invalid={!!urlError}
              />
            </Field>
          )}
          <Field label="Title" htmlFor={fieldId('title')}>
            <Input id={fieldId('title')} value={draft.title} maxLength={120} onChange={e => onChange({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Description" htmlFor={fieldId('description')} hint="The first paragraph is the card's summary for tutorials and courses.">
            <Textarea
              id={fieldId('description')}
              value={draft.description}
              maxLength={5000}
              rows={4}
              onChange={e => onChange({ ...draft, description: e.target.value })}
            />
          </Field>
        </div>
        <ThumbnailField
          itemId={itemId}
          title={draft.title}
          value={draft.thumbnail}
          onChange={thumbnail => onChange({ ...draft, thumbnail })}
          fallback={youtubeId ? youtubeThumbnail(youtubeId) : fallbackThumbnail}
          fallbackLabel={youtubeId ? "YouTube's" : fallbackLabel}
        />
      </div>
    </div>
  );
}

/** Uploads a thumbnail (public once uploaded), takes a pasted link, or goes back to the default. */
function ThumbnailField({
  itemId,
  title,
  value,
  onChange,
  fallback,
  fallbackLabel,
}: {
  itemId: string;
  title: string;
  value: string;
  onChange: (thumbnail: string) => void;
  fallback?: string;
  fallbackLabel?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const { uploadUrl, publicUrl } = await adminCall<{ uploadUrl: string; publicUrl: string }>({
        type: 'create_thumbnail_upload',
        itemId,
        filename: file.name,
        contentType: file.type,
      });
      // the signed link expects exactly these headers
      const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      onChange(publicUrl);
      toast.success('Thumbnail uploaded: save to keep it');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${itemId}-thumbnail`}>Thumbnail</Label>
      <VideoThumb id={itemId} title={title || 'Untitled'} src={value.trim() || fallback} className="rounded-lg border" />
      <p className="text-xs text-muted-foreground">
        {value.trim() ? 'Uploaded' : fallbackLabel ? `${fallbackLabel}: none uploaded` : 'None yet: cards show the title on its colour'}
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={e => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}
          Upload
        </Button>
        {value.trim() && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            {fallbackLabel ? `Use ${fallbackLabel.toLowerCase().replace('youtube', 'YouTube')}` : 'Remove'}
          </Button>
        )}
      </div>
      <Input
        id={`${itemId}-thumbnail`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="or paste an https link"
        className="h-8 text-xs"
      />
    </div>
  );
}

/**
 * An item's intro video (a skill's, or an MCP's or app's), or a tutorial's
 * video: it plays on the item's page, and its thumbnail tops its card.
 */
export function VideoPanel({ detail, onSaved }: { detail: ItemDetail; onSaved: () => void }) {
  const { item, video } = detail;
  const tutorial = item.kind === 'tutorial';
  const saved = useMemo(() => draftOf(video), [video]);
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(saved), [saved]);

  const dirty = !sameDraft(draft, saved);
  const valid = !!parseYouTubeId(draft.url) && !!draft.title.trim();

  async function save(body: ReturnType<typeof videoBody> | null, done: string) {
    setBusy(true);
    try {
      await adminCall({ type: 'set_video', itemId: item.id, video: body });
      toast.success(done);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={tutorial ? 'Video' : 'Intro video'}
      description={
        tutorial
          ? 'The tutorial itself: it plays on its page, and its title and description are the card’s.'
          : `Plays on its page (${watchPath(item.id)}), and its thumbnail tops its card on the homepage.`
      }
    >
      {video?.youtubeId && <YouTubeEmbed youtubeId={video.youtubeId} title={video.title} className="mb-5" />}
      <VideoFields itemId={item.id} draft={draft} onChange={setDraft} withUrl />
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        <Button size="sm" disabled={!dirty || !valid || busy} onClick={() => save(videoBody(draft), video ? 'Video saved' : 'Intro video added')}>
          {busy && <Loader2 className="animate-spin" />}
          {video ? 'Save' : tutorial ? 'Save video' : 'Add intro video'}
        </Button>
        {dirty && video && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDraft(saved)}>
            Discard changes
          </Button>
        )}
        {video && (
          <Button size="sm" variant="outline" asChild>
            <a href={watchPath(item.id)} target="_blank" rel="noreferrer">
              See it live <ExternalLink />
            </a>
          </Button>
        )}
        {video && !tutorial && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => window.confirm(`Remove ${item.title}'s intro video?`) && save(null, 'Intro video removed')}
          >
            Remove video
          </Button>
        )}
      </div>
      {tutorial && (
        <div className="mt-4 border-t pt-4">
          <GroupLabel>In courses</GroupLabel>
          {detail.inCourses?.length ? (
            <ul className="flex flex-wrap gap-2">
              {detail.inCourses.map(course => (
                <li key={course.id}>
                  <Link href={itemPath(course.id)} className="rounded-md border px-2 py-1 text-sm hover:bg-muted">
                    {course.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None yet: add it to a course on the course’s page.</p>
          )}
        </div>
      )}
    </Panel>
  );
}

/** A course: its words, its thumbnail (its first lesson's by default) and its tutorials in order. */
export function CoursePanel({ detail, onSaved }: { detail: ItemDetail; onSaved: () => void }) {
  const { item, video } = detail;
  const tutorials = useMemo(() => detail.tutorials ?? [], [detail.tutorials]);
  const byId = useMemo(() => new Map(tutorials.map(t => [t.id, t])), [tutorials]);
  const saved = useMemo(() => ({ draft: draftOf(video), lessons: video?.lessons ?? [] }), [video]);
  const [draft, setDraft] = useState(saved.draft);
  const [lessons, setLessons] = useState(saved.lessons);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setDraft(saved.draft);
    setLessons(saved.lessons);
  }, [saved]);

  const dirty = !sameDraft(draft, saved.draft) || lessons.join() !== saved.lessons.join();
  const firstThumbnail = lessons.map(id => byId.get(id)?.thumbnail).find(Boolean);
  const left = tutorials.filter(t => !lessons.includes(t.id));

  const move = (from: number, to: number) =>
    setLessons(list => {
      const next = [...list];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });

  async function save() {
    setBusy(true);
    try {
      await adminCall({ type: 'set_video', itemId: item.id, video: videoBody({ ...draft, url: '' }, { lessons }) });
      toast.success('Course saved');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Course" description={`Its tutorials play in this order on ${watchPath(item.id)}. Viewers see only the lessons they can open.`}>
      <VideoFields
        itemId={item.id}
        draft={draft}
        onChange={setDraft}
        withUrl={false}
        fallbackThumbnail={firstThumbnail}
        fallbackLabel={firstThumbnail ? "First lesson's" : undefined}
      />
      <div className="mt-5 border-t pt-4">
        <GroupLabel>Lessons, in order</GroupLabel>
        {lessons.length ? (
          <ol className="flex flex-col gap-2">
            {lessons.map((id, i) => {
              const lesson = byId.get(id);
              return (
                <li key={id} className="flex items-start gap-3 rounded-lg border p-2">
                  <span className="mt-1 w-4 shrink-0 text-center text-xs font-medium tabular-nums text-muted-foreground">{i + 1}</span>
                  <VideoThumb id={id} title={lesson?.title ?? id} src={lesson?.thumbnail} size="sm" className="w-20 shrink-0 rounded-md" />
                  {/* the title on top, the tier and the order buttons under it: fits the release page's narrow column */}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={itemPath(id)} className="line-clamp-2 text-sm font-medium hover:underline">
                      {lesson?.title ?? id}
                    </Link>
                    <span className="flex flex-wrap items-center justify-between gap-1">
                      {lesson ? <TierPill tier={lesson.tier} /> : <span className="text-xs text-destructive">Not in the catalog any more</span>}
                      <span className="-mr-1 flex items-center">
                        <Button size="icon" variant="ghost" className="size-7" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Play earlier">
                          <ArrowUp />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" disabled={i === lessons.length - 1} onClick={() => move(i, i + 1)} aria-label="Play later">
                          <ArrowDown />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => setLessons(list => list.filter(other => other !== id))}
                          aria-label="Take out of the course"
                        >
                          <X />
                        </Button>
                      </span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No lessons yet: add tutorials below.</p>
        )}
        <div className="mt-3">
          {left.length ? (
            <Select value="" onValueChange={id => setLessons(list => [...list, id])}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Add a tutorial…" />
              </SelectTrigger>
              <SelectContent>
                {left.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              {tutorials.length ? 'Every tutorial is in it.' : 'No tutorials yet: add one from the Releases page.'}
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        <Button size="sm" disabled={!dirty || !draft.title.trim() || busy} onClick={save}>
          {busy && <Loader2 className="animate-spin" />}
          Save course
        </Button>
        {dirty && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setDraft(saved.draft);
              setLessons(saved.lessons);
            }}
          >
            Discard changes
          </Button>
        )}
        <Button size="sm" variant="outline" asChild className="ml-auto">
          <a href={watchPath(item.id)} target="_blank" rel="noreferrer">
            Course page <ExternalLink />
          </a>
        </Button>
      </div>
    </Panel>
  );
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

/** Adds a tutorial (a YouTube video) or a course from the dashboard; it starts in development, then opens its page. */
export function NewVideoItemDialog({
  kind,
  existing,
  onClose,
}: {
  kind: 'tutorial' | 'course' | null;
  /** Ids already in the catalog, so a taken slug is caught before sending. */
  existing: CatalogItemRecord[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(draftOf(null));
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setDraft(draftOf(null));
    setSlug('');
    setSlugEdited(false);
  }, [kind]);

  if (!kind) return null;
  const finalSlug = slugEdited ? slug : slugify(draft.title);
  const id = catalogItemId(kind, finalSlug || 'new');
  const taken = existing.some(item => item.id === id);
  const slugError = !finalSlug ? null : !isValidSlug(finalSlug) ? 'Lowercase letters, digits and dashes' : taken ? `${id} already exists` : null;
  const valid = !!draft.title.trim() && !!finalSlug && !slugError && (kind === 'course' || !!parseYouTubeId(draft.url));

  async function create() {
    setBusy(true);
    try {
      await adminCall({ type: 'create_video_item', kind, slug: finalSlug, video: videoBody(draft, kind === 'course' ? { lessons: [] } : {}) });
      toast.success(kind === 'course' ? 'Course added: now pick its lessons' : 'Tutorial added, in development');
      onClose();
      router.push(itemPath(catalogItemId(kind!, finalSlug)));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{kind === 'course' ? 'New course' : 'New tutorial'}</DialogTitle>
          <DialogDescription>
            {kind === 'course'
              ? 'A course plays tutorials in order. Name it here, then pick its lessons on its page.'
              : 'A tutorial is one YouTube video. It starts in development; release it from the Board.'}
          </DialogDescription>
        </DialogHeader>
        <VideoFields itemId={id} draft={draft} onChange={setDraft} withUrl={kind === 'tutorial'} />
        <Field label="Id" htmlFor="new-video-slug" error={slugError} hint={`Its page: /core/releases/${kind}/${finalSlug || '…'}`}>
          <div className={cn('flex items-center rounded-md border pl-3 text-sm', slugError && 'border-destructive')}>
            <span className="font-mono text-muted-foreground">{kind}/</span>
            <input
              id="new-video-slug"
              value={finalSlug}
              onChange={e => {
                setSlugEdited(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono outline-none"
            />
          </div>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={create} disabled={!valid || busy}>
            {busy && <Loader2 className="animate-spin" />}
            {kind === 'course' ? 'Add course' : 'Add tutorial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
