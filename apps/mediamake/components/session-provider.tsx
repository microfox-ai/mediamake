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

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session');
        if (response.ok) {
          const data = await response.json();
          setSession(data);
        } else {
          setSession({ isAuthenticated: false });
          const currentPath = window.location.pathname + window.location.search;
          const loginUrl = currentPath !== '/login'
            ? `/login?redirectTo=${encodeURIComponent(currentPath)}`
            : '/login';
          router.push(loginUrl);
        }
      } catch (error) {
        setSession({ isAuthenticated: false });
        const currentPath = window.location.pathname + window.location.search;
        const loginUrl = currentPath !== '/login'
          ? `/login?redirectTo=${encodeURIComponent(currentPath)}`
          : '/login';
        router.push(loginUrl);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

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
