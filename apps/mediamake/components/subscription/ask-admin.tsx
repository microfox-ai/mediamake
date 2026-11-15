'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Subscription's "Ask an admin": a request for the next membership up, with
 * a line saying why. It lands in Manage Memberships (POST /api/memberships/request).
 */
export function AskAdmin({ tier, pending: initiallyPending }: { tier: string; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(initiallyPending);
  const [busy, setBusy] = useState(false);

  if (pending) {
    return <p className="text-sm text-muted-foreground">You asked for {tier}. An admin will decide, and you get a mail when your membership changes.</p>;
  }
  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        Ask an admin for {tier}
      </Button>
    );
  }

  const ask = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/memberships/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setPending(true);
      toast.success('Sent to the admins');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={`What you make, and what you would use ${tier} for`}
        maxLength={1000}
        rows={3}
        aria-label="Your message to the admins"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !message.trim()} onClick={ask}>
          Send
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
