'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CONTRIBUTION_MONTHS } from '@/lib/memberships/membership';
import type { PersonRow } from '@/lib/memberships/people';
import { GRANTABLE_TIERS, tierLabel, type GrantableTier } from '@/lib/memberships/tiers';
import { cn } from '@/lib/utils';
import { formatDay, howGot, lastsWords, type Mailed } from './model';
import { MemberTierPill } from './parts';

type Tier = GrantableTier | 'public';
type Lasts = 'default' | 'days' | 'permanent';

const TIERS: Tier[] = ['public', ...GRANTABLE_TIERS];

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="flex w-fit flex-wrap rounded-lg border p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition',
            option.value === value && 'bg-muted font-medium text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Change one person's membership. The reason is required: it is kept on the
 * record, shown in the audit log, and goes in the mail the person gets.
 */
export function ChangeDialog({
  person,
  mail,
  onClose,
  onSave,
}: {
  person: PersonRow | null;
  /** Whether mail can be sent at all. */
  mail: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<{ mailed?: Mailed } | null>;
}) {
  const [tier, setTier] = useState<Tier>('public');
  const [source, setSource] = useState<'admin' | 'contribution'>('admin');
  const [ref, setRef] = useState('');
  const [lasts, setLasts] = useState<Lasts>('default');
  const [days, setDays] = useState('90');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  // a fresh form for each person
  useEffect(() => {
    if (!person) return;
    setTier(person.tier === 'admin' ? 'public' : person.tier);
    setSource('admin');
    setRef('');
    setLasts('default');
    setDays('90');
    setReason('');
    setNotify(true);
  }, [person]);

  if (!person) return null;
  const current: Tier = person.tier === 'admin' ? 'public' : person.tier;
  const toPublic = tier === 'public';
  const canMail = mail && !!person.email;
  const daysOk = lasts !== 'days' || (Number(days) >= 1 && Number(days) <= 3650);
  // the same tier again is still a change when how long it lasts or how it was got differs
  const ready = reason.trim().length > 0 && daysOk && !(toPublic && current === 'public');

  const save = async () => {
    setBusy(true);
    const done = await onSave({
      type: 'set_tier',
      clientId: person.clientId,
      tier,
      reason: reason.trim(),
      ...(!toPublic && {
        source,
        ref: ref.trim() || undefined,
        permanent: lasts === 'permanent',
        days: lasts === 'days' ? Number(days) : undefined,
      }),
      notify: canMail && notify,
    });
    setBusy(false);
    if (done) onClose();
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change {person.name}&rsquo;s membership</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            Now <MemberTierPill tier={person.tier} />
            <span>
              {howGot(person)}
              {person.membership ? `, ${lastsWords(person.membership)}` : ''}
            </span>
          </DialogDescription>
        </DialogHeader>

        {person.isAdmin && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            {person.name} is an admin, which opens everything whatever membership they hold. The admin flag is set on the account, not here.
          </p>
        )}

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Membership</Label>
            <Choice value={tier} onChange={setTier} options={TIERS.map(value => ({ value, label: tierLabel(value) }))} />
            {tier === 'cohort' && <p className="text-xs text-muted-foreground">Cohort is invisible to everyone below it, and opens everything but the vault.</p>}
            {toPublic && current !== 'public' && (
              <p className="text-xs text-muted-foreground">Their {tierLabel(current)} membership ends now. The record stays in their history.</p>
            )}
          </div>

          {!toPublic && (
            <>
              <div className="flex flex-col gap-2">
                <Label>How they got it</Label>
                <Choice
                  value={source}
                  onChange={setSource}
                  options={[
                    { value: 'admin', label: 'An admin gives it' },
                    { value: 'contribution', label: 'A contribution' },
                  ]}
                />
                {source === 'contribution' && (
                  <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="What they contributed: a PR link or an item" maxLength={500} />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>How long it lasts</Label>
                <Choice
                  value={lasts}
                  onChange={setLasts}
                  options={[
                    { value: 'default', label: source === 'contribution' ? `${CONTRIBUTION_MONTHS} months` : 'Until an admin removes it' },
                    { value: 'days', label: 'A number of days' },
                    ...(source === 'contribution' ? [{ value: 'permanent' as const, label: 'Permanent' }] : []),
                  ]}
                />
                {lasts === 'days' && (
                  <div className="flex items-center gap-2">
                    <Input type="number" min={1} max={3650} value={days} onChange={e => setDays(e.target.value)} className="w-28" aria-label="Days" />
                    <span className="text-sm text-muted-foreground">
                      days{daysOk ? `, until ${formatDay(new Date(Date.now() + Number(days) * 86_400_000).toISOString())}` : ': between 1 and 3650'}
                    </span>
                  </div>
                )}
                {source === 'contribution' && lasts === 'default' && (
                  <p className="text-xs text-muted-foreground">A contribution lasts {CONTRIBUTION_MONTHS} months and renews when they contribute again.</p>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="membership-reason">Reason</Label>
            <Textarea
              id="membership-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why this change. It is kept in the audit log and shown to them in the mail."
              maxLength={500}
              rows={3}
            />
          </div>

          <label className={cn('flex items-start gap-2 text-sm', !canMail && 'text-muted-foreground')}>
            <Checkbox checked={canMail && notify} disabled={!canMail} onCheckedChange={value => setNotify(value === true)} className="mt-0.5" />
            <span>
              Tell them by mail
              <span className="block text-xs text-muted-foreground">
                {canMail
                  ? `To ${person.email}, from mediamake@reply-bots.com.`
                  : !person.email
                    ? 'This account has no email yet, so no mail can go.'
                    : 'Mail is not set up on this deployment yet (RESEND_API_KEY).'}
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !ready}>
            {toPublic ? 'End membership' : tier === current ? 'Save' : `Make them ${tierLabel(tier)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
