'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { withRedirect } from '@/lib/auth/redirect';

/**
 * What /app renders for someone who is not signed in: it sends them to
 * /login and brings them back to the page they asked for. Under `next dev`
 * it first tries the development sign-in (DEV_CLIENT_KEY or DEV_API_KEY, see
 * /api/dev-session), as Core does; `?manual=1` skips that.
 */
export function SignInGate() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const here = window.location.pathname + window.location.search;
    const manual = new URLSearchParams(window.location.search).get('manual') === '1';

    (async () => {
      if (process.env.NODE_ENV === 'development' && !manual) {
        try {
          const dev = await fetch('/api/dev-session', { method: 'POST' });
          if (dev.ok && !cancelled) return router.refresh();
        } catch {
          // no dev sign-in: the login page it is
        }
      }
      if (!cancelled) router.replace(withRedirect('/login', here));
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Opening sign-in…</div>;
}
