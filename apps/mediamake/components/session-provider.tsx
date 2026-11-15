'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

interface Session {
  isAuthenticated: boolean;
  clientId?: string;
}

const SessionContext = createContext<Session | null>(null);

export const useSession = () => {
  return useContext(SessionContext);
};

/**
 * Core's pages check the session in the browser and send signed-out people to
 * /core/login. The app at /app checks on the server (app/app/layout.tsx) and
 * passes who is signed in as `initialSession`, so nothing is fetched here.
 */
export const SessionProvider = ({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session;
}) => {
  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  const [loading, setLoading] = useState(!initialSession);
  const router = useRouter();

  useEffect(() => {
    if (initialSession) return;
    const redirectToLogin = () => {
      setSession({ isAuthenticated: false });
      const params = new URLSearchParams(window.location.search);
      const manual = params.get('manual') === '1';
      const currentPath = window.location.pathname + window.location.search;
      const loginParams = new URLSearchParams();
      if (currentPath !== '/core/login') {
        loginParams.set('redirectTo', currentPath);
      }
      if (manual) loginParams.set('manual', '1');
      const query = loginParams.toString();
      // Core keeps its own form (client ID and key, plus Google).
      router.push(query ? `/core/login?${query}` : '/core/login');
    };

    const checkSession = async () => {
      try {
        let response = await fetch('/api/session');
        // Local browsers (Cursor, Claude) have no saved password. In development,
        // mint a session from DEV_CLIENT_KEY / DEV_API_KEY before showing login.
        const skipDevLogin = new URLSearchParams(window.location.search).get('manual') === '1';
        if (!response.ok && process.env.NODE_ENV === 'development' && !skipDevLogin) {
          const devLogin = await fetch('/api/dev-session', { method: 'POST' });
          if (devLogin.ok) {
            response = await fetch('/api/session');
          }
        }
        if (response.ok) {
          const data = await response.json();
          setSession(data);
        } else {
          redirectToLogin();
        }
      } catch {
        redirectToLogin();
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router, initialSession]);

  if (loading) {
    // You can replace this with a beautiful loading spinner
    return <div>Loading session...</div>;
  }

  if (!session?.isAuthenticated) {
    // This will be brief as the redirect is already triggered.
    return null;
  }

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};
