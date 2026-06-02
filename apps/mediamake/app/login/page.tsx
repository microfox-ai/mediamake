'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
// import Link from 'next/link';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState('');
  const [clientKey, setClientKey] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientKey,
        }),
      });

      if (response.ok) {
        const redirectTo = searchParams.get('redirectTo');
        const isRelative = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//');
        router.push(isRelative ? redirectTo : '/projects');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.message || 'Invalid client ID or client key');
      }
    } catch (err) {
      setError('An error occurred during sign-in.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="min-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your Client ID and Key to access your account.
            {/* Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign Up
            </Link> */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID (Username)</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Your client ID"
                required
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="clientKey">Client Key (Password)</Label>
              </div>
              <Input
                id="clientKey"
                type="password"
                required
                placeholder="Your client key"
                value={clientKey}
                onChange={e => setClientKey(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
