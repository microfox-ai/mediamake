'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyInstallPrompt } from '@/lib/catalog/copy-install-prompt';
import type { CatalogEntry } from '@/lib/catalog/types';
import { itemPagePath } from '@/lib/catalog/paths';
import { watchPath } from '@/lib/catalog/video';
import { MadeByLine, UsesLine } from '@/components/catalog/uses';
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
  // Locked cards lead to the request-access / redeem-invite page; a skill, an
  // MCP or an app to its own page (which plays its intro video and opens or
  // installs it); a tutorial or course to where it plays; and anything else
  // installable to its install page.
  const accessHref = `/access?item=${encodeURIComponent(card.id)}`;
  const href = locked
    ? accessHref
    : card.kind === 'skill' || card.kind === 'mcp' || card.kind === 'app'
      ? itemPagePath(card.id)
      : card.kind === 'course' || card.video
        ? watchPath(card.id)
        : (card.href ?? (card.installPrompt ? accessHref : undefined));
  // a skill always shows a picture on top: its thumbnail, else its title on its own colour
  const showThumb = !!card.video?.thumbnail || card.kind === 'skill';

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
          src={card.video?.thumbnail}
          className={cn('border-b', locked && 'opacity-60')}
        />
      )}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{kindLabel[card.kind]}</Badge>
          <Badge variant="secondary">{statusLabel[card.status]}</Badge>
          {!locked && card.version && (
            <span className="font-mono text-xs text-muted-foreground" title="Latest release">
              v{card.version}
            </span>
          )}
          {card.access !== 'open' && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              {locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              {locked ? 'Invite only' : 'You have access'}
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
          {locked && <p className="text-xs font-medium text-foreground/80">Request access</p>}
        </div>

        {!locked && card.installPrompt && <CopyInstallPrompt itemId={card.id} prompt={card.installPrompt} fallbackHref={accessHref} />}

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

/** Copies the one-line Claude install prompt without leaving the homepage. */
function CopyInstallPrompt({ itemId, prompt, fallbackHref }: { itemId: string; prompt: string; fallbackHref: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      className="w-fit"
      title={prompt}
      onClick={async (e) => {
        // The card itself is a link to the install page.
        e.preventDefault();
        e.stopPropagation();
        try {
          await copyInstallPrompt(itemId, prompt);
        } catch {
          // No clipboard access: the install page shows the prompt to copy by hand.
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
