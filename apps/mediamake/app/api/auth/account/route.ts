import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getAccount, requestEmailChange, setName, setPassword, unlinkProvider } from '@/lib/auth/accounts';
import { body, crossSite, fail, publicOrigin, sameOrigin, sessionClientIdOf, signedOut } from '@/lib/auth/http';
import { configuredProviders, isProvider } from '@/lib/auth/providers';
import { mailConfigured } from '@/lib/mail/send';

/**
 * How the signed-in person signs in.
 *
 * GET   their email, name and which of password, Google and GitHub they have,
 *       and which providers this deployment has set up.
 * POST  { action: 'email', email }                        mails a link that adds the address
 *       { action: 'password', password, currentPassword? } sets or changes the password
 *       { action: 'unlink', provider, id? }                removes GitHub, or the Google account `id`
 *       { action: 'name', name }
 * Google and GitHub are added with /api/auth/<provider>/start?connect=1.
 */
export async function GET(req: NextRequest) {
  const clientId = await sessionClientIdOf(req);
  if (!clientId) return signedOut();
  try {
    return NextResponse.json({
      account: await getAccount(clientId),
      providers: configuredProviders(),
      mail: mailConfigured() || process.env.NODE_ENV !== 'production',
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return crossSite();
  const clientId = await sessionClientIdOf(req);
  if (!clientId) return signedOut();
  try {
    const input = await body(req);
    switch (input.action) {
      case 'email':
        await requestEmailChange({ clientId, email: input.email, origin: publicOrigin(req) });
        return NextResponse.json({ message: 'Check that address for a link to confirm it.' });
      case 'password':
        await setPassword({ clientId, password: input.password, currentPassword: input.currentPassword });
        break;
      case 'unlink':
        if (typeof input.provider !== 'string' || !isProvider(input.provider)) throw new AuthError('Unknown provider.');
        await unlinkProvider(clientId, input.provider, typeof input.id === 'string' ? input.id : undefined);
        break;
      case 'name':
        await setName(clientId, input.name);
        break;
      default:
        throw new AuthError('Unknown action.');
    }
    return NextResponse.json({ account: await getAccount(clientId) });
  } catch (error) {
    return fail(error);
  }
}
