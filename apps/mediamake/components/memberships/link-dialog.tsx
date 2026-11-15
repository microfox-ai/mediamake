'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PersonRow } from '@/lib/memberships/people';
import { usersCall } from './model';

/**
 * Link an old account (a client id with keys, from before sign-in) to its
 * person, in one of two ways: a one-time link to send them, or their email,
 * which the admin vouches for. Both are lib/auth/accounts, through
 * /api/admin/users.
 */
export function LinkDialog({ person, onClose, onLinked }: { person: PersonRow | null; onClose: () => void; onLinked: () => void }) {
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail('');
    setUrl(null);
  }, [person]);

  if (!person) return null;

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Link copied. Send it only to that person.');
    } catch {
      toast.message('Copy the link from the box');
    }
  };

  const makeLink = async () => {
    setBusy(true);
    try {
      const made = await usersCall<{ url: string }>({ clientId: person.clientId });
      setUrl(made.url);
      await copy(made.url);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const linkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await usersCall({ clientId: person.clientId, email: email.trim() });
      toast.success(`${person.name} can now sign in as ${email.trim()}`);
      onLinked();
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link {person.name}&rsquo;s account</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{person.clientId}</span> is from before sign-in: it has a key and nothing else. Link it so its owner signs in
            with email, Google or GitHub.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Send them a link</p>
            <p className="text-xs text-muted-foreground">
              They open it and pick their Google or GitHub account, which is linked and signs them in. It works once, for 7 days, and whoever opens it gets the
              account, so send it only to its owner.
            </p>
            {url ? (
              <div className="flex gap-1.5">
                <Input readOnly value={url} className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
                <Button size="icon" variant="outline" className="shrink-0" aria-label="Copy link" onClick={() => copy(url)}>
                  <Copy className="size-4" />
                </Button>
              </div>
            ) : (
              <Button className="w-fit" size="sm" disabled={busy} onClick={makeLink}>
                Make a link to send
              </Button>
            )}
          </div>

          <form onSubmit={linkEmail} className="flex flex-col gap-2 border-t pt-5">
            <Label htmlFor="link-email" className="text-sm font-medium">
              Or name their email
            </Label>
            <p className="text-xs text-muted-foreground">
              You vouch that this address is theirs. They then sign in with a Google or GitHub account of that address, or set a password with &ldquo;Forgot
              password&rdquo;.
            </p>
            <div className="flex gap-2">
              <Input id="link-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
              <Button type="submit" variant="outline" disabled={busy || !email.trim()}>
                Link this email
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
