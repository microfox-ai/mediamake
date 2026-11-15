import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/password-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose a new password · MediaMake' };

/** /login/reset?token=…, from the reset mail. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthCard
        title="This link is not complete"
        description="Open the link from your mail again, or ask for a new one."
        footer={
          <Link href="/login/forgot" className="underline underline-offset-4">
            Send a new link
          </Link>
        }
      />
    );
  }
  return <ResetPasswordForm token={token} />;
}
