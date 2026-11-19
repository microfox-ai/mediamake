'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, ChevronsUpDown, ExternalLink, ImagePlus, ImageUp, Loader2, Play, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HEALTH } from '@/components/catalog/health';
import { README_PROSE } from '@/components/catalog/item-listing';
import { ProofGallery } from '@/components/catalog/proof-gallery';
import { galleryTiles } from '@/lib/catalog/gallery';
import {
  MAX_ADVICE_NOTE,
  MAX_LISTING_DESCRIPTION,
  MAX_LISTING_MEDIA,
  MAX_LISTING_README,
  MAX_LISTING_TAGS,
  mediaKindOf,
  parseTag,
  type ListingMedia,
} from '@/lib/catalog/listing';
import type { ItemReadme } from '@/lib/catalog/readme';
import { SKILL_TYPES, type SkillType } from '@/lib/catalog/skill-profile';
import {
  ADVICE,
  ITEM_HEALTH,
  ITEM_TIERS,
  LEVELS,
  RULE,
  adviceInfo,
  isAlwaysPublic,
  levelInfo,
  proofOf,
  type ItemAdvice,
  type ItemHealth,
  type ItemTier,
  type Readiness,
} from '@/lib/catalog/types';
import { parseYouTubeId, youtubeThumbnail } from '@/lib/catalog/video';
import { cn } from '@/lib/utils';
import { TIER_META, adminCall, type ItemDetail } from './model';
import { ProofDialog } from './proof-dialog';

/**
 * The store listing editor on an item's release page (/app/releases/<kind>/<slug>): everything an
 * admin sets on a listing, in one place.
 *
 * - Status: its level (Alpha, Beta, Production), its advice (Recommended, Not recommended,
 *   Deprecated), its tier and its health as dropdowns, and Editors' pick and Archived as switches.
 * - Card: its headshot, icon, description and tags, as its card and page show them.
 * - Skill details: a skill's type and its superset.
 * - Its README (a tab of its own) and its screenshots (on Made with this).
 *
 * A choice saves the moment it is made: the level (Production asks for what was made with it, as
 * the rule says), the tier, the switches, a skill's type. What takes words waits for the save bar
 * at the foot of the page: the card's text and pictures, the README, the advice and the health
 * with their reasons. Saving is the admin API (`set_listing`, `set_health`, `set_readiness`,
 * `set_item_tier`, `set_archived`) and POST /api/catalog/profile for a skill's type.
 */

/* ---------- the draft: what waits for Save ---------- */

export interface ListingDraft {
  description: string;
  tags: string[];
  headshot: string;
  icon: string;
  readme: string;
  advice: ItemAdvice;
  adviceNote: string;
  insteadOf: string;
  /** `default`: no admin mark, the repo's own health. */
  health: ItemHealth | 'default';
  healthNote: string;
}

type DraftKey = keyof ListingDraft;

function draftOf(detail: ItemDetail): ListingDraft {
  const listing = detail.listing;
  return {
    description: listing?.description ?? '',
    tags: listing?.tags ?? [],
    headshot: listing?.headshot ?? '',
    icon: listing?.icon ?? '',
    readme: listing?.readme ?? '',
    advice: listing?.advice ?? 'recommended',
    adviceNote: listing?.adviceNote ?? '',
    insteadOf: listing?.insteadOf ?? '',
    health: detail.healthMark?.health ?? 'default',
    healthNote: detail.healthMark?.note ?? '',
  };
}

const same = (a: ListingDraft[DraftKey], b: ListingDraft[DraftKey]) => (Array.isArray(a) && Array.isArray(b) ? a.join('\n') === b.join('\n') : a === b);

/** The words each change is named by in the save bar. */
const CHANGE_LABEL: Record<DraftKey, string> = {
  description: 'description',
  tags: 'tags',
  headshot: 'headshot',
  icon: 'icon',
  readme: 'README',
  advice: 'advice',
  adviceNote: 'advice',
  insteadOf: 'advice',
  health: 'health',
  healthNote: 'health',
};

const HTTPS = /^https:\/\/\S+$/;

/** What stops the draft from saving, in words; null when it can. */
function problemOf(draft: ListingDraft): string | null {
  if (draft.headshot.trim() && !HTTPS.test(draft.headshot.trim())) return 'The headshot is a picture by its https link';
  if (draft.icon.trim() && !HTTPS.test(draft.icon.trim())) return 'The icon is a picture by its https link';
  if (draft.advice !== 'recommended' && !draft.adviceNote.trim()) return `Say why it is ${adviceInfo(draft.advice).label.toLowerCase()}`;
  if (draft.health === 'failed' && !draft.healthNote.trim()) return 'A failed item needs its reason';
  return null;
}

/**
 * The page's draft. When the item loads again (after an instant change), what was not changed here
 * follows the new values, and what was changed here stays as typed.
 */
export function useListingDraft(detail: ItemDetail, onSaved: () => void) {
  const initial = useMemo(() => draftOf(detail), [detail]);
  const [base, setBase] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(current => {
      const next = { ...initial };
      for (const key of Object.keys(next) as DraftKey[]) if (!same(current[key], base[key])) (next as Record<DraftKey, unknown>)[key] = current[key];
      return next;
    });
    setBase(initial);
  }, [initial]);

  const changed = (Object.keys(draft) as DraftKey[]).filter(key => !same(draft[key], base[key]));
  const labels = [...new Set(changed.map(key => CHANGE_LABEL[key]))];
  const problem = changed.length ? problemOf(draft) : null;

  const set = useCallback(<K extends DraftKey>(key: K, value: ListingDraft[K]) => setDraft(current => ({ ...current, [key]: value })), []);
  const discard = () => setDraft(base);

  async function save() {
    if (problem || saving) return;
    const item = detail.item;
    const listing: Record<string, unknown> = {};
    for (const key of ['description', 'headshot', 'icon', 'readme'] as const) if (changed.includes(key)) listing[key] = draft[key].trim();
    if (changed.includes('tags')) listing.tags = draft.tags;
    if (changed.some(key => key === 'advice' || key === 'adviceNote' || key === 'insteadOf')) {
      listing.advice = draft.advice;
      if (draft.advice !== 'recommended') {
        listing.adviceNote = draft.adviceNote.trim();
        listing.insteadOf = draft.insteadOf;
      }
    }
    const health = changed.includes('health') || changed.includes('healthNote');
    setSaving(true);
    try {
      if (Object.keys(listing).length) await adminCall({ type: 'set_listing', itemId: item.id, ...listing });
      if (health)
        await adminCall({
          type: 'set_health',
          itemIds: [item.id],
          health: draft.health === 'default' ? null : draft.health,
          ...(draft.health !== 'default' && draft.health !== 'healthy' && draft.healthNote.trim() && { note: draft.healthNote.trim() }),
        });
      toast.success(`Saved: ${labels.join(', ')}`);
      // what was saved is the new starting point, until the item loads again
      setBase(draft);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return { draft, set, labels, problem, saving, save, discard };
}

export type DraftState = ReturnType<typeof useListingDraft>;

/** The save bar at the foot of the page, while something waits to be saved. */
export function SaveBar({ state }: { state: DraftState }) {
  if (!state.labels.length) return null;
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-xl border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Unsaved:</span> <span className="text-muted-foreground">{state.labels.join(', ')}</span>
        {state.problem && <span className="block text-xs text-destructive">{state.problem}</span>}
      </p>
      <Button variant="ghost" size="sm" onClick={state.discard} disabled={state.saving}>
        Discard
      </Button>
      <Button size="sm" onClick={state.save} disabled={!!state.problem || state.saving}>
        {state.saving && <Loader2 className="animate-spin" />}
        Save
      </Button>
    </div>
  );
}

/* ---------- layout ---------- */

/** One part of the editor: a heading, a line about it, and its fields. */
export function Section({ title, about, children, className }: { title: string; about?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {about && <p className="mt-0.5 text-sm text-muted-foreground">{about}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- status ---------- */

/**
 * Its level, advice, tier and health as four dropdowns, then Editors' pick and Archived as
 * switches. The level, the tier and the switches save at once; the advice and the health wait for
 * the save bar with their reasons.
 */
export function StatusSection({ detail, tier, state, onChanged }: { detail: ItemDetail; tier: ItemTier; state: DraftState; onChanged: () => void }) {
  const { item } = detail;
  const { draft, set } = state;
  const storeKind = item.kind === 'skill' || item.kind === 'mcp' || item.kind === 'app';
  const options = useMemo(
    () =>
      Object.entries(detail.names)
        .filter(([id]) => id !== item.id)
        .map(([id, title]) => ({ id, label: title, hint: id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [detail.names, item.id],
  );
  return (
    <Section title="Status" about="Where it stands, who it opens for and whether it works. Each choice shows on its card and page.">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <LevelSelect detail={detail} onChanged={onChanged} />
        {storeKind && (
          <Field label="Advice" htmlFor="item-advice" hint={draft.advice === 'recommended' ? undefined : adviceInfo(draft.advice).about}>
            <Select value={draft.advice} onValueChange={value => set('advice', value as ItemAdvice)}>
              <SelectTrigger id="item-advice" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADVICE.map(entry => (
                  <SelectItem key={entry.id} value={entry.id}>
                    <span className={cn('size-1.5 rounded-full', entry.id === 'recommended' ? 'bg-emerald-500' : 'bg-red-500')} />
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <TierSelect detail={detail} tier={tier} onChanged={onChanged} />
        <Field label="Health" htmlFor="item-health" hint={draft.health === 'default' ? `The repo's own: ${HEALTH[item.health ?? 'healthy'].label.toLowerCase()}` : undefined}>
          <Select value={draft.health} onValueChange={value => set('health', value as ListingDraft['health'])}>
            <SelectTrigger id="item-health" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              {ITEM_HEALTH.map(health => (
                <SelectItem key={health} value={health}>
                  {HEALTH[health].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {storeKind && draft.advice !== 'recommended' && (
        <div className="grid gap-x-6 gap-y-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <Field label={`Why it is ${adviceInfo(draft.advice).label.toLowerCase()}`} htmlFor="item-advice-note" hint={`${draft.adviceNote.length} / ${MAX_ADVICE_NOTE}`}>
            <Input
              id="item-advice-note"
              value={draft.adviceNote}
              maxLength={MAX_ADVICE_NOTE}
              onChange={e => set('adviceNote', e.target.value)}
              placeholder="Its tools time out on long files; the local MCP doesn't"
              aria-invalid={!draft.adviceNote.trim()}
            />
          </Field>
          <Field label="Use instead (optional)">
            <PickOne value={draft.insteadOf} options={options} placeholder="Pick an item" onPick={id => set('insteadOf', id)} />
          </Field>
        </div>
      )}

      {draft.health !== 'default' && draft.health !== 'healthy' && (
        <Field label={`Why it is ${HEALTH[draft.health].label.toLowerCase()}${draft.health === 'failed' ? '' : ' (optional)'}`} htmlFor="item-health-note">
          <Input id="item-health-note" value={draft.healthNote} maxLength={500} onChange={e => set('healthNote', e.target.value)} placeholder="Shown with it on its card and page" />
        </Field>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:gap-8">
        <EditorsPickSwitch detail={detail} onChanged={onChanged} />
        <ArchivedSwitch detail={detail} onChanged={onChanged} />
      </div>
    </Section>
  );
}

/** Its level, saved at once. Production asks for what was made with it (the rule), filled with what it had before. */
function LevelSelect({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const { item } = detail;
  const level: Readiness = item.readiness ?? 'beta';
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const set = async (value: string) => {
    const next = value as Readiness;
    if (next === level) return;
    if (next === 'ready') return setAsking(true);
    setBusy(true);
    try {
      await adminCall({ type: 'set_readiness', itemIds: [item.id], readiness: next });
      toast.success(`Level: ${levelInfo(next).label}`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label="Level" htmlFor="item-level" hint={levelInfo(level).about}>
      <Select value={level} onValueChange={set} disabled={busy}>
        <SelectTrigger id="item-level" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEVELS.map(entry => (
            <SelectItem key={entry.id} value={entry.id}>
              <span className={cn('size-1.5 rounded-full', LEVEL_DOT[entry.id])} />
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {asking && <ProofDialog detail={detail} onClose={() => setAsking(false)} onDone={onChanged} />}
    </Field>
  );
}

export const LEVEL_DOT: Record<Readiness, string> = { alpha: 'bg-red-500', beta: 'bg-amber-500', ready: 'bg-emerald-500' };

/**
 * The tier, the lowest membership that opens it, saved at once (`set_item_tier`). Releasing to
 * Public asks first. A skill in the public repo, an item made by others and a card defined in code
 * can't be moved: the hint says why.
 */
function TierSelect({ detail, tier, onChanged }: { detail: ItemDetail; tier: ItemTier; onChanged: () => void }) {
  const { item } = detail;
  const always = isAlwaysPublic(item);
  const locked = always ? (item.madeBy ? 'Made by others: always Public' : 'In the public repo: always Public') : detail.definedIn === 'items.ts' ? 'Set in lib/catalog/items.ts' : undefined;
  const [busy, setBusy] = useState(false);
  const set = async (value: string) => {
    const next = value as ItemTier;
    if (next === tier) return;
    if (next === 'public' && !window.confirm(`Release ${item.title} to everyone now?`)) return;
    setBusy(true);
    try {
      await adminCall({ type: 'set_item_tier', itemId: item.id, tier: next });
      toast.success(next === 'public' ? 'Released to the public' : `Moved to ${next === 'admin' ? 'the vault' : TIER_META[next].label}`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label="Tier" htmlFor="item-tier" hint={locked ?? TIER_META[tier].who}>
      <Select value={tier} onValueChange={set} disabled={busy || !!locked}>
        <SelectTrigger id="item-tier" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEM_TIERS.map(option => (
            <SelectItem key={option} value={option}>
              <span className={cn('size-1.5 rounded-full', TIER_META[option].dot)} />
              {TIER_META[option].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SwitchRow({ id, label, about, checked, busy, onChange }: { id: string; label: string; about: string; checked: boolean; busy: boolean; onChange: (on: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <Switch id={id} checked={checked} disabled={busy} onCheckedChange={onChange} className="mt-0.5" />
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{about}</span>
      </span>
    </label>
  );
}

function useInstant(onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const run = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      await adminCall(body);
      toast.success(done);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function EditorsPickSwitch({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const { busy, run } = useInstant(onChanged);
  const picked = !!detail.listing?.editorsPick;
  return (
    <SwitchRow
      id="item-editors-pick"
      label="Editors' pick"
      about="At the top of Explore"
      checked={picked}
      busy={busy}
      onChange={on => run({ type: 'set_listing', itemId: detail.item.id, editorsPick: on }, on ? "Added to the editors' picks" : "Taken out of the editors' picks")}
    />
  );
}

function ArchivedSwitch({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const { busy, run } = useInstant(onChanged);
  const archived = !!detail.archive;
  return (
    <SwitchRow
      id="item-archived"
      label="Archived"
      about="Off the homepage; still installs by its link"
      checked={archived}
      busy={busy}
      onChange={on => run({ type: 'set_archived', itemIds: [detail.item.id], archived: on }, on ? 'Archived: left off the homepage' : 'Back on the homepage')}
    />
  );
}

/* ---------- card ---------- */

/** Uploads a picture for the listing (public once uploaded) and gives back its link. */
async function uploadPicture(itemId: string, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)) throw new Error('A PNG, JPEG, WebP, GIF or AVIF picture');
  const { uploadUrl, publicUrl } = await adminCall<{ uploadUrl: string; publicUrl: string }>({ type: 'create_thumbnail_upload', itemId, filename: file.name, contentType: file.type });
  // the signed link expects exactly these headers
  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return publicUrl;
}

/** A picture field: its preview, Upload, and a link box. Empty: the default. */
function PictureField({
  itemId,
  id,
  label,
  value,
  onChange,
  shape,
  empty,
}: {
  itemId: string;
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  shape: 'wide' | 'square';
  empty: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const link = value.trim();
  const upload = async (file: File) => {
    setBusy(true);
    try {
      onChange(await uploadPicture(itemId, file));
      toast.success(`${label} uploaded: save to keep it`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <Field label={label} htmlFor={id} className={shape === 'wide' ? 'w-full sm:w-72' : 'w-full sm:w-40'}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          'group relative overflow-hidden rounded-xl border bg-muted text-left transition-colors hover:border-foreground/30',
          shape === 'wide' ? 'aspect-video w-full' : 'aspect-square w-24',
        )}
        aria-label={`Upload the ${label.toLowerCase()}`}
      >
        {HTTPS.test(link) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">{empty}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      <div className="flex gap-1.5">
        <Input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder="Paste a link" className="h-8 min-w-0 text-xs" aria-invalid={!!link && !HTTPS.test(link)} />
        {link && (
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => onChange('')} aria-label={`Clear the ${label.toLowerCase()}`}>
            <X />
          </Button>
        )}
      </div>
    </Field>
  );
}

/** Its headshot, icon, description and tags: what its card and its page show. */
export function CardSection({ detail, state }: { detail: ItemDetail; state: DraftState }) {
  const { item } = detail;
  const { draft, set } = state;
  const hasIcon = item.kind === 'mcp' || item.kind === 'app';
  const own = (item.tags ?? []).filter(tag => !(detail.listing?.tags ?? []).includes(tag));
  return (
    <Section title="Card" about="What its card in Explore and the top of its page show.">
      <div className="flex flex-col gap-5 sm:flex-row">
        <PictureField
          itemId={item.id}
          id="listing-headshot"
          label="Headshot"
          shape="wide"
          value={draft.headshot}
          onChange={url => set('headshot', url)}
          empty={item.video?.thumbnail ? "Its video's thumbnail shows" : 'Its title on its colour shows'}
        />
        {hasIcon && <PictureField itemId={item.id} id="listing-icon" label="Icon" shape="square" value={draft.icon} onChange={url => set('icon', url)} empty="Its first letter shows" />}
      </div>
      <Field label="Description" htmlFor="listing-description" hint={`${draft.description.length} / ${MAX_LISTING_DESCRIPTION}${draft.description ? '' : ` · Empty: its summary shows`}`}>
        <Textarea
          id="listing-description"
          value={draft.description}
          maxLength={MAX_LISTING_DESCRIPTION}
          onChange={e => set('description', e.target.value)}
          placeholder={item.summary || 'What it is, for people, in a line or two'}
          className="min-h-20"
        />
      </Field>
      <Field label="Tags" hint={`Words people find it by. ${draft.tags.length} / ${MAX_LISTING_TAGS}`}>
        <TagPicker own={own} tags={draft.tags} options={detail.tagOptions ?? []} onChange={tags => set('tags', tags)} />
      </Field>
    </Section>
  );
}

/** The tags: its own ones fixed and muted, the added ones removable, and a picker of the catalog's tags that also takes new ones. */
function TagPicker({ own, tags, options, onChange }: { own: string[]; tags: string[]; options: string[]; onChange: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const full = tags.length >= MAX_LISTING_TAGS;
  const typed = parseTag(text);
  const add = (tag: string | null) => {
    if (!tag || own.includes(tag) || tags.includes(tag) || full) return;
    onChange([...tags, tag]);
    setText('');
  };
  const left = options.filter(tag => !own.includes(tag) && !tags.includes(tag));
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
      {own.map(tag => (
        <span key={tag} title="It comes with the item" className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {tag}
        </span>
      ))}
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 rounded-full border bg-background py-0.5 pl-2.5 pr-1 text-xs font-medium">
          {tag}
          <button
            type="button"
            aria-label={`Remove the tag ${tag}`}
            onClick={() => onChange(tags.filter(other => other !== tag))}
            className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {!full && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <Plus className="size-3" /> Add a tag
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput
                value={text}
                onValueChange={setText}
                placeholder="Find or type a tag"
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && typed && !left.includes(typed)) {
                    e.preventDefault();
                    add(typed);
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>{typed ? `Enter adds “${typed}”` : 'Type a tag'}</CommandEmpty>
                {typed && !left.includes(typed) && !tags.includes(typed) && !own.includes(typed) && (
                  <CommandGroup heading="New">
                    <CommandItem value={`new:${typed}`} onSelect={() => add(typed)}>
                      <Plus /> {typed}
                    </CommandItem>
                  </CommandGroup>
                )}
                {left.length > 0 && (
                  <CommandGroup heading="In the catalog">
                    {left.map(tag => (
                      <CommandItem key={tag} value={tag} onSelect={() => add(tag)}>
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/** A searchable dropdown of one choice among many (an item, a skill). */
export function PickOne({
  value,
  options,
  placeholder,
  onPick,
  disabled,
}: {
  value: string;
  options: { id: string; label: string; hint?: string }[];
  placeholder: string;
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const picked = options.find(option => option.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="w-full justify-between font-normal" aria-expanded={open}>
          <span className={cn('truncate', !picked && 'text-muted-foreground')}>{picked?.label ?? (value || placeholder)}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandEmpty>Nothing by that name</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__none"
                  onSelect={() => {
                    onPick('');
                    setOpen(false);
                  }}
                >
                  <X /> None
                </CommandItem>
              )}
              {options.map(option => (
                <CommandItem
                  key={option.id}
                  value={`${option.label} ${option.id}`}
                  onSelect={() => {
                    onPick(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn(option.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.hint && option.hint !== option.label && <span className="truncate text-xs text-muted-foreground">{option.hint}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- a skill's details ---------- */

const NOT_SET = 'none';

/**
 * A skill's type and, for a subset, its superset: saved at once (POST /api/catalog/profile), a
 * subset once its superset is picked. A skill in the store is always shared use.
 */
export function SkillDetailsSection({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const form = detail.skillDetails;
  const [type, setType] = useState<SkillType | typeof NOT_SET>(form?.type ?? NOT_SET);
  const [busy, setBusy] = useState(false);
  useEffect(() => setType(form?.type ?? NOT_SET), [form?.type]);
  const supersets = useMemo(() => (form?.supersets ?? []).map(name => ({ id: name, label: name })), [form?.supersets]);
  if (!form) return null;

  const save = async (next: SkillType | typeof NOT_SET, superset?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/catalog/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: form.key, type: next === NOT_SET ? null : next, ...(next === 'subset' && { superset }) }),
      });
      const answer = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(answer.error ?? 'Could not save the details');
      toast.success(next === NOT_SET ? 'Type cleared' : `Type: ${SKILL_TYPES.find(entry => entry.id === next)!.label}${superset ? ` of ${superset}` : ''}`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
      setType(form.type ?? NOT_SET);
    } finally {
      setBusy(false);
    }
  };
  const about = SKILL_TYPES.find(entry => entry.id === type)?.about;
  return (
    <Section title="Skill details" about="How it sits among the other skills. In the store, a skill is always for shared use.">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field label="Type" htmlFor="skill-type" hint={about ?? (form.set ? undefined : 'Not set: its page shows none')}>
          <Select
            value={type}
            disabled={busy}
            onValueChange={value => {
              const next = value as SkillType | typeof NOT_SET;
              setType(next);
              // a subset saves once its superset is picked
              if (next !== 'subset') void save(next);
              else if (form.superset) void save(next, form.superset);
            }}
          >
            <SelectTrigger id="skill-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NOT_SET}>Not set</SelectItem>
              {SKILL_TYPES.map(entry => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {type === 'subset' && (
          <Field label="Subset of" hint={form.superset ? undefined : 'Pick the skill it is a style or a part of'}>
            <PickOne value={form.superset ?? ''} options={supersets} placeholder="Pick its superset" disabled={busy} onPick={name => name && save('subset', name)} />
          </Field>
        )}
      </div>
    </Section>
  );
}

/* ---------- README ---------- */

/**
 * Its README, full width: Write and Preview. An MCP's or an app's (or a skill's without a README.md
 * in the repo) is written here and saved with the save bar. A repo skill's README.md is edited in
 * the repo (docs/item-readme.md), so it shows here to read, with a link to edit it on GitHub.
 */
export function ReadmeEditor({ detail, state }: { detail: ItemDetail; state: DraftState }) {
  const source = detail.readme;
  const { draft, set } = state;
  const fromFile = source?.source === 'file';
  const [mode, setMode] = useState<'write' | 'preview'>(fromFile ? 'preview' : 'write');
  const text = fromFile ? (source?.text ?? '') : draft.readme;
  const shown = text.trim() ? text : (source?.defaultText ?? '');
  const preview = useReadmePreview(mode === 'preview' ? shown : null, fromFile ? source?.base : undefined);

  if (!source) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label="README view">
          {(['write', 'preview'] as const).map(view => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={mode === view}
              onClick={() => setMode(view)}
              disabled={view === 'write' && fromFile}
              className={cn('rounded-md px-3 py-1 text-sm capitalize transition-colors disabled:opacity-40', mode === view ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')}
            >
              {view}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {fromFile
            ? 'Its README.md lives in the repo, beside its SKILL.md: edit it there.'
            : draft.readme.trim()
              ? `Markdown. A video link on the first line plays at the top; pictures one after another show as a grid. ${draft.readme.length} / ${MAX_LISTING_README}`
              : 'None written yet: its page shows the default one.'}
        </p>
        {fromFile && source.editUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={source.editUrl} target="_blank" rel="noreferrer">
              <ExternalLink /> Edit README.md on GitHub
            </a>
          </Button>
        )}
        {!fromFile && !draft.readme.trim() && source.defaultText && (
          <Button variant="outline" size="sm" onClick={() => set('readme', source.defaultText!)}>
            Start from the default
          </Button>
        )}
      </div>

      {fromFile && source.override && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          <span className="min-w-0 flex-1">A README saved on its listing shows instead of this file.</span>
          <Button variant="outline" size="sm" onClick={() => set('readme', '')} disabled={!draft.readme}>
            Remove it
          </Button>
        </div>
      )}

      {mode === 'write' && !fromFile ? (
        <Textarea
          value={draft.readme}
          maxLength={MAX_LISTING_README}
          onChange={e => set('readme', e.target.value)}
          placeholder={source.defaultText || '# Its name\n\nWhat it does, in a line or two.\n\n## How to use\n\n1. …'}
          className="min-h-[60vh] w-full resize-y font-mono text-[13px] leading-relaxed"
          aria-label="README, in Markdown"
          spellCheck
        />
      ) : (
        <div className="min-h-[40vh] rounded-xl border bg-card p-6">
          {preview === null ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {preview.title && <h1 className="text-2xl font-semibold tracking-tight">{preview.title}</h1>}
              {preview.video && (
                <p className="text-xs text-muted-foreground">
                  <Play className="mr-1 inline size-3" /> Its video plays at the top of its page.
                </p>
              )}
              <article className={README_PROSE} dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The README rendered as its page renders it (lib/catalog/readme), loaded only when previewing. */
function useReadmePreview(markdown: string | null, base: Parameters<typeof import('@/lib/catalog/readme').renderReadme>[1]) {
  const [preview, setPreview] = useState<ItemReadme | null>(null);
  useEffect(() => {
    if (markdown === null) return;
    let live = true;
    setPreview(null);
    import('@/lib/catalog/readme')
      .then(({ renderReadme }) => renderReadme(markdown, base))
      .then(rendered => live && setPreview(rendered))
      .catch(() => live && setPreview({ html: '<p>Couldn’t render it.</p>', written: true }));
    return () => {
      live = false;
    };
  }, [markdown, base?.files]);
  return preview;
}

/* ---------- made with this ---------- */

/**
 * What was made with it (the productions that make it Production) and its screenshots: its page's
 * Made with this tab, as an admin edits it.
 */
export function MadeWithSection({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const proof = proofOf(detail.readinessMark);
  const kept = detail.savedProof ?? [];
  const ready = detail.item.readiness === 'ready';
  const shown = ready ? proof : kept;
  const tiles = useMemo(() => galleryTiles(shown), [shown]);
  return (
    <Section
      title="Productions"
      about={
        <>
          {RULE} The finished productions made with it are what make it Production.
          {!ready && kept.length > 0 && ' It is not at Production now; these are kept for when it goes back.'}
        </>
      }
    >
      {tiles.length ? (
        <div className={cn('rounded-xl border bg-card p-4', !ready && 'opacity-60')}>
          <ProofGallery itemId={detail.item.id} tiles={tiles} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">None yet. Name the first finished production made with it to take it to Production.</p>
      )}
      <div>
        <Button variant={ready ? 'outline' : 'default'} size="sm" onClick={() => setEditing(true)}>
          {ready ? 'Edit productions' : kept.length ? 'Back to Production with these' : 'Add a production'}
        </Button>
      </div>
      {editing && <ProofDialog detail={detail} onClose={() => setEditing(false)} onDone={onChanged} />}
    </Section>
  );
}

/**
 * Its screenshots, pictures and videos by link or upload, in order: saved at once, like a list.
 */
export function ScreenshotsSection({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const { item } = detail;
  const media = detail.listing?.media ?? [];
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (next: ListingMedia[], done: string) => {
    setBusy(true);
    try {
      await adminCall({ type: 'set_listing', itemId: item.id, media: next });
      toast.success(done);
      onChanged();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const move = (from: number, to: number) => {
    const next = [...media];
    next.splice(to, 0, ...next.splice(from, 1));
    return save(next, 'Order saved');
  };
  return (
    <Section title="Screenshots and videos" about={`Pictures and videos of it at work, shown under its productions. ${media.length} / ${MAX_LISTING_MEDIA}`}>
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
                <IconButton label="Remove it" disabled={busy} onClick={() => save(media.filter((_, at) => at !== i), entry.kind === 'video' ? 'Video removed' : 'Screenshot removed')}>
                  <X className="size-3.5" />
                </IconButton>
              </span>
            </div>
            <span className="truncate text-xs text-muted-foreground">{entry.title || (entry.kind === 'video' ? 'Video' : `Screenshot ${i + 1}`)}</span>
          </li>
        ))}
        {media.length < MAX_LISTING_MEDIA && (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <ImagePlus className="size-4" /> Add
            </button>
          </li>
        )}
      </ul>
      {adding && (
        <MediaDialog
          itemId={item.id}
          busy={busy}
          onClose={() => setAdding(false)}
          onAdd={async entry => (await save([...media, entry], entry.kind === 'video' ? 'Video added' : 'Screenshot added')) && setAdding(false)}
        />
      )}
    </Section>
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

/** Adds one screenshot or video: an uploaded picture, or a link to a picture, a YouTube video, or an MP4 or WebM clip. */
function MediaDialog({ itemId, busy, onClose, onAdd }: { itemId: string; busy: boolean; onClose: () => void; onAdd: (entry: ListingMedia) => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const link = url.trim();
  const kind = mediaKindOf(link);
  const valid = HTTPS.test(link);
  const entry: ListingMedia = { kind, url: link, ...(title.trim() && { title: title.trim() }) };
  const upload = async (file: File) => {
    setUploading(true);
    try {
      setUrl(await uploadPicture(itemId, file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a screenshot or video</DialogTitle>
          <DialogDescription>Upload a picture, or paste a link to a picture, a YouTube video, or an MP4 or WebM clip.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            if (valid && !busy) onAdd(entry);
          }}
        >
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={uploading} onClick={() => input.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <ImageUp />} Upload
            </Button>
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            <Input autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="or paste a link" aria-label="Link" aria-invalid={!!link && !valid} />
          </div>
          <Input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} placeholder="Caption (optional): what it shows" aria-label="Caption" />
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
