import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LinkForm } from '@/components/auth/link-form';
import { describePending } from '@/lib/auth/accounts';
import { PENDING_COOKIE } from '@/lib/auth/http';
import { PROVIDER_NAMES } from '@/lib/auth/providers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'One more step · MediaMake' };

/** /login/link: after Google or GitHub, when no account has that identity yet. */
export default async function LinkAccountPage() {
  const pending = await describePending((await cookies()).get(PENDING_COOKIE)?.value).catch(() => null);
  if (!pending) redirect(`/login?error=${encodeURIComponent('That took too long. Sign in again.')}`);
  return (
    <LinkForm
      provider={PROVIDER_NAMES[pending.provider]}
      label={pending.label}
      maySignUp={pending.maySignUp}
      redirectTo={pending.redirectTo}
    />
  );
}
