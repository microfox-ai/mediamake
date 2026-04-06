'use client';

import { SessionProvider } from '@/components/session-provider';

interface ProtectedPageProps {
  children: React.ReactNode;
}

export function ProtectedPage({ children }: ProtectedPageProps) {
  return <SessionProvider requireAuth>{children}</SessionProvider>;
}
