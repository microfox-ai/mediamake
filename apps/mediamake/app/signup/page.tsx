import { SignupForm } from '@/components/auth/signup-form';
import { configuredProviders } from '@/lib/auth/providers';
import { safeRedirect } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create your account · MediaMake' };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** /signup: a new account, open to anyone. What it opens follows the membership (Public to start). */
export default async function SignupPage({ searchParams }: { searchParams: Params }) {
  const redirectTo = safeRedirect(one((await searchParams).redirectTo), '') || undefined;
  return <SignupForm providers={configuredProviders()} redirectTo={redirectTo} />;
}
