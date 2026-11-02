'use client';

import { useRef, useState } from 'react';
import { AlertTriangleIcon, CloudIcon, CopyIcon, FilmIcon, FolderKanbanIcon, GitForkIcon, HardDriveIcon, LayersIcon, MusicIcon, PlayIcon, StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { drifted, qualityOf } from '@/lib/library/filter';
import { productionThumb, ratingOf, skillThumb } from '@/lib/library/model';
import type { Channel, MediaItem, Production, Skill } from '@/lib/library/types';
import { ago, duration, plural } from './format';
import { hideHover, showHover } from './HoverPreview';
import { Thumb } from './Thumb';
import { pendingChannel, pendingRating, pendingSort, useLibraryStore } from './store';

export function Chip({ children, className, tone = 'muted', title }: { children: React.ReactNode; className?: string; tone?: 'muted' | 'accent' | 'outline' | 'dark' | 'warn' | 'good' | 'pending'; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10.5px] font-medium [&>svg]:size-3',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'accent' && 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
        tone === 'outline' && 'border text-muted-foreground',
        tone === 'dark' && 'bg-black/65 text-white backdrop-blur-sm',
        tone === 'warn' && 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
        tone === 'good' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
        tone === 'pending' && 'border border-dashed border-sky-400 text-sky-700 dark:text-sky-300',
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, 'muted' | 'good' | 'accent'> = { active: 'muted', delivered: 'accent', uploaded: 'good' };

const TITLE_SIZE = { sm: 'text-[13px]', md: 'text-sm', lg: 'text-base' } as const;

function cardClass(selected: boolean) {
  return cn(
    'group relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl p-1.5 text-left outline-none transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
    selected && 'bg-muted/80 ring-1 ring-foreground/15',
  );
}

export function Stars({ value, pending, onRate, size = 'sm' }: { value: number | null; pending?: boolean; onRate?: (n: number | null) => void; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const star = (n: number) => <StarIcon className={cn(size === 'md' ? 'size-4' : 'size-3', n <= shown ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/40')} />;
  return (
    <span className={cn('inline-flex items-center', pending && 'rounded-full outline-dashed outline-1 outline-offset-2 outline-sky-400')} onMouseLeave={() => setHover(null)} title={pending ? 'Waiting for the media CLI' : value ? `${value} of 5` : undefined}>
      {[1, 2, 3, 4, 5].map(n =>
        onRate ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onMouseEnter={() => setHover(n)}
            onClick={e => {
              e.stopPropagation();
              onRate(value === n ? null : n);
            }}
            className={cn('grid place-items-center', size === 'md' ? 'size-6' : 'size-3.5')}
          >
            {star(n)}
          </button>
        ) : (
          <span key={n} className={cn('grid place-items-center', size === 'md' ? 'size-6' : 'size-3.5')}>
            {star(n)}
          </span>
        ),
      )}
    </span>
  );
}

export function SkillCard({ skill, size = 'md' }: { skill: Skill; size?: 'sm' | 'md' | 'lg' }) {
  const selected = useLibraryStore(s => s.selected?.kind === 'skill' && s.selected.id === skill.name);
  const select = useLibraryStore(s => s.select);
  const library = useLibraryStore(s => s.library);
  const thumb = skillThumb(library, skill);
  const variantLabel = skill.variantOf ? (skill.variantRef ? (library.production[skill.variantRef]?.title ?? skill.variantRef.replace(/[-_]+/g, ' ')) : skill.name) : null;
  return (
    <button type="button" data-card={`skill:${skill.name}`} onClick={() => select({ kind: 'skill', id: skill.name })} className={cardClass(selected)}>
      <div className="relative w-full">
        <Thumb image={thumb} seed={skill.family} title={skill.title} label={skill.category} className="aspect-video rounded-xl border border-black/5" />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {skill.variantOf && (
            <Chip tone="dark">
              <GitForkIcon /> {variantLabel}
            </Chip>
          )}
          {drifted(skill) && (
            <Chip tone="warn" title={`${skill.variantOf} changed since the fork: ${plural(skill.drift!.upstream.commits, 'commit')}, ${plural(skill.drift!.upstream.files, 'file')}`}>
              base moved on
            </Chip>
          )}
        </div>
        {skill.variants.length > 0 && (
          <span className="absolute bottom-2 right-2">
            <Chip tone="dark">
              <LayersIcon /> {plural(skill.variants.length, 'variant')}
            </Chip>
          </span>
        )}
        {skill.best?.production && (
          <span className="absolute bottom-2 left-2">
            <Chip tone="dark" title="Its best approved output">
              {library.production[skill.best.production]?.title ?? skill.best.production}
            </Chip>
          </span>
        )}
      </div>
      <div className="w-full min-w-0 px-1 pb-1">
        <div className={cn('truncate font-mono font-medium leading-tight', TITLE_SIZE[size])}>{skill.name}</div>
        {size !== 'sm' && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{skill.summary}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {skill.runs > 0 ? (
            <Chip>
              <PlayIcon /> {plural(skill.runs, 'run')}
            </Chip>
          ) : (
            <Chip tone="outline">never run</Chip>
          )}
          {skill.lastRun && <span className="text-[11px] text-muted-foreground">last {ago(skill.lastRun)}</span>}
          {skill.location === 'local' && <Chip tone="outline">local</Chip>}
        </div>
      </div>
    </button>
  );
}

export function ProductionCard({ production, size = 'md' }: { production: Production; size?: 'sm' | 'md' | 'lg' }) {
  const selected = useLibraryStore(s => s.selected?.kind === 'production' && s.selected.id === production.slug);
  const select = useLibraryStore(s => s.select);
  const library = useLibraryStore(s => s.library);
  const pending = useLibraryStore(s => s.pending);
  const moved = pendingChannel(pending, production.slug);
  const channel = moved !== undefined ? (moved ? library.channel[moved] : null) : production.channel ? library.channel[production.channel] : null;
  return (
    <button type="button" data-card={`production:${production.slug}`} onClick={() => select({ kind: 'production', id: production.slug })} className={cardClass(selected)}>
      <div className="relative w-full">
        <Thumb image={productionThumb(library, production)} seed={production.slug} title={production.title} className="aspect-video rounded-xl border border-black/5" />
        <span className="absolute left-2 top-2">
          <Chip tone={production.status === 'uploaded' ? 'good' : production.status === 'delivered' ? 'accent' : 'dark'}>{production.status}</Chip>
        </span>
      </div>
      <div className="w-full min-w-0 px-1 pb-1">
        <div className={cn('truncate font-medium leading-tight', TITLE_SIZE[size])}>{production.title}</div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {[channel?.name, production.artist !== channel?.name ? production.artist : null].filter(Boolean).join(' · ') || <span className="font-mono">{production.slug}</span>}
          {moved !== undefined && <span className="text-sky-600"> (moving)</span>}
        </div>
        {size !== 'sm' && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip>
              <FilmIcon /> {plural(production.uses, 'item')}
            </Chip>
            <Chip>
              <PlayIcon /> {plural(production.skills.length, 'skill')}
            </Chip>
            {production.deliveries.length > 0 && <Chip tone="outline">{plural(production.deliveries.length, 'delivery', 'deliveries')}</Chip>}
            {production.updatedAt && <span className="self-center text-[11px] text-muted-foreground">{ago(production.updatedAt)}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

export function ChannelCard({ channel, onOpen }: { channel: Channel; onOpen: () => void }) {
  const library = useLibraryStore(s => s.library);
  const productions = channel.productions.map(slug => library.production[slug]).filter(Boolean);
  const count = (status: string) => productions.filter(p => p.status === status).length;
  const recent = [...productions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  return (
    <button type="button" onClick={onOpen} className="group flex min-w-0 flex-col gap-3 rounded-3xl border bg-card p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center gap-3">
        <Thumb image={channel.logo} seed={channel.id} title={channel.name} compact fit="contain" className="size-14 shrink-0 rounded-2xl border bg-neutral-950" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-tight">{channel.name}</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">Downloads/{channel.folder}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Chip>{plural(productions.length, 'production')}</Chip>
        {count('active') > 0 && <Chip tone="outline">{count('active')} active</Chip>}
        {count('delivered') > 0 && <Chip tone="accent">{count('delivered')} delivered</Chip>}
        {count('uploaded') > 0 && <Chip tone="good">{count('uploaded')} uploaded</Chip>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {recent.map(p => (
          <Thumb key={p.slug} image={productionThumb(library, p)} seed={p.slug} title={p.title} compact className="aspect-video rounded-lg border border-black/5" />
        ))}
        {!recent.length && <span className="col-span-3 py-3 text-xs text-muted-foreground">No productions yet</span>}
      </div>
    </button>
  );
}

const KIND_ICON: Record<string, React.ReactNode> = { music: <MusicIcon />, sfx: <MusicIcon />, footage: <FilmIcon />, overlays: <FilmIcon /> };

export function MediaCard({ item, size = 'md' }: { item: MediaItem; size?: 'sm' | 'md' | 'lg' }) {
  const selected = useLibraryStore(s => s.selected?.kind === 'item' && s.selected.id === item.id);
  const select = useLibraryStore(s => s.select);
  const pending = useLibraryStore(s => s.pending);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const el = useRef<HTMLButtonElement>(null);
  const waiting = pendingRating(pending, item.id);
  const rating = waiting !== undefined ? waiting : ratingOf(item);
  const sorted = pendingSort(pending, item.id);
  const q = qualityOf(item);
  const len = duration(item.duration);
  return (
    <button
      ref={el}
      type="button"
      data-card={`item:${item.id}`}
      onClick={() => {
        if (timer.current) clearTimeout(timer.current);
        hideHover();
        select({ kind: 'item', id: item.id });
      }}
      onMouseEnter={() => {
        timer.current = setTimeout(() => el.current && showHover(item.id, el.current.getBoundingClientRect()), 350);
      }}
      onMouseLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        hideHover();
      }}
      className={cn(cardClass(selected), (item.status === 'missing' || sorted) && 'opacity-60')}
    >
      <div className="relative w-full">
        <Thumb image={item.thumb} seed={item.subject ?? item.kind} title={item.title} label={item.kind} className="aspect-video rounded-xl border border-black/5" />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {item.status === 'remote' && (
            <Chip tone="accent" title={`A teammate’s, shared through the ${item.remote?.channel ?? ''} channel${item.remote?.file ? '' : ' (details only)'}`}>
              <CloudIcon /> team
            </Chip>
          )}
          {item.status !== 'online' && item.status !== 'remote' && (
            <Chip tone="warn" title={item.status === 'cold' ? 'On an external disk that isn’t plugged in' : 'Not found where the catalog has it'}>
              {item.status === 'cold' ? <HardDriveIcon /> : <AlertTriangleIcon />} {item.status}
            </Chip>
          )}
          {!!item.dupes?.length && (
            <Chip tone="dark" title={`${plural(item.dupes.length, 'other copy', 'other copies')}`}>
              <CopyIcon /> {item.dupes.length + 1}×
            </Chip>
          )}
          {sorted && <Chip tone="pending">sorted as {sorted.kind}</Chip>}
        </div>
        {(len || q) && (
          <span className="absolute bottom-2 right-2">
            <Chip tone="dark">
              {KIND_ICON[item.kind]}
              {[q !== 'Audio' ? q : null, len].filter(Boolean).join(' · ')}
            </Chip>
          </span>
        )}
      </div>
      <div className="w-full min-w-0 px-1 pb-1">
        <div className={cn('truncate font-medium leading-tight', TITLE_SIZE[size])}>{item.title}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{item.subject ?? item.kind}</span>
          {(rating !== null || waiting !== undefined) && <Stars value={rating} pending={waiting !== undefined} />}
        </div>
        {size !== 'sm' && item.uses.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <FolderKanbanIcon className="size-3" /> used in {plural(item.uses.length, 'production')}
          </div>
        )}
      </div>
    </button>
  );
}

/** A one-line row with a small thumbnail, for lists in the detail panel. */
export function MiniRow({ image, seed, title, subtitle, badge, onClick, active }: { image?: string | null; seed: string; title: string; subtitle?: React.ReactNode; badge?: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full min-w-0 items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-muted', active && 'bg-muted')}>
      <Thumb image={image} seed={seed} title={title} compact className="aspect-video w-16 shrink-0 rounded-lg border border-black/5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        {subtitle && <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
      </span>
      {badge}
    </button>
  );
}
