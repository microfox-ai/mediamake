'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckIcon, CopyIcon, DownloadIcon, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AccessLevel } from '@/lib/catalog/types';

export function AccessActions({
  itemId,
  access,
  hasPackage,
  signedIn,
  pending: initiallyPending,
  loginHref,
  installPrompt,
  worksWith = false,
}: {
  itemId: string;
  access: AccessLevel;
  hasPackage: boolean;
  signedIn: boolean;
  pending: boolean;
  loginHref: string;
  installPrompt?: string;
  /** It works with other items (a skill's MCPs), which the install offers as choices. */
  worksWith?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(initiallyPending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (access !== 'locked') {
    if (!installPrompt) return <p className="text-sm text-muted-foreground">You have access. No download is published yet.</p>;
    // installed from where it lives (a skill in the repo, an MCP from its maker): nothing of ours to download
    if (!hasPackage) return <InstallPrompt itemId={itemId} prompt={installPrompt} worksWith={worksWith} />;
    if (!signedIn) {
      return (
        <Button asChild>
          <Link href={loginHref}>Sign in to download</Link>
        </Button>
      );
    }
    return (
      <div className="space-y-4">
        <InstallPrompt itemId={itemId} prompt={installPrompt} worksWith={worksWith} />
        <Button asChild variant="outline">
          <a href={`/api/catalog/download?item=${encodeURIComponent(itemId)}&redirect=1`}>Download package</a>
        </Button>
      </div>
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

/**
 * How to install an item: on a computer signed in to MediaMake, `mm items install` (it installs what
 * the membership opens, nothing pasted); elsewhere, the paste-into-Claude prompt that installs it and
 * what it needs, where whoever pastes it signs in as themselves.
 */
export function InstallPrompt({
  itemId,
  prompt,
  worksWith = false,
}: {
  itemId: string;
  prompt: string;
  worksWith?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const membersOnly = !itemId.startsWith('skill/');
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Install with Claude</p>
      {membersOnly && (
        <p className="text-sm text-muted-foreground">
          On a computer with MediaMake, sign in once with <code className="text-xs">mm login</code>; then{' '}
          <code className="text-xs">mm items install {itemId} --yes</code> installs it, and{' '}
          <code className="text-xs">mm items install --yes</code> everything your membership opens.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {membersOnly ? 'Anywhere else, copy' : 'Copy'} this and paste it into Claude Code or Claude Desktop. It installs this and everything it needs
        {worksWith ? ', asks which of the MCPs it works with to add (and what you lose without each),' : ''} and tells you
        when it needs you.
      </p>
      <div className="flex flex-wrap gap-2">
        <code className="min-w-0 flex-1 basis-56 rounded-md border bg-muted px-3 py-2 text-xs break-words">{prompt}</code>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard?.writeText(prompt).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

/**
 * The install buttons at the top of an item's page (ItemHero), short like an app store's Get button:
 * copy the install prompt, download the package, share the page. What the prompt does is one line under
 * them; the `mm items install` way for a computer signed in to MediaMake is behind a disclosure. A
 * locked item asks for access as AccessActions does.
 */
export function HeroInstall({
  itemId,
  title,
  access,
  hasPackage,
  signedIn,
  pending,
  loginHref,
  installPrompt,
  worksWith = false,
}: {
  itemId: string;
  title: string;
  access: AccessLevel;
  hasPackage: boolean;
  signedIn: boolean;
  pending: boolean;
  loginHref: string;
  installPrompt?: string;
  worksWith?: boolean;
}) {
  const [copied, setCopied] = useState<'prompt' | 'link' | null>(null);
  if (access === 'locked') return <AccessActions itemId={itemId} access={access} hasPackage={hasPackage} signedIn={signedIn} pending={pending} loginHref={loginHref} />;
  if (!installPrompt) return <p className="text-sm text-muted-foreground">You have access. No download is published yet.</p>;
  const flash = (what: 'prompt' | 'link') => {
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };
  // a package of ours is downloaded as the member: the prompt is no use before they sign in
  const needsSignIn = hasPackage && !signedIn;
  const membersOnly = !itemId.startsWith('skill/');
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {needsSignIn ? (
          <Button asChild>
            <Link href={loginHref}>Sign in to install</Link>
          </Button>
        ) : (
          <Button
            title={installPrompt}
            onClick={async () => {
              await navigator.clipboard?.writeText(installPrompt).catch(() => undefined);
              flash('prompt');
            }}
          >
            {copied === 'prompt' ? <CheckIcon /> : <CopyIcon />}
            {copied === 'prompt' ? 'Copied' : 'Copy install prompt'}
          </Button>
        )}
        {hasPackage && signedIn && (
          <Button asChild variant="outline">
            <a href={`/api/catalog/download?item=${encodeURIComponent(itemId)}&redirect=1`}>
              <DownloadIcon /> Download
            </a>
          </Button>
        )}
        <ShareButton title={title} copied={copied === 'link'} onCopied={() => flash('link')} />
      </div>
      {!needsSignIn && (
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Paste it into Claude Code or Claude Desktop: it installs this and what it needs{worksWith ? ', and asks which of the MCPs it works with to add' : ''}.
        </p>
      )}
      {membersOnly && signedIn && (
        <details className="max-w-xl text-xs text-muted-foreground">
          <summary className="w-fit cursor-pointer hover:text-foreground">On a computer with MediaMake</summary>
          <p className="mt-1.5 leading-relaxed">
            Sign in once with <code className="rounded bg-muted px-1 py-0.5">mm login</code>, then{' '}
            <code className="rounded bg-muted px-1 py-0.5">mm items install {itemId} --yes</code> installs it, and{' '}
            <code className="rounded bg-muted px-1 py-0.5">mm items install --yes</code> everything your membership opens.
          </p>
        </details>
      )}
    </div>
  );
}

/** Copies the page's link, or opens the share sheet on a phone. */
export function ShareButton({ title, copied, onCopied }: { title: string; copied: boolean; onCopied: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const url = window.location.href.split('#')[0];
        // phones get the share sheet; elsewhere the link goes on the clipboard
        if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
          await navigator.share({ title, url }).catch(() => undefined);
          return;
        }
        await navigator.clipboard?.writeText(url).catch(() => undefined);
        onCopied();
      }}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
      {copied ? 'Link copied' : 'Share'}
    </Button>
  );
}
