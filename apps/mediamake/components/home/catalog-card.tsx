'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Lock, RefreshCw, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CatalogEntry } from '@/lib/catalog/types';
import { itemPagePath } from '@/lib/catalog/paths';
import { tierLabel } from '@/lib/memberships/tiers';
import { watchPath } from '@/lib/catalog/video';
import { MadeByLine, UsesLine } from '@/components/catalog/uses';
import { HealthBadge } from '@/components/catalog/health';
import { OldBadge, RunsBadges } from '@/components/catalog/runs';
import { slugOf } from '@/lib/catalog/types';
import { VideoThumb } from '@/components/catalog/video';

const kindLabel: Record<CatalogEntry['kind'], string> = {
  mcp: 'MCP',
  skill: 'Skill',
  app: 'App',
  tutorial: 'Tutorial',
  course: 'Course',
};

const statusLabel: Record<CatalogEntry['status'], string> = {
  live: 'Live',
  beta: 'Beta',
  'coming-soon': 'Coming soon',
};

export function CatalogCard({ card }: { card: CatalogEntry }) {
  const locked = card.access === 'locked';
  // A skill, an MCP or an app leads to its own page (which plays its intro video and opens or
  // installs it, or says which membership opens it); a tutorial or course to where it plays,
  // and a locked one to Subscription, where a membership is asked for.
  const item = card.kind === 'skill' || card.kind === 'mcp' || card.kind === 'app';
  const href = item
    ? itemPagePath(card.id)
    : locked
      ? '/app/subscription'
      : card.kind === 'course' || card.video
        ? watchPath(card.id)
        : card.href;
  // a skill always shows a picture on top: its thumbnail, else its title on its own colour
  // its listing's headshot, else its video's thumbnail
  const headshot = card.headshot ?? card.video?.thumbnail;
  const showThumb = !!headshot || card.kind === 'skill';

  const body = (
    <div
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors',
        locked ? 'border-dashed' : href && 'hover:border-foreground/30 hover:bg-muted/40',
      )}
    >
      {showThumb && (
        <VideoThumb
          id={card.id}
          title={card.video?.title || card.title}
          src={headshot}
          className={cn('border-b', locked && 'opacity-60')}
        />
      )}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{kindLabel[card.kind]}</Badge>
          <RunsBadges runs={card.runs} />
          {card.alternativeTo ? <OldBadge to={slugOf(card.alternativeTo)} /> : <Badge variant="secondary">{statusLabel[card.status]}</Badge>}
          <HealthBadge health={card.health} note={card.healthNote} />
          {!locked && card.version && (
            <span className="font-mono text-xs text-muted-foreground" title="Latest release">
              v{card.version}
            </span>
          )}
          {card.access !== 'open' && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              {locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              {locked ? (card.tier && card.tier !== 'public' ? `${tierLabel(card.tier)} members` : 'Members only') : 'You have access'}
            </span>
          )}
        </div>

        <div className={cn('flex flex-col gap-1.5', locked && 'opacity-60')}>
          <h3 className="flex items-center gap-1 font-semibold">
            {card.title}
            {!locked && href && (
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{card.summary}</p>
          {/* the card is a link itself: no link inside */}
          {card.madeBy && <MadeByLine madeBy={card.madeBy} link={false} />}
          {!locked && card.uses && card.uses.length > 0 && <UsesLine uses={card.uses} />}
          {locked && <p className="text-xs font-medium text-foreground/80">How to get it</p>}
        </div>

        {!locked && card.installPrompt && (
          <div className="flex flex-wrap gap-2">
            <CopyInstallPrompt prompt={card.installPrompt} fallbackHref={href ?? itemPagePath(card.id)} />
            {card.updatePrompt && <CopyUpdatePrompt prompt={card.updatePrompt} />}
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className={cn('mt-auto flex flex-wrap gap-1.5', locked && 'opacity-60')}>
            {card.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}

/**
 * Copies the one-line prompt that has Claude bring an installed MCP up to date.
 * It needs nothing pasted with it: the sign-in or the update token the install left covers it.
 */
function CopyUpdatePrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-fit"
      title={prompt}
      onClick={async (e) => {
        // The card itself is a link to the item's page.
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(prompt);
        } catch {
          // No clipboard access: show it to copy by hand.
          window.prompt('Copy this update prompt and paste it into Claude:', prompt);
          return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-4" /> : <RefreshCw className="size-4" />}
      {copied ? 'Copied' : 'Copy update prompt'}
    </Button>
  );
}

/** Copies the one-line Claude install prompt without leaving the homepage. */
function CopyInstallPrompt({ prompt, fallbackHref }: { prompt: string; fallbackHref: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      className="w-fit"
      title={prompt}
      onClick={async (e) => {
        // The card itself is a link to the item's page.
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(prompt);
        } catch {
          // No clipboard access: the item's page shows the prompt to copy by hand.
          window.location.assign(fallbackHref);
          return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : 'Copy install prompt'}
    </Button>
  );
}
