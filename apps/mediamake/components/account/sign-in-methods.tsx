'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Mail, UserRound } from 'lucide-react';
import { GitHubIcon, GoogleIcon } from '@/components/auth/provider-buttons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const TOAST_MS = 4000;

interface Account {
  clientId: string;
  email?: string;
  name?: string;
  githubLogin?: string;
  googleAccounts: { id: string; email?: string }[];
  methods: { password: boolean; google: boolean; github: boolean };
}

interface AccountResponse {
  account: Account;
  providers: { google: boolean; github: boolean };
  mail: boolean;
}

interface AccountRow extends Account {
  linked: boolean;
}

async function send(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Something went wrong. Try again.');
  return data;
}

function Row({
  icon,
  title,
  detail,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * How the signed-in person signs in: their email, password, Google and
 * GitHub (/api/auth/account). An account from before sign-in existed (a
 * client ID and key) is linked by adding any of them here. Admins also get a
 * form that links an old account to a person's email (/api/admin/users).
 */
export function SignInMethods() {
  const [data, setData] = useState<AccountResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<'email' | 'password' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/account');
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(me => setIsAdmin(!!me?.isAdmin))
      .catch(() => {});
    // What the Google or GitHub round trip came back with.
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const connected = params.get('connected');
    if (error) toast.error(error, { duration: TOAST_MS });
    if (connected) toast.success(`${connected === 'github' ? 'GitHub' : 'Google'} added to your account`, { duration: TOAST_MS });
    if (error || connected) window.history.replaceState(null, '', window.location.pathname);
  }, [load]);

  const act = async (payload: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      const result = await send('/api/auth/account', payload);
      if (result.account) setData(d => (d ? { ...d, account: result.account } : d));
      toast.success(result.message || done, { duration: TOAST_MS });
      setEditing(null);
      setEmail('');
      setPassword('');
      setCurrentPassword('');
    } catch (error) {
      toast.error((error as Error).message, { duration: TOAST_MS });
    } finally {
      setBusy(false);
    }
  };

  if (failed) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6">
      <div className="rounded-xl border bg-card p-5">
        <p className="font-medium">How you sign in</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add an email, Google or GitHub to sign in on the MediaMake site without your client ID and key. Your keys keep
          working for scripts, the command line and Core.
        </p>
        {!data ? (
          <Skeleton className="mt-4 h-40 w-full" />
        ) : (
          <div className="mt-2 divide-y">
            <Row
              icon={<UserRound className="size-4" />}
              title="Account"
              detail={
                <>
                  {data.account.name ? `${data.account.name} · ` : ''}
                  <span className="font-mono">{data.account.clientId}</span>
                </>
              }
            />
            <Row icon={<Mail className="size-4" />} title="Email" detail={data.account.email ?? 'Not added yet'}>
              {editing === 'email' ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    void act({ action: 'email', email }, 'Check that address for a link to confirm it.');
                  }}
                >
                  <Input
                    type="email"
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="h-8 w-56"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <Button size="sm" type="submit" disabled={busy}>
                    Send link
                  </Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing('email')} disabled={!data.mail}>
                  {data.account.email ? 'Change' : 'Add email'}
                </Button>
              )}
            </Row>
            <Row
              icon={<KeyRound className="size-4" />}
              title="Password"
              detail={
                data.account.methods.password
                  ? 'Set. You sign in with your email and this password.'
                  : data.account.email
                    ? 'Not set'
                    : 'Add an email first'
              }
            >
              {editing === 'password' ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    void act({ action: 'password', password, currentPassword }, 'Password saved');
                  }}
                >
                  {data.account.methods.password && (
                    <Input
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Current password"
                      className="h-8 w-44"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                  )}
                  <Input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="New password (8 or more)"
                    className="h-8 w-52"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <Button size="sm" type="submit" disabled={busy}>
                    Save
                  </Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing('password')} disabled={!data.account.email}>
                  {data.account.methods.password ? 'Change' : 'Set password'}
                </Button>
              )}
            </Row>
            {data.account.googleAccounts.map((google, index) => (
              <Row
                key={google.id}
                icon={<GoogleIcon />}
                title={index === 0 ? 'Google' : 'Another Google account'}
                detail={google.email ?? 'Linked'}
              >
                <Badge variant="secondary">Linked</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => act({ action: 'unlink', provider: 'google', id: google.id }, 'Google account removed')}
                >
                  Remove
                </Button>
              </Row>
            ))}
            {(data.providers.google || data.account.googleAccounts.length === 0) && (
              <Row
                icon={<GoogleIcon />}
                title={data.account.googleAccounts.length > 0 ? 'Add a Google account' : 'Google'}
                detail={
                  !data.providers.google
                    ? 'Not set up on this site yet'
                    : data.account.googleAccounts.length > 0
                      ? 'Sign in with any of your Google accounts'
                      : 'Not linked'
                }
              >
                {data.providers.google && (
                  <Button size="sm" variant="outline" asChild>
                    <a href="/api/auth/google/start?connect=1">
                      {data.account.googleAccounts.length > 0 ? 'Link another' : 'Link Google'}
                    </a>
                  </Button>
                )}
              </Row>
            )}
            <Row
              icon={<GitHubIcon />}
              title="GitHub"
              detail={
                data.account.methods.github
                  ? data.account.githubLogin
                    ? `Linked as ${data.account.githubLogin}`
                    : 'Linked'
                  : data.providers.github
                    ? 'Not linked'
                    : 'Not set up on this site yet'
              }
            >
              {data.account.methods.github ? (
                <>
                  <Badge variant="secondary">Linked</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => act({ action: 'unlink', provider: 'github' }, 'GitHub removed')}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                data.providers.github && (
                  <Button size="sm" variant="outline" asChild>
                    <a href="/api/auth/github/start?connect=1">Link GitHub</a>
                  </Button>
                )
              )}
            </Row>
          </div>
        )}
      </div>
      {isAdmin && <LinkOldAccounts />}
    </div>
  );
}

/** Admins: say which email is the person behind an old account. */
function LinkOldAccounts() {
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [clientId, setClientId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ clientId: string; url: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) setAccounts((await response.json()).accounts);
    } catch {
      // The form still works without the list.
    }
  }, []);
  useEffect(() => void load(), [load]);

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await send('/api/admin/users', { clientId, email });
      toast.success(`${clientId} can now sign in as ${email}`, { duration: TOAST_MS });
      setClientId('');
      setEmail('');
      await load();
    } catch (error) {
      toast.error((error as Error).message, { duration: TOAST_MS });
    } finally {
      setBusy(false);
    }
  };

  const makeLink = async () => {
    setBusy(true);
    try {
      const result = await send('/api/admin/users', { clientId });
      setMade(result);
      await navigator.clipboard.writeText(result.url).catch(() => {});
      toast.success('Link copied. Send it only to that person.', { duration: TOAST_MS });
    } catch (error) {
      toast.error((error as Error).message, { duration: TOAST_MS });
    } finally {
      setBusy(false);
    }
  };

  const old = accounts?.filter(a => !a.linked) ?? [];
  return (
    <div className="mt-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <p className="font-medium">Link an old account</p>
        <Badge variant="outline">Admin</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a client ID and make a one-time link to send to its owner: they open it, pick their Google or GitHub
        account, and sign in that way from then on. Or name their email, and they sign in with a Google or GitHub account
        of that address, or set a password with "Forgot password".
        {accounts && ` ${old.length} of ${accounts.length} accounts are not linked yet.`}
      </p>
      <form onSubmit={link} className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          required
          list="old-accounts"
          placeholder="Client ID"
          className="h-9 w-56"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
        />
        <datalist id="old-accounts">
          {old.map(a => (
            <option key={a.clientId} value={a.clientId}>
              {a.name}
            </option>
          ))}
        </datalist>
        <Input
          type="email"
          placeholder="Their email (optional)"
          className="h-9 w-64"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={busy || !email}>
          Link this email
        </Button>
        <Button type="button" size="sm" disabled={busy || !clientId} onClick={makeLink}>
          Make a link to send
        </Button>
      </form>
      {made && (
        <div className="mt-3 rounded-md border bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">
            For <span className="font-mono text-foreground">{made.clientId}</span>. Works once, for 7 days. Whoever opens
            it gets the account, so send it only to that person.
          </p>
          <code className="mt-2 block break-all font-mono text-xs">{made.url}</code>
        </div>
      )}
    </div>
  );
}
