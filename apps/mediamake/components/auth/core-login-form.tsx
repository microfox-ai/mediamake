'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AFTER_CORE_SIGN_IN, safeRedirect, withRedirect } from '@/lib/auth/redirect';
import { AuthCard, Divider, FormError } from './auth-card';
import { ProviderButtons, type Providers } from './provider-buttons';
import { usePost } from './use-post';

/** /core/login: Core's own form, a client ID and key, plus Continue with Google. */
export function CoreLoginForm({
  providers,
  redirectTo,
  initialError,
}: {
  providers: Providers;
  redirectTo?: string;
  initialError?: string;
}) {
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState('');
  const [clientKey, setClientKey] = useState('');
  const { post, busy, error } = usePost();
  const [devSigningIn, setDevSigningIn] = useState(process.env.NODE_ENV === 'development');
  const target = safeRedirect(redirectTo, AFTER_CORE_SIGN_IN);

  // `next dev` signs in with the development key from the server environment,
  // unless ?manual=1 asks for the form.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (searchParams.get('manual') === '1' || initialError) {
      setDevSigningIn(false);
      return;
    }
    let cancelled = false;
    fetch('/api/dev-session', { method: 'POST' })
      .then(response => {
        if (cancelled) return;
        if (response.ok) window.location.assign(target);
        else setDevSigningIn(false);
      })
      .catch(() => !cancelled && setDevSigningIn(false));
    return () => {
      cancelled = true;
    };
  }, [searchParams, target, initialError]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await post('/api/login', { clientId, clientKey })) window.location.assign(target);
  };

  return (
    <AuthCard
      title="Sign in to Core"
      description="Enter your client ID and key."
      footer={
        <Link href={withRedirect('/login', redirectTo)} className="underline underline-offset-4">
          Sign in with email or GitHub instead
        </Link>
      }
    >
      <form onSubmit={signIn} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            autoComplete="username"
            placeholder="Your client ID"
            required
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="clientKey">Client key</Label>
          <Input
            id="clientKey"
            type="password"
            autoComplete="current-password"
            placeholder="Your client key"
            required
            value={clientKey}
            onChange={e => setClientKey(e.target.value)}
          />
        </div>
        {devSigningIn && (
          <p className="text-sm text-muted-foreground">Signing in with the development key from the server environment.</p>
        )}
        <FormError>{error || initialError}</FormError>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      {providers.google && <Divider>or</Divider>}
      <ProviderButtons providers={providers} redirectTo={target} only="google" />
    </AuthCard>
  );
}
