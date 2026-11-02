import type { ReleaseTier } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';
import { TIER_META } from './model';

/** The tier as a small coloured pill: In development, Community, Public, Vault. */
export function TierPill({ tier, className }: { tier: ReleaseTier; className?: string }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', TIER_META[tier].soft, className)}>
      <span className={cn('size-1.5 rounded-full', TIER_META[tier].dot)} />
      {TIER_META[tier].label}
    </span>
  );
}

/** A titled card, as the release pages lay out their sections. */
export function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border bg-card', className)}>
      <header className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** A small uppercase label over a group of rows. */
export function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{children}</p>;
}
