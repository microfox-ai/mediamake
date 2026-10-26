'use client';

import { useState } from 'react';
import { FolderKanbanIcon, GitForkIcon, LayersIcon, StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Production, Skill, VariantKind } from '@/lib/skill-library/types';
import { Thumb } from './Thumb';
import { pinKey, useSkillLibraryStore } from './store';

export const KIND_LABEL: Record<VariantKind, string> = { production: 'From a production', style: 'Style', version: 'Version' };

export function Chip({ children, className, tone = 'muted' }: { children: React.ReactNode; className?: string; tone?: 'muted' | 'accent' | 'outline' | 'dark' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10.5px] font-medium [&>svg]:size-3',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'accent' && 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
        tone === 'outline' && 'border text-muted-foreground',
        tone === 'dark' && 'bg-black/65 text-white backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </span>
  );
}

function PinButton({ pinned, onToggle, className }: { pinned: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={pinned ? 'Unpin' : 'Pin'}
      aria-pressed={pinned}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'grid size-7 place-items-center rounded-full bg-white/85 text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white',
        pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        className,
      )}
    >
      <StarIcon className={cn('size-3.5', pinned && 'fill-amber-400 text-amber-500')} />
    </button>
  );
}

const TITLE_SIZE = { sm: 'text-[13px]', md: 'text-sm', lg: 'text-base' } as const;

export function SkillCard({ skill, stacked = 0, dim, size = 'md' }: { skill: Skill; stacked?: number; dim?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const selected = useSkillLibraryStore(s => s.selected?.kind === 'skill' && s.selected.id === skill.name);
  const pinned = useSkillLibraryStore(s => s.pins.includes(pinKey({ kind: 'skill', id: skill.name })));
  const select = useSkillLibraryStore(s => s.select);
  const togglePin = useSkillLibraryStore(s => s.togglePin);
  const productions = useSkillLibraryStore(s => s.library.productions);
  const [hover, setHover] = useState(false);
  const origin = skill.variant?.production ? productions[skill.variant.production] : null;

  return (
    <div
      role="button"
      tabIndex={0}
      data-card={`skill:${skill.name}`}
      onClick={() => select({ kind: 'skill', id: skill.name })}
      onKeyDown={e => e.key === 'Enter' && select({ kind: 'skill', id: skill.name })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn('group relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl p-1.5 outline-none transition', 'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring', selected && 'bg-muted/80 ring-1 ring-foreground/15', dim && 'opacity-45')}
    >
      <div className={cn('relative', stacked > 0 && 'mt-2')}>
        {stacked > 0 && (
          <>
            {stacked > 1 && <div className="absolute inset-x-5 -top-2 h-6 rounded-xl border bg-muted/80" aria-hidden />}
            <div className="absolute inset-x-2.5 -top-1 h-6 rounded-xl border bg-muted" aria-hidden />
          </>
        )}
        <Thumb
          image={skill.thumbnail}
          preview={skill.preview}
          playing={hover}
          seed={skill.family}
          title={skill.title}
          label={skill.variant ? undefined : skill.category}
          className="relative aspect-video rounded-xl border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-1">
          <span className="flex flex-wrap gap-1">
            {skill.variant && (
              <Chip tone="dark">
                <GitForkIcon /> {skill.variant.kind === 'version' ? skill.variant.ref : KIND_LABEL[skill.variant.kind]}
              </Chip>
            )}
          </span>
          <span className="pointer-events-auto">
            <PinButton pinned={pinned} onToggle={() => togglePin(pinKey({ kind: 'skill', id: skill.name }))} />
          </span>
        </div>
        {stacked > 0 && (
          <span className="absolute bottom-2 right-2">
            <Chip tone="dark">
              <LayersIcon /> {stacked} variant{stacked === 1 ? '' : 's'}
            </Chip>
          </span>
        )}
      </div>
      <div className="min-w-0 px-1 pb-1">
        <div className={cn('truncate font-medium leading-tight', TITLE_SIZE[size])}>{skill.variant ? skill.variant.label : skill.title}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{skill.name}</div>
        {size !== 'sm' && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{skill.summary}</p>}
        {size !== 'sm' && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip>{skill.category}</Chip>
            {skill.location === 'local' && <Chip tone="outline">local</Chip>}
            {skill.owner && <Chip tone="outline">{skill.owner}</Chip>}
            {origin && (
              <Chip tone="accent">
                <FolderKanbanIcon /> {origin.title}
              </Chip>
            )}
            {!origin && skill.productions.length > 0 && (
              <Chip>
                <FolderKanbanIcon /> {skill.productions.length}
              </Chip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductionCard({ production, size = 'md' }: { production: Production; size?: 'sm' | 'md' | 'lg' }) {
  const selected = useSkillLibraryStore(s => s.selected?.kind === 'production' && s.selected.id === production.slug);
  const pinned = useSkillLibraryStore(s => s.pins.includes(pinKey({ kind: 'production', id: production.slug })));
  const select = useSkillLibraryStore(s => s.select);
  const togglePin = useSkillLibraryStore(s => s.togglePin);
  const skills = useSkillLibraryStore(s => s.library.skills);
  const used = production.skills.filter(n => skills[n]);

  return (
    <div
      role="button"
      tabIndex={0}
      data-card={`production:${production.slug}`}
      onClick={() => select({ kind: 'production', id: production.slug })}
      onKeyDown={e => e.key === 'Enter' && select({ kind: 'production', id: production.slug })}
      className={cn('group relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl p-1.5 outline-none transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring', selected && 'bg-muted/80 ring-1 ring-foreground/15')}
    >
      <div className="relative">
        <Thumb image={production.thumbnail} seed={production.slug} title={production.title} label="production" className="aspect-video rounded-xl border border-black/5" />
        <span className="absolute right-2 top-2">
          <PinButton pinned={pinned} onToggle={() => togglePin(pinKey({ kind: 'production', id: production.slug }))} />
        </span>
        {production.bornVariants.length > 0 && (
          <span className="absolute bottom-2 left-2">
            <Chip tone="dark">
              <GitForkIcon /> {production.bornVariants.length} variant{production.bornVariants.length === 1 ? '' : 's'} made here
            </Chip>
          </span>
        )}
      </div>
      <div className="min-w-0 px-1 pb-1">
        <div className={cn('truncate font-medium leading-tight', TITLE_SIZE[size])}>{production.title}</div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {production.artist ? `${production.artist} · ` : ''}
          <span className="font-mono">{production.slug}</span>
        </div>
        {size !== 'sm' && (
          <div className="mt-2 flex flex-wrap gap-1">
            {used.slice(0, 3).map(n => (
              <Chip key={n} tone={skills[n].variant ? 'accent' : 'muted'}>
                {skills[n].variant ? skills[n].variant!.label : skills[n].title}
              </Chip>
            ))}
            {used.length > 3 && <Chip tone="outline">+{used.length - 3}</Chip>}
            {!used.length && <span className="text-[11px] text-muted-foreground">No skills linked yet</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** A one-line row with a small thumbnail, for lists in the detail panel. */
export function MiniRow({
  image,
  seed,
  title,
  subtitle,
  badge,
  onClick,
  active,
}: {
  image: Skill['thumbnail'];
  seed: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full min-w-0 items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-muted', active && 'bg-muted')}>
      <Thumb image={image} seed={seed} title={title} compact className="aspect-video w-16 shrink-0 rounded-lg border border-black/5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        {subtitle && <span className="block truncate font-mono text-[11px] text-muted-foreground">{subtitle}</span>}
      </span>
      {badge}
    </button>
  );
}
