import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ConfirmEmailForm } from '@/components/auth/password-forms';
import { describeVerification } from '@/lib/auth/accounts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirm your email · MediaMake' };

/**
 * /login/verify?token=…, from the verification mail. The link is used up by
 * the button here, not by opening the page, so mail scanners can't spend it.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const pending = await describeVerification(token).catch(() => null);
  if (!token || !pending) {
    return (
      <AuthCard
        title="This link has expired"
        description="It was already used, or it is more than 24 hours old. If your account exists, sign in. Otherwise sign up again for a new link."
        footer={
          <Link href="/login" className="underline underline-offset-4">
            Go to sign in
          </Link>
        }
      />
    );
  }
  return <ConfirmEmailForm token={token} email={pending.email} adding={pending.type === 'email'} />;
}
