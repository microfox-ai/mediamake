import Link from 'next/link';
import { ArrowUpRight, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CatalogEntry } from '@/lib/catalog/types';

const kindLabel: Record<CatalogEntry['kind'], string> = {
  mcp: 'MCP',
  skill: 'Skill',
  app: 'App',
  tutorial: 'Tutorial',
};

const statusLabel: Record<CatalogEntry['status'], string> = {
  live: 'Live',
  beta: 'Beta',
  'coming-soon': 'Coming soon',
};

export function CatalogCard({ card }: { card: CatalogEntry }) {
  const locked = card.access === 'locked';
  // Locked cards lead to the request-access / redeem-invite page.
  const href = locked ? `/access?item=${encodeURIComponent(card.id)}` : card.href;

  const body = (
    <div
      className={cn(
        'group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-colors',
        locked ? 'border-dashed' : href && 'hover:border-foreground/30 hover:bg-muted/40',
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline">{kindLabel[card.kind]}</Badge>
        <Badge variant="secondary">{statusLabel[card.status]}</Badge>
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
        {locked && <p className="text-xs font-medium text-foreground/80">Request access</p>}
      </div>

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
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
