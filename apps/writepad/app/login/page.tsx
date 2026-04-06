'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { AlertCircle, ArrowRight, FileText, Sparkles, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: FileText,   text: 'Structured project workspace with file tree' },
  { icon: Sparkles,   text: 'Context-aware AI writing assistance' },
  { icon: GitBranch,  text: 'Diff-based editing — review every AI change' },
];

export default function LoginPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [clientKey, setClientKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientKey }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Invalid credentials');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Theme toggle — top right */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left panel — branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-card p-10 lg:flex lg:w-[45%]">
        {/* Violet gradient blob */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-[80px]" />
          <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="relative z-10 w-fit text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          write<span className="text-primary">pad</span>
        </button>

        {/* Center copy */}
        <div className="relative z-10">
          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight">
            Your AI-native<br />writing studio.
          </h2>
          <p className="mb-8 text-muted-foreground leading-relaxed">
            Scripts, screenplays, novels — write faster with intelligent workflows,
            contextual AI chat, and precise diff-based editing.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon size={14} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} Writepad
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-xl font-bold tracking-tight transition-opacity hover:opacity-80 lg:hidden"
        >
          write<span className="text-primary">pad</span>
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in with your client credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="your-client-id"
                required
                autoComplete="username"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientKey">Client Key</Label>
              <Input
                id="clientKey"
                type="password"
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={15} />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Need access?{' '}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-primary hover:underline"
            >
              Learn about Writepad
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
