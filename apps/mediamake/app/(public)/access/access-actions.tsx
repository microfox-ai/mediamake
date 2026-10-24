'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AccessLevel } from '@/lib/catalog/types';

export function AccessActions({
  itemId,
  access,
  hasPackage,
  signedIn,
  pending: initiallyPending,
  loginHref,
}: {
  itemId: string;
  access: AccessLevel;
  hasPackage: boolean;
  signedIn: boolean;
  pending: boolean;
  loginHref: string;
}) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(initiallyPending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (access !== 'locked') {
    if (!hasPackage) return <p className="text-sm text-muted-foreground">You have access. No download is published yet.</p>;
    if (!signedIn) {
      return (
        <Button asChild>
          <Link href={loginHref}>Sign in to download</Link>
        </Button>
      );
    }
    return (
      <Button asChild>
        <a href={`/api/catalog/download?item=${encodeURIComponent(itemId)}&redirect=1`}>Download</a>
      </Button>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">This is shared with a few people for now. Sign in to ask for access.</p>
        <Button asChild>
          <Link href={loginHref}>Sign in</Link>
        </Button>
      </div>
    );
  }

  if (pending) return <p className="text-sm text-muted-foreground">Your request is in. You will get access once it is approved.</p>;

  async function requestAccess() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/catalog/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, message: message.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setPending(true);
    else setError(json.error ?? 'Something went wrong');
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">This is shared with a few people for now.</p>
      <Textarea
        placeholder="What would you use it for? (optional)"
        value={message}
        onChange={e => setMessage(e.target.value)}
        maxLength={1000}
      />
      <Button onClick={requestAccess} disabled={busy}>
        {busy ? 'Sending…' : 'Request access'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function RedeemInvite({
  initialCode,
  signedIn,
  loginHref,
}: {
  initialCode: string;
  signedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (!signedIn) {
    return (
      <Button asChild variant="outline">
        <Link href={loginHref}>Sign in to redeem</Link>
      </Button>
    );
  }

  async function redeem() {
    setBusy(true);
    setResult(null);
    const res = await fetch('/api/catalog/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setResult({ ok: false, text: json.error ?? 'Something went wrong' });
    const what = [
      ...(json.itemIds ?? []).map((id: string) => (id === '*' ? 'everything' : id)),
      ...(json.groupId ? [`the ${json.groupId} group`] : []),
    ].join(', ');
    setResult({ ok: true, text: `Unlocked ${what}.` });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Invite code" value={code} onChange={e => setCode(e.target.value)} />
        <Button onClick={redeem} disabled={busy || !code.trim()}>
          {busy ? 'Redeeming…' : 'Redeem'}
        </Button>
      </div>
      {result && <p className={`text-sm ${result.ok ? 'text-muted-foreground' : 'text-destructive'}`}>{result.text}</p>}
    </div>
  );
}
