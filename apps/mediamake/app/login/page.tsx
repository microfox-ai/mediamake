import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { configuredProviders } from '@/lib/auth/providers';
import { safeRedirect } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · MediaMake' };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * /login: email and password, Google and GitHub. The MCP sign-in (/oauth)
 * and every "sign in" link on the site pass through here. Core's client id
 * and key form is at /core/login.
 */
export default async function LoginPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const redirectTo = safeRedirect(one(params.redirectTo), '') || undefined;
  return (
    <Suspense>
      <LoginForm
        providers={configuredProviders()}
        redirectTo={redirectTo}
        initialError={one(params.error)?.slice(0, 200)}
      />
    </Suspense>
  );
}
