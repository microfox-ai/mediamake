'use client';

// The agent marks are small SVG files, served as they are.
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GoogleIcon } from '@/components/auth/provider-buttons';
import { usePost } from '@/components/auth/use-post';
import type { Providers } from '@/components/auth/provider-buttons';
import { withRedirect } from '@/lib/auth/redirect';

/**
 * The homepage's two popups, drawn in its own look (landing.css › toast, signin): the note that says
 * what to do after the setup prompt is copied, and the sign-in a signed-out visitor gets on the way
 * into the app (Explore, Enter app).
 */

/** How long the copied note stays, unless it is closed or the pointer rests on it. */
const TOAST_MS = 9000;

/** What to do next with the setup prompt: on the clipboard (`copied`), or selected on the page to copy by hand. */
export function SetupToast({ copied, shown, onClose }: { copied: boolean; shown: number; onClose: () => void }) {
  const [resting, setResting] = useState(false);
  useEffect(() => {
    if (!shown || resting) return;
    const timer = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(timer);
  }, [shown, resting, onClose]);
  if (!shown) return null;

  return (
    <div className="toast" role="status" aria-live="polite" onMouseEnter={() => setResting(true)} onMouseLeave={() => setResting(false)}>
      <div className="glow glow--soft toast__box" key={shown}>
        <span className="toast__ic" aria-hidden="true">
          <svg className="ic"><use href={copied ? '#i-check' : '#i-copy'} /></svg>
        </span>
        <div className="toast__body">
          <b>{copied ? 'Setup prompt copied' : 'Setup prompt selected'}</b>
          <ol>
            {!copied && <li>Press ⌘C (Ctrl+C on Windows) to copy it.</li>}
            <li>
              Open{' '}
              <span className="ags" aria-hidden="true">
                <span className="ag"><img src="/home/agents/claude.svg" alt="" /></span>
                <span className="ag"><img src="/home/agents/codex.svg" alt="" /></span>
                <span className="ag"><img src="/home/agents/antigravity.svg" alt="" /></span>
              </span>{' '}
              Claude Code, Codex or Antigravity.
            </li>
            <li>Paste it in and send it.</li>
            <li>Your agent sets MediaMake up on your computer. Then say what you want made.</li>
          </ol>
        </div>
        <button type="button" className="toast__x" onClick={onClose} aria-label="Close">
          <svg className="ic"><use href="#i-x" /></svg>
        </button>
      </div>
    </div>
  );
}

/** Where the sign-in leads, and what it is called in the popup's title. */
export type SignInTarget = { href: string; what: string };

/**
 * Sign in on the homepage itself: Google, GitHub, or email and password, then on to `target`. The
 * full pages (/login, /signup) stay one link away.
 */
export function SignInPopup({ target, providers, onClose }: { target: SignInTarget | null; providers: Providers; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { post, busy, error, setError } = usePost();

  useEffect(() => {
    const box = dialog.current;
    if (!box) return;
    if (target && !box.open) {
      setError('');
      box.showModal();
    }
    if (!target && box.open) box.close();
  }, [target, setError]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (target && (await post('/api/auth/login', { email, password }))) window.location.assign(target.href);
  };
  const start = (provider: 'google' | 'github') => `/api/auth/${provider}/start?${new URLSearchParams({ redirectTo: target?.href ?? '/app' })}`;
  const oauth = providers.google || providers.github;

  return (
    <dialog
      ref={dialog}
      className="signin"
      aria-labelledby="signin-title"
      onClose={onClose}
      // a click on the dimmed page around the box closes it
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="glow signin__box">
        <button type="button" className="signin__x" onClick={onClose} aria-label="Close">
          <svg className="ic"><use href="#i-x" /></svg>
        </button>
        <img className="signin__mark" src="/brand/mediamake-mark.svg" alt="" />
        <h2 id="signin-title">Sign in to open {target?.what ?? 'the app'}</h2>
        <p className="signin__lead">The store lives in the app. Sign in, and it opens right where you clicked.</p>

        {oauth && (
          <div className="signin__oauth">
            {providers.google && (
              <a className="btn btn--light" href={start('google')}>
                <GoogleIcon className="gicon" /> Continue with Google
              </a>
            )}
            {providers.github && (
              <a className="btn btn--line" href={start('github')}>
                <svg className="ic"><use href="#i-github" /></svg> Continue with GitHub
              </a>
            )}
          </div>
        )}
        {oauth && <p className="signin__or"><span>or</span></p>}

        <form className="signin__form" onSubmit={signIn}>
          <label>
            <span>Email</span>
            <input type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>
            <span>
              Password <Link href="/login/forgot">Forgot it?</Link>
            </span>
            <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {error && <p className="signin__error" role="alert">{error}</p>}
          <button className="btn btn--light" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="signin__foot">
          New here? <Link href={withRedirect('/signup', target?.href)}>Create an account</Link>
        </p>
      </div>
    </dialog>
  );
}
