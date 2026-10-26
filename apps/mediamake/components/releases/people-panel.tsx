'use client';

import { Check, Crown, FlaskConical, Globe, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PersonPicker } from './person-picker';
import { COMMUNITY_GROUP, PRIVATE_GROUP, formatDate, personName, type AdminCatalog } from './model';

/**
 * The people side of the tiers: private testers and the community are
 * access groups; everyone else sees public items only. Pending access
 * requests and live invites sit alongside.
 */
export function PeoplePanel({
  data,
  privateMembers,
  communityMembers,
  run,
}: {
  data: AdminCatalog;
  privateMembers: string[];
  communityMembers: string[];
  run: (label: string, body: Record<string, unknown>) => Promise<boolean>;
}) {
  const invites = data.invites.filter(
    i => !i.disabledAt && i.uses < i.maxUses && (!i.expiresAt || i.expiresAt > new Date().toISOString()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TierCard
          icon={<Crown className="size-4" />}
          title="Admin"
          body="Only you. The one who releases."
          tone="bg-foreground text-background"
        />
        <GroupCard
          data={data}
          groupId={PRIVATE_GROUP}
          icon={<FlaskConical className="size-4" />}
          title="Private testers"
          body="Everything in development and ready, except the vault. Can't release."
          tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          members={privateMembers}
          run={run}
        />
        <GroupCard
          data={data}
          groupId={COMMUNITY_GROUP}
          icon={<Users className="size-4" />}
          title="Community"
          body="Production-ready items before they go public. Installs with an install code, no API key to paste."
          tone="bg-violet-500/10 text-violet-700 dark:text-violet-300"
          members={communityMembers}
          run={run}
        />
        <TierCard
          icon={<Globe className="size-4" />}
          title="Public"
          body={data.publicReleasesOpen ? 'Everyone else. Released items only.' : 'Everyone else. Nothing opens to them until public releases are unlocked.'}
          tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        />
      </div>

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
                      {i.groupId ? `Join ${i.groupId === COMMUNITY_GROUP ? 'community' : i.groupId}` : i.itemIds.map(id => data.items.find(x => x.id === id)?.title ?? id).join(', ')}
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

function GroupCard({
  data,
  groupId,
  icon,
  title,
  body,
  tone,
  members,
  run,
}: {
  data: AdminCatalog;
  groupId: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: string;
  members: string[];
  run: (label: string, body: Record<string, unknown>) => Promise<boolean>;
}) {
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
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {members.map(clientId => (
            <li key={clientId} className="group flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted">
              <span className="truncate">{personName(data.people, clientId)}</span>
              <button
                type="button"
                aria-label={`Remove ${clientId}`}
                className="text-muted-foreground opacity-0 transition group-hover:opacity-100"
                onClick={() => run(`Removed from ${title.toLowerCase()}`, { type: 'group_remove', groupId, clientIds: [clientId] })}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">
        <PersonPicker
          people={data.people}
          exclude={members}
          action="Add"
          onPick={clientId => run(`Added to ${title.toLowerCase()}`, { type: 'group_add', groupId, clientIds: [clientId], name: title })}
        />
      </div>
    </section>
  );
}
