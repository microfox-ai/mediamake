'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Link2, X } from 'lucide-react';
import type { CatalogItemRecord } from '@/lib/catalog/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PersonPicker } from './person-picker';
import {
  COMMUNITY_GROUP,
  PRIVATE_GROUP,
  TIER_META,
  adminCall,
  formatDate,
  gateOf,
  grantsFor,
  groupMembers,
  personName,
  tierOf,
  type AdminCatalog,
} from './model';

/** Who can open one item, and controls to grant, revoke and invite. */
export function ItemAccessSheet({
  data,
  item,
  onClose,
  run,
}: {
  data: AdminCatalog;
  item: CatalogItemRecord | null;
  onClose: () => void;
  run: (label: string, body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [days, setDays] = useState('');
  const [uses, setUses] = useState('5');
  const [invite, setInvite] = useState<string | null>(null);

  if (!item) return <Sheet open={false} />;

  const tier = tierOf(item);
  const gate = gateOf(item);
  const grants = grantsFor(data, item);
  const privateCount = groupMembers(data, PRIVATE_GROUP).length;
  const communityCount = groupMembers(data, COMMUNITY_GROUP).length;

  const reach = [
    { label: 'You (admin)', on: true },
    { label: `Private testers · ${privateCount}`, on: tier !== 'vault' },
    { label: `Community · ${communityCount}`, on: tier === 'community' || tier === 'public' },
    { label: data.publicReleasesOpen ? 'Everyone' : 'Everyone (locked site-wide)', on: tier === 'public' && data.publicReleasesOpen },
  ];

  const createInvite = async () => {
    try {
      const { invite: created } = await adminCall<{ invite: { code: string } }>({
        type: 'create_invite',
        itemIds: [item.id],
        maxUses: Number(uses) || 1,
        grantDays: Number(days) || undefined,
      });
      setInvite(`${window.location.origin}/access?code=${created.code}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={open => {
        if (!open) {
          setInvite(null);
          onClose();
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        {item.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover} alt="" onError={e => (e.currentTarget.style.display = 'none')} className="aspect-[2/1] w-full object-cover" />
        )}
        <SheetHeader className="gap-1 border-b p-5">
          <span className={cn('w-fit rounded-md px-2 py-0.5 text-xs font-medium', TIER_META[tier].soft)}>{TIER_META[tier].label}</span>
          <SheetTitle className="text-lg">{item.title}</SheetTitle>
          <SheetDescription>
            {item.id}
            {item.version ? ` · v${item.version}` : ''}
            {gate ? ` · public on ${formatDate(gate.end)}` : ''}
          </SheetDescription>
        </SheetHeader>

        <section className="flex flex-col gap-3 border-b p-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Who can open it</h4>
          <ul className="flex flex-col gap-2">
            {reach.map(r => (
              <li key={r.label} className={cn('flex items-center gap-2 text-sm', !r.on && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
                <span className={cn('size-1.5 rounded-full', r.on ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                {r.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3 border-b p-5">
          <div className="flex items-baseline justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Grants</h4>
            <span className="text-xs text-muted-foreground">{grants.length}</span>
          </div>
          {grants.length ? (
            <ul className="flex flex-col divide-y rounded-lg border">
              {grants.map(g => (
                <li key={g.grantId} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {g.subject.kind === 'group' ? `Group ${g.subject.id}` : personName(data.people, g.subject.id)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.itemId === item.id ? 'This item' : g.itemId === '*' ? 'Every item' : `Every ${item.kind}`}
                      {g.expiresAt ? ` · until ${formatDate(g.expiresAt)}` : ''}
                      {g.inviteCode ? ' · via invite' : ''}
                    </p>
                  </div>
                  {g.itemId === item.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Revoke"
                      onClick={() => run('Grant revoked', { type: 'revoke', grantId: g.grantId })}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No one has a grant yet.</p>
          )}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Give someone access{tier === 'vault' ? ' (vault items open only by grant)' : ''}</Label>
            <PersonPicker
              people={data.people}
              exclude={grants.filter(g => g.subject.kind === 'client').map(g => g.subject.id)}
              action="Grant"
              onPick={clientId =>
                run(`Granted to ${personName(data.people, clientId)}`, {
                  type: 'grant',
                  itemId: item.id,
                  clientId,
                  days: Number(days) || undefined,
                })
              }
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 p-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invite link</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-uses" className="text-xs">Uses</Label>
              <Input id="invite-uses" type="number" min={1} value={uses} onChange={e => setUses(e.target.value)} className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grant-days" className="text-xs">Access lasts (days)</Label>
              <Input id="grant-days" type="number" min={1} placeholder="No limit" value={days} onChange={e => setDays(e.target.value)} className="h-9" />
            </div>
          </div>
          {invite ? (
            <div className="flex gap-2">
              <Input readOnly value={invite} className="h-9 font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => navigator.clipboard.writeText(invite).then(() => toast.success('Invite link copied'))}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={createInvite}>
              <Link2 className="size-4" /> Create invite link
            </Button>
          )}
          <p className="text-xs text-muted-foreground">The access length also applies to grants made above.</p>
        </section>
      </SheetContent>
    </Sheet>
  );
}
