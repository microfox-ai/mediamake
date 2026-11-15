'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { withRedirect } from '@/lib/auth/redirect';
import { AuthCard, Divider, FormError } from './auth-card';
import { ProviderButtons, type Providers } from './provider-buttons';
import { usePost } from './use-post';

/** /signup: an account with an email and password, or through Google or GitHub. */
export function SignupForm({ providers, redirectTo }: { providers: Providers; redirectTo?: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const { post, busy, error } = usePost();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await post('/api/auth/signup', { name, email, password, redirectTo })) setSentTo(email);
  };

  const signInLink = (
    <p>
      Already have an account?{' '}
      <Link href={withRedirect('/login', redirectTo)} className="font-medium text-foreground underline underline-offset-4">
        Sign in
      </Link>
    </p>
  );

  if (sentTo) {
    return (
      <AuthCard
        title="Check your mail"
        description={
          <>
            We sent a link to <strong className="text-foreground">{sentTo}</strong>. Open it to confirm your address and
            finish making your account. The link works for 24 hours.
          </>
        }
        footer={signInLink}
      />
    );
  }

  return (
    <AuthCard title="Create your account" description="One account for MediaMake's skills, MCPs and apps." footer={signInLink}>
      <ProviderButtons providers={providers} redirectTo={redirectTo} />
      {(providers.google || providers.github) && <Divider>or</Divider>}
      <form onSubmit={signUp} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Sending the link…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
