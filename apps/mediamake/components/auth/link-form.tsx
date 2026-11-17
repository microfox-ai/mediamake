'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AFTER_SIGN_IN, safeRedirect } from '@/lib/auth/redirect';
import { AuthCard, Divider, FormError } from './auth-card';
import { usePost } from './use-post';

/**
 * /login/link: someone came back from Google or GitHub with an identity no
 * account has yet. They make a new account, or link the old account they
 * prove with its client id and key.
 */
export function LinkForm({
  provider,
  label,
  redirectTo,
}: {
  provider: string;
  label: string;
  redirectTo?: string;
}) {
  const [clientId, setClientId] = useState('');
  const [clientKey, setClientKey] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const { post, busy, error } = usePost();
  const done = (result: { redirectTo?: string } | null) => {
    if (result) window.location.assign(safeRedirect(result.redirectTo ?? redirectTo, AFTER_SIGN_IN));
  };

  const create = async () => done(await post('/api/auth/link', { create: true }));
  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    done(await post('/api/auth/link', { clientId, clientKey }));
  };

  return (
    <AuthCard
      title="One more step"
      description={
        <>
          No MediaMake account uses the {provider} account <strong className="text-foreground">{label}</strong> yet.
        </>
      }
      footer={
        <Link href="/login" className="underline underline-offset-4">
          Use a different account
        </Link>
      }
    >
      <Button className="w-full" onClick={create} disabled={busy}>
        Create a new account
      </Button>
      {!showKeyForm && (
        <Button variant="ghost" className="w-full" onClick={() => setShowKeyForm(true)}>
          I already have a client ID and key
        </Button>
      )}
      {showKeyForm && (
        <>
          <Divider>or link the account you have</Divider>
          <form onSubmit={link} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input id="clientId" required value={clientId} onChange={e => setClientId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientKey">Client key</Label>
              <Input
                id="clientKey"
                type="password"
                required
                value={clientKey}
                onChange={e => setClientKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Any working API key of that account. From then on you sign in with {provider}.
              </p>
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={busy}>
              Link my account
            </Button>
          </form>
        </>
      )}
      <FormError>{error}</FormError>
    </AuthCard>
  );
}
