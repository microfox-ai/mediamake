'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AFTER_SIGN_IN, safeRedirect } from '@/lib/auth/redirect';
import { AuthCard, FormError } from './auth-card';
import { usePost } from './use-post';

const backToSignIn = (
  <Link href="/login" className="underline underline-offset-4">
    Back to sign in
  </Link>
);

/** /login/forgot: asks for a reset link. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { post, busy, error } = usePost();

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await post('/api/auth/password/forgot', { email })) setSent(true);
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your mail"
        description={
          <>
            If <strong className="text-foreground">{email}</strong> has an account, a link to choose a new password is on
            its way. It works for 1 hour.
          </>
        }
        footer={backToSignIn}
      />
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we will send a link to choose a new one. This also sets a first password for an account that signs in with Google or GitHub."
      footer={backToSignIn}
    >
      <form onSubmit={send} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send the link'}
        </Button>
      </form>
    </AuthCard>
  );
}

/** /login/reset?token=…: chooses the new password. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const { post, busy, error } = usePost();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await post('/api/auth/password/reset', { token, password })) window.location.assign(AFTER_SIGN_IN);
  };

  return (
    <AuthCard
      title="Choose a new password"
      description="Your other browsers are signed out when you save it."
      footer={backToSignIn}
    >
      <form onSubmit={save} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
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
          {busy ? 'Saving…' : 'Save and sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}

/** /login/verify?token=…: confirms the address from a verification mail. */
export function ConfirmEmailForm({ token, email, adding }: { token: string; email: string; adding: boolean }) {
  const { post, busy, error } = usePost();

  const confirm = async () => {
    const result = await post<{ signedIn: boolean; redirectTo?: string }>('/api/auth/verify', { token });
    if (!result) return;
    window.location.assign(safeRedirect(result.redirectTo, AFTER_SIGN_IN));
  };

  return (
    <AuthCard
      title="Confirm your email"
      description={
        adding ? (
          <>
            Add <strong className="text-foreground">{email}</strong> to your MediaMake account.
          </>
        ) : (
          <>
            Confirm <strong className="text-foreground">{email}</strong> to finish making your MediaMake account.
          </>
        )
      }
      footer={backToSignIn}
    >
      <FormError>{error}</FormError>
      <Button className="w-full" onClick={confirm} disabled={busy}>
        {busy ? 'Confirming…' : 'Confirm email'}
      </Button>
    </AuthCard>
  );
}
