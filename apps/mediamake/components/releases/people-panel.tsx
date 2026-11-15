'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Crown, FlaskConical, Globe, Infinity as InfinityIcon, Link2, Sparkles, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isAlwaysPublic, type CatalogItemRecord } from '@/lib/catalog/types';
import { describeMembership } from '@/lib/memberships/membership';
import { GRANTABLE_TIERS, tierLabel, tierOpens, type GrantableTier } from '@/lib/memberships/tiers';
import { siteUrl } from '@/lib/catalog/install-prompt';
import { cn } from '@/lib/utils';
import { PersonPicker } from './person-picker';
import { adminCall, formatDate, membersByTier, personMembership, personName, personTier, tierOf, type AdminCatalog } from './model';

type Run = (label: string, body: Record<string, unknown>) => Promise<boolean>;

/**
 * The people side of the ladder: who holds Cohort, Pro and Plus, and how
 * each got it (a membership record: an admin grant, a contribution, an
 * invite). Everyone else is Public. Pending access requests and live invites
 * sit alongside.
 */
export function PeoplePanel({ data, run }: { data: AdminCatalog; run: (label: string, body: Record<string, unknown>) => Promise<boolean> }) {
  const invites = data.invites.filter(
    i => !i.disabledAt && i.uses < i.maxUses && (!i.expiresAt || i.expiresAt > new Date().toISOString()),
  );
  const members = useMemo(() => membersByTier(data), [data]);

  // What each tier opens with no per-item grants: our gated items (repo skills and items made by others are open to all)
  const opens = useMemo(() => {
    const gated = [...data.items, ...data.cards].filter(item => !isAlwaysPublic(item) && !item.archivedAt);
    return Object.fromEntries(
      GRANTABLE_TIERS.map(tier => [tier, gated.filter(item => tierOf(item) !== 'admin' && tierOpens(tier, tierOf(item)))]),
    ) as Record<GrantableTier, CatalogItemRecord[]>;
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TierCard
          icon={<Crown className="size-4" />}
          title="Admin"
          body="Everything, the vault included. The one who releases."
          tone="bg-foreground text-background"
        />
        <GroupCard
          data={data}
          icon={<FlaskConical className="size-4" />}
          tier="cohort"
          body="Everything but the vault, with no per-item grants. Invisible to everyone below, and given by an admin only."
          tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          members={members.cohort}
          opens={opens.cohort}
          run={run}
        />
        <GroupCard
          data={data}
          icon={<Sparkles className="size-4" />}
          tier="pro"
          body="Pro items (Browse Hack, ProjectSync) and everything Plus opens. Earned by contributing a Pro item, or given by an admin."
          tone="bg-violet-500/10 text-violet-700 dark:text-violet-300"
          members={members.pro}
          opens={opens.pro}
          run={run}
        />
        <GroupCard
          data={data}
          icon={<Users className="size-4" />}
          tier="plus"
          body="Plus items and cloud projects. Earned by contributing, or given by an admin."
          tone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          members={members.plus}
          opens={opens.plus}
          run={run}
        />
        <TierCard
          icon={<Globe className="size-4" />}
          title="Public"
          body={data.publicReleasesOpen ? 'Everyone else. Public items only.' : 'Everyone else. Nothing but repo skills opens to them until public releases are unlocked.'}
          tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        />
      </div>

      <KeyHolders data={data} run={run} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card">
          <header className="border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Access requests</h3>
          </header>
          {data.requests.length ? (
            <ul className="divide-y">
              {data.requests.map(r => {
                const item = data.items.find(i => i.id === r.itemId);
                return (
                  <li key={r.requestId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        <span className="font-medium">{personName(data.people, r.clientId)}</span> wants {item?.title ?? r.itemId}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{r.message || formatDate(r.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" className="size-8" aria-label="Reject" onClick={() => run('Request rejected', { type: 'resolve_request', requestId: r.requestId, approve: false })}>
                        <X className="size-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="size-8" aria-label="Approve" onClick={() => run('Access granted', { type: 'resolve_request', requestId: r.requestId, approve: true })}>
                        <Check className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No pending requests.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-card">
          <header className="border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Live invites</h3>
          </header>
          {invites.length ? (
            <ul className="divide-y">
              {invites.map(i => (
                <li key={i.code} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {i.tier ? `Join ${tierLabel(i.tier)}` : i.groupId ? `Join ${i.groupId}` : i.itemIds.map(id => data.items.find(x => x.id === id)?.title ?? id).join(', ')}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.uses}/{i.maxUses} used{i.expiresAt ? ` · until ${formatDate(i.expiresAt)}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => run('Invite turned off', { type: 'disable_invite', code: i.code })}>
                    Turn off
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No live invites.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function TierCard({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <span className={cn('flex size-8 items-center justify-center rounded-lg', tone)}>{icon}</span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </section>
  );
}

/**
 * One membership tier. Adding and removing go through set_tier, so a person
 * holds one tier at a time: their earlier records end (kept as history) and
 * one new record says an admin gave it. A membership that ends by itself (a
 * contribution lasts 3 months) can be made permanent here.
 */
function GroupCard({
  data,
  tier,
  icon,
  body,
  tone,
  members,
  opens,
  run,
}: {
  data: AdminCatalog;
  tier: GrantableTier;
  icon: React.ReactNode;
  body: string;
  tone: string;
  members: string[];
  opens: CatalogItemRecord[];
  run: Run;
}) {
  const title = tierLabel(tier);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <span className={cn('flex size-8 items-center justify-center rounded-lg', tone)}>{icon}</span>
        <span className="text-2xl font-semibold tabular-nums">{members.length}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
      {members.length > 0 && (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {members.map(clientId => {
            const membership = personMembership(data, clientId);
            return (
              <li key={clientId} className="group flex items-start justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                <span className="min-w-0">
                  <span className="block truncate">{personName(data.people, clientId)}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">
                    {membership?.tier === tier ? describeMembership(membership) : 'From the earlier tiers: run the migration to give them a membership record'}
                    {membership?.note ? ` · ${membership.note}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1.5 pt-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {membership?.tier === tier && membership.expiresAt && (
                    <button
                      type="button"
                      aria-label={`Make ${clientId}'s membership permanent`}
                      title="Make it permanent: no expiry, until an admin removes it"
                      onClick={() => run('Membership made permanent', { type: 'membership_permanent', membershipId: membership.membershipId })}
                    >
                      <InfinityIcon className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${clientId}`}
                    title="Back to Public"
                    onClick={() => run(`Removed from ${title}`, { type: 'set_tier', clientId, tier: 'public' })}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {opens.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Opens now</p>
          <div className="flex flex-wrap gap-1">
            {opens.slice(0, 8).map(item => (
              <span key={item.id} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]" title={item.id}>
                {item.title}
              </span>
            ))}
            {opens.length > 8 && <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{opens.length - 8} more</span>}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <PersonPicker
          people={data.people}
          exclude={members}
          action="Add"
          onPick={clientId => run(`Added to ${title}`, { type: 'set_tier', clientId, tier })}
        />
        <TierInvite tier={tier} title={title} />
      </div>
    </section>
  );
}

/**
 * An invite link into the tier, for people without a MediaMake account yet:
 * they sign up, open it, and are in. Works for 10 people for 30 days.
 */
function TierInvite({ tier, title }: { tier: GrantableTier; title: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Invite link copied');
    } catch {
      toast.message('Copy the link from the box');
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const { invite } = await adminCall<{ invite: { code: string } }>({
        type: 'create_invite',
        tier,
        maxUses: 10,
        expiresInDays: 30,
        note: `Invite to ${title}`,
      });
      const url = `${siteUrl() ?? window.location.origin}/access?code=${invite.code}`;
      setLink(url);
      await copy(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!link) {
    return (
      <Button size="sm" variant="ghost" className="h-8 justify-start text-muted-foreground" disabled={busy} onClick={create}>
        <Link2 className="size-3.5" />
        Invite link for people without an account
      </Button>
    );
  }
  return (
    <div className="flex gap-1.5">
      <Input readOnly value={link} className="h-8 font-mono text-xs" onFocus={e => e.currentTarget.select()} />
      <Button size="icon" variant="outline" className="size-8 shrink-0" aria-label="Copy invite link" onClick={() => copy(link)}>
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

const TIER_OPTIONS = [{ value: 'public', label: 'Public' }, ...GRANTABLE_TIERS.map(tier => ({ value: tier, label: tierLabel(tier) }))] as const;

/**
 * Everyone with an API key and the tier you've given them. A key alone
 * grants nothing beyond public items; the tier decides what it opens.
 */
function KeyHolders({ data, run }: { data: AdminCatalog; run: (label: string, body: Record<string, unknown>) => Promise<boolean> }) {
  const [query, setQuery] = useState('');
  if (!data.people.length) return null;
  const q = query.trim().toLowerCase();
  const shown = q ? data.people.filter(p => p.name.toLowerCase().includes(q) || p.clientId.toLowerCase().includes(q)) : data.people;

  return (
    <section className="rounded-2xl border bg-card">
      <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">API key holders</h3>
          <p className="text-xs text-muted-foreground">
            A key only signs people in. What they can open, the MediaMake MCP included, depends on the tier you give them here.
          </p>
        </div>
        {data.people.length > 8 && (
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a person" className="h-8 sm:w-48" />
        )}
      </header>
      <ul className="divide-y">
        {shown.map(person => {
          const current = personTier(data, person.clientId);
          return (
            <li key={person.clientId} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.clientId} · {person.activeKeys} active key{person.activeKeys === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 rounded-lg border p-0.5">
                {TIER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.value === current}
                    onClick={() =>
                      run(`${person.name} is now ${option.label}`, {
                        type: 'set_tier',
                        clientId: person.clientId,
                        tier: option.value,
                      })
                    }
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs text-muted-foreground transition',
                      option.value === current && 'bg-muted font-medium text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
