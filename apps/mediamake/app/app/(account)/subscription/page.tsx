import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { MemberTierPill } from '@/components/memberships/parts';
import { AskAdmin } from '@/components/subscription/ask-admin';
import { getEntitlements } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { listCatalog, type CatalogEntry } from '@/lib/catalog';
import { accessRequestsDB } from '@/lib/catalog/store';
import { CONTRIBUTION_MONTHS, currentMembership, isLive, type Membership } from '@/lib/memberships/membership';
import { daysLeft, endsSoon } from '@/lib/memberships/people';
import { nextTier, tierRequestId } from '@/lib/memberships/requests';
import { membershipsDB } from '@/lib/memberships/store';
import { FEATURE_TIERS, TIER_LADDER, tierLabel, tierOpens, type MemberTier, type TierFeature } from '@/lib/memberships/tiers';

export const metadata = { title: 'Subscription · MediaMake' };

/** What each feature outside the catalog is, as this page names it. */
const FEATURES: Record<TierFeature, { title: string; about: string; href?: string }> = {
  cloudProjects: { title: 'Spaces with files', about: 'Project spaces to share with a team, and productions, brand kits and song takes kept in the cloud', href: '/app/spaces' },
  lambdaRender: { title: 'Cloud renders', about: 'Renders on MediaMake\'s own machines' },
};

const SOURCE: Record<Membership['source'], string> = {
  signup: 'You got it when you signed up',
  admin: 'An admin gave it to you',
  contribution: 'You earned it by contributing',
  invite: 'You joined with an invite',
  migration: 'Carried over from the earlier tiers',
  paid: 'Paid',
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const KIND_WORDS: Record<string, [string, string]> = {
  skill: ['skill', 'skills'],
  mcp: ['MCP', 'MCPs'],
  app: ['app', 'apps'],
  tutorial: ['tutorial', 'tutorials'],
  course: ['course', 'courses'],
};

/** "42 skills, 5 MCPs and 6 apps". */
function countWords(items: CatalogEntry[]): string {
  const parts = Object.entries(KIND_WORDS)
    .map(([kind, [one, many]]) => {
      const count = items.filter(item => item.kind === kind).length;
      return count ? `${count} ${count === 1 ? one : many}` : null;
    })
    .filter((part): part is string => !!part);
  if (!parts.length) return 'nothing yet';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function featuresAt(tier: MemberTier) {
  return (Object.keys(FEATURE_TIERS) as TierFeature[]).filter(feature => FEATURE_TIERS[feature] === tier).map(feature => FEATURES[feature]);
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

/** One tier's items as small tags, the first dozen. */
function ItemTags({ items }: { items: CatalogEntry[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 12).map(item => (
        <span key={item.id} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
          {item.title}
        </span>
      ))}
      {items.length > 12 && <span className="px-1 py-0.5 text-xs text-muted-foreground">and {items.length - 12} more</span>}
    </div>
  );
}

/**
 * /app/subscription: the person's membership, how they got it, what it
 * opens, and how to reach the next one. There are no payments, so there is
 * no billing here: a membership comes from contributing or from an admin.
 */
export default async function SubscriptionPage() {
  const viewer = await getAppViewer();
  if (!viewer.clientId) return null; // the app's layout sends signed-out visitors to sign in
  const { clientId, tier, isAdmin } = viewer;

  const entitlements = await getEntitlements({ clientId });
  const [history, catalog, waiting] = await Promise.all([
    membershipsDB.historyFor(clientId).catch((): Membership[] => []),
    listCatalog({ clientId }, undefined, { entitlements, locked: 'show' }).catch((): CatalogEntry[] => []),
    accessRequestsDB.pendingFor(clientId).catch((): string[] => []),
  ]);
  const items = catalog.filter(item => !item.archivedAt);
  const current = isAdmin ? null : currentMembership(history);
  // a tier still held through an earlier group has no record of its own
  const carried = !isAdmin && tier !== 'public' && current?.tier !== tier;
  const next = isAdmin ? null : nextTier(tier);
  const left = daysLeft(current);

  // the ladder up to their own tier; Cohort and Admin are named only to those who hold them
  const held = TIER_LADDER.filter(rung => tierOpens(tier, rung.id) && (!rung.hidden || rung.id === tier));
  const opensAt = (rung: MemberTier) => items.filter(item => item.access !== 'locked' && (item.tier ?? 'public') === rung);
  const nextItems = next ? items.filter(item => item.access === 'locked' && item.tier === next) : [];

  return (
    <AppPage title="Subscription">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 lg:px-6">
        <Card label="Your membership">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-3xl font-semibold tracking-tight">{tierLabel(tier)}</p>
            <MemberTierPill tier={tier} />
          </div>
          <p className="text-sm">
            {isAdmin
              ? 'You are an admin: everything is open to you, the vault included.'
              : current && !carried
                ? `${SOURCE[current.source]} on ${day(current.grantedAt)}.`
                : carried
                  ? 'Carried over from the earlier tiers.'
                  : 'Every account starts here. Everything Public is open to you.'}
          </p>
          {current && !carried && (
            <p className="text-sm text-muted-foreground">
              {current.expiresAt
                ? `It lasts until ${day(current.expiresAt)}${current.source === 'contribution' ? `. A contribution lasts ${CONTRIBUTION_MONTHS} months, and contributing again renews it.` : '.'}`
                : current.permanent
                  ? 'It is permanent: it lasts until an admin removes it.'
                  : 'It has no end date: it lasts until an admin removes it.'}
            </p>
          )}
          {current?.ref && /^https:\/\/\S+$/.test(current.ref) && (
            <p className="text-sm text-muted-foreground">
              For{' '}
              <a href={current.ref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {current.ref.replace(/^https:\/\/(www\.)?/, '')}
              </a>
            </p>
          )}
          {endsSoon(current) && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              It ends in {left} day{left === 1 ? '' : 's'}. Contribute again to renew it, or you go back to Public.
            </p>
          )}
        </Card>

        <Card label="What it opens">
          <ul className="flex flex-col gap-4">
            {held.map(rung => {
              const open = opensAt(rung.id);
              const features = featuresAt(rung.id).filter(() => rung.id !== 'admin');
              return (
                <li key={rung.id} className="flex flex-col gap-1.5">
                  <p className="text-sm">
                    <span className="font-medium">{rung.id === 'admin' ? 'The vault' : rung.label}</span>
                    <span className="text-muted-foreground">: {countWords(open)}</span>
                  </p>
                  {features.map(feature => (
                    <p key={feature.title} className="text-sm text-muted-foreground">
                      {feature.href ? (
                        <Link href={feature.href} className="font-medium text-foreground underline underline-offset-4">
                          {feature.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{feature.title}</span>
                      )}
                      : {feature.about}
                    </p>
                  ))}
                  {rung.id !== 'public' && <ItemTags items={open} />}
                </li>
              );
            })}
          </ul>
          <p className="text-sm">
            <Link href="/app/explore" className="font-medium underline underline-offset-4">
              See everything in Explore
            </Link>
          </p>
        </Card>

        {!isAdmin && (
          <Card label="The next membership">
            {next ? (
              <>
                <p className="text-sm">
                  <span className="font-medium">{tierLabel(next)}</span> adds {nextItems.length ? countWords(nextItems) : 'what is released for it from here on'}
                  {featuresAt(next).length ? `, and ${featuresAt(next).map(feature => feature.title).join(' and ')}` : ''}.
                </p>
                {featuresAt(next).map(feature => (
                  <p key={feature.title} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{feature.title}</span>: {feature.about}
                  </p>
                ))}
                <ItemTags items={nextItems} />
                <div className="mt-2 grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Contribute</p>
                    <p className="text-sm text-muted-foreground">
                      Share a skill, MCP or app you made and used for real work. When it is accepted at {tierLabel(next)}, you are {tierLabel(next)} for{' '}
                      {CONTRIBUTION_MONTHS} months, and each new contribution renews it. We publish nothing we don&rsquo;t use, so it needs one finished
                      production made with it.
                    </p>
                    <a
                      href="https://github.com/microfox-ai/mediamake"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-fit text-sm font-medium underline underline-offset-4"
                    >
                      MediaMake on GitHub
                    </a>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Or ask an admin</p>
                    <p className="text-sm text-muted-foreground">An admin can give a membership directly. Say what you make and what you would use it for.</p>
                    <AskAdmin tier={tierLabel(next)} pending={waiting.includes(tierRequestId(next))} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm">You hold the highest membership there is to earn. Contributing keeps it going.</p>
            )}
          </Card>
        )}

        {history.length > 0 && (
          <Card label="History">
            <ul className="flex flex-col divide-y">
              {history.map(record => {
                const live = isLive(record);
                return (
                  <li key={record.membershipId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <MemberTierPill tier={record.tier} className={live ? undefined : 'opacity-60'} />
                      <span className="truncate text-sm">
                        {SOURCE[record.source].replace(/^You /, '').replace(/^(.)/, c => c.toUpperCase())}
                        {record.note ? ` · ${record.note}` : ''}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {day(record.grantedAt)}
                      {' to '}
                      {record.revokedAt ? day(record.revokedAt) : record.expiresAt ? day(record.expiresAt) : 'now'}
                      {live ? ' · live' : record.revokedAt ? ' · ended' : ' · ran out'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <p className="px-1 text-xs text-muted-foreground">
          There is nothing to pay and no billing: a membership comes from contributing or from an admin. You get a mail whenever yours changes.
        </p>
      </div>
    </AppPage>
  );
}
