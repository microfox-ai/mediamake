'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionData {
  isAuthenticated: boolean;
  clientId?: string;
}

interface SessionContextValue {
  session: SessionData | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = () => useContext(SessionContext);

interface SessionProviderProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function SessionProvider({
  children,
  requireAuth = false,
  redirectTo = '/login',
}: SessionProviderProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/session');
      if (response.ok) {
        const data = (await response.json()) as SessionData;
        setSession(data);
      } else {
        setSession({ isAuthenticated: false });
      }
    } catch {
      setSession({ isAuthenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!loading && requireAuth && !session?.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, requireAuth, redirectTo, router, session?.isAuthenticated]);

  const value = useMemo(
    () => ({
      session,
      loading,
      refreshSession,
    }),
    [loading, session],
  );

  if (loading) {
    return <div>Loading session...</div>;
  }

  if (requireAuth && !session?.isAuthenticated) {
    return null;
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
