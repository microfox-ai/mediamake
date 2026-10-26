'use client';

import { useState } from 'react';
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
import type { CatalogItemRecord, CatalogKind, ReleaseTier } from '@/lib/catalog/types';
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
import type { ItemAction } from './releases-dashboard';
import { TIER_META, formatDate, formatLeft, gateOf, grantsFor, tierOf, type AdminCatalog } from './model';

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
}: {
  data: AdminCatalog;
  items: CatalogItemRecord[];
  tiers: ReleaseTier[];
  now: number;
  onAction: (item: CatalogItemRecord, action: ItemAction) => void;
}) {
  return (
    <div className={cn('grid gap-4', tiers.length > 1 ? 'md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1')}>
      {tiers.map(tier => {
        const column = items.filter(item => tierOf(item, now) === tier);
        return (
          <section key={tier} className="flex min-h-48 flex-col gap-3 rounded-2xl bg-muted/40 p-3">
            <header className="flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={cn('size-2 rounded-full', TIER_META[tier].dot)} />
                {TIER_META[tier].label}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{column.length}</span>
            </header>
            <div className={cn('flex flex-col gap-3', tiers.length === 1 && 'sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
              {column.map(item => (
                <ItemCard key={item.id} data={data} item={item} now={now} onAction={onAction} />
              ))}
              {!column.length && (
                <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Nothing here</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ItemCard({
  data,
  item,
  now,
  onAction,
}: {
  data: AdminCatalog;
  item: CatalogItemRecord;
  now: number;
  onAction: (item: CatalogItemRecord, action: ItemAction) => void;
}) {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const tier = tierOf(item, now);
  const gate = gateOf(item, now);
  const grants = grantsFor(data, item).length;
  const Icon = KIND_ICON[item.kind];

  return (
    <article className="group overflow-hidden rounded-xl border bg-card shadow-xs transition hover:shadow-sm">
      <button type="button" className="block w-full text-left" onClick={() => onAction(item, { type: 'access' })}>
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
      </button>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              <button type="button" className="hover:underline" onClick={() => onAction(item, { type: 'access' })}>
                {item.title}
              </button>
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {item.id}
              {item.version ? ` · v${item.version}` : ''}
            </p>
          </div>
          <ItemMenu item={item} tier={tier} gated={!!gate} onAction={onAction} onRelease={() => setConfirmRelease(true)} />
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
        {tier === 'public' && (
          <DropdownMenuItem onClick={act({ type: 'set_visibility', visibility: 'network' })}>
            <Undo2 /> Pull back to community
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={act({ type: 'access' })}>
          <Users /> Who has access
        </DropdownMenuItem>
        {tier !== 'vault' && (
          <DropdownMenuItem onClick={act({ type: 'set_never_publish', neverPublish: true })}>
            <Archive /> Move to the vault
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
