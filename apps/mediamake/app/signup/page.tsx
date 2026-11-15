import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { SignupForm } from '@/components/auth/signup-form';
import { maySignUp } from '@/lib/auth/accounts';
import { configuredProviders } from '@/lib/auth/providers';
import { safeRedirect, withRedirect } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create your account · MediaMake' };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** /signup: a new account. Open to anyone unless MEDIAMAKE_SIGNUP=invite (see lib/auth/accounts.ts). */
export default async function SignupPage({ searchParams }: { searchParams: Params }) {
  const redirectTo = safeRedirect(one((await searchParams).redirectTo), '') || undefined;
  if (!(await maySignUp(redirectTo))) {
    return (
      <AuthCard
        title="Sign-up is invite only for now"
        description="Open the invite link you were sent to make an account. If you already have one, sign in."
        footer={
          <Link href={withRedirect('/login', redirectTo)} className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        }
      />
    );
  }
  return <SignupForm providers={configuredProviders()} redirectTo={redirectTo} />;
}
