import { NextRequest, NextResponse } from 'next/server';
import { apiKeyForClient, issueCode, publicOrigin, sessionClientId, takeAuthorizeRequest } from '@/lib/mcp/oauth';

// The consent form on /oauth/authorize posts here. The pending request is
// bound to the user it was shown to and can be answered only once.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const requestId = form.get('request_id');
  const pending = typeof requestId === 'string' ? await takeAuthorizeRequest(requestId) : null;
  const viewer = { clientId: await sessionClientId() };
  if (!pending || !viewer.clientId || pending.clientId !== viewer.clientId) {
    return new NextResponse('This sign-in request expired. Go back to your app and connect again.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const back = new URL(pending.redirectUri);
  if (pending.state) back.searchParams.set('state', pending.state);
  // RFC 9207: tell the client which server answered.
  back.searchParams.set('iss', publicOrigin(req));

  const apiKey = form.get('decision') === 'allow' ? await apiKeyForClient(viewer.clientId) : null;
  if (form.get('decision') !== 'allow') {
    back.searchParams.set('error', 'access_denied');
  } else if (apiKey === null) {
    back.searchParams.set('error', 'access_denied');
    back.searchParams.set('error_description', 'The Mediamake account has no enabled API key');
  } else {
    back.searchParams.set('code', await issueCode(pending, apiKey));
  }
  return NextResponse.redirect(back, 303);
}
