import { TIER_META } from '@/components/releases/model';
import { tierLabel, type MemberTier } from '@/lib/memberships/tiers';
import { cn } from '@/lib/utils';

/** A person's tier as a small coloured pill. (Releases' TierPill names an item's tier, where Admin is the vault.) */
export function MemberTierPill({ tier, className }: { tier: MemberTier; className?: string }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', TIER_META[tier].soft, className)}>
      <span className={cn('size-1.5 rounded-full', TIER_META[tier].dot)} />
      {tierLabel(tier)}
    </span>
  );
}

/** A bordered section with its title and a line under it. */
export function Section({
  title,
  about,
  action,
  children,
  className,
}: {
  title: string;
  about?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border bg-card', className)}>
      <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {about && <p className="mt-0.5 text-xs text-muted-foreground">{about}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}
