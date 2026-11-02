'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AppWindow,
  Archive,
  ArchiveRestore,
  BookOpen,
  CalendarClock,
  CalendarX,
  Hammer,
  MoreHorizontal,
  Plug,
  Rocket,
  Sparkles,
  Undo2,
  Users,
  Wand2,
} from 'lucide-react';
import { isAlwaysPublic, type CatalogItemRecord, type CatalogKind, type ReleaseTier } from '@/lib/catalog/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MadeByLine } from '@/components/catalog/uses';
import type { ItemAction } from './releases-dashboard';
import { TIER_META, formatDate, formatLeft, gateOf, grantsFor, itemPath, tierOf, type AdminCatalog } from './model';

export const KIND_ICON: Record<CatalogKind, React.ComponentType<{ className?: string }>> = {
  skill: Wand2,
  mcp: Plug,
  app: AppWindow,
  tutorial: BookOpen,
};

export function ReleaseBoard({
  data,
  items,
  tiers,
  now,
  onAction,
  collapseSkills,
  onShowSkills,
}: {
  data: AdminCatalog;
  items: CatalogItemRecord[];
  tiers: ReleaseTier[];
  now: number;
  onAction: (item: CatalogItemRecord, action: ItemAction) => void;
  /** Show the skills as one card, so the repo's skills don't bury the apps and MCPs. */
  collapseSkills?: boolean;
  onShowSkills?: () => void;
}) {
  return (
    <div className={cn('grid gap-4', tiers.length > 1 ? 'md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1')}>
      {tiers.map(tier => {
        const all = items.filter(item => tierOf(item, now) === tier);
        const skills = collapseSkills ? all.filter(item => item.kind === 'skill') : [];
        const column = skills.length ? all.filter(item => item.kind !== 'skill') : all;
        return (
          <section key={tier} className="flex min-h-48 flex-col gap-3 rounded-2xl bg-muted/40 p-3">
            <header className="flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={cn('size-2 rounded-full', TIER_META[tier].dot)} />
                {TIER_META[tier].label}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{all.length}</span>
            </header>
            <div className={cn('flex flex-col gap-3', tiers.length === 1 && 'sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
              {skills.length > 0 && <SkillsCard count={skills.length} onShow={onShowSkills} />}
              {column.map(item => (
                <ItemCard key={item.id} data={data} item={item} now={now} onAction={onAction} inCode={data.cards.some(card => card.id === item.id)} />
              ))}
              {!all.length && (
                <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Nothing here</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** The skills in a column, as one card: they are always public, so there is nothing to move. */
function SkillsCard({ count, onShow }: { count: number; onShow?: () => void }) {
  return (
    <button type="button" onClick={onShow} className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition hover:shadow-sm">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TIER_META.public.soft)}>
        <Wand2 className="size-5 opacity-70" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{count} skills</span>
        <span className="block text-xs text-muted-foreground">Always public, from the repo&apos;s skills.json. Show them</span>
      </span>
    </button>
  );
}

export function ItemCard({
  data,
  item,
  now,
  onAction,
  inCode = false,
}: {
  data: AdminCatalog;
  item: CatalogItemRecord;
  now: number;
  onAction: (item: CatalogItemRecord, action: ItemAction) => void;
  /** A card defined in lib/catalog/items.ts: shown, but it moves only by editing that file. */
  inCode?: boolean;
}) {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const tier = tierOf(item, now);
  const gate = gateOf(item, now);
  const grants = grantsFor(data, item).length;
  const Icon = KIND_ICON[item.kind];

  return (
    <article className="group overflow-hidden rounded-xl border bg-card shadow-xs transition hover:shadow-sm">
      <Link href={itemPath(item.id)} className="block w-full">
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-muted">
          {item.cover && !coverFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover}
              alt=""
              onError={() => setCoverFailed(true)}
              className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className={cn('flex size-full items-center justify-center', TIER_META[tier].soft)}>
              <Icon className="size-7 opacity-70" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur">
            {item.kind}
          </span>
        </div>
      </Link>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              <Link href={itemPath(item.id)} className="hover:underline">
                {item.title}
              </Link>
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {item.id}
              {item.version ? ` · v${item.version}` : ''}
            </p>
            {item.madeBy && <MadeByLine madeBy={item.madeBy} link={false} className="truncate" />}
          </div>
          {inCode ? (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title="Defined in lib/catalog/items.ts: edit that file to change it">
              in code
            </span>
          ) : (
            <ItemMenu item={item} tier={tier} gated={!!gate} onAction={onAction} onRelease={() => setConfirmRelease(true)} />
          )}
        </div>

        {gate && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(gate.progress * 100)}%` }} />
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              Public in {formatLeft(gate.msLeft)} · {formatDate(gate.end)}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {grants} grant{grants === 1 ? '' : 's'}
          </span>
          {item.status !== 'live' && <span className="capitalize">{item.status.replace('-', ' ')}</span>}
          {item.listed === false && <span>Unlisted</span>}
          {item.archivedAt && <span title="Left off the homepage; still installs by its link">Archived</span>}
          {item.install?.uses?.length ? <span title={item.install.uses.map(u => `${u.id} (${u.need})`).join('\n')}>Uses {item.install.uses.length}</span> : null}
        </div>
      </div>

      <AlertDialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release {item.title} now?</AlertDialogTitle>
            <AlertDialogDescription>
              It skips {gate ? 'the rest of its gate' : 'the community gate'} and becomes public
              {data.publicReleasesOpen ? ' to everyone right away.' : ' (it opens to everyone once public releases are unlocked site-wide).'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onAction(item, { type: 'set_visibility', visibility: 'public' })}>Release now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function ItemMenu({
  item,
  tier,
  gated,
  onAction,
  onRelease,
}: {
  item: CatalogItemRecord;
  tier: ReleaseTier;
  gated: boolean;
  onAction: (item: CatalogItemRecord, action: ItemAction) => void;
  onRelease: () => void;
}) {
  const act = (action: ItemAction) => () => onAction(item, action);
  // Skills and items made by others are always public: no stages, gate or vault to move them through.
  const alwaysPublic = isAlwaysPublic(item);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="-mr-1 size-7 shrink-0" aria-label={`Actions for ${item.title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tier === 'vault' && (
          <DropdownMenuItem onClick={act({ type: 'set_never_publish', neverPublish: false })}>
            <ArchiveRestore /> Take out of the vault
          </DropdownMenuItem>
        )}
        {tier === 'development' && (
          <>
            <DropdownMenuItem onClick={act({ type: 'schedule' })}>
              <CalendarClock /> Mark ready and start gate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={act({ type: 'set_visibility', visibility: 'network' })}>
              <Sparkles /> Mark ready, no gate
            </DropdownMenuItem>
          </>
        )}
        {tier === 'community' && (
          <>
            <DropdownMenuItem onClick={act({ type: 'schedule' })}>
              <CalendarClock /> {gated ? 'Change gate' : 'Start gate'}
            </DropdownMenuItem>
            {gated && (
              <DropdownMenuItem onClick={act({ type: 'cancel_release' })}>
                <CalendarX /> Cancel gate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onRelease}>
              <Rocket /> Release now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={act({ type: 'set_visibility', visibility: 'private' })}>
              <Hammer /> Back to development
            </DropdownMenuItem>
          </>
        )}
        {alwaysPublic && (
          <DropdownMenuItem disabled>
            <Rocket /> Always public ({item.madeBy ? `made by ${item.madeBy.name}` : 'skill'})
          </DropdownMenuItem>
        )}
        {tier === 'public' && !alwaysPublic && (
          <DropdownMenuItem onClick={act({ type: 'set_visibility', visibility: 'network' })}>
            <Undo2 /> Pull back to community
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={act({ type: 'access' })}>
          <Users /> Who has access
        </DropdownMenuItem>
        {tier !== 'vault' && !alwaysPublic && (
          <DropdownMenuItem onClick={act({ type: 'set_never_publish', neverPublish: true })}>
            <Archive /> Move to the vault
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
