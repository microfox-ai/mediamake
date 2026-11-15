'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AFTER_SIGN_IN, safeRedirect, withRedirect } from '@/lib/auth/redirect';
import { AuthCard, Divider, FormError } from './auth-card';
import { ProviderButtons, type Providers } from './provider-buttons';
import { usePost } from './use-post';

/** /login: email and password, Continue with Google, Continue with GitHub. */
export function LoginForm({
  providers,
  redirectTo,
  showSignup,
  initialError,
}: {
  providers: Providers;
  redirectTo?: string;
  showSignup: boolean;
  initialError?: string;
}) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { post, busy, error } = usePost();
  const [devSigningIn, setDevSigningIn] = useState(process.env.NODE_ENV === 'development');
  const target = safeRedirect(redirectTo, AFTER_SIGN_IN);

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
    if (await post('/api/auth/login', { email, password })) window.location.assign(target);
  };

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to MediaMake."
      footer={
        <>
          {showSignup && (
            <p>
              New here?{' '}
              <Link href={withRedirect('/signup', redirectTo)} className="font-medium text-foreground underline underline-offset-4">
                Create an account
              </Link>
            </p>
          )}
          <p className="mt-2">
            Have a client ID and key?{' '}
            <Link href={withRedirect('/core/login', redirectTo)} className="underline underline-offset-4">
              Sign in with them
            </Link>
          </p>
        </>
      }
    >
      <ProviderButtons providers={providers} redirectTo={redirectTo} />
      {(providers.google || providers.github) && <Divider>or</Divider>}
      <form onSubmit={signIn} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/login/forgot" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
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
    </AuthCard>
  );
}
