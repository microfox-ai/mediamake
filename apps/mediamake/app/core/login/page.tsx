import { Suspense } from 'react';
import { CoreLoginForm } from '@/components/auth/core-login-form';
import { configuredProviders } from '@/lib/auth/providers';
import { safeRedirect } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in to Core · MediaMake' };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** /core/login: Core keeps its client ID and key form, and adds Continue with Google. */
export default async function CoreLoginPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  return (
    <Suspense>
      <CoreLoginForm
        providers={configuredProviders()}
        redirectTo={safeRedirect(one(params.redirectTo), '') || undefined}
        initialError={one(params.error)?.slice(0, 200)}
      />
    </Suspense>
  );
}
