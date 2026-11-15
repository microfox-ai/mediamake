import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ProviderButtons } from '@/components/auth/provider-buttons';
import { describeClaim } from '@/lib/auth/accounts';
import { configuredProviders } from '@/lib/auth/providers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Link your account · MediaMake' };

/**
 * /login/claim?token=…: the one-time link an admin sends to the owner of an
 * account from before sign-in. They pick Google or GitHub, and from then on
 * that is how they sign in. The link is used up when the linking succeeds.
 */
export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const claim = await describeClaim(token).catch(() => null);
  const providers = configuredProviders();
  if (!token || !claim) {
    return (
      <AuthCard
        title="This link has expired"
        description="It was already used, or it is more than 7 days old. Ask for a new one, or sign in if your account is already linked."
        footer={
          <Link href="/login" className="underline underline-offset-4">
            Go to sign in
          </Link>
        }
      />
    );
  }
  return (
    <AuthCard
      title="Link your account"
      description={
        <>
          Choose how you want to sign in to your MediaMake account{' '}
          <strong className="text-foreground">{claim.name ? `${claim.name} (${claim.clientId})` : claim.clientId}</strong>{' '}
          from now on. Your client ID and keys keep working.
        </>
      }
      footer="You can add more Google accounts, GitHub or a password later, under API Keys."
    >
      {providers.google || providers.github ? (
        <ProviderButtons providers={providers} claim={token} />
      ) : (
        <p className="text-sm text-muted-foreground">Google and GitHub sign-in are not set up on this site yet.</p>
      )}
    </AuthCard>
  );
}
